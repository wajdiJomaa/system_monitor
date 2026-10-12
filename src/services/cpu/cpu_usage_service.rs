use crate::models::cpu::cpu_stats::CpuStats;
use std::{collections::HashMap, fs};
pub fn parse_cpu_usage() -> HashMap<String, CpuStats> {
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

pub fn cpu_usage_percent(prev: &CpuStats, curr: &CpuStats) -> f64 {
    let total_delta = curr.total().saturating_sub(prev.total()) as f64;
    if total_delta == 0.0 {
        return 0.0;
    }
    let idle_delta = curr.idle_time().saturating_sub(prev.idle_time()) as f64;
    let percent = (1.0 - (idle_delta / total_delta)) * 100.0;
    (percent * 100.0).round() / 100.0
}
