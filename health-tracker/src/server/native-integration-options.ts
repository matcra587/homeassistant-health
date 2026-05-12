export type NativeIntegrationOptions = {
  enabled: boolean;
  token: string;
  metrics: NativeIntegrationMetric[];
};

export const NATIVE_INTEGRATION_METRICS = [
  "current_weight",
  "logged_today",
  "streak_days",
  "goal_progress",
] as const;

export type NativeIntegrationMetric =
  (typeof NATIVE_INTEGRATION_METRICS)[number];

export const DEFAULT_NATIVE_INTEGRATION_OPTIONS: NativeIntegrationOptions = {
  enabled: true,
  token: "",
  metrics: [...NATIVE_INTEGRATION_METRICS],
};

const DEFAULT_OPTIONS_PATH = "/data/options.json";
const SUPPORTED_METRICS = new Set<string>(NATIVE_INTEGRATION_METRICS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseNativeIntegrationOptions(
  raw: unknown,
): NativeIntegrationOptions {
  const options = isRecord(raw) ? raw.native_integration : null;
  const source = isRecord(options) ? options : {};
  const envToken = Bun.env.HEALTH_TRACKER_NATIVE_TOKEN;
  const metrics = Array.isArray(source.metrics)
    ? source.metrics.filter(
        (metric): metric is NativeIntegrationMetric =>
          typeof metric === "string" && SUPPORTED_METRICS.has(metric),
      )
    : DEFAULT_NATIVE_INTEGRATION_OPTIONS.metrics;

  return {
    enabled:
      typeof source.enabled === "boolean"
        ? source.enabled
        : DEFAULT_NATIVE_INTEGRATION_OPTIONS.enabled,
    token:
      envToken ??
      (typeof source.token === "string"
        ? source.token.trim()
        : DEFAULT_NATIVE_INTEGRATION_OPTIONS.token),
    metrics,
  };
}

export async function readNativeIntegrationOptions(
  path = Bun.env.HEALTH_TRACKER_OPTIONS_PATH ?? DEFAULT_OPTIONS_PATH,
): Promise<NativeIntegrationOptions> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    return parseNativeIntegrationOptions({});
  }

  try {
    return parseNativeIntegrationOptions(await file.json());
  } catch (error) {
    console.error(`Failed to read add-on options from ${path}`, error);
    return parseNativeIntegrationOptions({});
  }
}
