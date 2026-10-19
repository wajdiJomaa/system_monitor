"use server";

import { db } from "@/app/lib/db";

export type ServerFormState = {
  error?: string;
  success?: boolean;
};

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
