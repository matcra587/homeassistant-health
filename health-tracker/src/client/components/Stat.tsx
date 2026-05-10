import { Box, Text } from "@mantine/core";
import type { ReactNode } from "react";

export type StatTone = "good" | "warn" | null;

export type StatProps = {
  label: string;
  value: ReactNode;
  tone?: StatTone;
  dim?: boolean;
  suffix?: string;
};

export function Stat({ label, value, tone, dim, suffix }: StatProps) {
  const color =
    tone === "good"
      ? "var(--mantine-color-github-green-text)"
      : tone === "warn"
        ? "var(--mantine-color-github-red-text)"
        : dim
          ? "var(--mantine-color-dimmed)"
          : undefined;
  return (
    <Box>
      <Text fz="xs" c="dimmed" fw={500} tt="uppercase" lts="0.06em">
        {label}
      </Text>
      <Text
        fz={20}
        fw={500}
        mt={4}
        lh={1.15}
        c={color}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
        {suffix && (
          <Text component="span" ff="monospace" fz={11} c="dimmed" ml={4}>
            {suffix}
          </Text>
        )}
      </Text>
    </Box>
  );
}
