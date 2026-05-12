import { createHash } from "node:crypto";
import type { Entry, Household, Member } from "../lib/types";
import {
  type NativeIntegrationMetric,
  type NativeIntegrationOptions,
  readNativeIntegrationOptions,
} from "./native-integration-options";
import { nativeIntegrationSnapshot } from "./tracker-store";

type NativeComponent = "sensor" | "binary_sensor";
type NativeMetric = NativeIntegrationMetric;

type NativeEntityDefinition = {
  component: NativeComponent;
  name: string;
  icon: string;
  unit?: string;
  deviceClass?: string;
  stateClass?: string;
};

export type NativeIntegrationEntity = {
  uniqueId: string;
  objectId: string;
  component: NativeComponent;
  metric: NativeMetric;
  name: string;
  icon: string;
  nativeValue: string | number | boolean | null;
  unitOfMeasurement?: string;
  deviceClass?: string;
  stateClass?: string;
  memberId: string;
  memberName: string;
  deviceId: string;
  deviceName: string;
  attributes: Record<string, unknown>;
};

export type NativeIntegrationPayload = {
  version: 1;
  generatedAt: string;
  household: Household;
  entities: NativeIntegrationEntity[];
};

type NativeIntegrationSnapshot = ReturnType<typeof nativeIntegrationSnapshot>;

const METRIC_DEFINITIONS: Record<NativeMetric, NativeEntityDefinition> = {
  current_weight: {
    component: "sensor",
    name: "Current weight",
    icon: "mdi:scale-bathroom",
    unit: "kg",
    deviceClass: "weight",
    stateClass: "measurement",
  },
  logged_today: {
    component: "binary_sensor",
    name: "Logged today",
    icon: "mdi:calendar-check",
  },
  streak_days: {
    component: "sensor",
    name: "Streak",
    icon: "mdi:fire",
    unit: "d",
    stateClass: "measurement",
  },
  goal_progress: {
    component: "sensor",
    name: "Goal progress",
    icon: "mdi:target",
    unit: "%",
    stateClass: "measurement",
  },
};

function memberKey(memberId: string): string {
  return createHash("sha1").update(memberId).digest("hex").slice(0, 10);
}

function dateKey(value: string | Date): string {
  return new Date(value).toISOString().slice(0, 10);
}

function sortedEntries(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

function loggedToday(latest: Entry | null, today: Date): boolean {
  return latest ? dateKey(latest.date) === dateKey(today) : false;
}

function streakDays(
  entries: Entry[],
  today: Date,
  gracePeriodDays: number,
): number {
  const latest = entries[0];
  if (!latest) return 0;

  const daysSinceLast = Math.floor(
    (+today - +new Date(latest.date)) / 86_400_000,
  );
  if (daysSinceLast > gracePeriodDays) return 0;

  const days = new Set(entries.map((entry) => dateKey(entry.date)));
  let count = 0;
  let cursor = days.has(dateKey(today))
    ? new Date(today)
    : new Date(+today - 86_400_000);

  while (days.has(dateKey(cursor))) {
    count++;
    cursor = new Date(+cursor - 86_400_000);
  }

  return count;
}

function progressPercent(
  member: Member,
  latestKg: number | null,
): number | null {
  if (latestKg == null) return null;
  if (member.startWeightKg == null || member.goalWeightKg == null) return null;

  const span = member.startWeightKg - member.goalWeightKg;
  if (Math.abs(span) < 0.1) return 100;

  const done = member.startWeightKg - latestKg;
  return Math.round(Math.max(0, Math.min(1, done / span)) * 100);
}

function metricValue(
  metric: NativeMetric,
  member: Member,
  entries: Entry[],
  today: Date,
): NativeIntegrationEntity["nativeValue"] {
  const latest = entries[0] ?? null;

  switch (metric) {
    case "current_weight":
      return latest ? Number(latest.weightKg.toFixed(1)) : null;
    case "logged_today":
      return loggedToday(latest, today);
    case "streak_days":
      return streakDays(entries, today, member.resetGracePeriodDays);
    case "goal_progress":
      return progressPercent(member, latest?.weightKg ?? null);
  }
}

function entityForMetric(
  member: Member,
  entries: Entry[],
  today: Date,
  metric: NativeMetric,
): NativeIntegrationEntity {
  const key = memberKey(member.id);
  const definition = METRIC_DEFINITIONS[metric];
  const uniqueId = `homeassistant_health_${key}_${metric}`;

  return {
    uniqueId,
    objectId: uniqueId,
    component: definition.component,
    metric,
    name: definition.name,
    icon: definition.icon,
    nativeValue: metricValue(metric, member, entries, today),
    ...(definition.unit ? { unitOfMeasurement: definition.unit } : {}),
    ...(definition.deviceClass ? { deviceClass: definition.deviceClass } : {}),
    ...(definition.stateClass ? { stateClass: definition.stateClass } : {}),
    memberId: member.id,
    memberName: member.displayName,
    deviceId: `homeassistant_health_profile_${key}`,
    deviceName: `Health ${member.displayName}`,
    attributes: {
      profile: member.displayName,
    },
  };
}

function authorize(request: Request, options: NativeIntegrationOptions): void {
  if (!options.enabled) {
    throw new Response("Native integration API is disabled", { status: 404 });
  }

  if (!options.token) return;

  const authorization = request.headers.get("authorization");
  const expected = `Bearer ${options.token}`;
  if (authorization !== expected) {
    throw new Response("Native integration token is required", { status: 401 });
  }
}

export function buildNativeIntegrationPayload(
  snapshot: NativeIntegrationSnapshot,
  options: NativeIntegrationOptions,
): NativeIntegrationPayload {
  const today = new Date(snapshot.today);

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    household: snapshot.household,
    entities: snapshot.members.flatMap((member) => {
      const entries = sortedEntries(
        snapshot.entries.filter((entry) => entry.memberId === member.id),
      );
      return options.metrics.map((metric) =>
        entityForMetric(member, entries, today, metric),
      );
    }),
  };
}

export async function nativeIntegrationResponse(
  request: Request,
): Promise<Response> {
  const options = await readNativeIntegrationOptions();
  authorize(request, options);
  return Response.json(
    buildNativeIntegrationPayload(nativeIntegrationSnapshot(), options),
  );
}
