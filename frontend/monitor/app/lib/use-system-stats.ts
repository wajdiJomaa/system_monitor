"use client";

import { useEffect, useState } from "react";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export interface RamUsage {
  total_kb: number;
  used_kb: number;
  used_percent: number;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  command: string | null;
  state: string;
  cpu_percent: number;
  mem_kb: number;
}

export interface SystemStats {
  cpu: Record<string, number>;
  ram: RamUsage;
  processes: ProcessInfo[];
}

export interface UsageHistory {
  cpu: number[];
  ram: number[];
}

const MAX_HISTORY = 120;

export function useSystemStats(wsUrl: string | undefined) {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [history, setHistory] = useState<UsageHistory>({ cpu: [], ram: [] });

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    // Local per-connection buffers: switching servers starts a fresh graph.
    let cpuSamples: number[] = [];
    let ramSamples: number[] = [];

    function recordSample(next: SystemStats) {
      if (typeof next.cpu?.cpu === "number") {
        cpuSamples.push(next.cpu.cpu);
        if (cpuSamples.length > MAX_HISTORY) {
          cpuSamples = cpuSamples.slice(-MAX_HISTORY);
        }
      }
      if (typeof next.ram?.used_percent === "number") {
        ramSamples.push(next.ram.used_percent);
        if (ramSamples.length > MAX_HISTORY) {
          ramSamples = ramSamples.slice(-MAX_HISTORY);
        }
      }
      setHistory({ cpu: [...cpuSamples], ram: [...ramSamples] });
    }

    function connect() {
      if (cancelled || !wsUrl) return;

      setStatus("connecting");
      const socket = new WebSocket(`${wsUrl}/ws/system_stats`);
      ws = socket;

      socket.onopen = () => {
        setStatus("connected");
      };

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data as string) as SystemStats;
          setStats(parsed);
          recordSample(parsed);
        } catch {
          // Ignore malformed frames.
        }
      };

      socket.onclose = () => {
        setStatus("disconnected");
        if (!cancelled) {
          reconnectTimer = setTimeout(connect, 1000);
        }
      };

      socket.onerror = () => socket.close();
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
      }
    };
  }, [wsUrl]);

  return { stats, status, history };
}
