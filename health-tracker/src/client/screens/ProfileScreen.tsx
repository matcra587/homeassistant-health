import {
  Box,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { DateInput, TimeInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { type ReactNode, useState } from "react";
import type { Member, Sex, Theme, Units } from "../../lib/types";
import { parseFormDate } from "../lib/format";
import { CM_TO_IN, cmToIn, kgToLb, lbToKg } from "../lib/units";

export type ProfileScreenProps = {
  me: Member;
  units: Units | null | undefined;
  theme: Theme;
  onUpdate: (patch: Partial<Member>) => void;
  onUnits: (value: Units) => void;
  onTheme: (value: Theme) => void;
};

export function ProfileScreen({
  me,
  units,
  theme,
  onUpdate,
  onUnits,
  onTheme,
}: ProfileScreenProps) {
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // useForm holds the displayed form state; auto-save patches the parent
  // through `update()` whenever a field changes.
  const form = useForm<Member>({
    mode: "controlled",
    initialValues: { ...me },
  });

  function update(patch: Partial<Member>): void {
    form.setValues((prev) => ({ ...prev, ...patch }));
    onUpdate(patch);
    setSavedAt(Date.now());
  }

  function updateUnits(value: string | null): void {
    if (!value) return;
    const next = value as Units;
    onUnits(next);
    update({ units: next });
  }

  function updateTheme(value: string | null): void {
    if (!value) return;
    const next = value as Theme;
    onTheme(next);
    update({ theme: next });
  }

  const goalKgRaw = form.values.goalWeightKg ?? 0;
  const heightCmRaw = form.values.heightCm ?? 0;
  const goalKgDisplay = units === "imperial" ? kgToLb(goalKgRaw) : goalKgRaw;
  const heightDisplay =
    units === "imperial" ? cmToIn(heightCmRaw) : heightCmRaw;
  const targetDateValue = form.values.targetDate
    ? new Date(form.values.targetDate)
    : null;

  return (
    <Box>
      <Box mb="xl">
        <Title order={1} fz={{ base: 28, sm: 36 }} fw={500}>
          Profile &amp; settings
        </Title>
        <Group gap={8} mt={4}>
          <Text c="dimmed" fz="sm">
            Change anything below. It saves as you go.
          </Text>
          {savedAt && (
            <Text c="github-green.5" fz="sm">
              · saved
            </Text>
          )}
        </Group>
      </Box>

      <ProfileSection
        title="You"
        subtitle="Used to estimate your derived stats."
      >
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          <TextInput
            label="Display name"
            value={form.values.displayName ?? ""}
            onChange={(e) => {
              const value = e.currentTarget.value;
              update({
                displayName: value,
                initials: value.slice(0, 2).toUpperCase(),
              });
            }}
          />
          <NumberInput
            label={units === "imperial" ? "Height (in)" : "Height (cm)"}
            min={0}
            allowDecimal={false}
            value={Math.round(heightDisplay) || ""}
            onChange={(value) => {
              const num =
                typeof value === "number" ? value : Number.parseFloat(value);
              if (!Number.isFinite(num)) return;
              update({
                heightCm:
                  units === "imperial" ? Math.round(num / CM_TO_IN) : num,
              });
            }}
          />
          <NumberInput
            label="Age"
            min={0}
            allowDecimal={false}
            value={form.values.age ?? ""}
            onChange={(value) => {
              const num =
                typeof value === "number" ? value : Number.parseInt(value, 10);
              if (!Number.isFinite(num)) return;
              update({ age: num });
            }}
          />
          <Select
            label="Sex (for estimates)"
            value={form.values.sex}
            onChange={(value) => value && update({ sex: value as Sex })}
            data={[
              { value: "F", label: "Female" },
              { value: "M", label: "Male" },
            ]}
          />
          <Select
            label="Activity level"
            value={String(form.values.activityLevel)}
            onChange={(value) =>
              value && update({ activityLevel: Number.parseFloat(value) })
            }
            data={[
              { value: "1.2", label: "Sedentary" },
              { value: "1.4", label: "Light (1–3 days/wk)" },
              { value: "1.55", label: "Moderate (3–5 days/wk)" },
              { value: "1.7", label: "Active (6–7 days/wk)" },
              { value: "1.9", label: "Very active" },
            ]}
          />
        </SimpleGrid>
      </ProfileSection>

      <ProfileSection title="Goal" subtitle="Where you're headed, and by when.">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <NumberInput
            label={
              units === "imperial" ? "Target weight (lb)" : "Target weight (kg)"
            }
            min={0}
            step={0.1}
            decimalScale={1}
            value={Number(goalKgDisplay.toFixed(1)) || ""}
            onChange={(value) => {
              const num =
                typeof value === "number" ? value : Number.parseFloat(value);
              if (!Number.isFinite(num)) return;
              update({
                goalWeightKg: units === "imperial" ? lbToKg(num) : num,
              });
            }}
          />
          <DateInput
            label="Target date"
            placeholder="Pick a date"
            value={targetDateValue}
            onChange={(value) => {
              const date = parseFormDate(value);
              if (!date) return;
              date.setHours(8, 0, 0, 0);
              update({ targetDate: date.toISOString() });
            }}
          />
        </SimpleGrid>
      </ProfileSection>

      <ProfileSection title="Preferences">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          <Select
            label="Units"
            value={units}
            onChange={updateUnits}
            data={[
              { value: "metric", label: "Metric (kg, cm)" },
              { value: "imperial", label: "Imperial (lb, in)" },
            ]}
          />
          <Select
            label="Theme"
            value={theme}
            onChange={updateTheme}
            data={[
              { value: "system", label: "System" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
          <TimeInput
            label="Daily reminder"
            value={form.values.reminderTime ?? ""}
            onChange={(e) => update({ reminderTime: e.currentTarget.value })}
          />
          <Select
            label="Streak grace (days)"
            description="Miss this many days and your streak resets."
            value={String(form.values.resetGracePeriodDays)}
            onChange={(value) =>
              value &&
              update({ resetGracePeriodDays: Number.parseInt(value, 10) })
            }
            data={[
              { value: "0", label: "None — strict" },
              { value: "1", label: "1 day" },
              { value: "2", label: "2 days" },
              { value: "3", label: "3 days" },
            ]}
          />
        </SimpleGrid>
        <Stack gap="md" mt="lg">
          <Switch
            label="Share exact numbers in Household"
            description="Off keeps your weight, BMI and goal hidden. Streak and trend are always visible."
            checked={!!form.values.shareDetails}
            onChange={(e) => update({ shareDetails: e.currentTarget.checked })}
          />
          <Switch
            label="Milestone alerts"
            description="A small celebration when you hit goal, halfway, or a 30-day streak."
            checked={!!form.values.milestoneAlerts}
            onChange={(e) =>
              update({ milestoneAlerts: e.currentTarget.checked })
            }
          />
        </Stack>
      </ProfileSection>
    </Box>
  );
}

type ProfileSectionProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

function ProfileSection({ title, subtitle, children }: ProfileSectionProps) {
  return (
    <Stack gap="sm" mb="xl">
      <Box>
        <Title order={2} fz={22} fw={500}>
          {title}
        </Title>
        {subtitle && (
          <Text c="dimmed" fz="sm" mt={4}>
            {subtitle}
          </Text>
        )}
      </Box>
      <Paper withBorder radius="md" p="lg">
        {children}
      </Paper>
    </Stack>
  );
}
