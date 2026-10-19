"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { updateServer, type ServerFormState } from "../servers/actions";

type Server = {
  id: number;
  name: string;
  host: string;
  port: number;
};

export default function ServerNavigation({ servers }: { servers: Server[] }) {
  const router = useRouter();
  const [menu, setMenu] = useState<{ serverId: number; x: number; y: number } | null>(null);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [state, formAction, pending] = useActionState<ServerFormState, FormData>(saveServer, {});

  async function saveServer(
    previousState: ServerFormState,
    formData: FormData,
  ): Promise<ServerFormState> {
    const result = await updateServer(previousState, formData);
    if (result.success) {
      setEditingServer(null);
      router.refresh();
    }
    return result;
  }

  if (servers.length === 0) {
    return (
      <p className="px-2 py-3 text-sm text-neutral-500 dark:text-neutral-400">
        No servers added yet.
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-1">
        {servers.map((server) => (
          <li key={server.id}>
            <Link
              href={`/servers/${server.id}`}
              onContextMenu={(event) => {
                event.preventDefault();
                setMenu({
                  serverId: server.id,
                  x: Math.min(event.clientX, window.innerWidth - 180),
                  y: Math.min(event.clientY, window.innerHeight - 60),
                });
              }}
              className="block rounded-lg px-3 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-900"
            >
              <span className="block truncate text-sm font-medium">{server.name}</span>
              <span className="mt-0.5 block truncate font-mono text-xs text-neutral-500 dark:text-neutral-400">
                {server.host}:{server.port}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {menu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setMenu(null)}
          onContextMenu={(event) => event.preventDefault()}
        >
          <div
            className="absolute min-w-40 rounded-lg border border-neutral-200 bg-white p-1 shadow-xl dark:border-neutral-700 dark:bg-neutral-900"
            style={{ left: menu.x, top: menu.y }}
            onClick={(event) => event.stopPropagation()}
            role="menu"
          >
            <button
              type="button"
              className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
              onClick={() => {
                const server = servers.find((item) => item.id === menu.serverId);
                setMenu(null);
                setEditingServer(server ?? null);
              }}
            >
              Edit server info
            </button>
          </div>
        </div>
      )}

      {editingServer && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={() => setEditingServer(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-700 dark:bg-neutral-900"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-server-title"
          >
            <h2 id="edit-server-title" className="text-xl font-bold">
              Edit server info
            </h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Update the connection details for {editingServer.name}.
            </p>

            <form action={formAction} className="mt-6 space-y-4">
              <input type="hidden" name="id" value={editingServer.id} />
              <label className="block text-sm font-medium">
                Server name
                <input
                  name="name"
                  required
                  maxLength={100}
                  defaultValue={editingServer.name}
                  className="mt-2 w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 font-normal outline-none focus:border-blue-500 dark:border-neutral-700"
                />
              </label>
              <label className="block text-sm font-medium">
                IP address or domain
                <input
                  name="host"
                  required
                  maxLength={253}
                  defaultValue={editingServer.host}
                  className="mt-2 w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 font-normal outline-none focus:border-blue-500 dark:border-neutral-700"
                />
              </label>
              <label className="block text-sm font-medium">
                Port
                <input
                  name="port"
                  type="number"
                  required
                  min={1}
                  max={65535}
                  defaultValue={editingServer.port}
                  className="mt-2 w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 font-normal outline-none focus:border-blue-500 dark:border-neutral-700"
                />
              </label>

              {state.error && (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {state.error}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingServer(null)}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pending ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
