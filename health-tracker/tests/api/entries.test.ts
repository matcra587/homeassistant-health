import { expect, test } from "bun:test";
import { deleteJson, getJson, haHeaders, patchJson, postJson } from "./helpers";

async function completeProfile(userId: string): Promise<void> {
  await getJson("/api/bootstrap", haHeaders(userId, userId));
  const res = await patchJson(
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
      },
    },
    haHeaders(userId, userId),
  );
  expect(res.status).toBe(204);
}

test("logs an entry and reads it back via bootstrap", async () => {
  const userId = "ha-entries-happy";
  await completeProfile(userId);

  const entry = {
    id: `${userId}-2026-05-10`,
    memberId: userId,
    date: "2026-05-10T08:00:00.000Z",
    weightKg: 72.4,
    bodyFatPct: null,
    waistCm: null,
    note: "test entry",
  };
  const post = await postJson("/api/entries", entry, haHeaders(userId, userId));
  expect(post.status).toBe(200);

  const bootstrap = await (
    await getJson("/api/bootstrap", haHeaders(userId, userId))
  ).json();
  const stored = bootstrap.entries.find(
    (e: { id: string }) => e.id === entry.id,
  );
  expect(stored).toBeDefined();
  expect(stored.weightKg).toBe(72.4);
  expect(stored.note).toBe("test entry");
});

test("rejects an out-of-range weight at the schema boundary with 422", async () => {
  const userId = "ha-entries-invalid";
  await completeProfile(userId);

  const res = await postJson(
    "/api/entries",
    {
      id: `${userId}-2026-05-10`,
      memberId: userId,
      date: "2026-05-10T08:00:00.000Z",
      weightKg: 999,
      bodyFatPct: null,
      waistCm: null,
      note: null,
    },
    haHeaders(userId, userId),
  );
  expect(res.status).toBe(422);
  expect(await res.text()).toContain("weightKg");
});

test("rejects malformed JSON body with 400", async () => {
  const userId = "ha-entries-badjson";
  await completeProfile(userId);

  const res = await fetch(
    `${(await import("./helpers")).baseUrl}/api/entries`,
    {
      method: "POST",
      headers: haHeaders(userId, userId),
      body: "{not json",
    },
  );
  expect(res.status).toBe(400);
});

test("deletes an entry and bootstrap stops returning it", async () => {
  const userId = "ha-entries-delete";
  await completeProfile(userId);

  const id = `${userId}-2026-05-09`;
  await postJson(
    "/api/entries",
    {
      id,
      memberId: userId,
      date: "2026-05-09T08:00:00.000Z",
      weightKg: 71,
      bodyFatPct: null,
      waistCm: null,
      note: null,
    },
    haHeaders(userId, userId),
  );

  const del = await deleteJson(
    "/api/entries",
    { id },
    haHeaders(userId, userId),
  );
  expect(del.status).toBe(204);

  const bootstrap = await (
    await getJson("/api/bootstrap", haHeaders(userId, userId))
  ).json();
  expect(
    bootstrap.entries.find((e: { id: string }) => e.id === id),
  ).toBeUndefined();
});

test("ingress users do not see another user's entries", async () => {
  const owner = "ha-entries-owner";
  const intruder = "ha-entries-intruder";
  await completeProfile(owner);
  await completeProfile(intruder);

  const ownerEntry = {
    id: `${owner}-2026-05-08`,
    memberId: owner,
    date: "2026-05-08T08:00:00.000Z",
    weightKg: 70,
    bodyFatPct: null,
    waistCm: null,
    note: "private",
  };
  await postJson("/api/entries", ownerEntry, haHeaders(owner, owner));

  const intruderBootstrap = await (
    await getJson("/api/bootstrap", haHeaders(intruder, intruder))
  ).json();
  expect(
    intruderBootstrap.entries.find(
      (e: { id: string }) => e.id === ownerEntry.id,
    ),
  ).toBeUndefined();
});
