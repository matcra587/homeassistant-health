/**
 * Shared setup for HTTP integration tests.
 *
 * Each suite that imports this gets a fresh server bound to a random port and
 * a private SQLite database. The database lives in an OS tmpdir so multiple
 * test files run in parallel without trampling each other.
 */

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Per-suite SQLite path so parallel test files do not trample each other.
// requireIngress=false matches local-dev behaviour: missing ingress headers
// fall back to a synthetic user so tests exercise normal flows without
// faking proxy headers everywhere. The one test that needs the strict
// branch boots its own server with requireIngress: true.
const dbDir = mkdtempSync(join(tmpdir(), "homeassistant-health-api-"));
Bun.env.HEALTH_TRACKER_DB_PATH = join(dbDir, "health.db");

const { createServer } = await import("../../src/server/index");

const server = createServer({
  port: 0,
  hostname: "127.0.0.1",
  requireIngress: false,
});

export const baseUrl = server.url.toString().replace(/\/$/, "");

export function url(path: string): string {
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function haHeaders(id: string, displayName: string): HeadersInit {
  return {
    "x-ha-user-id": id,
    "x-ha-user-display-name": displayName,
    "content-type": "application/json",
  };
}

export async function postJson(
  path: string,
  body: unknown,
  headers: HeadersInit,
): Promise<Response> {
  return await fetch(url(path), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

export async function patchJson(
  path: string,
  body: unknown,
  headers: HeadersInit,
): Promise<Response> {
  return await fetch(url(path), {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
}

export async function deleteJson(
  path: string,
  body: unknown,
  headers: HeadersInit,
): Promise<Response> {
  return await fetch(url(path), {
    method: "DELETE",
    headers,
    body: JSON.stringify(body),
  });
}

export async function getJson(
  path: string,
  headers: HeadersInit,
): Promise<Response> {
  return await fetch(url(path), { headers });
}
