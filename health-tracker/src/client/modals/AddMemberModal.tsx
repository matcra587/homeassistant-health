import {
  Box,
  Button,
  ColorSwatch,
  Group,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { isNotEmpty, useForm } from "@mantine/form";
import { IconCheck } from "@tabler/icons-react";
import { useState } from "react";
import type { Member, Sex, Units } from "../../lib/types";
import { parseFormDate } from "../lib/format";
import { CM_TO_IN, lbToKg } from "../lib/units";

const AVATAR_COLORS = [
  "oklch(72% 0.10 80)", // amber
  "oklch(70% 0.09 25)", // terracotta
  "oklch(70% 0.08 145)", // sage
  "oklch(70% 0.10 230)", // blue
  "oklch(72% 0.10 305)", // violet
  "oklch(74% 0.06 60)", // sand
] as const;

const STEP_FIELDS: Record<0 | 1, string[]> = {
  0: ["displayName", "units", "heightCm", "age", "sex", "activityLevel"],
  1: ["startWeightKg", "goalWeightKg", "targetDate"],
};

const isPositiveNumber =
  (message: string) =>
  (value: unknown): string | null => {
    const num =
      typeof value === "number" ? value : Number.parseFloat(String(value));
    return Number.isFinite(num) && num > 0 ? null : message;
  };

type AddMemberFormValues = {
  displayName: string;
  sex: string;
  age: number | string;
  units: string;
  heightCm: number | string;
  activityLevel: string;
  startWeightKg: number | string;
  goalWeightKg: number | string;
  targetDate: Date | string | null;
  colorIdx: number;
  shareDetails: boolean;
};

export type AddMemberModalProps = {
  onAdd: (profile: Partial<Member>) => Promise<unknown> | unknown;
  onClose: () => void;
};

export function AddMemberModal({ onAdd, onClose }: AddMemberModalProps) {
  const [step, setStep] = useState<0 | 1>(0);

  const form = useForm<AddMemberFormValues>({
    mode: "controlled",
    initialValues: {
      displayName: "",
      sex: "",
      age: "",
      units: "",
      heightCm: "",
      activityLevel: "",
      startWeightKg: "",
      goalWeightKg: "",
      targetDate: null,
      colorIdx: 2,
      shareDetails: false,
    },
    validate: {
      displayName: isNotEmpty("Please enter a name"),
      units: isNotEmpty("Pick units"),
      sex: isNotEmpty("Pick sex"),
      activityLevel: isNotEmpty("Pick activity level"),
      heightCm: (value, values) => {
        const num =
          typeof value === "number" ? value : Number.parseFloat(String(value));
        if (!Number.isFinite(num)) return "Required";
        const minHeight = values.units === "imperial" ? 36 : 90;
        return num < minHeight ? "Please enter a sensible height" : null;
      },
      age: (value) => {
        const num =
          typeof value === "number" ? value : Number.parseFloat(String(value));
        if (!Number.isFinite(num)) return "Required";
        return num < 5 || num > 110 ? "Please enter a sensible age" : null;
      },
      startWeightKg: isPositiveNumber("Required"),
      goalWeightKg: isPositiveNumber("Required"),
      targetDate: (value) => {
        const date = parseFormDate(value);
        return date && !Number.isNaN(date.getTime())
          ? null
          : "Pick a target date";
      },
    },
  });

  const v = form.values;

  function continueToStep(nextStep: 0 | 1): void {
    const fields = STEP_FIELDS[step];
    const results = fields.map((f) => form.validateField(f));
    if (!results.some((r) => r.hasError)) {
      setStep(nextStep);
    }
  }

  async function handleSubmit(values: AddMemberFormValues) {
    const heightNum =
      typeof values.heightCm === "number"
        ? values.heightCm
        : Number.parseFloat(values.heightCm);
    const startNum =
      typeof values.startWeightKg === "number"
        ? values.startWeightKg
        : Number.parseFloat(values.startWeightKg);
    const goalNum =
      typeof values.goalWeightKg === "number"
        ? values.goalWeightKg
        : Number.parseFloat(values.goalWeightKg);
    const heightCm =
      values.units === "imperial" ? heightNum / CM_TO_IN : heightNum;
    const startKg = values.units === "imperial" ? lbToKg(startNum) : startNum;
    const goalKg = values.units === "imperial" ? lbToKg(goalNum) : goalNum;
    const target = parseFormDate(values.targetDate);
    if (!target) {
      form.setFieldError("targetDate", "Pick a target date");
      return;
    }
    target.setHours(8, 0, 0, 0);
    try {
      await onAdd({
        displayName: values.displayName.trim(),
        initials: values.displayName.trim().slice(0, 2).toUpperCase(),
        sex: values.sex as Sex,
        age: Number.parseInt(String(values.age), 10),
        heightCm: Math.round(heightCm * 10) / 10,
        activityLevel: Number.parseFloat(values.activityLevel),
        startWeightKg: Math.round(startKg * 10) / 10,
        goalWeightKg: Math.round(goalKg * 10) / 10,
        targetDate: target.toISOString(),
        shareDetails: values.shareDetails,
        units: values.units as Units,
      });
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Could not add member.";
      form.setFieldError("targetDate", message);
    }
  }

  const palette = [0, 1, 2, 3, 4, 5];

  return (
    <Modal
      opened
      onClose={onClose}
      centered
      size="lg"
      title="New household member"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        {step === 0 && (
          <Stack gap="md">
            <TextInput
              label="Display name"
              placeholder="Casey"
              data-autofocus
              {...form.getInputProps("displayName")}
            />
            <Box>
              <Text fz="sm" fw={500} mb={6}>
                Avatar tint
              </Text>
              <Group gap="sm">
                {palette.map((i) => (
                  <UnstyledButton
                    key={i}
                    type="button"
                    aria-label={`Tint ${i + 1}`}
                    aria-pressed={v.colorIdx === i}
                    onClick={() => form.setFieldValue("colorIdx", i)}
                    style={{ borderRadius: 9999 }}
                  >
                    <ColorSwatch
                      color={AVATAR_COLORS[i] ?? AVATAR_COLORS[0]}
                      size={36}
                      withShadow={false}
                      style={{
                        cursor: "pointer",
                        outline:
                          v.colorIdx === i
                            ? "2px solid var(--mantine-color-text)"
                            : "2px solid transparent",
                        outlineOffset: 2,
                      }}
                    />
                  </UnstyledButton>
                ))}
              </Group>
            </Box>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
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
            </SimpleGrid>
            <Select
              label="Units"
              placeholder="Select units"
              data={[
                { value: "metric", label: "Metric (kg, cm)" },
                { value: "imperial", label: "Imperial (lb, in)" },
              ]}
              {...form.getInputProps("units")}
            />
            <NumberInput
              label={v.units === "imperial" ? "Height (in)" : "Height (cm)"}
              min={0}
              step={0.1}
              decimalScale={1}
              {...form.getInputProps("heightCm")}
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
            <Group justify="space-between" mt="sm">
              <Button variant="subtle" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" onClick={() => continueToStep(1)}>
                Continue
              </Button>
            </Group>
          </Stack>
        )}

        {step === 1 && (
          <Stack gap="md">
            <Text c="dimmed" fz="sm">
              Add a starting point and target so progress cards have real
              context.
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <NumberInput
                label={
                  v.units === "imperial"
                    ? "Today's weight (lb)"
                    : "Today's weight (kg)"
                }
                placeholder="—"
                min={0}
                step={0.1}
                decimalScale={1}
                {...form.getInputProps("startWeightKg")}
              />
              <NumberInput
                label={
                  v.units === "imperial"
                    ? "Target weight (lb)"
                    : "Target weight (kg)"
                }
                placeholder="—"
                min={0}
                step={0.1}
                decimalScale={1}
                {...form.getInputProps("goalWeightKg")}
              />
              <DateInput
                label="Target date"
                placeholder="Pick a date"
                clearable
                {...form.getInputProps("targetDate")}
              />
            </SimpleGrid>
            <Switch
              label="Share exact numbers in Household"
              description="Off by default. Each member can change this themselves later."
              {...form.getInputProps("shareDetails", { type: "checkbox" })}
            />
            <Group justify="space-between" mt="sm">
              <Button
                variant="subtle"
                type="button"
                onClick={() => setStep(0)}
                disabled={form.submitting}
              >
                Back
              </Button>
              <Button
                type="submit"
                loading={form.submitting}
                leftSection={<IconCheck size={16} />}
              >
                Add to household
              </Button>
            </Group>
          </Stack>
        )}
      </form>
    </Modal>
  );
}
