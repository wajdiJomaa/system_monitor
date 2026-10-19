import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import EditServerForm from "./edit-server-form";
import { db } from "@/app/lib/db";

export default function EditServerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-neutral-500">Loading server…</p>}>
      <EditServerContent params={params} />
    </Suspense>
  );
}

async function EditServerContent({
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

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <section className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="mb-2 text-2xl font-bold">Edit server</h1>
        <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
          Update the connection details for {server.name}.
        </p>
        <EditServerForm server={server} />
      </section>
      <Link
        href={`/servers/${server.id}`}
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        Cancel
      </Link>
    </main>
  );
}
