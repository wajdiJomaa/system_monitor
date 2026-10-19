use serde::Serialize;

#[derive(Default, Clone, Serialize)]
pub struct RamUsage {
    pub total_kb: u64,
    pub used_kb: u64,
    pub used_percent: f64,
}
