"use client";

import { useMemo, useState } from "react";
import StatusBadge from "./status-badge";
import { usageColor } from "@/app/lib/usage-color";
import { usePersistedState } from "@/app/lib/use-persisted-state";
import { killProcess } from "../servers/actions";
import type { ConnectionStatus, ProcessInfo } from "@/app/lib/use-system-stats";

type SortKey = "pid" | "name" | "cpu_percent" | "mem_kb";

const STATE_LABELS: Record<string, string> = {
  R: "Running",
  S: "Sleeping",
  D: "Waiting",
  Z: "Zombie",
  T: "Stopped",
  I: "Idle",
};

export default function ProcessTable({
  processes,
  status,
  serverId,
}: {
  processes: ProcessInfo[] | null;
  status: ConnectionStatus;
  serverId: number;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("cpu_percent");
  const [sortDesc, setSortDesc] = useState(true);
  const [query, setQuery] = usePersistedState("monitor:process-filter");
  const [killingPid, setKillingPid] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    process: ProcessInfo;
  } | null>(null);

  async function handleKill(p: ProcessInfo) {
    const confirmed = window.confirm(
      `Send SIGTERM to ${p.name} (PID ${p.pid})?\n\nThe process may be terminated without cleanup.`,
    );
    if (!confirmed) return;

    setKillingPid(p.pid);
    try {
      const result = await killProcess(serverId, p.pid);
      setNotice({ ok: result.success, text: result.message });
    } catch {
      setNotice({ ok: false, text: "The kill request failed." });
    } finally {
      setKillingPid(null);
    }
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = (processes ?? []).filter((p) => {
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.command?.toLowerCase().includes(q) ?? false) ||
        String(p.pid).includes(q)
      );
    });

    return [...filtered].sort((a, b) => {
      const dir = sortDesc ? -1 : 1;
      switch (sortKey) {
        case "name":
          return dir * a.name.localeCompare(b.name);
        case "pid":
          return dir * (a.pid - b.pid);
        case "mem_kb":
          return dir * (a.mem_kb - b.mem_kb);
        default:
          return dir * (a.cpu_percent - b.cpu_percent);
      }
    });
  }, [processes, query, sortDesc, sortKey]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDesc((desc) => !desc);
    } else {
      setSortKey(key);
      setSortDesc(key === "pid" || key === "name" ? false : true);
    }
  }

  return (
    <section className="w-full rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:col-span-2 xl:col-span-3">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Processes</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Right-click a process to kill it.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={status} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by name, command, or PID…"
            className="w-56 rounded-lg border border-neutral-300 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-neutral-700"
          />
        </div>
      </div>

      {notice && (
        <p
          role={notice.ok ? "status" : "alert"}
          className={`mb-3 text-sm ${
            notice.ok
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {notice.text}
        </p>
      )}

      {!processes ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {status === "connected" ? "Waiting for data…" : "Connecting…"}
        </p>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-neutral-400">
                <SortableTh
                  label="PID"
                  className="w-16"
                  active={sortKey === "pid"}
                  desc={sortDesc}
                  onSort={() => toggleSort("pid")}
                />
                <SortableTh
                  label="Name"
                  active={sortKey === "name"}
                  desc={sortDesc}
                  onSort={() => toggleSort("name")}
                />
                <th className="w-24 px-2 py-2 font-medium">State</th>
                <SortableTh
                  label="CPU"
                  align="right"
                  className="w-20"
                  active={sortKey === "cpu_percent"}
                  desc={sortDesc}
                  onSort={() => toggleSort("cpu_percent")}
                />
                <SortableTh
                  label="MEM"
                  align="right"
                  className="w-24"
                  active={sortKey === "mem_kb"}
                  desc={sortDesc}
                  onSort={() => toggleSort("mem_kb")}
                />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-2 py-4 text-sm text-neutral-500 dark:text-neutral-400"
                  >
                    No processes match.
                  </td>
                </tr>
              ) : (
                rows.map((p) => (
                  <ProcessRow
                    key={p.pid}
                    p={p}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      setMenu({
                        x: Math.min(event.clientX, window.innerWidth - 260),
                        y: Math.min(event.clientY, window.innerHeight - 120),
                        process: p,
                      });
                    }}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {menu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setMenu(null)}
          onContextMenu={(event) => event.preventDefault()}
        >
          <div
            className="absolute min-w-56 rounded-lg border border-neutral-200 bg-white p-1 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
            style={{ left: menu.x, top: menu.y }}
            onClick={(event) => event.stopPropagation()}
            role="menu"
          >
            <div className="px-3 py-2">
              <p className="truncate text-sm font-medium">{menu.process.name}</p>
              <p className="truncate font-mono text-xs text-neutral-500 dark:text-neutral-400">
                PID {menu.process.pid} ·{" "}
                {STATE_LABELS[menu.process.state] ?? menu.process.state}
              </p>
            </div>
            <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-800" />
            <button
              type="button"
              role="menuitem"
              disabled={menu.process.pid <= 1 || killingPid === menu.process.pid}
              onClick={() => {
                const target = menu.process;
                setMenu(null);
                void handleKill(target);
              }}
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-950"
            >
              {killingPid === menu.process.pid
                ? "Killing…"
                : `Kill process (SIGTERM)`}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function SortableTh({
  label,
  active,
  desc,
  onSort,
  className,
  align = "left",
}: {
  label: string;
  active: boolean;
  desc: boolean;
  onSort: () => void;
  className?: string;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`sticky top-0 z-10 bg-white px-2 py-2 font-medium dark:bg-neutral-900 ${className ?? ""}`}
    >
      <button
        type="button"
        onClick={onSort}
        className={`flex w-full items-center gap-1 hover:text-neutral-600 dark:hover:text-neutral-300 ${
          align === "right" ? "justify-end" : ""
        }`}
      >
        {label}
        {active && (
          <span className="text-[9px]" aria-hidden="true">
            {desc ? "▼" : "▲"}
          </span>
        )}
      </button>
    </th>
  );
}

function ProcessRow({
  p,
  onContextMenu,
}: {
  p: ProcessInfo;
  onContextMenu: (event: React.MouseEvent<HTMLTableRowElement>) => void;
}) {
  const color = usageColor(p.cpu_percent);
  const stateLabel = STATE_LABELS[p.state] ?? p.state;

  return (
    <tr
      onContextMenu={onContextMenu}
      className="cursor-context-menu border-t border-neutral-100 hover:bg-neutral-50 dark:border-neutral-800/60 dark:hover:bg-neutral-800/40"
    >
      <td className="px-2 py-1.5 font-mono text-xs">{p.pid}</td>
      <td className="min-w-0 px-2 py-1.5">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="shrink-0 font-medium">{p.name}</span>
          {p.command && p.command !== p.name && (
            <span
              className="min-w-0 truncate text-xs text-neutral-400 dark:text-neutral-500"
              title={p.command}
            >
              {p.command}
            </span>
          )}
        </div>
      </td>
      <td className="px-2 py-1.5">
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
          {stateLabel}
        </span>
      </td>
      <td className={`px-2 py-1.5 text-right font-mono text-xs ${color.text}`}>
        {p.cpu_percent.toFixed(1)}%
      </td>
      <td className="px-2 py-1.5 text-right font-mono text-xs">
        {fmtMem(p.mem_kb)}
      </td>
    </tr>
  );
}

function fmtMem(kb: number) {
  if (kb >= 1024 * 1024) return `${(kb / 1024 / 1024).toFixed(1)} GB`;
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${kb} kB`;
}
