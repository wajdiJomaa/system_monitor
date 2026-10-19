"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateServer, type ServerFormState } from "../../actions";

type Server = {
  id: number;
  name: string;
  host: string;
  port: number;
};

export default function EditServerForm({ server }: { server: Server }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ServerFormState, FormData>(
    updateServer,
    {},
  );

  useEffect(() => {
    if (state.success) router.push(`/servers/${server.id}`);
  }, [router, server.id, state.success]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="id" value={server.id} />
      <div>
        <label htmlFor="name" className="mb-2 block text-sm font-medium">Server name</label>
        <input id="name" name="name" type="text" required maxLength={100} defaultValue={server.name} className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700" />
      </div>
      <div>
        <label htmlFor="host" className="mb-2 block text-sm font-medium">IP address or domain</label>
        <input id="host" name="host" type="text" required maxLength={253} defaultValue={server.host} className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700" />
      </div>
      <div>
        <label htmlFor="port" className="mb-2 block text-sm font-medium">Port</label>
        <input id="port" name="port" type="number" required min={1} max={65535} defaultValue={server.port} className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700" />
      </div>
      {state.error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{state.error}</p>}
      <button type="submit" disabled={pending} className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
