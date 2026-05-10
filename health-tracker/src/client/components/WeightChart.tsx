import { LineChart } from "@mantine/charts";
import {
  Group,
  Paper,
  SegmentedControl,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useMemo, useState } from "react";
import type { Entry, Member, Units } from "../../lib/types";
import { fmtDate } from "../lib/format";
import { kgToLb } from "../lib/units";

export const RANGE_DAYS = {
  "1W": 7,
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  All: Number.POSITIVE_INFINITY,
} as const;

export type RangeKey = keyof typeof RANGE_DAYS;

export function filterByRange(entries: Entry[], range: RangeKey): Entry[] {
  const days = RANGE_DAYS[range];
  if (!Number.isFinite(days)) return entries;
  const today = window.__fixtures?.today ?? new Date();
  const cutoff = +today - days * 86_400_000;
  return entries.filter((e) => +new Date(e.date) >= cutoff);
}

export type WeightChartProps = {
  entries: Entry[];
  member: Member;
  units: Units | null | undefined;
  height?: number;
};

export function WeightChart({
  entries,
  member,
  units,
  height = 280,
}: WeightChartProps) {
  const [range, setRange] = useState<RangeKey>("3M");

  const data = useMemo(() => {
    return filterByRange(entries, range)
      .slice()
      .sort((a, b) => +new Date(a.date) - +new Date(b.date))
      .map((e) => ({
        date: fmtDate(e.date),
        weight: units === "imperial" ? kgToLb(e.weightKg) : e.weightKg,
      }));
  }, [entries, range, units]);

  if (entries.length < 3) {
    return (
      <Paper withBorder radius="md" p="xl">
        <Stack align="center" gap="xs">
          <Title order={3} fz={20} fw={500} c="dimmed">
            Not enough yet to draw a line.
          </Title>
          <Text c="dimmed" fz="sm" maw={360} ta="center">
            A few more days of entries and the trend will appear here. Keep at
            it — quietly.
          </Text>
        </Stack>
      </Paper>
    );
  }

  const goalDisplay =
    units === "imperial"
      ? kgToLb(member.goalWeightKg ?? 0)
      : (member.goalWeightKg ?? 0);
  const unitLabel = units === "imperial" ? "lb" : "kg";

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap" gap="md">
        <Group gap="md" align="baseline">
          <Text fz="xs" c="dimmed" fw={500} tt="uppercase" lts="0.08em">
            Weight over time
          </Text>
          <Text c="dimmed" fz="sm">
            {data.length} entries · {range}
          </Text>
        </Group>
        <SegmentedControl
          size="xs"
          value={range}
          onChange={(value) => setRange(value as RangeKey)}
          data={Object.keys(RANGE_DAYS).map((k) => ({ value: k, label: k }))}
        />
      </Group>

      <Paper withBorder radius="md" p="md">
        <LineChart
          h={height}
          data={data}
          dataKey="date"
          series={[
            {
              name: "weight",
              color: "github-blue.5",
              label: `Weight (${unitLabel})`,
            },
          ]}
          curveType="natural"
          withDots={data.length < 30}
          withLegend={false}
          referenceLines={[
            {
              y: goalDisplay,
              label: `goal · ${goalDisplay.toFixed(1)} ${unitLabel}`,
              color: "github-red.6",
            },
          ]}
          valueFormatter={(value) => `${value.toFixed(1)} ${unitLabel}`}
          gridAxis="y"
          tickLine="none"
          xAxisProps={{ minTickGap: 50 }}
        />
      </Paper>
    </Stack>
  );
}
