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
use models::ram::ram_usage::RamUsage;
use serde::Serialize;
use services::cpu::{cpu_identity_service, cpu_usage_service};
use services::ram::ram_usage_service;
use tokio::{net::TcpListener, sync::broadcast};

#[derive(Clone, Default, Serialize)]
struct SystemStats {
    cpu: HashMap<String, f64>,
    ram: RamUsage,
}

#[derive(Clone)]
struct AppState {
    cache: Arc<Mutex<SystemStats>>,
    tx: broadcast::Sender<SystemStats>,
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

    loop {
        tokio::time::sleep(Duration::from_secs(1)).await;
        let curr = cpu_usage_service::parse_cpu_usage();

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

        let stats = SystemStats {
            cpu,
            ram: ram_usage_service::parse_ram_usage(),
        };

        *state.cache.lock().unwrap() = stats.clone();
        let _ = state.tx.send(stats);
        prev = curr;
    }
}
