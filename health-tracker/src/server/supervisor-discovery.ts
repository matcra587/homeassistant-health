import type { NativeIntegrationOptions } from "./native-integration-options";
import { readNativeIntegrationOptions } from "./native-integration-options";

const DISCOVERY_SERVICE = "homeassistant_health";
const DEFAULT_SUPERVISOR_URL = "http://supervisor";
const DEFAULT_APP_PORT = 3000;

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
type DiscoveryAuthMode = "bearer" | "none";

export type DiscoveryRegistrationResult =
  | "disabled"
  | "failed"
  | "missing_hostname"
  | "missing_token"
  | "registered";

export type DiscoveryRegistrationOptions = {
  appPort?: number;
  fetchImpl?: FetchLike;
  nativeOptions?: NativeIntegrationOptions;
  supervisorToken?: string;
  supervisorUrl?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function responseData(payload: unknown): Record<string, unknown> {
  if (isRecord(payload) && isRecord(payload.data)) {
    return payload.data;
  }

  return isRecord(payload) ? payload : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown): number | null {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  return Number.isInteger(number) && number > 0 ? number : null;
}

function supervisorHeaders(token: string): HeadersInit {
  return {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  };
}

async function supervisorJson(
  fetchImpl: FetchLike,
  url: string,
  token: string,
): Promise<Record<string, unknown>> {
  const response = await fetchImpl(url, { headers: supervisorHeaders(token) });
  if (!response.ok) {
    throw new Error(
      `Supervisor request failed: ${response.status} ${response.statusText}`,
    );
  }

  return responseData(await response.json());
}

async function postSupervisorJson(
  fetchImpl: FetchLike,
  url: string,
  token: string,
  body: unknown,
): Promise<void> {
  const response = await fetchImpl(url, {
    method: "POST",
    headers: supervisorHeaders(token),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `Supervisor discovery failed: ${response.status} ${response.statusText}`,
    );
  }
}

function discoveryHostname(info: Record<string, unknown>): string {
  const hostname = stringValue(info.hostname);
  if (hostname) {
    return hostname;
  }

  return stringValue(info.slug).replaceAll("_", "-");
}

function discoveryPort(
  info: Record<string, unknown>,
  configuredPort: number | undefined,
): number {
  return (
    numberValue(configuredPort) ??
    numberValue(Bun.env.PORT) ??
    numberValue(info.ingress_port) ??
    DEFAULT_APP_PORT
  );
}

function discoveryAuthMode(token: string): DiscoveryAuthMode {
  return token ? "bearer" : "none";
}

function logDiscoveryRegistration(
  uri: string,
  endpoint: string,
  auth: DiscoveryAuthMode,
): void {
  for (const line of [
    "Home Assistant Health discovery registered:",
    `  service: ${DISCOVERY_SERVICE}`,
    `  url: ${uri}`,
    `  endpoint: ${endpoint}`,
    `  auth: ${auth}`,
  ]) {
    console.log(line);
  }
}

export async function registerNativeIntegrationDiscovery(
  options: DiscoveryRegistrationOptions = {},
): Promise<DiscoveryRegistrationResult> {
  const supervisorToken = options.supervisorToken ?? Bun.env.SUPERVISOR_TOKEN;
  if (!supervisorToken) {
    console.log(
      "Home Assistant discovery skipped: SUPERVISOR_TOKEN is not available",
    );
    return "missing_token";
  }

  const nativeOptions =
    options.nativeOptions ?? (await readNativeIntegrationOptions());
  if (!nativeOptions.enabled) {
    console.log(
      "Home Assistant discovery skipped: native integration is disabled",
    );
    return "disabled";
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const supervisorUrl = (
    options.supervisorUrl ??
    Bun.env.SUPERVISOR_URL ??
    DEFAULT_SUPERVISOR_URL
  ).replace(/\/+$/, "");

  try {
    const info = await supervisorJson(
      fetchImpl,
      `${supervisorUrl}/addons/self/info`,
      supervisorToken,
    );
    const hostname = discoveryHostname(info);
    if (!hostname) {
      console.error(
        "Failed to register discovery: Supervisor returned no host",
      );
      return "missing_hostname";
    }

    const port = discoveryPort(info, options.appPort);
    const uri = `http://${hostname}:${port}`;
    const endpoint = `${uri}/api/native/v1/entities`;

    await postSupervisorJson(
      fetchImpl,
      `${supervisorUrl}/discovery`,
      supervisorToken,
      {
        service: DISCOVERY_SERVICE,
        config: {
          host: hostname,
          port,
          token: nativeOptions.token,
          uri,
        },
      },
    );

    logDiscoveryRegistration(
      uri,
      endpoint,
      discoveryAuthMode(nativeOptions.token),
    );
    return "registered";
  } catch (error) {
    console.error("Failed to register Home Assistant Health discovery", error);
    return "failed";
  }
}
