import { getCpuIdentity } from "../lib/cpu";

export default async function CpuIdentityCard({ apiUrl }: { apiUrl?: string }) {
  const identity = await getCpuIdentity(apiUrl).catch(() => null);

  if (!identity) {
    return (
      <section className="w-full max-w-md rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
        <h2 className="mb-2 text-lg font-semibold">CPU Identity</h2>
        <p className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load CPU identity from the API.
        </p>
        <p className="mt-1 font-mono text-xs text-red-500 dark:text-red-400">
           Is the server running at {apiUrl ?? "the configured API"}?
        </p>
      </section>
    );
  }

  const rows = [
    { label: "Vendor", value: identity.vendor },
    { label: "Model name", value: identity.model_name },
    { label: "Family", value: identity.family },
    { label: "Model", value: identity.model },
    { label: "Stepping", value: identity.stepping },
    { label: "Microcode", value: identity.microcode },
  ];

  return (
    <section className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="mb-4 text-lg font-semibold">CPU Identity</h2>
      <dl className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 py-2"
          >
            <dt className="text-sm text-neutral-500 dark:text-neutral-400">
              {row.label}
            </dt>
            <dd className="text-right font-mono text-sm">
              {row.value ?? "—"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
