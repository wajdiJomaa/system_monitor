mod models;
mod services;

use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
    time::Duration,
};

use axum::{
    Json, Router,
    extract::{
        State,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    response::IntoResponse,
    routing::*,
};
use models::cpu::cpu_identity::CpuIdentity;
use models::process::process_info::ProcessInfo;
use models::ram::ram_usage::RamUsage;
use serde::{Deserialize, Serialize};
use services::cpu::{cpu_identity_service, cpu_usage_service};
use services::process::process_service;
use services::ram::ram_usage_service;
use tokio::{net::TcpListener, sync::broadcast};

#[derive(Clone, Default, Serialize)]
struct SystemStats {
    cpu: HashMap<String, f64>,
    ram: RamUsage,
    processes: Vec<ProcessInfo>,
}

#[derive(Clone)]
struct AppState {
    cache: Arc<Mutex<SystemStats>>,
    tx: broadcast::Sender<SystemStats>,
}

#[derive(Deserialize)]
struct KillRequest {
    pid: i32,
    signal: Option<String>,
}

#[derive(Serialize)]
struct KillResponse {
    success: bool,
    message: String,
}

#[tokio::main]
async fn main() {
    let (tx, _) = broadcast::channel(16);
    let state = AppState {
        cache: Arc::new(Mutex::new(SystemStats::default())),
        tx,
    };

    tokio::spawn(stats_updater(state.clone()));

    let app = Router::new()
        .route("/cpu_identity", get(get_cpu_identity))
        .route("/system_stats", get(get_system_stats))
        .route("/ws/system_stats", get(ws_system_stats))
        .route("/processes/kill", post(kill_process))
        .with_state(state);

    let listener = TcpListener::bind("0.0.0.0:3001").await.unwrap();

    axum::serve(listener, app).await.unwrap();
}

async fn get_cpu_identity() -> Json<CpuIdentity> {
    Json(cpu_identity_service::get_cpu_identity())
}

async fn get_system_stats(State(state): State<AppState>) -> Json<SystemStats> {
    Json(state.cache.lock().unwrap().clone())
}

async fn kill_process(Json(request): Json<KillRequest>) -> Json<KillResponse> {
    let signal = match request.signal.as_deref() {
        Some("KILL") => "KILL",
        _ => "TERM",
    };

    if request.pid <= 1 {
        return Json(KillResponse {
            success: false,
            message: "Refusing to signal PID 1.".to_string(),
        });
    }

    let output = tokio::process::Command::new("kill")
        .arg(format!("-{signal}"))
        .arg(request.pid.to_string())
        .output()
        .await;

    let (success, message) = match output {
        Ok(output) if output.status.success() => (
            true,
            format!("Sent SIG{signal} to PID {}.", request.pid),
        ),
        Ok(output) => {
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            (
                false,
                if stderr.is_empty() {
                    format!("kill exited with {}", output.status)
                } else {
                    stderr
                },
            )
        }
        Err(err) => (false, format!("Failed to run kill: {err}")),
    };

    Json(KillResponse { success, message })
}

async fn ws_system_stats(ws: WebSocketUpgrade, State(state): State<AppState>) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_system_stats_socket(socket, state))
}

async fn handle_system_stats_socket(mut socket: WebSocket, state: AppState) {
    let mut rx = state.tx.subscribe();

    {
        let current = state.cache.lock().unwrap().clone();
        if !current.cpu.is_empty() {
            let Ok(json) = serde_json::to_string(&current) else {
                return;
            };
            if socket.send(Message::Text(json.into())).await.is_err() {
                return;
            }
        }
    }

    loop {
        tokio::select! {
            msg = rx.recv() => {
                match msg {
                    Ok(stats) => {
                        let Ok(json) = serde_json::to_string(&stats) else {
                            continue;
                        };
                        if socket.send(Message::Text(json.into())).await.is_err() {
                            break;
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
            msg = socket.recv() => {
                match msg {
                    Some(Ok(Message::Close(_))) | None => break,
                    Some(Ok(_)) => {}
                    Some(Err(_)) => break,
                }
            }
        }
    }
}

async fn stats_updater(state: AppState) {
    let mut prev = cpu_usage_service::parse_cpu_usage();
    let mut prev_processes = process_service::parse_processes();

    loop {
        tokio::time::sleep(Duration::from_secs(1)).await;
        let curr = cpu_usage_service::parse_cpu_usage();
        let current_processes = process_service::parse_processes();

        let cpu: HashMap<String, f64> = prev
            .iter()
            .filter_map(|(name, prev_stats)| {
                curr.get(name).map(|curr_stats| {
                    (
                        name.clone(),
                        cpu_usage_service::cpu_usage_percent(prev_stats, curr_stats),
                    )
                })
            })
            .collect();

        // Total jiffies consumed by all cores this tick, from the
        // aggregate "cpu" line, plus the core count for per-core scaling.
        let total_delta = curr
            .get("cpu")
            .and_then(|curr_stats| {
                prev.get("cpu")
                    .map(|prev_stats| curr_stats.total().saturating_sub(prev_stats.total()))
            })
            .unwrap_or(0);
        let cores = curr
            .keys()
            .filter(|name| name.as_str() != "cpu")
            .count()
            .max(1) as f64;

        let mut processes: Vec<ProcessInfo> = current_processes
            .iter()
            .map(|(pid, sample)| {
                let prev_jiffies = prev_processes.get(pid).map(|s| s.jiffies).unwrap_or(0);
                let delta = sample.jiffies.saturating_sub(prev_jiffies);
                let cpu_percent = if total_delta > 0 {
                    ((delta as f64 * cores / total_delta as f64) * 100.0 * 100.0).round()
                        / 100.0
                } else {
                    0.0
                };
                ProcessInfo {
                    pid: *pid,
                    name: sample.name.clone(),
                    command: sample.command.clone(),
                    state: sample.state.clone(),
                    cpu_percent,
                    mem_kb: sample.mem_kb,
                }
            })
            .collect();
        processes.sort_by(|a, b| b.cpu_percent.total_cmp(&a.cpu_percent));

        let stats = SystemStats {
            cpu,
            ram: ram_usage_service::parse_ram_usage(),
            processes,
        };

        *state.cache.lock().unwrap() = stats.clone();
        let _ = state.tx.send(stats);
        prev = curr;
        prev_processes = current_processes;
    }
}
