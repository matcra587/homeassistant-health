export type ProgressBarProps = {
  fraction: number;
  color?: string;
};

export function ProgressBar({ fraction, color }: ProgressBarProps) {
  const pct = Math.round(fraction * 100);
  return (
    <div
      style={{
        position: "relative",
        height: 6,
        background: "var(--mantine-color-default-border)",
        borderRadius: 999,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: `${pct}%`,
          background: color || "var(--mantine-primary-color-filled)",
          borderRadius: 999,
          transition: "width 600ms cubic-bezier(.2,.8,.2,1)",
        }}
      />
    </div>
  );
}
