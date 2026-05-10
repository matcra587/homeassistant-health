/**
 * Test render helper. Wraps the component-under-test with the providers it
 * expects in production: MantineProvider for theming + components and
 * DatesProvider for the @mantine/dates components.
 */

import { MantineProvider } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import {
  type RenderOptions,
  type RenderResult,
  render as rtlRender,
} from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";

function Providers({ children }: { children: ReactNode }) {
  return (
    <MantineProvider>
      <DatesProvider settings={{ locale: "en", firstDayOfWeek: 1 }}>
        {children}
      </DatesProvider>
    </MantineProvider>
  );
}

export function render(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
): RenderResult {
  return rtlRender(ui, { wrapper: Providers, ...options });
}

export type Member = {
  id: string;
  displayName: string;
  initials: string;
  heightCm: number | null;
  age: number | null;
  sex: "M" | "F" | null;
  activityLevel: number | null;
  startWeightKg: number | null;
  goalWeightKg: number | null;
  targetDate: string | null;
  units: "metric" | "imperial" | "uk" | null;
  theme: "system" | "light" | "dark";
  shareDetails: boolean;
  reminderTime: string;
  milestoneAlerts: boolean;
  resetGracePeriodDays: number;
  isMe: boolean;
  tone: string;
  profileComplete: boolean;
};

export function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    id: "u1",
    displayName: "Iris",
    initials: "IR",
    heightCm: 168,
    age: 38,
    sex: "F",
    activityLevel: 1.55,
    startWeightKg: 74,
    goalWeightKg: 66,
    targetDate: "2026-12-01T08:00:00.000Z",
    units: "metric",
    theme: "system",
    shareDetails: false,
    reminderTime: "07:30",
    milestoneAlerts: true,
    resetGracePeriodDays: 1,
    isMe: true,
    tone: "iris",
    profileComplete: true,
    ...overrides,
  };
}
