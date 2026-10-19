"use client";

import CpuUsageCard from "./cpu-usage-card";
import ProcessTable from "./process-table";
import RamUsageCard from "./ram-usage-card";
import { useSystemStats } from "@/app/lib/use-system-stats";

export default function SystemStatsCards({
  serverId,
  wsUrl,
}: {
  serverId: number;
  wsUrl?: string;
}) {
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
      <ProcessTable
        processes={stats?.processes ?? null}
        status={status}
        serverId={serverId}
      />
    </>
  );
}
