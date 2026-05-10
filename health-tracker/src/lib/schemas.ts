/**
 * Valibot schemas shared by server and client.
 *
 * Server uses them at the HTTP request boundary (parseBody throws Response
 * to be caught by the route wrapper). Client uses them at the response
 * boundary (parseResponse throws Error so callers can surface it normally).
 *
 * Schemas mirror the types in src/lib/types.ts; the helpers at the bottom
 * assert each schema's inferred output is structurally compatible with its
 * target type, so a drift fails type-check rather than runtime.
 */

import * as v from "valibot";
import type { Entry, Household, Member } from "./types";

const SexSchema = v.picklist(["M", "F"]);
const UnitsSchema = v.picklist(["metric", "imperial", "uk"]);
const ThemeSchema = v.picklist(["system", "light", "dark"]);

const heightCm = v.pipe(v.number(), v.minValue(90), v.maxValue(250));
const age = v.pipe(v.number(), v.minValue(5), v.maxValue(110));
const activityLevel = v.pipe(v.number(), v.minValue(1), v.maxValue(2.5));
const weightKg = v.pipe(v.number(), v.minValue(20), v.maxValue(300));
const isoDate = v.pipe(
  v.string(),
  v.check((value) => !Number.isNaN(new Date(value).getTime()), "Invalid date"),
);

export const MemberSchema = v.object({
  id: v.string(),
  displayName: v.string(),
  initials: v.string(),
  heightCm: v.nullable(heightCm),
  age: v.nullable(age),
  sex: v.nullable(SexSchema),
  activityLevel: v.nullable(activityLevel),
  startWeightKg: v.nullable(weightKg),
  goalWeightKg: v.nullable(weightKg),
  targetDate: v.nullable(isoDate),
  units: v.nullable(UnitsSchema),
  theme: ThemeSchema,
  shareDetails: v.boolean(),
  reminderTime: v.string(),
  milestoneAlerts: v.boolean(),
  resetGracePeriodDays: v.number(),
  isMe: v.boolean(),
  tone: v.string(),
  profileComplete: v.boolean(),
});

export const MemberPatchSchema = v.partial(MemberSchema);

export const EntrySchema = v.object({
  id: v.string(),
  memberId: v.string(),
  date: isoDate,
  weightKg,
  bodyFatPct: v.nullable(v.number()),
  waistCm: v.nullable(v.number()),
  note: v.nullable(v.string()),
});

export const EntryDeleteSchema = v.object({ id: v.string() });
export const MemberDeleteSchema = v.object({ id: v.string() });
export const MemberPatchRequestSchema = v.object({
  id: v.string(),
  patch: MemberPatchSchema,
});

export const HouseholdSchema = v.object({
  id: v.string(),
  name: v.string(),
  createdAt: v.string(),
  locale: v.string(),
});

export const BootstrapPayloadSchema = v.object({
  members: v.array(MemberSchema),
  entries: v.array(EntrySchema),
  household: HouseholdSchema,
  today: v.string(),
});

// Compile-time guards: the inferred output type from each schema must be
// assignable to the canonical type from src/lib/types. A drift fails the
// type-check rather than slipping through to runtime.
const _memberAssign: (m: v.InferOutput<typeof MemberSchema>) => Member = (m) =>
  m;
const _entryAssign: (e: v.InferOutput<typeof EntrySchema>) => Entry = (e) => e;
const _householdAssign: (
  h: v.InferOutput<typeof HouseholdSchema>,
) => Household = (h) => h;
void _memberAssign;
void _entryAssign;
void _householdAssign;

function formatIssues(error: v.ValiError<v.GenericSchema>): string {
  return error.issues
    .map((issue) => {
      const path = issue.path?.map((p) => String(p.key)).join(".") ?? "body";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

/**
 * Parse a request body against a schema and convert ValiError into a 422
 * Response so the existing server route wrapper can surface it as a JSON
 * error. Server-only.
 */
export function parseBody<TSchema extends v.GenericSchema>(
  schema: TSchema,
  body: unknown,
): v.InferOutput<TSchema> {
  try {
    return v.parse(schema, body);
  } catch (error) {
    if (error instanceof v.ValiError) {
      const message = formatIssues(error);
      throw new Response(message || "Invalid request body", { status: 422 });
    }
    throw error;
  }
}

/**
 * Parse a server response against a schema and convert ValiError into a
 * regular Error so the client can surface it through normal error handling.
 */
export function parseResponse<TSchema extends v.GenericSchema>(
  schema: TSchema,
  body: unknown,
): v.InferOutput<TSchema> {
  try {
    return v.parse(schema, body);
  } catch (error) {
    if (error instanceof v.ValiError) {
      throw new Error(`Server response failed schema: ${formatIssues(error)}`);
    }
    throw error;
  }
}
