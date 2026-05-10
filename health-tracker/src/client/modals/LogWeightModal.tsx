import {
  Accordion,
  Button,
  Group,
  Modal,
  NumberInput,
  SimpleGrid,
  Stack,
  TextInput,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { IconCheck } from "@tabler/icons-react";
import type { Entry, Member, Units } from "../../lib/types";
import { formatLocalDateKey, parseFormDate } from "../lib/format";
import { CM_TO_IN, cmToIn, kgToLb, lbToKg } from "../lib/units";

export type LogWeightModalProps = {
  me: Member;
  units: Units | null | undefined;
  existingEntry?: Partial<Entry> | null;
  onSave: (entry: Entry) => void;
  onClose: () => void;
};

type LogWeightFormValues = {
  weight: number | string;
  date: Date;
  bodyFat: number | string;
  waist: number | string;
  note: string;
};

export function LogWeightModal({
  me,
  units,
  existingEntry,
  onSave,
  onClose,
}: LogWeightModalProps) {
  const today = window.__fixtures?.today ?? new Date();
  const initialDate = existingEntry?.date
    ? new Date(existingEntry.date)
    : new Date(today);
  const initialKg = existingEntry?.weightKg ?? null;
  const initialWeight: number | string =
    initialKg != null
      ? units === "imperial"
        ? Number(kgToLb(initialKg).toFixed(1))
        : Number(initialKg.toFixed(1))
      : "";
  const initialWaist: number | string =
    existingEntry?.waistCm != null
      ? units === "imperial"
        ? Number(cmToIn(existingEntry.waistCm).toFixed(1))
        : existingEntry.waistCm
      : "";
  const isEdit = existingEntry?.weightKg != null;

  const form = useForm<LogWeightFormValues>({
    mode: "controlled",
    initialValues: {
      weight: initialWeight,
      date: initialDate,
      bodyFat: existingEntry?.bodyFatPct ?? "",
      waist: initialWaist,
      note: existingEntry?.note ?? "",
    },
    validate: {
      weight: (value) => {
        const num =
          typeof value === "number" ? value : Number.parseFloat(String(value));
        if (!Number.isFinite(num)) return "Please enter a weight.";
        const kg = units === "imperial" ? lbToKg(num) : num;
        if (kg < 25 || kg > 300) {
          return units === "imperial"
            ? "Should be between 55 and 660 lb."
            : "Should be between 25 and 300 kg.";
        }
        return null;
      },
    },
  });

  function handleSubmit(values: LogWeightFormValues) {
    const num =
      typeof values.weight === "number"
        ? values.weight
        : Number.parseFloat(values.weight);
    const kg = units === "imperial" ? lbToKg(num) : num;
    const waistRaw =
      typeof values.waist === "number"
        ? values.waist
        : Number.parseFloat(values.waist);
    const waistCm = Number.isFinite(waistRaw)
      ? units === "imperial"
        ? waistRaw / CM_TO_IN
        : waistRaw
      : null;
    const bodyFatNum =
      typeof values.bodyFat === "number"
        ? values.bodyFat
        : Number.parseFloat(values.bodyFat);
    const date = parseFormDate(values.date);
    if (!date) return;
    date.setHours(8, 0, 0, 0);
    const dateKey = formatLocalDateKey(date);
    onSave({
      id: existingEntry?.id || `${me.id}-${dateKey}`,
      memberId: me.id,
      date: date.toISOString(),
      weightKg: Math.round(kg * 10) / 10,
      bodyFatPct: Number.isFinite(bodyFatNum) ? bodyFatNum : null,
      waistCm: waistCm != null ? Math.round(waistCm) : null,
      note: values.note || null,
    });
  }

  return (
    <Modal
      opened
      onClose={onClose}
      title={isEdit ? "Edit entry" : "Log entry"}
      centered
      size="lg"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <NumberInput
            label={`Weight (${units === "imperial" ? "lb" : "kg"})`}
            placeholder="—"
            min={0}
            step={0.1}
            decimalScale={1}
            size="xl"
            data-autofocus
            styles={{
              input: {
                fontVariantNumeric: "tabular-nums",
                textAlign: "center",
              },
            }}
            {...form.getInputProps("weight")}
          />

          <DateInput
            label="Date"
            placeholder="Pick a date"
            {...form.getInputProps("date")}
          />

          <Accordion variant="separated" radius="md">
            <Accordion.Item value="optional">
              <Accordion.Control>Optional measurements</Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md">
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    <NumberInput
                      label="Body fat (%)"
                      placeholder="—"
                      min={0}
                      step={0.1}
                      decimalScale={1}
                      {...form.getInputProps("bodyFat")}
                    />
                    <NumberInput
                      label={units === "imperial" ? "Waist (in)" : "Waist (cm)"}
                      placeholder="—"
                      min={0}
                      step={0.1}
                      decimalScale={1}
                      {...form.getInputProps("waist")}
                    />
                  </SimpleGrid>
                  <TextInput
                    label="A small note (optional)"
                    placeholder="Anything to remember about today..."
                    {...form.getInputProps("note")}
                  />
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>

          <Group justify="flex-end" gap="sm" mt="sm">
            <Button variant="subtle" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button type="submit" leftSection={<IconCheck size={16} />}>
              {isEdit ? "Save changes" : "Log entry"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
