"use client";

import { useActionState } from "react";
import { createServer, type ServerFormState } from "../actions";

const initialState: ServerFormState = {};

export default function ServerForm() {
  const [state, formAction, pending] = useActionState(
    createServer,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label htmlFor="name" className="mb-2 block text-sm font-medium">
          Server name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={100}
          placeholder="Production server"
          className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700"
        />
      </div>

      <div>
        <label htmlFor="host" className="mb-2 block text-sm font-medium">
          IP address or domain
        </label>
        <input
          id="host"
          name="host"
          type="text"
          required
          maxLength={253}
          placeholder="192.168.1.10 or server.example.com"
          className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700"
        />
      </div>

      <div>
        <label htmlFor="port" className="mb-2 block text-sm font-medium">
          Port
        </label>
        <input
          id="port"
          name="port"
          type="number"
          required
          min={1}
          max={65535}
          placeholder="3001"
          className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700"
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      )}

      {state.success && (
        <p className="text-sm text-green-600 dark:text-green-400" role="status">
          Server saved successfully.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save server"}
      </button>
    </form>
  );
}
