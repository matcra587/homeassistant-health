import { expect, test } from "bun:test";
import type { NativeIntegrationOptions } from "../src/server/native-integration-options";
import { registerNativeIntegrationDiscovery } from "../src/server/supervisor-discovery";

type FetchCall = {
  init?: RequestInit;
  url: string;
};

const enabledOptions: NativeIntegrationOptions = {
  enabled: true,
  token: "",
  metrics: ["current_weight"],
};

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

function createSupervisorFetch(
  calls: FetchCall[],
  info: unknown,
): (url: string, init?: RequestInit) => Promise<Response> {
  return async (url, init) => {
    calls.push(init === undefined ? { url } : { init, url });

    if (url.endsWith("/addons/self/info")) {
      return jsonResponse(info);
    }

    if (url.endsWith("/discovery")) {
      return jsonResponse({ result: "ok" });
    }

    return jsonResponse({ error: "not found" }, 404);
  };
}

test("supervisor discovery is skipped when not running as a Home Assistant App", async () => {
  const calls: FetchCall[] = [];

  const result = await registerNativeIntegrationDiscovery({
    fetchImpl: createSupervisorFetch(calls, {}),
    nativeOptions: enabledOptions,
    supervisorToken: "",
  });

  expect(result).toBe("missing_token");
  expect(calls).toHaveLength(0);
});

test("supervisor discovery is skipped when native integration is disabled", async () => {
  const calls: FetchCall[] = [];

  const result = await registerNativeIntegrationDiscovery({
    fetchImpl: createSupervisorFetch(calls, {}),
    nativeOptions: { ...enabledOptions, enabled: false },
    supervisorToken: "supervisor-token",
  });

  expect(result).toBe("disabled");
  expect(calls).toHaveLength(0);
});

test("supervisor discovery registers the runtime App hostname", async () => {
  const calls: FetchCall[] = [];

  const result = await registerNativeIntegrationDiscovery({
    appPort: 3000,
    fetchImpl: createSupervisorFetch(calls, {
      data: {
        hostname: "8cd0e720-homeassistant-health",
        ingress_port: 3000,
      },
    }),
    nativeOptions: { ...enabledOptions, token: "native-api-token" },
    supervisorToken: "supervisor-token",
    supervisorUrl: "http://supervisor/",
  });

  expect(result).toBe("registered");
  expect(calls.map((call) => call.url)).toEqual([
    "http://supervisor/addons/self/info",
    "http://supervisor/discovery",
  ]);
  expect(calls[0]?.init?.headers).toEqual({
    authorization: "Bearer supervisor-token",
    "content-type": "application/json",
  });
  expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({
    service: "homeassistant_health",
    config: {
      host: "8cd0e720-homeassistant-health",
      port: 3000,
      token: "native-api-token",
      uri: "http://8cd0e720-homeassistant-health:3000",
    },
  });
});

test("supervisor discovery falls back to the App slug as a DNS hostname", async () => {
  const calls: FetchCall[] = [];

  const result = await registerNativeIntegrationDiscovery({
    appPort: 3000,
    fetchImpl: createSupervisorFetch(calls, {
      data: {
        slug: "8cd0e720_homeassistant_health",
      },
    }),
    nativeOptions: enabledOptions,
    supervisorToken: "supervisor-token",
  });

  expect(result).toBe("registered");
  expect(JSON.parse(String(calls[1]?.init?.body))).toMatchObject({
    config: {
      host: "8cd0e720-homeassistant-health",
      uri: "http://8cd0e720-homeassistant-health:3000",
    },
  });
});
