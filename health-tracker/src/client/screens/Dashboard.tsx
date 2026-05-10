import {
  Affix,
  Badge,
  Box,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconFlame, IconPencil, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import type { Entry, Member, Units } from "../../lib/types";
import { ProgressBar } from "../components/ProgressBar";
import { WeightChart } from "../components/WeightChart";
import {
  bmiCategory,
  calcBMI,
  calcBMR,
  calcIdealWeight,
  calcPacing,
  calcStreak,
  calcTDEE,
  estBodyFat,
  progressFraction,
  trendDirection,
} from "../lib/calc";
import { fmtDate, fmtDateLong } from "../lib/format";
import { fmtDelta, fmtWeight } from "../lib/units";
import { getToday } from "../store";
import { EmptyDashboard } from "./EmptyDashboard";
import { FirstOfMonthCard } from "./FirstOfMonthCard";

export type DashboardProps = {
  me: Member;
  entries: Entry[];
  units: Units | null | undefined;
  onLogToday: () => void;
  onEditEntry?: (entry: Entry) => void;
};

export function Dashboard({ me, entries, units, onLogToday }: DashboardProps) {
  const [dismissedMonth, setDismissedMonth] = useState(false);
  const myEntries = entries.filter((e) => e.memberId === me.id);
  if (myEntries.length < 3) {
    return <EmptyDashboard me={me} entries={entries} onLogToday={onLogToday} />;
  }

  const sorted = [...myEntries].sort(
    (a, b) => +new Date(b.date) - +new Date(a.date),
  );
  const latest = sorted[0];
  if (!latest) {
    return <EmptyDashboard me={me} entries={entries} onLogToday={onLogToday} />;
  }
  const previous = sorted[1];
  const pacing = calcPacing(me, myEntries);
  const streak = calcStreak(myEntries, me.resetGracePeriodDays);
  // trend is currently consumed via member-card displays, not the dashboard
  // headline; keeping the call site so calcs run together.
  void trendDirection(myEntries, 14);
  const progress = progressFraction(me, latest.weightKg);
  const bmi = calcBMI(latest.weightKg, me.heightCm);
  const bmr = calcBMR(latest.weightKg, me.heightCm, me.age, me.sex);
  const tdee = calcTDEE(
    latest.weightKg,
    me.heightCm,
    me.age,
    me.sex,
    me.activityLevel,
  );
  const bf = estBodyFat(latest.weightKg, me.heightCm, me.age, me.sex);
  const ideal = calcIdealWeight(me.heightCm, me.sex);

  const today = getToday();
  const loggedToday =
    new Date(latest.date).toDateString() === today.toDateString();
  const dayDelta = previous ? latest.weightKg - previous.weightKg : 0;
  const fromGoal =
    me.goalWeightKg != null ? latest.weightKg - me.goalWeightKg : 0;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const pacingColor = pacing
    ? pacing.onTrack
      ? "github-blue"
      : pacing.aheadDays > 0
        ? "github-green"
        : "github-gray"
    : null;

  return (
    <Box>
      <Box mb="xl">
        <Text fz="sm" c="dimmed">
          {fmtDateLong(today)}
        </Text>
        <Title order={1} fz={{ base: 32, sm: 44 }} fw={500} mt={6} lh={1.1}>
          {greeting}, {me.displayName}.
        </Title>
        <Text c="dimmed" fz="md" mt="sm" maw={520}>
          {loggedToday
            ? "You're set for the day. Quietly progressing."
            : streak.broken
              ? "A new day, a new entry. Begin again whenever you like."
              : "When you're ready, log today's weight below."}
        </Text>
      </Box>

      {!dismissedMonth && (
        <FirstOfMonthCard
          me={me}
          entries={entries}
          units={units}
          onDismiss={() => setDismissedMonth(true)}
        />
      )}

      {pacing && (
        <Paper
          withBorder
          radius="md"
          p="md"
          mb="md"
          style={{
            borderLeft: `3px solid var(--mantine-color-${pacingColor}-filled)`,
          }}
        >
          <Text fz="sm">
            {pacing.onTrack ? (
              <>
                You're{" "}
                <Text component="span" fw={500}>
                  on pace
                </Text>{" "}
                for your target date.
              </>
            ) : pacing.aheadDays > 0 ? (
              <>
                <Text component="span" fw={500}>
                  {pacing.aheadDays}
                </Text>{" "}
                day{pacing.aheadDays === 1 ? "" : "s"} ahead of pace
                {pacing.projectedDate && (
                  <> · projected goal {fmtDate(pacing.projectedDate)}</>
                )}
              </>
            ) : (
              <>
                <Text component="span" fw={500}>
                  {Math.abs(pacing.aheadDays)}
                </Text>{" "}
                day{pacing.aheadDays === -1 ? "" : "s"} behind pace
                {pacing.projectedDate && (
                  <> · projected goal {fmtDate(pacing.projectedDate)}</>
                )}
              </>
            )}
          </Text>
        </Paper>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md" mb="md">
        <Paper withBorder radius="md" p="lg">
          <Text fz="xs" c="dimmed" fw={500} tt="uppercase" lts="0.08em">
            Current weight
          </Text>
          <Group gap={6} align="baseline" mt="xs">
            <Title
              order={2}
              fz={44}
              fw={500}
              lh={1.05}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {fmtWeight(latest.weightKg, units, { unitless: true })}
            </Title>
            <Text ff="monospace" fz="lg" c="dimmed">
              {units === "imperial" ? "lb" : "kg"}
            </Text>
          </Group>
          {previous && (
            <Text c="dimmed" fz="sm" mt={6}>
              <Text
                component="span"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {fmtDelta(dayDelta, units)}
              </Text>{" "}
              from last entry
            </Text>
          )}
        </Paper>

        <Paper withBorder radius="md" p="lg">
          <Group justify="space-between" align="center" mb="xs">
            <Text fz="xs" c="dimmed" fw={500} tt="uppercase" lts="0.08em">
              Streak
            </Text>
            {!streak.broken && streak.length >= 7 && (
              <Badge
                size="sm"
                variant="light"
                color="github-green"
                leftSection={<IconFlame size={12} />}
              >
                on a roll
              </Badge>
            )}
          </Group>
          <Group gap={8} align="baseline">
            <Title
              order={2}
              fz={44}
              fw={500}
              lh={1.05}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {streak.length}
            </Title>
            <Text c="dimmed" fz="lg">
              {streak.length === 1 ? "day" : "days"}
            </Text>
          </Group>
          <Text c="dimmed" fz="sm" mt={6}>
            {streak.broken && streak.lastEntry
              ? `Last entry ${fmtDate(streak.lastEntry.date, { relative: true })}.`
              : streak.lastEntry
                ? `Last logged ${fmtDate(streak.lastEntry.date, { relative: true }).toLowerCase()}.`
                : "Start with today."}
          </Text>
        </Paper>

        <Paper withBorder radius="md" p="lg">
          <Text fz="xs" c="dimmed" fw={500} tt="uppercase" lts="0.08em" mb="sm">
            Toward goal
          </Text>
          <Group gap="xs" align="baseline" mb="sm">
            <Title
              order={2}
              fz={36}
              fw={500}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {Math.round(progress * 100)}%
            </Title>
            <Text c="dimmed" fz="sm">
              of the way there
            </Text>
          </Group>
          <ProgressBar fraction={progress} />
          <Group justify="space-between" mt="sm" gap="xs">
            <Text c="dimmed" fz="xs" ff="monospace">
              start {fmtWeight(me.startWeightKg, units, { unitless: true })}
            </Text>
            <Text c="dimmed" fz="xs" ff="monospace">
              {Math.abs(fromGoal) < 0.1
                ? "at goal"
                : `${fmtDelta(fromGoal, units)} to go`}
            </Text>
            <Text c="dimmed" fz="xs" ff="monospace">
              goal {fmtWeight(me.goalWeightKg, units, { unitless: true })}
            </Text>
          </Group>
        </Paper>
      </SimpleGrid>

      <Box mb="xl">
        <WeightChart entries={myEntries} member={me} units={units} />
      </Box>

      <Stack gap="sm" mb="xl">
        <Group gap="md" align="baseline">
          <Title order={2} fz={22} fw={500}>
            Derived stats
          </Title>
          <Text c="dimmed" fz="sm">
            estimated from your latest entry
          </Text>
        </Group>
        <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }} spacing="md">
          {[
            { label: "BMI", value: bmi?.toFixed(1), sub: bmiCategory(bmi) },
            {
              label: "BMR",
              value: bmr != null ? Math.round(bmr) : null,
              sub: "kcal at rest",
            },
            {
              label: "TDEE",
              value: tdee != null ? Math.round(tdee) : null,
              sub: "kcal estimated",
            },
            {
              label: "Body-fat est.",
              value: bf ? `${bf.toFixed(1)}%` : "—",
              sub: "Deurenberg",
            },
            {
              label: "Ideal weight",
              value: fmtWeight(ideal, units, { unitless: true }),
              sub: units === "imperial" ? "lb · Robinson" : "kg · Robinson",
            },
          ].map((s) => (
            <Box key={s.label}>
              <Text fz="xs" c="dimmed" fw={500} tt="uppercase" lts="0.08em">
                {s.label}
              </Text>
              <Text
                fz={22}
                fw={500}
                mt={4}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {s.value ?? "—"}
              </Text>
              {s.sub && (
                <Text c="dimmed" fz="xs" mt={2}>
                  {s.sub}
                </Text>
              )}
            </Box>
          ))}
        </SimpleGrid>
      </Stack>

      <Affix
        position={{
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)",
          right: 24,
        }}
        zIndex={50}
      >
        <Button
          size="lg"
          radius="lg"
          leftSection={
            loggedToday ? <IconPencil size={18} /> : <IconPlus size={18} />
          }
          onClick={onLogToday}
        >
          {loggedToday ? "Edit today's entry" : "Log today's weight"}
        </Button>
      </Affix>
    </Box>
  );
}
