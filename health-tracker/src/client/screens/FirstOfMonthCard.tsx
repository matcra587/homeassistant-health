import { ActionIcon, Paper, SimpleGrid, Text, Title } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import type { Entry, Member, Units } from "../../lib/types";
import { Stat } from "../components/Stat";
import { fmtDelta } from "../lib/units";

export type FirstOfMonthCardProps = {
  me: Member;
  entries: Entry[];
  units: Units | null | undefined;
  onDismiss: () => void;
};

export function FirstOfMonthCard({
  me,
  entries,
  units,
  onDismiss,
}: FirstOfMonthCardProps) {
  const today = window.__fixtures?.today ?? new Date();
  const dayOfMonth = today.getDate();
  if (dayOfMonth > 7) return null;

  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const myEntries = entries.filter((e) => e.memberId === me.id);
  const lastMonthEntries = myEntries
    .filter((e) => {
      const d = new Date(e.date);
      return d >= lastMonth && d < thisMonthStart;
    })
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));

  const start = lastMonthEntries[0];
  const end = lastMonthEntries[lastMonthEntries.length - 1];
  if (!start || !end || lastMonthEntries.length < 2) return null;

  const delta = end.weightKg - start.weightKg;
  const losing =
    me.startWeightKg != null &&
    me.goalWeightKg != null &&
    me.startWeightKg > me.goalWeightKg;
  const positive = (losing && delta < 0) || (!losing && delta > 0);
  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth(),
    0,
  ).getDate();
  const consistency = lastMonthEntries.length / daysInMonth;

  return (
    <Paper withBorder radius="md" p="lg" mb="lg" pos="relative">
      <ActionIcon
        variant="subtle"
        color="gray"
        pos="absolute"
        top={12}
        right={12}
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        <IconX size={16} />
      </ActionIcon>
      <Text fz="xs" c="dimmed" fw={500} tt="uppercase" lts="0.08em">
        A new month
      </Text>
      <Title order={3} fz={22} fw={500} mt={6} mb="md">
        Looking back on{" "}
        {lastMonth.toLocaleDateString("en-US", { month: "long" })}
      </Title>
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="md">
        <Stat
          label="Days logged"
          value={`${lastMonthEntries.length}/${daysInMonth}`}
        />
        <Stat
          label="Net change"
          value={fmtDelta(delta, units)}
          tone={Math.abs(delta) < 0.2 ? null : positive ? "good" : "warn"}
        />
        <Stat label="Consistency" value={`${Math.round(consistency * 100)}%`} />
      </SimpleGrid>
      <Text fs="italic" fz="sm" c="dimmed">
        {Math.abs(delta) < 0.2
          ? "A steady month. Maintenance is its own kind of progress."
          : positive
            ? consistency > 0.7
              ? "A considered month — consistent and quietly downward."
              : "Real progress, even with a few quiet days."
            : "Not the direction you wanted, but the honest record matters more than the number."}
      </Text>
    </Paper>
  );
}
