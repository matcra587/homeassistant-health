import {
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import {
  IconList,
  IconPlus,
  IconSparkles,
  IconUsers,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import type { Entry, Member } from "../../lib/types";
import { fmtDate, fmtDateLong } from "../lib/format";
import { fmtWeight } from "../lib/units";
import { getToday } from "../store";

export type EmptyDashboardProps = {
  me: Member;
  entries: Entry[];
  onLogToday: () => void;
};

export function EmptyDashboard({
  me,
  entries,
  onLogToday,
}: EmptyDashboardProps) {
  const myEntries = entries.filter((e) => e.memberId === me.id);
  const count = myEntries.length;
  const today = getToday();
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <Box maw={720}>
      <Box mb="xl">
        <Text fz="sm" c="dimmed">
          {fmtDateLong(today)}
        </Text>
        <Title order={1} fz={{ base: 32, sm: 44 }} fw={500} mt={6} lh={1.1}>
          {greeting}, {me.displayName}.
        </Title>
      </Box>

      <Paper withBorder radius="md" p="xl" mb="md">
        <Badge
          variant="light"
          size="sm"
          leftSection={<IconSparkles size={12} />}
          mb="md"
        >
          Just getting started
        </Badge>
        <Title order={2} fz={28} fw={500} lh={1.15} mb="xs">
          {count === 0
            ? "One small step begins it."
            : "You've made a beginning."}
        </Title>
        <Text c="dimmed" fz="md" lh={1.55} mb="lg" maw={460}>
          {count === 0
            ? "Log today's weight to start your record. The chart and stats appear once you've a few days behind you — usually three or four."
            : `${count} entr${count === 1 ? "y" : "ies"} so far. ${
                3 - count > 0
                  ? `${3 - count} more day${3 - count === 1 ? "" : "s"} and your trend line will appear.`
                  : "Your trend line is on its way."
              }`}
        </Text>
        <Button
          size="md"
          leftSection={<IconPlus size={16} />}
          onClick={onLogToday}
        >
          Log today's weight
        </Button>
      </Paper>

      {count > 0 && (
        <Stack gap="sm" mb="md">
          <Text fz="xs" c="dimmed" fw={500} tt="uppercase" lts="0.1em">
            Your entries so far
          </Text>
          <Paper withBorder radius="md">
            {myEntries.slice(0, 3).map((e, i, arr) => (
              <Box key={e.id}>
                <Group justify="space-between" align="center" px="lg" py="md">
                  <Box>
                    <Text fz="md" fw={500} lh={1.1}>
                      {fmtDate(e.date, { relative: true })}
                    </Text>
                    <Text c="dimmed" fz="xs">
                      {fmtDateLong(e.date)}
                    </Text>
                  </Box>
                  <Text
                    fz={22}
                    fw={500}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {fmtWeight(e.weightKg, "metric")}
                  </Text>
                </Group>
                {i < arr.length - 1 && <Divider />}
              </Box>
            ))}
          </Paper>
        </Stack>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <HintCard
          icon={<IconUsers size={14} />}
          title="Bring others in"
          body="Add household members from Profile → Household. Everyone gets their own dashboard."
        />
        <HintCard
          icon={<IconList size={14} />}
          title="Backfill old entries"
          body="If you've been weighing for a while, paste in past dates from Entries."
        />
      </SimpleGrid>
    </Box>
  );
}

type HintCardProps = {
  icon: ReactNode;
  title: string;
  body: string;
};

function HintCard({ icon, title, body }: HintCardProps) {
  return (
    <Paper withBorder radius="md" p="md">
      <Group gap={8} c="dimmed" mb={6}>
        {icon}
        <Text fz="xs" fw={500} tt="uppercase" lts="0.08em">
          {title}
        </Text>
      </Group>
      <Text fz="sm" lh={1.5}>
        {body}
      </Text>
    </Paper>
  );
}
