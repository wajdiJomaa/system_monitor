use crate::models::process::process_info::ProcessSample;
use std::{collections::HashMap, fs};

/// RSS is reported in pages; 4 KiB pages in kB on Linux x86/arm.
const PAGE_KB: u64 = 4;

pub fn parse_processes() -> HashMap<i32, ProcessSample> {
    let mut processes = HashMap::new();

    let Ok(entries) = fs::read_dir("/proc") else {
        return processes;
    };

    for entry in entries.flatten() {
        let Some(pid) = entry
            .file_name()
            .to_str()
            .and_then(|name| name.parse::<i32>().ok())
        else {
            continue;
        };

        let Ok(stat) = fs::read_to_string(entry.path().join("stat")) else {
            continue; // Process exited between read_dir and read.
        };

        // "pid (name) state ..." — the name may contain spaces or parens,
        // so everything before the last ')' is pid + name.
        let Some((_, after_pid)) = stat.split_once('(') else {
            continue;
        };
        let Some((name, rest)) = after_pid.rsplit_once(')') else {
            continue;
        };

        let mut fields = rest.split_whitespace();
        let state = fields.next().unwrap_or_default();
        let _ = fields.nth(9); // ppid .. cmajflt (fields 4-13)
        let utime = fields
            .next()
            .and_then(|value| value.parse::<u64>().ok())
            .unwrap_or(0);
        let stime = fields
            .next()
            .and_then(|value| value.parse::<u64>().ok())
            .unwrap_or(0);
        let _ = fields.nth(7); // cutime .. vsize (fields 16-23)
        let rss_pages = fields
            .next()
            .and_then(|value| value.parse::<u64>().ok())
            .unwrap_or(0);

        let command = fs::read_to_string(entry.path().join("cmdline"))
            .ok()
            .map(|cmdline| {
                cmdline
                    .trim_end_matches('\0')
                    .replace('\0', " ")
                    .trim()
                    .to_string()
            })
            .filter(|cmdline| !cmdline.is_empty());

        processes.insert(
            pid,
            ProcessSample {
                name: name.trim().to_string(),
                command,
                state: state.to_string(),
                jiffies: utime + stime,
                mem_kb: rss_pages * PAGE_KB,
            },
        );
    }

    processes
}
