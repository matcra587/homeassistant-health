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
    profileComplete: true,
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

function completeProfile(headers: Headers, id: string): void {
  store.updateMember(headers, id, {
    activityLevel: 1.4,
    age: 32,
    goalWeightKg: 68,
    heightCm: 172,
    sex: "F",
    startWeightKg: 74,
    targetDate: "2026-10-01T07:30:00.000Z",
    units: "metric",
  });
}

test("bootstraps a Home Assistant user without demo household seed data", () => {
  const payload = store.bootstrap(haHeaders("ha-user-1", "Ada Lovelace"));

  expect(payload.household.name).toBe("Home Assistant");
  expect(payload.entries).toHaveLength(0);
  expect(payload.members).toHaveLength(1);
  expect(payload.members[0]?.id).toBe("ha-user-1");
  expect(payload.members[0]?.displayName).toBe("Ada Lovelace");
  expect(payload.members[0]?.isMe).toBe(true);
  expect(payload.members[0]?.profileComplete).toBe(false);
  expect(payload.members[0]?.heightCm).toBeNull();
  expect(payload.members[0]?.startWeightKg).toBeNull();
});

test("uses a single development user when ingress headers are missing outside production", () => {
  const originalNodeEnv = Bun.env.NODE_ENV;
  Bun.env.NODE_ENV = "development";

  try {
    const payload = store.bootstrap(new Headers());

    expect(payload.members.some((item) => item.id === "dev-user-001")).toBe(
      true,
    );
    expect(payload.members.some((item) => item.id === "m2")).toBe(false);
    expect(payload.members.some((item) => item.id === "m3")).toBe(false);
    expect(payload.members.some((item) => item.id === "m4")).toBe(false);
    expect(payload.members[0]?.profileComplete).toBe(false);
  } finally {
    Bun.env.NODE_ENV = originalNodeEnv;
  }
});

test("marks a profile complete after required fields are saved", () => {
  const headers = haHeaders("ha-complete", "Complete User");

  store.bootstrap(headers);
  completeProfile(headers, "ha-complete");

  const payload = store.bootstrap(headers);
  const completed = payload.members.find((item) => item.id === "ha-complete");
  expect(completed?.profileComplete).toBe(true);
  expect(completed?.heightCm).toBe(172);
  expect(completed?.startWeightKg).toBe(74);
});

test("rejects entries until the member profile is complete", async () => {
  const headers = haHeaders("ha-incomplete-entry", "Incomplete Entry User");

  store.bootstrap(headers);

  try {
    store.saveEntry(headers, entry({ memberId: "ha-incomplete-entry" }));
    throw new Error("Expected saveEntry to reject an incomplete profile");
  } catch (error) {
    expect(error).toBeInstanceOf(Response);
    expect((error as Response).status).toBe(422);
    expect(await (error as Response).text()).toContain(
      "Member profile is incomplete",
    );
  }
});

test("rejects missing ingress headers in production", async () => {
  const originalNodeEnv = Bun.env.NODE_ENV;
  Bun.env.NODE_ENV = "production";

  try {
    store.bootstrap(new Headers());
    throw new Error("Expected bootstrap to reject missing ingress headers");
  } catch (error) {
    expect(error).toBeInstanceOf(Response);
    expect((error as Response).status).toBe(401);
    expect(await (error as Response).text()).toContain(
      "Home Assistant ingress user is required",
    );
  } finally {
    Bun.env.NODE_ENV = originalNodeEnv;
  }
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
  completeProfile(ownerHeaders, "ha-owner");
  completeProfile(otherHeaders, "ha-other");
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
