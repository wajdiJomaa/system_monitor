use crate::models::cpu::cpu_identity::CpuIdentity;
use std::{collections::HashMap, fs};

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

pub fn get_cpu_identity() -> CpuIdentity {
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

    identity
}
