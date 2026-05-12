import { expect, test } from "bun:test";
import { parseNativeIntegrationOptions } from "../src/server/native-integration-options";

test("native integration options default to the baseline metric set", () => {
  const options = parseNativeIntegrationOptions({});

  expect(options).toEqual({
    enabled: true,
    token: "",
    metrics: ["current_weight", "logged_today", "streak_days", "goal_progress"],
  });
});

test("native integration options filter unknown metrics", () => {
  const options = parseNativeIntegrationOptions({
    native_integration: {
      enabled: true,
      token: " secret ",
      metrics: ["current_weight", "future_metric", "logged_today"],
    },
  });

  expect(options).toEqual({
    enabled: true,
    token: "secret",
    metrics: ["current_weight", "logged_today"],
  });
});
