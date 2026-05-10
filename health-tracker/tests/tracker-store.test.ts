import { expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Entry, Member } from "../src/server/tracker-store";

const dbDir = mkdtempSync(join(tmpdir(), "homeassistant-health-"));
Bun.env.HEALTH_TRACKER_DB_PATH = join(dbDir, "health.db");

const store = await import("../src/server/tracker-store");

function haHeaders(id: string, displayName: string): Headers {
  return new Headers({
    "x-ha-user-display-name": displayName,
    "x-ha-user-id": id,
  });
}

function member(overrides: Partial<Member> = {}): Member {
  return {
    id: "m_test_member",
    displayName: "Casey",
    initials: "CA",
    heightCm: 172,
    age: 32,
    sex: "F",
    activityLevel: 1.4,
    startWeightKg: 74,
    goalWeightKg: 68,
    targetDate: "2026-10-01T07:30:00.000Z",
    units: "metric",
    shareDetails: false,
    reminderTime: "08:00",
    milestoneAlerts: true,
    resetGracePeriodDays: 1,
    isMe: false,
    tone: "sam",
    ...overrides,
  };
}

function entry(overrides: Partial<Entry> = {}): Entry {
  const memberId = overrides.memberId ?? "ha-user-1";
  return {
    id: `${memberId}-2026-01-01`,
    memberId,
    date: "2026-01-01T07:30:00.000Z",
    weightKg: 72.4,
    bodyFatPct: null,
    waistCm: null,
    note: null,
    ...overrides,
  };
}

test("bootstraps a Home Assistant user without demo household seed data", () => {
  const payload = store.bootstrap(haHeaders("ha-user-1", "Ada Lovelace"));

  expect(payload.household.name).toBe("Home Assistant");
  expect(payload.entries).toHaveLength(0);
  expect(payload.members).toHaveLength(1);
  expect(payload.members[0]?.id).toBe("ha-user-1");
  expect(payload.members[0]?.displayName).toBe("Ada Lovelace");
  expect(payload.members[0]?.isMe).toBe(true);
});

test("rejects members without required weights", async () => {
  const invalidMember = member({
    id: "m_member_without_start",
    startWeightKg: Number.NaN,
  });

  try {
    store.saveMember(
      haHeaders("ha-user-validation", "Validation User"),
      invalidMember,
    );
    throw new Error("Expected saveMember to reject missing start weight");
  } catch (error) {
    expect(error).toBeInstanceOf(Response);
    expect((error as Response).status).toBe(422);
    expect(await (error as Response).text()).toContain("Starting weight");
  }
});

test("scopes Home Assistant writes to the signed-in user", async () => {
  const ownerHeaders = haHeaders("ha-owner", "Owner User");
  const otherHeaders = haHeaders("ha-other", "Other User");

  store.bootstrap(ownerHeaders);
  store.bootstrap(otherHeaders);
  store.saveEntry(ownerHeaders, entry({ memberId: "ha-owner" }));

  try {
    store.saveEntry(
      otherHeaders,
      entry({
        id: "ha-owner-spoofed-entry",
        memberId: "ha-owner",
        weightKg: 71.9,
      }),
    );
    throw new Error("Expected saveEntry to reject another user's member");
  } catch (error) {
    expect(error).toBeInstanceOf(Response);
    expect((error as Response).status).toBe(403);
  }

  const otherPayload = store.bootstrap(otherHeaders);
  expect(
    otherPayload.entries.some((item) => item.memberId === "ha-owner"),
  ).toBe(false);
  expect(store.csvExport(otherHeaders)).not.toContain("Owner User");
});

test("allows Home Assistant users to manage their own household members", () => {
  const ownerHeaders = haHeaders("ha-household-owner", "Household Owner");
  const childMember = member({
    id: "m_owned_child",
    displayName: "Owned Child",
    initials: "OC",
  });

  store.bootstrap(ownerHeaders);
  store.saveMember(ownerHeaders, childMember);
  store.saveEntry(
    ownerHeaders,
    entry({
      id: "m_owned_child-2026-01-02",
      memberId: "m_owned_child",
      date: "2026-01-02T07:30:00.000Z",
    }),
  );

  const payload = store.bootstrap(ownerHeaders);
  expect(payload.members.some((item) => item.id === "m_owned_child")).toBe(
    true,
  );
  expect(
    payload.entries.some((item) => item.memberId === "m_owned_child"),
  ).toBe(true);
});
