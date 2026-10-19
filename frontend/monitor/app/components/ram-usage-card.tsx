import StatusBadge from "./status-badge";
import Sparkline from "./sparkline";
import { clampPct, usageColor } from "@/app/lib/usage-color";
import type { ConnectionStatus, RamUsage } from "@/app/lib/use-system-stats";

export default function RamUsageCard({
  ram,
  status,
  history,
}: {
  ram: RamUsage | null;
  status: ConnectionStatus;
  history: number[];
}) {
  const pct = ram ? clampPct(ram.used_percent) : 0;
  const color = usageColor(pct);

  return (
    <section className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">RAM</h2>
        <StatusBadge status={status} />
      </div>

      {!ram ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {status === "connected" ? "Waiting for data…" : "Connecting…"}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
            <span className={`font-mono text-3xl font-semibold ${color.text}`}>
              {pct.toFixed(1)}%
            </span>
            <span className="min-w-0 truncate font-mono text-xs text-neutral-500 dark:text-neutral-400">
              {gb(ram.used_kb)} / {gb(ram.total_kb)} GB
            </span>
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${color.bg}`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <Sparkline data={history} className={`mt-4 ${color.text}`} />

          <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-2">
            <StatTile label="Used" value={`${gb(ram.used_kb)} GB`} />
            <StatTile
              label="Available"
              value={`${gb(ram.total_kb - ram.used_kb)} GB`}
            />
            <StatTile label="Total" value={`${gb(ram.total_kb)} GB`} />
          </div>
        </>
      )}
    </section>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-neutral-200 px-2 py-1.5 dark:border-neutral-800">
      <p className="min-w-0 truncate text-[10px] font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className="mt-0.5 min-w-0 truncate font-mono text-xs">{value}</p>
    </div>
  );
}

function gb(kb: number) {
  return (kb / 1024 / 1024).toFixed(1);
}
