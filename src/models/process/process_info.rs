use serde::Serialize;

/// Process entry sent to clients in the `system_stats` stream.
#[derive(Clone, Serialize)]
pub struct ProcessInfo {
    pub pid: i32,
    pub name: String,
    pub command: Option<String>,
    pub state: String,
    pub cpu_percent: f64,
    pub mem_kb: u64,
}

/// Raw per-tick parse of `/proc/[pid]/stat` and `/proc/[pid]/cmdline`,
/// kept between ticks to compute CPU deltas per PID.
#[derive(Clone)]
pub struct ProcessSample {
    pub name: String,
    pub command: Option<String>,
    pub state: String,
    pub jiffies: u64,
    pub mem_kb: u64,
}
