import { expect, test } from "bun:test";
import type { Entry, Household, Member } from "../src/lib/types";
import { buildNativeIntegrationPayload } from "../src/server/native-integration";
import type { NativeIntegrationOptions } from "../src/server/native-integration-options";

const household: Household = {
  id: "h1",
  name: "Home Assistant",
  createdAt: "2026-01-01T00:00:00.000Z",
  locale: "en-US",
};

const member: Member = {
  id: "member-1",
  displayName: "Casey",
  initials: "CA",
  heightCm: 172,
  age: 32,
  sex: "F",
  activityLevel: 1.4,
  startWeightKg: 75,
  goalWeightKg: 70,
  targetDate: "2026-12-01T08:00:00.000Z",
  units: "metric",
  theme: "system",
  shareDetails: true,
  reminderTime: "08:00",
  milestoneAlerts: true,
  resetGracePeriodDays: 1,
  isMe: false,
  tone: "sam",
  profileComplete: true,
};

const entries: Entry[] = [
  {
    id: "member-1-2026-05-11",
    memberId: "member-1",
    date: "2026-05-11T07:30:00.000Z",
    weightKg: 72.4,
    bodyFatPct: null,
    waistCm: null,
    note: null,
  },
  {
    id: "member-1-2026-05-10",
    memberId: "member-1",
    date: "2026-05-10T07:30:00.000Z",
    weightKg: 72.8,
    bodyFatPct: null,
    waistCm: null,
    note: null,
  },
];

test("native integration payload creates configured baseline entities", () => {
  const options: NativeIntegrationOptions = {
    enabled: true,
    token: "",
    metrics: ["current_weight", "logged_today"],
  };
  const payload = buildNativeIntegrationPayload(
    {
      household,
      members: [member],
      entries,
      today: "2026-05-11T07:30:00.000Z",
    },
    options,
  );

  expect(payload.version).toBe(1);
  expect(payload.entities).toHaveLength(2);
  expect(payload.entities.map((entity) => entity.metric)).toEqual([
    "current_weight",
    "logged_today",
  ]);
  expect(payload.entities[0]).toMatchObject({
    component: "sensor",
    name: "Current weight",
    nativeValue: 72.4,
    unitOfMeasurement: "kg",
    deviceClass: "weight",
  });
  expect(payload.entities[1]).toMatchObject({
    component: "binary_sensor",
    name: "Logged today",
    nativeValue: true,
  });
});
