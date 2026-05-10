import {
  Box,
  Button,
  Center,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { isNotEmpty, useForm } from "@mantine/form";
import { useState } from "react";
import type { Member, Sex, Units } from "../../lib/types";
import { Logo } from "../components/Logo";
import { parseFormDate } from "../lib/format";
import { CM_TO_IN, lbToKg } from "../lib/units";

type Step = 0 | 1 | 2;

const STEP_FIELDS: Record<1 | 2, string[]> = {
  1: ["displayName", "units", "height", "age", "sex", "activityLevel"],
  2: ["startWeight", "goalWeight", "targetDate"],
};

const isPositiveNumber =
  (message: string) =>
  (value: unknown): string | null => {
    const num =
      typeof value === "number" ? value : Number.parseFloat(String(value));
    return Number.isFinite(num) && num > 0 ? null : message;
  };

type FirstRunValues = {
  displayName: string;
  units: string;
  height: number | string;
  age: number | string;
  sex: string;
  activityLevel: string;
  startWeight: number | string;
  goalWeight: number | string;
  targetDate: Date | string | null;
};

export type FirstRunProfile = Pick<
  Member,
  | "displayName"
  | "initials"
  | "heightCm"
  | "age"
  | "sex"
  | "activityLevel"
  | "startWeightKg"
  | "goalWeightKg"
  | "targetDate"
  | "units"
>;

export type FirstRunProps = {
  profile?: Member | null;
  onDone: (profile: FirstRunProfile) => Promise<unknown> | unknown;
};

export function FirstRun({ profile, onDone }: FirstRunProps) {
  const [step, setStep] = useState<Step>(0);

  const form = useForm<FirstRunValues>({
    mode: "controlled",
    initialValues: {
      displayName: profile?.displayName ?? "",
      units: profile?.units ?? "",
      height: profile?.heightCm ?? "",
      age: profile?.age ?? "",
      sex: profile?.sex ?? "",
      activityLevel: profile?.activityLevel
        ? String(profile.activityLevel)
        : "",
      startWeight: profile?.startWeightKg ?? "",
      goalWeight: profile?.goalWeightKg ?? "",
      targetDate: profile?.targetDate ? new Date(profile.targetDate) : null,
    },
    validate: {
      displayName: isNotEmpty("Required"),
      units: isNotEmpty("Pick units"),
      height: isPositiveNumber("Required"),
      age: isPositiveNumber("Required"),
      sex: isNotEmpty("Required"),
      activityLevel: isNotEmpty("Required"),
      startWeight: isPositiveNumber("Required"),
      goalWeight: isPositiveNumber("Required"),
      targetDate: (value) => {
        const date = parseFormDate(value);
        return date && !Number.isNaN(date.getTime()) ? null : "Pick a date";
      },
    },
  });

  const usingImperial = form.values.units === "imperial";

  function continueToStep(nextStep: Step): void {
    const fields = STEP_FIELDS[step as 1 | 2];
    if (!fields) {
      setStep(nextStep);
      return;
    }
    const results = fields.map((f) => form.validateField(f));
    if (!results.some((r) => r.hasError)) {
      setStep(nextStep);
    }
  }

  async function handleSubmit(values: FirstRunValues) {
    const heightNum =
      typeof values.height === "number"
        ? values.height
        : Number.parseFloat(values.height);
    const startNum =
      typeof values.startWeight === "number"
        ? values.startWeight
        : Number.parseFloat(values.startWeight);
    const goalNum =
      typeof values.goalWeight === "number"
        ? values.goalWeight
        : Number.parseFloat(values.goalWeight);
    const heightCm = usingImperial ? heightNum / CM_TO_IN : heightNum;
    const startKg = usingImperial ? lbToKg(startNum) : startNum;
    const goalKg = usingImperial ? lbToKg(goalNum) : goalNum;
    const target = parseFormDate(values.targetDate);
    if (!target) {
      form.setFieldError("targetDate", "Pick a date");
      return;
    }
    target.setHours(8, 0, 0, 0);
    try {
      await onDone({
        displayName: values.displayName.trim(),
        initials: values.displayName.trim().slice(0, 2).toUpperCase(),
        heightCm: Math.round(heightCm * 10) / 10,
        age: Number.parseInt(String(values.age), 10),
        sex: values.sex as Sex,
        activityLevel: Number.parseFloat(values.activityLevel),
        startWeightKg: Math.round(startKg * 10) / 10,
        goalWeightKg: Math.round(goalKg * 10) / 10,
        targetDate: target.toISOString(),
        units: values.units as Units,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not save profile.";
      form.setFieldError("targetDate", message);
    }
  }

  return (
    <Center mih="100vh" p="md">
      <Paper shadow="sm" radius="lg" p="xl" maw={520} w="100%" withBorder>
        <Group gap={6} mb="xl" wrap="nowrap">
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              h={3}
              style={{
                flex: 1,
                borderRadius: 999,
                background:
                  i <= step
                    ? "var(--mantine-primary-color-filled)"
                    : "var(--mantine-color-default-border)",
                transition: "background 280ms ease",
              }}
            />
          ))}
        </Group>

        {step === 0 && (
          <Stack gap="lg" align="flex-start">
            <Logo size={56} />
            <Title order={1} fz={38} fw={400} lh={1.1}>
              Welcome.
            </Title>
            <Text c="dimmed" maw={420}>
              A small, calm space for your household to track weight together.
              Add the required fields once, then start logging.
            </Text>
            <Button onClick={() => setStep(1)}>Begin</Button>
          </Stack>
        )}

        {step > 0 && (
          <form onSubmit={form.onSubmit(handleSubmit)}>
            {step === 1 && (
              <Stack gap="lg">
                <Box>
                  <Title order={1} fz={28} fw={400}>
                    About you
                  </Title>
                  <Text c="dimmed" fz="sm" mt={4}>
                    Used only to estimate your derived stats.
                  </Text>
                </Box>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <TextInput
                    label="Display name"
                    placeholder="Display name"
                    {...form.getInputProps("displayName")}
                  />
                  <Select
                    label="Units"
                    placeholder="Select units"
                    data={[
                      { value: "metric", label: "Metric" },
                      { value: "imperial", label: "Imperial" },
                    ]}
                    {...form.getInputProps("units")}
                  />
                  <NumberInput
                    label={usingImperial ? "Height (in)" : "Height (cm)"}
                    min={0}
                    {...form.getInputProps("height")}
                  />
                  <NumberInput
                    label="Age"
                    min={0}
                    allowDecimal={false}
                    {...form.getInputProps("age")}
                  />
                  <Select
                    label="Sex (for estimates)"
                    placeholder="Select"
                    data={[
                      { value: "F", label: "Female" },
                      { value: "M", label: "Male" },
                    ]}
                    {...form.getInputProps("sex")}
                  />
                  <Select
                    label="Activity level"
                    placeholder="Select activity"
                    data={[
                      { value: "1.2", label: "Sedentary" },
                      { value: "1.4", label: "Light" },
                      { value: "1.55", label: "Moderate" },
                      { value: "1.7", label: "Active" },
                      { value: "1.9", label: "Very active" },
                    ]}
                    {...form.getInputProps("activityLevel")}
                  />
                </SimpleGrid>
                <Group justify="space-between" mt="md">
                  <Button
                    variant="subtle"
                    type="button"
                    onClick={() => setStep(0)}
                  >
                    Back
                  </Button>
                  <Button type="button" onClick={() => continueToStep(2)}>
                    Continue
                  </Button>
                </Group>
              </Stack>
            )}

            {step === 2 && (
              <Stack gap="lg">
                <Box>
                  <Title order={1} fz={28} fw={400}>
                    Where you're starting
                  </Title>
                  <Text c="dimmed" fz="sm" mt={4}>
                    These fields are required before the dashboard can calculate
                    progress.
                  </Text>
                </Box>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <NumberInput
                    label={
                      usingImperial
                        ? "Today's weight (lb)"
                        : "Today's weight (kg)"
                    }
                    min={0}
                    step={0.1}
                    decimalScale={1}
                    {...form.getInputProps("startWeight")}
                  />
                  <NumberInput
                    label={
                      usingImperial
                        ? "Target weight (lb)"
                        : "Target weight (kg)"
                    }
                    min={0}
                    step={0.1}
                    decimalScale={1}
                    {...form.getInputProps("goalWeight")}
                  />
                  <DateInput
                    label="Target date"
                    placeholder="Pick a date"
                    clearable
                    {...form.getInputProps("targetDate")}
                  />
                </SimpleGrid>
                <Group justify="space-between" mt="md">
                  <Button
                    variant="subtle"
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={form.submitting}
                  >
                    Back
                  </Button>
                  <Button type="submit" loading={form.submitting}>
                    Begin tracking
                  </Button>
                </Group>
              </Stack>
            )}
          </form>
        )}
      </Paper>
    </Center>
  );
}
