import type { ConnectionStatus } from "@/app/lib/use-system-stats";

export default function StatusBadge({ status }: { status: ConnectionStatus }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
      <span
        className={`h-2 w-2 rounded-full ${
          status === "connected"
            ? "bg-green-500"
            : status === "connecting"
              ? "animate-pulse bg-amber-500"
              : "bg-red-500"
        }`}
      />
      {status === "connected"
        ? "Live"
        : status === "connecting"
          ? "Connecting…"
          : "Disconnected"}
    </span>
  );
}
