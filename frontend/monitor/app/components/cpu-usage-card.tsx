import StatusBadge from "./status-badge";
import Sparkline from "./sparkline";
import { clampPct, usageColor } from "@/app/lib/usage-color";
import type { ConnectionStatus } from "@/app/lib/use-system-stats";

type CpuUsage = Record<string, number>;

export default function CpuUsageCard({
  usage,
  status,
  history,
}: {
  usage: CpuUsage | null;
  status: ConnectionStatus;
  history: number[];
}) {
  const total = usage?.cpu;
  const cores = usage
    ? Object.entries(usage)
        .filter(([name]) => name !== "cpu")
        .sort(([a], [b]) => Number(a.slice(3)) - Number(b.slice(3)))
    : [];
  const color = usageColor(total ?? 0);

  return (
    <section className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">CPU</h2>
        <StatusBadge status={status} />
      </div>

      {!usage || total === undefined ? (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {status === "connected" ? "Waiting for data…" : "Connecting…"}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
            <span className={`font-mono text-3xl font-semibold ${color.text}`}>
              {total.toFixed(1)}%
            </span>
            <span className="min-w-0 truncate font-mono text-xs text-neutral-500 dark:text-neutral-400">
              {cores.length} cores
            </span>
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${color.bg}`}
              style={{ width: `${clampPct(total)}%` }}
            />
          </div>

          <Sparkline data={history} className={`mt-4 ${color.text}`} />

          <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-2">
            {cores.map(([name, pct]) => (
              <CoreTile key={name} name={name} pct={pct} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function CoreTile({ name, pct }: { name: string; pct: number }) {
  const core = name.replace(/^cpu/, "");
  const color = usageColor(pct);

  return (
    <div className="min-w-0 rounded-lg border border-neutral-200 px-2 py-1.5 dark:border-neutral-800">
      <div className="flex min-w-0 items-baseline justify-between gap-1">
        <span className="min-w-0 truncate text-[10px] font-medium uppercase tracking-wide text-neutral-400">
          CPU {core}
        </span>
        <span className="shrink-0 font-mono text-xs">{pct.toFixed(0)}%</span>
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color.bg}`}
          style={{ width: `${clampPct(pct)}%` }}
        />
      </div>
    </div>
  );
}
