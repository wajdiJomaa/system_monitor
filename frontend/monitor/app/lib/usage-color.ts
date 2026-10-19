export function clampPct(pct: number) {
  return Math.max(0, Math.min(pct, 100));
}

export function usageColor(pct: number): { text: string; bg: string } {
  if (pct < 50) return { text: "text-green-500", bg: "bg-green-500" };
  if (pct < 80) return { text: "text-amber-500", bg: "bg-amber-500" };
  return { text: "text-red-500", bg: "bg-red-500" };
}
