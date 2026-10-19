import Link from "next/link";
import { connection } from "next/server";
import { db } from "@/app/lib/db";
import ServerNavigation from "./server-navigation";
import ThemeToggle from "./theme-toggle";

export default async function ServerSidebar() {
  await connection();
  const servers = await db.server.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="border-b border-neutral-200 p-5 dark:border-neutral-800">
        <Link href="/" className="text-lg font-bold tracking-tight">
          System Monitor
        </Link>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Select a server to inspect
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto p-3" aria-label="Servers">
        <div className="mb-2 flex items-center justify-between px-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Servers
          </span>
          <Link
            href="/servers/new"
            className="rounded-md px-2 py-1 text-lg leading-none text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-900 dark:hover:text-white"
            aria-label="Add server"
          >
            +
          </Link>
        </div>

        <ServerNavigation servers={servers} />
      </nav>

      <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
        <ThemeToggle />
        <Link
          href="/servers/new"
          className="block rounded-lg px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-900 dark:hover:text-white"
        >
          Add a server
        </Link>
      </div>
    </aside>
  );
}
