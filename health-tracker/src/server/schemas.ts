/**
 * Valibot schemas for HTTP request bodies.
 *
 * These are the source of truth for what the server accepts at its boundary.
 * The schemas express the same range constraints that validateProfilePatch
 * used to enforce manually, plus the shape checks that previously lived in
 * `JSON.parse(text) as T` (which checked nothing at all).
 *
 * Schemas mirror the types in src/lib/types.ts; the helper at the bottom of
 * the file asserts the inferred output of each schema is structurally
 * compatible with its target type, so a drift between schema and type is a
 * compile error.
 */

import * as v from "valibot";
import type { Entry, Member } from "../lib/types";

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

// Compile-time guards: the inferred output type from each schema must be
// assignable to the canonical type from src/lib/types. A drift fails the
// type-check rather than slipping through to runtime.
const _memberAssign: (m: v.InferOutput<typeof MemberSchema>) => Member = (m) =>
  m;
const _entryAssign: (e: v.InferOutput<typeof EntrySchema>) => Entry = (e) => e;
void _memberAssign;
void _entryAssign;

/**
 * Parse a request body against a schema and convert ValiError into a 422
 * Response so the existing route wrapper can surface it as a JSON error.
 */
export function parseBody<TSchema extends v.GenericSchema>(
  schema: TSchema,
  body: unknown,
): v.InferOutput<TSchema> {
  try {
    return v.parse(schema, body);
  } catch (error) {
    if (error instanceof v.ValiError) {
      const message = error.issues
        .map((issue) => {
          const path =
            issue.path?.map((p: { key?: PropertyKey }) => p.key).join(".") ??
            "body";
          return `${path}: ${issue.message}`;
        })
        .join("; ");
      throw new Response(message || "Invalid request body", { status: 422 });
    }
    throw error;
  }
}
