import type { Entry, Member, Sex } from "../../lib/types";

export function calcBMI(
  kg: number | null | undefined,
  heightCm: number | null | undefined,
): number | null {
  if (!kg || !heightCm) return null;
  const m = heightCm / 100;
  return kg / (m * m);
}

export function bmiCategory(bmi: number | null | undefined): string | null {
  if (bmi == null) return null;
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Healthy";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

/** Mifflin–St Jeor BMR. */
export function calcBMR(
  kg: number | null | undefined,
  heightCm: number | null | undefined,
  age: number | null | undefined,
  sex: Sex | null | undefined,
): number | null {
  if (!kg || !heightCm || !age) return null;
  const base = 10 * kg + 6.25 * heightCm - 5 * age;
  return sex === "M" ? base + 5 : base - 161;
}

export function calcTDEE(
  kg: number | null | undefined,
  heightCm: number | null | undefined,
  age: number | null | undefined,
  sex: Sex | null | undefined,
  activity: number | null | undefined,
): number | null {
  const bmr = calcBMR(kg, heightCm, age, sex);
  return bmr && activity ? bmr * activity : null;
}

/** Deurenberg body-fat estimate. */
export function estBodyFat(
  kg: number | null | undefined,
  heightCm: number | null | undefined,
  age: number | null | undefined,
  sex: Sex | null | undefined,
): number | null {
  const bmi = calcBMI(kg, heightCm);
  if (!bmi || age == null) return null;
  const sexFactor = sex === "M" ? 1 : 0;
  return 1.2 * bmi + 0.23 * age - 10.8 * sexFactor - 5.4;
}

/** Robinson ideal body weight. */
export function calcIdealWeight(
  heightCm: number | null | undefined,
  sex: Sex | null | undefined,
): number | null {
  if (!heightCm) return null;
  const inchesOver5ft = heightCm / 2.54 - 60;
  if (inchesOver5ft <= 0) return sex === "M" ? 52 : 49;
  return (sex === "M" ? 52 : 49) + (sex === "M" ? 1.9 : 1.7) * inchesOver5ft;
}

export type StreakInfo = {
  length: number;
  lastEntry: Entry | null;
  broken: boolean;
};

export function calcStreak(entries: Entry[], gracePeriodDays = 1): StreakInfo {
  const sorted = [...entries].sort(
    (a, b) => +new Date(b.date) - +new Date(a.date),
  );
  const lastEntry = sorted[0];
  if (!lastEntry) return { length: 0, lastEntry: null, broken: false };

  const today = window.__fixtures?.today ?? new Date();
  const dayKey = (d: string | Date) => new Date(d).toISOString().slice(0, 10);
  const todayKey = dayKey(today);

  const lastEntryDate = new Date(lastEntry.date);
  const daysSinceLast = Math.floor((+today - +lastEntryDate) / 86_400_000);
  if (daysSinceLast > gracePeriodDays) {
    return { length: 0, lastEntry, broken: true };
  }

  const set = new Set(sorted.map((e) => dayKey(e.date)));
  let count = 0;
  let cursor = set.has(todayKey)
    ? new Date(today)
    : new Date(+today - 86_400_000);
  while (set.has(dayKey(cursor))) {
    count++;
    cursor = new Date(+cursor - 86_400_000);
  }
  return { length: count, lastEntry, broken: false };
}

export type TrendDirection = "flat" | "up" | "down";

export function trendDirection(
  entries: Entry[],
  days = 14,
): { direction: TrendDirection; deltaKg: number } {
  if (entries.length < 3) return { direction: "flat", deltaKg: 0 };
  const today = window.__fixtures?.today ?? new Date();
  const cutoff = +today - days * 86_400_000;
  const recent = entries
    .filter((e) => +new Date(e.date) >= cutoff)
    .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  const first = recent[0];
  const last = recent[recent.length - 1];
  if (!first || !last) return { direction: "flat", deltaKg: 0 };
  const delta = last.weightKg - first.weightKg;
  if (Math.abs(delta) < 0.3) return { direction: "flat", deltaKg: delta };
  return { direction: delta > 0 ? "up" : "down", deltaKg: delta };
}

export function progressFraction(
  member: Pick<Member, "startWeightKg" | "goalWeightKg"> | null | undefined,
  latestKg: number | null | undefined,
): number {
  if (!member || latestKg == null) return 0;
  const start = member.startWeightKg ?? 0;
  const goal = member.goalWeightKg ?? 0;
  const span = start - goal;
  if (Math.abs(span) < 0.1) return 1;
  const done = start - latestKg;
  return Math.max(0, Math.min(1, done / span));
}

export type PacingInfo = {
  startDate: Date;
  targetDate: Date;
  expectedKg: number;
  actualKg: number;
  aheadDays: number;
  projectedDate: Date | null;
  losing: boolean;
  onTrack: boolean;
};

export function calcPacing(
  member: Member,
  entries: Entry[],
): PacingInfo | null {
  if (!entries.length || !member.targetDate) return null;
  if (member.startWeightKg == null || member.goalWeightKg == null) return null;
  const sorted = [...entries].sort(
    (a, b) => +new Date(a.date) - +new Date(b.date),
  );
  const firstEntry = sorted[0];
  const lastEntry = sorted[sorted.length - 1];
  if (!firstEntry || !lastEntry) return null;
  const startDate = new Date(firstEntry.date);
  const targetDate = new Date(member.targetDate);
  const today = window.__fixtures?.today ?? new Date();
  const totalMs = +targetDate - +startDate;
  if (totalMs <= 0) return null;
  const elapsedFrac = Math.max(0, Math.min(1, (+today - +startDate) / totalMs));
  const expectedKg =
    member.startWeightKg +
    (member.goalWeightKg - member.startWeightKg) * elapsedFrac;
  const actualKg = lastEntry.weightKg;
  const losing = member.startWeightKg > member.goalWeightKg;
  const totalDelta = member.goalWeightKg - member.startWeightKg;
  const actualFrac =
    totalDelta === 0 ? 0 : (actualKg - member.startWeightKg) / totalDelta;
  const aheadDays = Math.round(
    (actualFrac - elapsedFrac) * (totalMs / 86_400_000),
  );
  const daysSoFar = (+today - +startDate) / 86_400_000;
  const ratePerDay =
    daysSoFar > 0 ? (actualKg - member.startWeightKg) / daysSoFar : 0;
  let projectedDate: Date | null = null;
  if (ratePerDay !== 0 && Math.sign(ratePerDay) === Math.sign(totalDelta)) {
    const remainingDays = (member.goalWeightKg - actualKg) / ratePerDay;
    if (
      Number.isFinite(remainingDays) &&
      remainingDays > 0 &&
      remainingDays < 365 * 3
    ) {
      projectedDate = new Date(+today + remainingDays * 86_400_000);
    }
  }
  return {
    startDate,
    targetDate,
    expectedKg,
    actualKg,
    aheadDays,
    projectedDate,
    losing,
    onTrack: Math.abs(aheadDays) <= 3,
  };
}

export function hasCompleteProfile(member: Member | null | undefined): boolean {
  if (!member) return false;
  return Boolean(
    member.displayName?.trim() &&
      Number.isFinite(member.heightCm) &&
      Number.isFinite(member.age) &&
      (member.sex === "F" || member.sex === "M") &&
      Number.isFinite(member.activityLevel) &&
      Number.isFinite(member.startWeightKg) &&
      Number.isFinite(member.goalWeightKg) &&
      member.targetDate &&
      member.units,
  );
}
