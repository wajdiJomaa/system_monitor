use crate::models::ram::ram_usage::RamUsage;
use std::{collections::HashMap, fs};

pub fn parse_ram_usage() -> RamUsage {
    let content =
        fs::read_to_string("/proc/meminfo").expect("Err: Failed to read /proc/meminfo");

    let mut fields: HashMap<String, u64> = HashMap::new();

    for line in content.lines() {
        if let Some((key, value)) = line.split_once(':') {
            let number = value
                .trim()
                .trim_end_matches("kB")
                .trim()
                .parse()
                .unwrap_or(0);
            fields.insert(key.trim().to_string(), number);
        }
    }

    let total_kb = *fields.get("MemTotal").unwrap_or(&0);
    let available_kb = *fields.get("MemAvailable").unwrap_or(&0);
    let used_kb = total_kb.saturating_sub(available_kb);
    let used_percent = if total_kb > 0 {
        ((used_kb as f64 / total_kb as f64) * 100.0 * 100.0).round() / 100.0
    } else {
        0.0
    };

    RamUsage {
        total_kb,
        used_kb,
        used_percent,
    }
}
