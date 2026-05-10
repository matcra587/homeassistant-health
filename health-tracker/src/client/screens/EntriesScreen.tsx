import {
  ActionIcon,
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
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { IconPencil, IconPlus, IconTrash, IconX } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import type { Entry, Member, Units } from "../../lib/types";
import { db } from "../api";
import { fmtDate } from "../lib/format";
import { cmToIn, fmtDelta, fmtWeight } from "../lib/units";

export type EntriesScreenProps = {
  me: Member;
  entries: Entry[];
  units: Units | null | undefined;
  onEdit: (entry: Entry) => void;
  onBackfill: (dateISO?: string) => void;
};

type ViewMode = "list" | "calendar";

export function EntriesScreen({
  me,
  entries,
  units,
  onEdit,
  onBackfill,
}: EntriesScreenProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("list");

  const myEntries = entries
    .filter((e) => e.memberId === me.id)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));

  const groups = useMemo(() => {
    const g: Record<string, Entry[]> = {};
    for (const e of myEntries) {
      const key = new Date(e.date).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      if (!g[key]) g[key] = [];
      g[key].push(e);
    }
    return g;
  }, [myEntries]);

  const calMonths = useMemo(() => {
    if (!myEntries.length) return [];
    const today = window.__fixtures?.today ?? new Date();
    const last = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstEntry = myEntries[myEntries.length - 1];
    if (!firstEntry) return [];
    const firstDate = new Date(firstEntry.date);
    const first = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
    const months: Date[] = [];
    let cur = new Date(last);
    while (+cur >= +first) {
      months.push(new Date(cur));
      cur = new Date(cur.getFullYear(), cur.getMonth() - 1, 1);
    }
    return months;
  }, [myEntries]);

  const entryByDate = useMemo(() => {
    const m: Record<string, Entry> = {};
    for (const e of myEntries) {
      m[e.date.slice(0, 10)] = e;
    }
    return m;
  }, [myEntries]);

  return (
    <Box>
      <Stack gap="md" mb="xl">
        <Group justify="space-between" wrap="wrap" gap="md">
          <Title order={1} fz={{ base: 28, sm: 36 }} fw={500}>
            Entries
          </Title>
          <Button
            variant="default"
            leftSection={<IconPlus size={16} />}
            onClick={() => onBackfill()}
          >
            Backfill a day
          </Button>
        </Group>
        <Text c="dimmed" fz="sm">
          {myEntries.length} entries · backfill any day that's missing.
        </Text>
        <SegmentedControl
          value={view}
          onChange={(value) => setView(value as ViewMode)}
          data={[
            { value: "list", label: "List" },
            { value: "calendar", label: "Calendar" },
          ]}
          maw={240}
        />
      </Stack>

      {view === "list" &&
        Object.entries(groups).map(([month, list]) => (
          <Stack key={month} gap="xs" mb="xl">
            <Text c="dimmed" fz="sm" fw={500} ml={4}>
              {month}
            </Text>
            <Paper withBorder radius="md">
              {list.map((e, i) => {
                const next = list[i + 1];
                const delta = next ? e.weightKg - next.weightKg : null;
                const isOpen = confirmDelete === e.id;
                return (
                  <Box key={e.id}>
                    <Group
                      align="center"
                      justify="space-between"
                      gap="md"
                      px="lg"
                      py="md"
                      wrap="nowrap"
                    >
                      <Box miw={64}>
                        <Title order={3} fz={22} fw={500} lh={1.1}>
                          {new Date(e.date).getDate()}
                        </Title>
                        <Text fz={11} c="dimmed" tt="uppercase" lts="0.06em">
                          {new Date(e.date).toLocaleDateString("en-US", {
                            weekday: "short",
                          })}
                        </Text>
                      </Box>
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Group gap="sm" wrap="wrap" align="baseline">
                          <Text
                            fz={22}
                            fw={500}
                            style={{ fontVariantNumeric: "tabular-nums" }}
                          >
                            {fmtWeight(e.weightKg, units, { unitless: true })}
                            <Text
                              component="span"
                              ff="monospace"
                              fz={13}
                              c="dimmed"
                              ml={4}
                            >
                              {units === "imperial" ? "lb" : "kg"}
                            </Text>
                          </Text>
                          {delta != null && Math.abs(delta) > 0.05 && (
                            <Badge
                              size="sm"
                              variant="light"
                              color={delta < 0 ? "github-green" : "github-red"}
                            >
                              {fmtDelta(delta, units)}
                            </Badge>
                          )}
                          {e.bodyFatPct && (
                            <Badge size="sm" variant="default">
                              {e.bodyFatPct}% bf
                            </Badge>
                          )}
                          {e.waistCm && (
                            <Badge size="sm" variant="default">
                              {units === "imperial"
                                ? `${cmToIn(e.waistCm).toFixed(1)} in waist`
                                : `${e.waistCm} cm waist`}
                            </Badge>
                          )}
                        </Group>
                        {e.note && (
                          <Text fz="sm" c="dimmed" fs="italic" mt={4}>
                            “{e.note}”
                          </Text>
                        )}
                      </Box>
                      <Group gap={4} wrap="nowrap">
                        {!isOpen ? (
                          <>
                            <Tooltip label="Edit entry">
                              <ActionIcon
                                variant="subtle"
                                color="gray"
                                onClick={() => onEdit(e)}
                                aria-label={`Edit entry on ${fmtDate(e.date)}`}
                              >
                                <IconPencil size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Delete entry">
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                onClick={() => setConfirmDelete(e.id)}
                                aria-label={`Delete entry on ${fmtDate(e.date)}`}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </>
                        ) : (
                          <Group gap={4} wrap="nowrap">
                            <Text fz="sm" c="dimmed">
                              delete?
                            </Text>
                            <Button
                              size="compact-sm"
                              color="red"
                              variant="outline"
                              onClick={async () => {
                                await db.deleteEntry(e.id);
                                setConfirmDelete(null);
                              }}
                            >
                              yes, delete
                            </Button>
                            <ActionIcon
                              variant="subtle"
                              color="gray"
                              onClick={() => setConfirmDelete(null)}
                              aria-label="Cancel delete"
                            >
                              <IconX size={16} />
                            </ActionIcon>
                          </Group>
                        )}
                      </Group>
                    </Group>
                    {i < list.length - 1 && <Divider />}
                  </Box>
                );
              })}
            </Paper>
          </Stack>
        ))}

      {view === "calendar" && (
        <Stack gap="xl" maw={460} mx="auto">
          {calMonths.map((monthDate) => {
            const today = window.__fixtures?.today ?? new Date();
            const monthName = monthDate.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            });
            const startOffset = monthDate.getDay();
            const daysInMonth = new Date(
              monthDate.getFullYear(),
              monthDate.getMonth() + 1,
              0,
            ).getDate();
            const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
            const monthEntries = myEntries.filter((e) => {
              const d = new Date(e.date);
              return (
                d.getFullYear() === monthDate.getFullYear() &&
                d.getMonth() === monthDate.getMonth()
              );
            });
            let expectedDays = 0;
            for (let dn = 1; dn <= daysInMonth; dn++) {
              const d = new Date(
                monthDate.getFullYear(),
                monthDate.getMonth(),
                dn,
              );
              if (+d <= +today) expectedDays++;
            }
            const missed = expectedDays - monthEntries.length;
            return (
              <Stack key={monthName} gap="xs">
                <Group justify="space-between" align="baseline" px={4}>
                  <Text c="dimmed" fz="sm" fw={500}>
                    {monthName}
                  </Text>
                  <Text c="dimmed" fz={11}>
                    <Text component="span" ff="monospace">
                      {monthEntries.length}
                    </Text>{" "}
                    logged
                    {missed > 0 && (
                      <>
                        {" · "}
                        <Text component="span" ff="monospace">
                          {missed}
                        </Text>{" "}
                        missed
                      </>
                    )}
                  </Text>
                </Group>
                <Paper withBorder radius="md" p="xs">
                  <SimpleGrid cols={7} spacing={4} mb={6}>
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (d) => (
                        <Text
                          key={d}
                          ta="center"
                          fz={10}
                          c="dimmed"
                          tt="uppercase"
                          lts="0.06em"
                        >
                          {d.charAt(0)}
                        </Text>
                      ),
                    )}
                  </SimpleGrid>
                  <SimpleGrid cols={7} spacing={4}>
                    {Array.from({ length: totalCells }).map((_, idx) => {
                      const dn = idx - startOffset + 1;
                      if (dn < 1 || dn > daysInMonth) {
                        return (
                          <Box
                            // biome-ignore lint/suspicious/noArrayIndexKey: empty padding cells have no semantic identity
                            key={`empty-${monthName}-${idx}`}
                          />
                        );
                      }
                      const date = new Date(
                        monthDate.getFullYear(),
                        monthDate.getMonth(),
                        dn,
                      );
                      const dateKey = `${date.getFullYear()}-${String(
                        date.getMonth() + 1,
                      ).padStart(2, "0")}-${String(dn).padStart(2, "0")}`;
                      const entry = entryByDate[dateKey];
                      const isToday =
                        date.toDateString() === today.toDateString();
                      const isFuture = +date > +today;
                      const logged = !!entry;
                      const display = entry
                        ? fmtWeight(entry.weightKg, units, { unitless: true })
                        : null;
                      return (
                        <UnstyledButton
                          key={`day-${dn}`}
                          disabled={isFuture}
                          onClick={() => {
                            if (isFuture) return;
                            if (entry) onEdit(entry);
                            else onBackfill(date.toISOString());
                          }}
                          title={
                            entry
                              ? `Edit ${fmtDate(date)}`
                              : isFuture
                                ? ""
                                : `Log ${fmtDate(date)}`
                          }
                          style={{
                            aspectRatio: "1 / 1",
                            border: isToday
                              ? "1.5px solid var(--mantine-primary-color-filled)"
                              : "1px solid var(--mantine-color-default-border)",
                            background: logged
                              ? "var(--mantine-color-github-blue-light)"
                              : "transparent",
                            color: logged
                              ? "var(--mantine-color-github-blue-light-color)"
                              : "var(--mantine-color-dimmed)",
                            opacity: isFuture ? 0.4 : 1,
                            borderRadius: 6,
                            padding: 2,
                            cursor: isFuture ? "default" : "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 1,
                            transition: "background 140ms ease",
                          }}
                        >
                          <Text
                            fz={11}
                            fw={logged ? 500 : 400}
                            lh={1}
                            style={{ fontVariantNumeric: "tabular-nums" }}
                          >
                            {dn}
                          </Text>
                          {display && (
                            <Text
                              ff="monospace"
                              fz={8.5}
                              lh={1}
                              opacity={0.85}
                              style={{ fontVariantNumeric: "tabular-nums" }}
                            >
                              {display}
                            </Text>
                          )}
                        </UnstyledButton>
                      );
                    })}
                  </SimpleGrid>
                </Paper>
              </Stack>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
