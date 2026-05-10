import { expect, test } from "bun:test";
import { createServer } from "../../src/server/index";
import { getJson, haHeaders } from "./helpers";

test("bootstraps a fresh Home Assistant user with their own profile", async () => {
  const res = await getJson(
    "/api/bootstrap",
    haHeaders("ha-bootstrap", "Iris"),
  );
  expect(res.status).toBe(200);
  const payload = await res.json();

  expect(payload.household.name).toBe("Home Assistant");
  const me = payload.members.find(
    (m: { id: string }) => m.id === "ha-bootstrap",
  );
  expect(me).toBeDefined();
  expect(me.displayName).toBe("Iris");
  expect(me.isMe).toBe(true);
  expect(me.profileComplete).toBe(false);
  expect(typeof payload.today).toBe("string");
});

test("rejects bootstrap without ingress headers when requireIngress is on", async () => {
  // Spin up a second server with requireIngress=true rather than flipping a
  // global env var. Each createServer() instance closes over its own auth
  // flag, so this exercises the production branch without affecting the
  // shared dev-mode server other tests use.
  const strict = createServer({
    port: 0,
    hostname: "127.0.0.1",
    requireIngress: true,
  });
  try {
    const res = await fetch(`${strict.url}api/bootstrap`, {
      headers: { "content-type": "application/json" },
    });
    expect(res.status).toBe(401);
    expect(await res.text()).toContain("Home Assistant ingress");
  } finally {
    strict.stop(true);
  }
});

test("returns the same member shape on subsequent bootstrap calls", async () => {
  const headers = haHeaders("ha-bootstrap-stable", "Stable");
  const first = await (await getJson("/api/bootstrap", headers)).json();
  const second = await (await getJson("/api/bootstrap", headers)).json();
  const me = (members: { id: string; displayName: string }[]) =>
    members.find((m) => m.id === "ha-bootstrap-stable");
  expect(me(second.members)?.displayName).toBe(me(first.members)?.displayName);
});
