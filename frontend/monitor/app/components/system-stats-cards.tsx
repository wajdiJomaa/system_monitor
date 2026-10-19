"use client";

import CpuUsageCard from "./cpu-usage-card";
import RamUsageCard from "./ram-usage-card";
import { useSystemStats } from "@/app/lib/use-system-stats";

export default function SystemStatsCards({ wsUrl }: { wsUrl?: string }) {
  const { stats, status, history } = useSystemStats(wsUrl);

  return (
    <>
      <CpuUsageCard
        usage={stats?.cpu ?? null}
        status={status}
        history={history.cpu}
      />
      <RamUsageCard
        ram={stats?.ram ?? null}
        status={status}
        history={history.ram}
      />
    </>
  );
}
