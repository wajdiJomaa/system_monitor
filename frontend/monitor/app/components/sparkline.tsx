import { clampPct } from "@/app/lib/usage-color";

export default function Sparkline({
  data,
  className,
}: {
  data: number[];
  className?: string;
}) {
  if (data.length < 2) {
    return (
      <div className="h-12 w-full rounded-md border border-dashed border-neutral-200 dark:border-neutral-800" />
    );
  }

  const w = 100;
  const h = 32;
  const step = w / (data.length - 1);
  const points = data.map(
    (value, i) =>
      `${(i * step).toFixed(2)},${(h - (clampPct(value) / 100) * h).toFixed(2)}`,
  );
  const line = `M${points.join(" L")}`;
  const area = `${line} L${w},${h} L0,${h} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={`h-12 w-full ${className ?? ""}`}
      aria-hidden="true"
    >
      <path d={area} fill="currentColor" opacity={0.15} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
