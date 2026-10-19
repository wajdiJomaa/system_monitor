import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import CpuIdentityCard from "@/app/components/cpu-identity-card";
import SystemStatsCards from "@/app/components/system-stats-cards";
import { db } from "@/app/lib/db";
import { getServerUrl } from "@/app/lib/cpu";

export default function ServerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<ServerPageLoading />}>
      <ServerDetails params={params} />
    </Suspense>
  );
}

async function ServerDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const serverId = Number(id);

  if (!Number.isInteger(serverId)) notFound();

  const server = await db.server.findUnique({ where: { id: serverId } });
  if (!server) notFound();

  const apiUrl = getServerUrl(server.host, server.port);
  const wsUrl = getServerUrl(server.host, server.port, "ws");

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/"
            className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          >
            ← Dashboard
          </Link>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">{server.name}</h1>
          <p className="mt-1 font-mono text-sm text-neutral-500 dark:text-neutral-400">
            {server.host}:{server.port}
          </p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          Monitoring
        </span>
      </header>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Suspense fallback={<CardLoading label="Loading CPU identity…" />}>
          <CpuIdentityCard apiUrl={apiUrl} />
        </Suspense>
        <SystemStatsCards wsUrl={wsUrl} />
      </div>
    </div>
  );
}

function ServerPageLoading() {
  return <div className="p-8 text-sm text-neutral-500">Loading server…</div>;
}

function CardLoading({ label }: { label: string }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-500 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      {label}
    </section>
  );
}
