import type { Units } from "../../lib/types";

export const KG_TO_LB = 2.2046226218;
export const CM_TO_IN = 0.3937007874;

export function kgToLb(kg: number): number {
  return kg * KG_TO_LB;
}

export function lbToKg(lb: number): number {
  return lb / KG_TO_LB;
}

export function cmToIn(cm: number): number {
  return cm * CM_TO_IN;
}

export function kgToSt(kg: number): number {
  return kgToLb(kg) / 14;
}

export function stLbToKg(st: number, lb: number): number {
  return ((st || 0) * 14 + (lb || 0)) / KG_TO_LB;
}

export function kgToStLb(kg: number): { st: number; lb: number } {
  const totalLb = kgToLb(kg);
  const st = Math.floor(totalLb / 14);
  const lb = totalLb - st * 14;
  return { st, lb };
}

export type WeightFormatOptions = {
  unitless?: boolean;
  dp?: number;
  lbDp?: number;
};

export function fmtWeight(
  kg: number | null | undefined,
  units: Units | null | undefined,
  opts: WeightFormatOptions = {},
): string {
  if (kg == null || Number.isNaN(kg)) return "—";
  if (units === "uk") {
    if (opts.unitless) return kgToSt(kg).toFixed(opts.dp ?? 1);
    const { st, lb } = kgToStLb(kg);
    return `${st} st ${lb.toFixed(opts.lbDp ?? 1)} lb`;
  }
  const value = units === "imperial" ? kgToLb(kg) : kg;
  const dp = opts.dp ?? 1;
  const num = value.toFixed(dp);
  const u = units === "imperial" ? "lb" : "kg";
  return opts.unitless ? num : `${num} ${u}`;
}

export function unitSuffix(units: Units | null | undefined): string {
  return units === "imperial" ? "lb" : units === "uk" ? "st" : "kg";
}

export function fmtHeight(
  cm: number | null | undefined,
  units: Units | null | undefined,
): string {
  if (cm == null) return "—";
  if (units === "imperial" || units === "uk") {
    const totalIn = cmToIn(cm);
    const ft = Math.floor(totalIn / 12);
    const inch = Math.round(totalIn - ft * 12);
    return `${ft}′${inch}″`;
  }
  return `${cm} cm`;
}

export function fmtDelta(
  kg: number | null | undefined,
  units: Units | null | undefined,
  opts: { dp?: number } = {},
): string {
  if (kg == null || Number.isNaN(kg)) return "—";
  const sign = kg > 0 ? "+" : kg < 0 ? "−" : "±";
  if (units === "uk") {
    const lb = Math.abs(kgToLb(kg));
    return `${sign}${lb.toFixed(opts.dp ?? 1)} lb`;
  }
  const value = Math.abs(units === "imperial" ? kgToLb(kg) : kg);
  return `${sign}${value.toFixed(opts.dp ?? 1)} ${units === "imperial" ? "lb" : "kg"}`;
}
