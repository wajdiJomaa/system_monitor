"use server";

import { db } from "@/app/lib/db";
import { getServerUrl } from "@/app/lib/cpu";

export type ServerFormState = {
  error?: string;
  success?: boolean;
};

export type KillResult = {
  success: boolean;
  message: string;
};

export async function killProcess(
  serverId: number,
  pid: number,
  signal: "TERM" | "KILL" = "TERM",
): Promise<KillResult> {
  const server = await db.server.findUnique({ where: { id: serverId } });

  if (!server) {
    return { success: false, message: "Server not found." };
  }

  const apiUrl = getServerUrl(server.host, server.port);

  try {
    const res = await fetch(`${apiUrl}/processes/kill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pid, signal }),
    });

    return (await res.json()) as KillResult;
  } catch {
    return {
      success: false,
      message: `Could not reach the server at ${apiUrl}.`,
    };
  }
}

export async function createServer(
  _previousState: ServerFormState,
  formData: FormData,
): Promise<ServerFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const host = String(formData.get("host") ?? "").trim();
  const port = Number(formData.get("port"));

  if (!name) {
    return { error: "Enter a name for the server." };
  }

  if (name.length > 100) {
    return { error: "The server name is too long." };
  }

  if (!host) {
    return { error: "Enter an IP address or domain." };
  }

  if (host.length > 253) {
    return { error: "The IP address or domain is too long." };
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { error: "Enter a valid port between 1 and 65535." };
  }

  try {
    await db.server.create({
      data: { name, host, port },
    });
  } catch {
    return { error: "This server and port may already be saved." };
  }

  return { success: true };
}

export async function updateServer(
  _previousState: ServerFormState,
  formData: FormData,
): Promise<ServerFormState> {
  const id = Number(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim();
  const host = String(formData.get("host") ?? "").trim();
  const port = Number(formData.get("port"));

  if (!Number.isInteger(id) || id < 1) {
    return { error: "Invalid server." };
  }

  if (!name) {
    return { error: "Enter a name for the server." };
  }

  if (name.length > 100) {
    return { error: "The server name is too long." };
  }

  if (!host) {
    return { error: "Enter an IP address or domain." };
  }

  if (host.length > 253) {
    return { error: "The IP address or domain is too long." };
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { error: "Enter a valid port between 1 and 65535." };
  }

  try {
    await db.server.update({
      where: { id },
      data: { name, host, port },
    });
  } catch {
    return { error: "This server and port may already be saved." };
  }

  return { success: true };
}
