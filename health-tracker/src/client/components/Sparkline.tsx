import type { Entry } from "../../lib/types";

export type SparklineProps = {
  entries: Entry[];
  width?: number;
  height?: number;
  color?: string;
};

export function Sparkline({
  entries,
  width = 100,
  height = 30,
  color = "var(--mantine-primary-color-filled)",
}: SparklineProps) {
  if (entries.length < 2) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          color: "var(--mantine-color-dimmed)",
          fontSize: 11,
          fontStyle: "italic",
        }}
      >
        just starting
      </div>
    );
  }

  const sorted = [...entries].sort(
    (a, b) => +new Date(a.date) - +new Date(b.date),
  );
  const ys = sorted.map((e) => e.weightKg);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const span = max - min || 1;
  const pts = sorted.map(
    (e, i) =>
      [
        (i / (sorted.length - 1)) * width,
        height - ((e.weightKg - min) / span) * (height - 4) - 2,
      ] as const,
  );
  const d = pts.reduce(
    (acc, p, i) => acc + (i === 0 ? `M ${p[0]} ${p[1]}` : ` L ${p[0]} ${p[1]}`),
    "",
  );
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
    >
      <title>Weight trend</title>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
