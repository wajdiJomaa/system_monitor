use std::{
    collections::HashMap,
    fs,
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
use serde::Serialize;
use tokio::{net::TcpListener, sync::broadcast};

#[derive(Clone)]
struct AppState {
    cache: Arc<Mutex<HashMap<String, f64>>>,
    tx: broadcast::Sender<HashMap<String, f64>>,
}

#[tokio::main]
async fn main() {
    let (tx, _) = broadcast::channel(16);
    let state = AppState {
        cache: Arc::new(Mutex::new(HashMap::new())),
        tx,
    };

    tokio::spawn(cpu_usage_updater(state.clone()));

    let app = Router::new()
        .route("/cpu_identity", get(get_cpu_identity))
        .route("/cpu_usage", get(get_cpu_usage))
        .route("/ws/cpu_usage", get(ws_cpu_usage))
        .with_state(state);

    let listener = TcpListener::bind("0.0.0.0:3000").await.unwrap();

    axum::serve(listener, app).await.unwrap();
}

async fn get_cpu_identity() -> Json<CpuIdentity> {
    let cpu_info = parse_cpu_info();

    let identity = if let Some(first_core) = cpu_info.get(0) {
        CpuIdentity {
            vendor: first_core.get("vendor_id").cloned(),
            model_name: first_core.get("model name").cloned(),
            family: first_core.get("cpu family").cloned(),
            model: first_core.get("model").cloned(),
            stepping: first_core.get("stepping").cloned(),
            microcode: first_core.get("microcode").cloned(),
        }
    } else {
        CpuIdentity::default()
    };

    Json(identity)
}

async fn get_cpu_usage(State(state): State<AppState>) -> Json<HashMap<String, f64>> {
    Json(state.cache.lock().unwrap().clone())
}

async fn ws_cpu_usage(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_cpu_usage_socket(socket, state))
}

async fn handle_cpu_usage_socket(mut socket: WebSocket, state: AppState) {
    let mut rx = state.tx.subscribe();

    {
        let current = state.cache.lock().unwrap().clone();
        if !current.is_empty() {
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
                    Ok(usage) => {
                        let Ok(json) = serde_json::to_string(&usage) else {
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

async fn cpu_usage_updater(state: AppState) {
    let mut prev = parse_cpu_usage();

    loop {
        tokio::time::sleep(Duration::from_secs(1)).await;
        let curr = parse_cpu_usage();

        let usage: HashMap<String, f64> = prev
            .iter()
            .filter_map(|(name, prev_stats)| {
                curr.get(name)
                    .map(|curr_stats| (name.clone(), cpu_usage_percent(prev_stats, curr_stats)))
            })
            .collect();

        *state.cache.lock().unwrap() = usage.clone();
        let _ = state.tx.send(usage);
        prev = curr;
    }
}

#[derive(Default, Serialize)]
struct CpuIdentity {
    vendor: Option<String>,
    model_name: Option<String>,
    family: Option<String>,
    model: Option<String>,
    stepping: Option<String>,
    microcode: Option<String>,
}

#[derive(Default, Serialize)]
struct CpuStats {
    user: u64,
    nice: u64,
    system: u64,
    idle: u64,
    iowait: u64,
    irq: u64,
    softirq: u64,
    steal: u64,
    guest: u64,
    guest_nice: u64,
}

fn parse_cpu_info() -> Vec<HashMap<String, String>> {
    let content = fs::read_to_string("/proc/cpuinfo").expect("Err: Failed to read /proc/cpuinfo");

    let mut cpu_info_list: Vec<HashMap<String, String>> = Vec::new();
    let mut cpu_info = HashMap::new();

    for line in content.lines() {
        if let Some((key, value)) = line.split_once(":") {
            if key.trim().eq("processor") {
                if !cpu_info.is_empty() {
                    cpu_info_list.push(cpu_info);
                }
                cpu_info = HashMap::new();
            }

            cpu_info.insert(key.trim().to_string(), value.trim().to_string());
        }
    }

    if !cpu_info.is_empty() {
        cpu_info_list.push(cpu_info);
    }

    cpu_info_list
}

fn parse_cpu_usage() -> HashMap<String, CpuStats> {
    let content = fs::read_to_string("/proc/stat").expect("Err: Failed to read /proc/stat");

    let mut cpu_usage: HashMap<String, CpuStats> = HashMap::new();

    for line in content.lines() {
        if let Some((key, value)) = line.split_once(" ") {
            if key.trim().starts_with("cpu") {
                cpu_usage.insert(key.trim().to_string(), parse_cpu_stats_from_line(value));
            }
        }
    }

    cpu_usage
}

fn parse_cpu_stats_from_line(value: &str) -> CpuStats {
    let mut parts = value.split_whitespace().filter_map(|s| s.parse().ok());
    CpuStats {
        user: parts.next().unwrap_or(0),
        nice: parts.next().unwrap_or(0),
        system: parts.next().unwrap_or(0),
        idle: parts.next().unwrap_or(0),
        iowait: parts.next().unwrap_or(0),
        irq: parts.next().unwrap_or(0),
        softirq: parts.next().unwrap_or(0),
        steal: parts.next().unwrap_or(0),
        guest: parts.next().unwrap_or(0),
        guest_nice: parts.next().unwrap_or(0),
    }
}

impl CpuStats {
    fn total(&self) -> u64 {
        self.user
            + self.nice
            + self.system
            + self.idle
            + self.iowait
            + self.irq
            + self.softirq
            + self.steal
            + self.guest
            + self.guest_nice
    }

    fn idle_time(&self) -> u64 {
        self.idle + self.iowait
    }
}

fn cpu_usage_percent(prev: &CpuStats, curr: &CpuStats) -> f64 {
    let total_delta = curr.total().saturating_sub(prev.total()) as f64;
    if total_delta == 0.0 {
        return 0.0;
    }
    let idle_delta = curr.idle_time().saturating_sub(prev.idle_time()) as f64;
    let percent = (1.0 - (idle_delta / total_delta)) * 100.0;
    (percent * 100.0).round() / 100.0
}
