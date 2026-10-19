import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-[calc(100vh-2rem)] flex-col items-center justify-center p-8 text-center">
      <div className="max-w-lg">
        <div className="mb-5 text-5xl">⌁</div>
        <h1 className="text-4xl font-bold tracking-tight">System Monitor</h1>
        <p className="mt-4 text-neutral-500 dark:text-neutral-400">
          Choose a server from the sidebar to view its CPU identity and live
          usage metrics.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/servers/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add server
          </Link>
        </div>
      </div>
    </main>
  );
}
