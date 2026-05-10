import { expect, test } from "bun:test";
import { getHealthStatus, getReadinessStatus } from "../src/lib/health";

test("reports the Bun app health contract", () => {
  expect(getHealthStatus()).toEqual({
    status: "ok",
    app: "homeassistant-health",
    runtime: "bun",
    bundler: "bun",
    storage: "sqlite",
  });
});

test("reports the readiness probe body", () => {
  expect(getReadinessStatus()).toBe("OK");
});
