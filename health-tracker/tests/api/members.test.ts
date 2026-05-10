import { expect, test } from "bun:test";
import { deleteJson, getJson, haHeaders, patchJson } from "./helpers";

test("PATCH /api/members updates the profile and bootstrap reflects it", async () => {
  const userId = "ha-members-patch";
  const headers = haHeaders(userId, "Iris");
  await getJson("/api/bootstrap", headers);

  const res = await patchJson(
    "/api/members",
    {
      id: userId,
      patch: {
        heightCm: 168,
        age: 38,
        sex: "F",
        activityLevel: 1.55,
        startWeightKg: 74,
        goalWeightKg: 66,
        targetDate: "2026-12-01T08:00:00.000Z",
        units: "metric",
      },
    },
    headers,
  );
  expect(res.status).toBe(204);

  const bootstrap = await (await getJson("/api/bootstrap", headers)).json();
  const me = bootstrap.members.find((m: { id: string }) => m.id === userId);
  expect(me).toBeDefined();
  expect(me.heightCm).toBe(168);
  expect(me.age).toBe(38);
  expect(me.profileComplete).toBe(true);
});

test("PATCH rejects an out-of-range height at the schema boundary", async () => {
  const userId = "ha-members-invalid";
  const headers = haHeaders(userId, "Bad Height");
  await getJson("/api/bootstrap", headers);

  const res = await patchJson(
    "/api/members",
    { id: userId, patch: { heightCm: 999 } },
    headers,
  );
  expect(res.status).toBe(422);
  expect(await res.text()).toContain("heightCm");
});

test("DELETE /api/members refuses to delete another user's record", async () => {
  const owner = "ha-members-owner";
  const intruder = "ha-members-intruder";
  await getJson("/api/bootstrap", haHeaders(owner, "Owner"));
  await getJson("/api/bootstrap", haHeaders(intruder, "Intruder"));

  const res = await deleteJson(
    "/api/members",
    { id: owner },
    haHeaders(intruder, "Intruder"),
  );
  // The store throws a 403 (not 404) for cross-user deletes; either is a
  // refusal — assert the user isn't gone.
  expect(res.status).toBeGreaterThanOrEqual(400);

  const ownerBootstrap = await (
    await getJson("/api/bootstrap", haHeaders(owner, "Owner"))
  ).json();
  expect(
    ownerBootstrap.members.find((m: { id: string }) => m.id === owner),
  ).toBeDefined();
});
