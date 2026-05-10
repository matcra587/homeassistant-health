import {
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconFlame, IconLock, IconPlus } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import type { Entry, Member, Units } from "../../lib/types";
import { Avatar } from "../components/Avatar";
import { ProgressBar } from "../components/ProgressBar";
import { Sparkline } from "../components/Sparkline";
import { Stat } from "../components/Stat";
import type { StreakInfo } from "../lib/calc";
import {
  calcBMI,
  calcStreak,
  progressFraction,
  trendDirection,
} from "../lib/calc";
import { fmtDate } from "../lib/format";
import { fmtDelta, fmtWeight, unitSuffix } from "../lib/units";

export type HouseholdMode = "now" | "week" | "month";

type Ranges = {
  weekStart: Date;
  weekEnd: Date;
  monthStart: Date;
  monthEnd: Date;
  daysInMonth: number;
};

type MemberSummary = {
  m: Member;
  list: Entry[];
  latest: Entry | undefined;
  streak: StreakInfo;
  weekEntries: Entry[];
  monthEntries: Entry[];
  weekDelta: number | null;
  weekLowest: number | null;
  monthDelta: number | null;
  monthLowest: number | null;
  monthSwing: number | null;
};

export type HouseholdScreenProps = {
  me: Member;
  members: Member[];
  entries: Entry[];
  units: Units | null | undefined;
  onTogglePrivacy: () => void;
  onAddMember?: () => void;
};

export function HouseholdScreen({
  me,
  members,
  entries,
  units,
  onTogglePrivacy,
  onAddMember,
}: HouseholdScreenProps) {
  const [mode, setMode] = useState<HouseholdMode>("now");
  const today = window.__fixtures?.today ?? new Date();

  const ranges = useMemo<Ranges>(() => {
    const weekStart = new Date(+today - 6 * 86_400_000);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(+today + 86_400_000);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const daysInMonth = Math.round((+monthEnd - +monthStart) / 86_400_000);
    return { weekStart, weekEnd, monthStart, monthEnd, daysInMonth };
  }, [today]);

  const summaries = useMemo<MemberSummary[]>(
    () => members.map((m) => summarize(m, entries, ranges)),
    [members, entries, ranges],
  );
  const totalThisWeek = summaries.reduce((a, s) => a + s.weekEntries.length, 0);
  const totalThisMonth = summaries.reduce(
    (a, s) => a + s.monthEntries.length,
    0,
  );
  const householdWeekConsistency =
    summaries.reduce((a, s) => a + s.weekEntries.length / 7, 0) /
    Math.max(1, summaries.length);
  const householdMonthConsistency =
    summaries.reduce(
      (a, s) => a + s.monthEntries.length / ranges.daysInMonth,
      0,
    ) / Math.max(1, summaries.length);

  return (
    <Box>
      <Stack gap="sm" mb="xl">
        <Group justify="space-between" wrap="wrap" gap="md">
          <Title order={1} fz={{ base: 28, sm: 36 }} fw={500}>
            {mode === "now" && "The household"}
            {mode === "week" &&
              `Week of ${ranges.weekStart.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
              })}`}
            {mode === "month" &&
              `Month of ${ranges.monthStart.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}`}
          </Title>
          {onAddMember && (
            <Button
              variant="default"
              leftSection={<IconPlus size={16} />}
              onClick={onAddMember}
            >
              Add a member
            </Button>
          )}
        </Group>
        <Text c="dimmed" fz="sm" maw={580}>
          {mode === "now" &&
            "Everyone's quiet progress, in one view. Exact numbers stay private unless a member chooses to share them."}
          {mode === "week" && (
            <>
              Together the household logged{" "}
              <Text component="span" c="text">
                {totalThisWeek}
              </Text>{" "}
              {totalThisWeek === 1 ? "entry" : "entries"} ·{" "}
              {Math.round(householdWeekConsistency * 100)}% of days covered.
            </>
          )}
          {mode === "month" && (
            <>
              Together:{" "}
              <Text component="span" c="text">
                {totalThisMonth}
              </Text>{" "}
              {totalThisMonth === 1 ? "entry" : "entries"} across{" "}
              {ranges.daysInMonth} days ·{" "}
              {Math.round(householdMonthConsistency * 100)}% covered.
            </>
          )}
        </Text>
        <SegmentedControl
          value={mode}
          onChange={(value) => setMode(value as HouseholdMode)}
          data={[
            { value: "now", label: "Now" },
            { value: "week", label: "This week" },
            { value: "month", label: "This month" },
          ]}
          maw={360}
        />
      </Stack>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {summaries.map((s) => (
          <MemberCard
            key={s.m.id}
            mode={mode}
            summary={s}
            ranges={ranges}
            entries={entries.filter((e) => e.memberId === s.m.id)}
            me={me}
            units={units}
            onTogglePrivacy={onTogglePrivacy}
          />
        ))}
      </SimpleGrid>
    </Box>
  );
}

function summarize(
  m: Member,
  allEntries: Entry[],
  ranges: Ranges,
): MemberSummary {
  const list = allEntries
    .filter((e) => e.memberId === m.id)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const inRange = (e: Entry, start: Date, end: Date) => {
    const t = +new Date(e.date);
    return t >= +start && t < +end;
  };
  const weekEntries = list.filter((e) =>
    inRange(e, ranges.weekStart, ranges.weekEnd),
  );
  const monthEntries = list.filter((e) =>
    inRange(e, ranges.monthStart, ranges.monthEnd),
  );
  const prevWeekStart = new Date(+ranges.weekStart - 7 * 86_400_000);
  const prevWeekEntries = list.filter((e) =>
    inRange(e, prevWeekStart, ranges.weekStart),
  );
  const prevMonthStart = new Date(
    ranges.monthStart.getFullYear(),
    ranges.monthStart.getMonth() - 1,
    1,
  );
  const prevMonthEntries = list.filter((e) =>
    inRange(e, prevMonthStart, ranges.monthStart),
  );

  const latest = list[list.length - 1];
  const streak = calcStreak(list, m.resetGracePeriodDays);

  const weekStartRef =
    prevWeekEntries[prevWeekEntries.length - 1] ?? weekEntries[0];
  const weekEndRef = weekEntries[weekEntries.length - 1];
  const weekDelta =
    weekStartRef && weekEndRef
      ? weekEndRef.weightKg - weekStartRef.weightKg
      : null;
  const weekLowest = weekEntries.length
    ? Math.min(...weekEntries.map((e) => e.weightKg))
    : null;

  const monthStartRef =
    prevMonthEntries[prevMonthEntries.length - 1] ?? monthEntries[0];
  const monthEndRef = monthEntries[monthEntries.length - 1];
  const monthDelta =
    monthStartRef && monthEndRef
      ? monthEndRef.weightKg - monthStartRef.weightKg
      : null;
  const monthLowest = monthEntries.length
    ? Math.min(...monthEntries.map((e) => e.weightKg))
    : null;
  const monthHighest = monthEntries.length
    ? Math.max(...monthEntries.map((e) => e.weightKg))
    : null;
  const monthSwing =
    monthLowest != null && monthHighest != null
      ? monthHighest - monthLowest
      : null;

  return {
    m,
    list,
    latest,
    streak,
    weekEntries,
    monthEntries,
    weekDelta,
    weekLowest,
    monthDelta,
    monthLowest,
    monthSwing,
  };
}

type MemberCardProps = {
  mode: HouseholdMode;
  summary: MemberSummary;
  ranges: Ranges;
  entries: Entry[];
  me: Member;
  units: Units | null | undefined;
  onTogglePrivacy: () => void;
};

function MemberCard({
  mode,
  summary,
  ranges,
  entries,
  me,
  units,
  onTogglePrivacy,
}: MemberCardProps) {
  const { m, streak } = summary;
  const isMe = m.id === me.id;
  const showDetails = m.shareDetails || isMe;
  const broken = streak.broken;
  const today = window.__fixtures?.today ?? new Date();
  const sinceLast = streak.lastEntry
    ? Math.floor((+today - +new Date(streak.lastEntry.date)) / 86_400_000)
    : null;

  return (
    <Paper
      withBorder
      radius="md"
      p="lg"
      pos="relative"
      style={{ opacity: broken ? 0.66 : 1, transition: "opacity 200ms ease" }}
    >
      {isMe && (
        <Badge size="xs" variant="default" pos="absolute" top={12} right={12}>
          you
        </Badge>
      )}
      <Group align="center" gap="md" mb="md" wrap="nowrap">
        <Avatar member={m} size={48} />
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text fz={20} fw={500} lh={1.1} truncate>
            {m.displayName}
          </Text>
          <Group gap={6} mt={2} fz="xs" c="dimmed" wrap="wrap">
            {broken ? (
              <Badge size="xs" variant="light" color="github-gray">
                streak reset · {sinceLast}d ago
              </Badge>
            ) : streak.length > 0 ? (
              <Group gap={4} align="center">
                <IconFlame size={12} />
                <Text fz="xs" ff="monospace">
                  {streak.length}
                </Text>
                <Text fz="xs">-day streak</Text>
              </Group>
            ) : (
              <Text fz="xs" fs="italic">
                just starting out
              </Text>
            )}
            {!showDetails && !isMe && (
              <Group gap={3} align="center" c="dimmed">
                <IconLock size={11} />
                <Text fz="xs">private</Text>
              </Group>
            )}
          </Group>
        </Box>
      </Group>

      {mode === "now" && (
        <NowBody
          summary={summary}
          entries={entries}
          units={units}
          showDetails={showDetails}
        />
      )}
      {mode === "week" && (
        <WeekBody
          summary={summary}
          ranges={ranges}
          units={units}
          showDetails={showDetails}
        />
      )}
      {mode === "month" && (
        <MonthBody
          summary={summary}
          ranges={ranges}
          units={units}
          showDetails={showDetails}
        />
      )}

      <Divider mt="md" mb="md" />
      <Group justify="space-between" align="center">
        <Sparkline entries={entries} width={120} height={28} />
        {isMe && (
          <Button
            variant="subtle"
            color="gray"
            size="compact-sm"
            leftSection={<IconLock size={12} />}
            onClick={onTogglePrivacy}
          >
            {m.shareDetails ? "Sharing details" : "Hiding details"}
          </Button>
        )}
      </Group>
    </Paper>
  );
}

type BodyProps = {
  summary: MemberSummary;
  units: Units | null | undefined;
  showDetails: boolean;
};

function NowBody({
  summary,
  entries,
  units,
  showDetails,
}: BodyProps & { entries: Entry[] }) {
  const { m, latest } = summary;
  const progress = progressFraction(m, latest?.weightKg);
  const trend = trendDirection(entries, 14);

  return (
    <Stack gap="md">
      <Box>
        <Group justify="space-between" align="baseline" mb={8}>
          <Text fz="xs" c="dimmed" fw={500} tt="uppercase" lts="0.06em">
            Toward goal
          </Text>
          <Text fz={18} fw={500} style={{ fontVariantNumeric: "tabular-nums" }}>
            {Math.round(progress * 100)}
            <Text component="span" fz={13} c="dimmed">
              %
            </Text>
          </Text>
        </Group>
        <ProgressBar fraction={progress} />
      </Box>

      {showDetails ? (
        <SimpleGrid cols={2} spacing="sm">
          <Stat
            label="Now"
            value={fmtWeight(latest?.weightKg, units, { unitless: true })}
            suffix={unitSuffix(units)}
          />
          <Stat
            label="Goal"
            value={fmtWeight(m.goalWeightKg, units, { unitless: true })}
            dim
          />
          <Stat
            label="BMI"
            value={calcBMI(latest?.weightKg, m.heightCm)?.toFixed(1)}
          />
          <Stat
            label="14-day"
            value={fmtDelta(trend.deltaKg, units)}
            tone={
              trend.direction === "down"
                ? "good"
                : trend.direction === "up"
                  ? "warn"
                  : null
            }
          />
        </SimpleGrid>
      ) : (
        <Paper bg="var(--mantine-color-default-hover)" p="sm" radius="md">
          <Text fz="sm" fs="italic" c="dimmed">
            Sharing relative progress only.
          </Text>
          <Text fz="xs" c="dimmed" mt={4}>
            {trend.direction === "down"
              ? "Trending downward"
              : trend.direction === "up"
                ? "Trending upward"
                : "Holding steady"}{" "}
            this fortnight.
          </Text>
        </Paper>
      )}
    </Stack>
  );
}

function WeekBody({
  summary,
  ranges,
  units,
  showDetails,
}: BodyProps & { ranges: Ranges }) {
  const { m, weekEntries, weekDelta, weekLowest } = summary;
  const today = window.__fixtures?.today ?? new Date();
  const positive =
    weekDelta != null &&
    m.startWeightKg != null &&
    m.goalWeightKg != null &&
    ((m.startWeightKg > m.goalWeightKg && weekDelta < 0) ||
      (m.startWeightKg < m.goalWeightKg && weekDelta > 0));
  const consistency = weekEntries.length / 7;

  return (
    <Stack gap="md">
      <Group gap={6} wrap="nowrap">
        {Array.from({ length: 7 }).map((_, i) => {
          const day = new Date(+ranges.weekStart + i * 86_400_000);
          const dayKey = day.toISOString().slice(0, 10);
          const has = weekEntries.find((e) => e.date.slice(0, 10) === dayKey);
          const isToday = day.toDateString() === today.toDateString();
          return (
            <Stack key={dayKey} gap={6} align="center" style={{ flex: 1 }}>
              <Box
                title={fmtDate(day)}
                w="100%"
                h={8}
                style={{
                  borderRadius: 999,
                  background: has
                    ? "var(--mantine-primary-color-filled)"
                    : "var(--mantine-color-default-border)",
                  opacity: has ? 1 : isToday ? 0.55 : 0.35,
                  boxShadow:
                    isToday && !has
                      ? "inset 0 0 0 1.5px var(--mantine-primary-color-filled)"
                      : "none",
                }}
              />
              <Text fz={10} c="dimmed" lts="0.04em">
                {day.toLocaleDateString("en-US", { weekday: "narrow" })}
              </Text>
            </Stack>
          );
        })}
      </Group>

      <SimpleGrid cols={showDetails ? 3 : 2} spacing="sm">
        <Stat label="Days" value={`${weekEntries.length}/7`} />
        {showDetails ? (
          <>
            <Stat
              label="Delta"
              value={weekDelta != null ? fmtDelta(weekDelta, units) : "—"}
              tone={
                weekDelta == null
                  ? null
                  : positive
                    ? "good"
                    : Math.abs(weekDelta) < 0.15
                      ? null
                      : "warn"
              }
            />
            <Stat
              label="Lowest"
              value={
                weekLowest != null
                  ? fmtWeight(weekLowest, units, { unitless: true })
                  : "—"
              }
            />
          </>
        ) : (
          <Stat
            label="Direction"
            value={
              weekDelta == null
                ? "—"
                : Math.abs(weekDelta) < 0.15
                  ? "steady"
                  : positive
                    ? "↓ on track"
                    : "↑ slight"
            }
            tone={weekDelta == null ? null : positive ? "good" : null}
          />
        )}
      </SimpleGrid>

      <Encouragement
        copy={weekCopy({ weekEntries, weekDelta, consistency, positive })}
      />
    </Stack>
  );
}

function MonthBody({
  summary,
  ranges,
  units,
  showDetails,
}: BodyProps & { ranges: Ranges }) {
  const { m, monthEntries, monthDelta, monthSwing } = summary;
  const today = window.__fixtures?.today ?? new Date();
  const positive =
    monthDelta != null &&
    m.startWeightKg != null &&
    m.goalWeightKg != null &&
    ((m.startWeightKg > m.goalWeightKg && monthDelta < 0) ||
      (m.startWeightKg < m.goalWeightKg && monthDelta > 0));
  const consistency = monthEntries.length / ranges.daysInMonth;
  const dayKeys = new Set(monthEntries.map((e) => e.date.slice(0, 10)));

  const firstDay = new Date(ranges.monthStart);
  const startOffset = firstDay.getDay();
  const totalCells = Math.ceil((startOffset + ranges.daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }).map((_, idx) => {
    const dayNum = idx - startOffset + 1;
    if (dayNum < 1 || dayNum > ranges.daysInMonth)
      return { empty: true as const };
    const date = new Date(
      ranges.monthStart.getFullYear(),
      ranges.monthStart.getMonth(),
      dayNum,
    );
    const key = date.toISOString().slice(0, 10);
    return {
      empty: false as const,
      date,
      has: dayKeys.has(key),
      isToday: date.toDateString() === today.toDateString(),
      isFuture: +date > +today,
    };
  });

  return (
    <Stack gap="md">
      <Box>
        <SimpleGrid cols={7} spacing={4} mb={6}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <Text key={d} fz={9.5} ta="center" c="dimmed" lts="0.06em">
              {d.charAt(0)}
            </Text>
          ))}
        </SimpleGrid>
        <SimpleGrid cols={7} spacing={4}>
          {cells.map((c, i) => {
            if (c.empty)
              return (
                <Box
                  // biome-ignore lint/suspicious/noArrayIndexKey: empty padding cells have no semantic identity
                  key={`empty-${i}`}
                  style={{ aspectRatio: "1 / 1" }}
                />
              );
            const bg = c.has
              ? "var(--mantine-primary-color-filled)"
              : "var(--mantine-color-default-border)";
            const op = c.has ? 1 : c.isFuture ? 0.18 : c.isToday ? 0.55 : 0.45;
            return (
              <Box
                key={c.date.toISOString()}
                title={fmtDate(c.date)}
                style={{
                  aspectRatio: "1 / 1",
                  borderRadius: 4,
                  background: bg,
                  opacity: op,
                  boxShadow:
                    c.isToday && !c.has
                      ? "inset 0 0 0 1.5px var(--mantine-primary-color-filled)"
                      : "none",
                }}
              />
            );
          })}
        </SimpleGrid>
      </Box>

      <SimpleGrid cols={showDetails ? 3 : 2} spacing="sm">
        <Stat
          label="Days"
          value={`${monthEntries.length}/${ranges.daysInMonth}`}
        />
        {showDetails ? (
          <>
            <Stat
              label="Delta"
              value={monthDelta != null ? fmtDelta(monthDelta, units) : "—"}
              tone={
                monthDelta == null
                  ? null
                  : positive
                    ? "good"
                    : Math.abs(monthDelta) < 0.3
                      ? null
                      : "warn"
              }
            />
            <Stat
              label="Swing"
              value={monthSwing != null ? fmtDelta(monthSwing, units) : "—"}
              dim
            />
          </>
        ) : (
          <Stat
            label="Direction"
            value={
              monthDelta == null
                ? "—"
                : Math.abs(monthDelta) < 0.3
                  ? "steady"
                  : positive
                    ? "↓ on track"
                    : "↑ drifting"
            }
            tone={monthDelta == null ? null : positive ? "good" : null}
          />
        )}
      </SimpleGrid>

      <Encouragement
        copy={monthCopy({
          monthEntries,
          monthDelta,
          consistency,
          positive,
          daysInMonth: ranges.daysInMonth,
        })}
      />
    </Stack>
  );
}

function Encouragement({ copy }: { copy: string }) {
  return (
    <Text
      fs="italic"
      fz="sm"
      lh={1.45}
      pt="md"
      mt="md"
      style={{ borderTop: "1px dashed var(--mantine-color-default-border)" }}
    >
      {copy}
    </Text>
  );
}

type WeekCopyArgs = {
  weekEntries: Entry[];
  weekDelta: number | null;
  consistency: number;
  positive: boolean;
};

function weekCopy({
  weekEntries,
  weekDelta,
  consistency,
  positive,
}: WeekCopyArgs): string {
  if (!weekEntries.length) return "A quiet week. Tomorrow's a clean page.";
  if (!weekDelta)
    return weekEntries.length === 1
      ? "First entry of the week — a beginning."
      : "Holding steady this week.";
  if (Math.abs(weekDelta) < 0.15)
    return "Just about even — the kind of week that builds patience.";
  if (positive)
    return consistency >= 0.85
      ? "Steady, considered, on the move."
      : "Quiet progress in the right direction.";
  return "A small bounce. Most weeks have one.";
}

type MonthCopyArgs = {
  monthEntries: Entry[];
  monthDelta: number | null;
  consistency: number;
  positive: boolean;
  daysInMonth: number;
};

function monthCopy({
  monthEntries,
  monthDelta,
  consistency,
  positive,
}: MonthCopyArgs): string {
  if (!monthEntries.length) return "A quiet month. The page is still open.";
  if (consistency >= 0.9 && positive) return "A patient month — and it shows.";
  if (consistency >= 0.7 && positive)
    return "Steady weighing, slow movement, real progress.";
  if (consistency >= 0.7 && !positive && Math.abs(monthDelta || 0) < 0.5)
    return "Almost flat. Sometimes that's the work.";
  if (consistency < 0.4) return "Light on entries this month — that's allowed.";
  if (positive) return "Trending the right way. The month is what it is.";
  if (monthDelta != null && Math.abs(monthDelta) > 1)
    return "A drift this month. Next page begins on the 1st.";
  return "Holding the line.";
}
