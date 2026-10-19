import { cacheLife } from "next/cache";

export interface CpuIdentity {
  vendor: string | null;
  model_name: string | null;
  family: string | null;
  model: string | null;
  stepping: string | null;
  microcode: string | null;
}

export const API_URL = process.env.API_URL ?? "http://localhost:3001";

export function getServerUrl(host: string, port: number, protocol: "http" | "ws" = "http") {
  const formattedHost = host.includes(":") && !host.startsWith("[")
    ? `[${host}]`
    : host;
  return `${protocol}://${formattedHost}:${port}`;
}

export async function getCpuIdentity(apiUrl: string = API_URL): Promise<CpuIdentity> {
  "use cache";
  cacheLife("days");

  const res = await fetch(`${apiUrl}/cpu_identity`);
  if (!res.ok) {
    throw new Error(`Failed to fetch CPU identity: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
