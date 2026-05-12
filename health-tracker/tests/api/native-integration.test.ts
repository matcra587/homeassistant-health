import { expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getJson, haHeaders, patchJson, postJson, url } from "./helpers";

const optionsDir = mkdtempSync(join(tmpdir(), "homeassistant-health-options-"));
const optionsPath = join(optionsDir, "options.json");
Bun.env.HEALTH_TRACKER_OPTIONS_PATH = optionsPath;

async function writeOptions(nativeIntegration: Record<string, unknown>) {
  await Bun.write(
    optionsPath,
    JSON.stringify({ native_integration: nativeIntegration }),
  );
}

async function completeSharedProfile(userId: string): Promise<void> {
  const headers = haHeaders(userId, userId);
  await getJson("/api/bootstrap", headers);
  const profile = await patchJson(
    "/api/members",
    {
      id: userId,
      patch: {
        heightCm: 170,
        age: 30,
        sex: "F",
        activityLevel: 1.4,
        startWeightKg: 75,
        goalWeightKg: 70,
        targetDate: "2026-12-01T08:00:00.000Z",
        units: "metric",
        shareDetails: true,
      },
    },
    headers,
  );
  expect(profile.status).toBe(204);
}

test("GET /api/native/v1/entities returns selected shared entities", async () => {
  const userId = "ha-native-route";
  await writeOptions({
    enabled: true,
    metrics: ["current_weight", "logged_today"],
  });
  await completeSharedProfile(userId);

  const today = new Date();
  today.setHours(7, 30, 0, 0);
  const entry = await postJson(
    "/api/entries",
    {
      id: `${userId}-${today.toISOString().slice(0, 10)}`,
      memberId: userId,
      date: today.toISOString(),
      weightKg: 72.4,
      bodyFatPct: null,
      waistCm: null,
      note: null,
    },
    haHeaders(userId, userId),
  );
  expect(entry.status).toBe(200);

  const res = await fetch(url("/api/native/v1/entities"));
  expect(res.status).toBe(200);
  const payload = await res.json();
  const memberEntities = payload.entities.filter(
    (entity: { memberId: string }) => entity.memberId === userId,
  );

  expect(
    memberEntities.map((entity: { metric: string }) => entity.metric),
  ).toEqual(["current_weight", "logged_today"]);
  expect(
    memberEntities.find(
      (entity: { metric: string }) => entity.metric === "current_weight",
    ).nativeValue,
  ).toBe(72.4);
});

test("GET /api/native/v1/entities enforces optional bearer token", async () => {
  await writeOptions({
    enabled: true,
    token: "test-token",
    metrics: ["current_weight"],
  });

  const rejected = await fetch(url("/api/native/v1/entities"));
  expect(rejected.status).toBe(401);

  const accepted = await fetch(url("/api/native/v1/entities"), {
    headers: { authorization: "Bearer test-token" },
  });
  expect(accepted.status).toBe(200);
});

test("GET /api/native/v1/entities returns 404 when disabled", async () => {
  await writeOptions({ enabled: false, metrics: ["current_weight"] });

  const res = await fetch(url("/api/native/v1/entities"));
  expect(res.status).toBe(404);
});
