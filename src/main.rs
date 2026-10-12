mod models;
mod services;

use models::cpu::cpu_identity::CpuIdentity;
use services::cpu::cpu_identity_service;
use services::cpu::cpu_usage_service;

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
    Json(cpu_identity_service::get_cpu_identity())
}

async fn get_cpu_usage(State(state): State<AppState>) -> Json<HashMap<String, f64>> {
    Json(state.cache.lock().unwrap().clone())
}

async fn ws_cpu_usage(ws: WebSocketUpgrade, State(state): State<AppState>) -> impl IntoResponse {
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
    let mut prev = cpu_usage_service::parse_cpu_usage();

    loop {
        tokio::time::sleep(Duration::from_secs(1)).await;
        let curr = cpu_usage_service::parse_cpu_usage();

        let usage: HashMap<String, f64> = prev
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

        *state.cache.lock().unwrap() = usage.clone();
        let _ = state.tx.send(usage);
        prev = curr;
    }
}
