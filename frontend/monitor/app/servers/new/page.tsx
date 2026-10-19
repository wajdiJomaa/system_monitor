import Link from "next/link";
import ServerForm from "./server-form";

export default function NewServerPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <section className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h1 className="mb-2 text-2xl font-bold">Add server</h1>
        <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
          Save the address of a server to monitor.
        </p>
        <ServerForm />
      </section>
      <Link
        href="/"
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        Back to dashboard
      </Link>
    </main>
  );
}
