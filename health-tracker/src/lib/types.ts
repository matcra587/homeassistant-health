/**
 * Shared API contract between server and client.
 *
 * The server is authoritative for these shapes — the client renders them and
 * sends back patches that conform to the same types. Anything specific to
 * server internals (DB row shapes, Home Assistant header parsing) lives next
 * to the server code, not here.
 */

export type Sex = "M" | "F";
export type Units = "metric" | "imperial" | "uk";
export type Theme = "system" | "light" | "dark";

export type Member = {
  id: string;
  displayName: string;
  initials: string;
  heightCm: number | null;
  age: number | null;
  sex: Sex | null;
  activityLevel: number | null;
  startWeightKg: number | null;
  goalWeightKg: number | null;
  targetDate: string | null;
  units: Units | null;
  theme: Theme;
  shareDetails: boolean;
  reminderTime: string;
  milestoneAlerts: boolean;
  resetGracePeriodDays: number;
  isMe: boolean;
  tone: string;
  profileComplete: boolean;
};

export type Entry = {
  id: string;
  memberId: string;
  date: string;
  weightKg: number;
  bodyFatPct: number | null;
  waistCm: number | null;
  note: string | null;
};

export type Household = {
  id: string;
  name: string;
  createdAt: string;
  locale: string;
};

export type MemberAccess = {
  id: string;
  ownerId: string | null;
  profileComplete: boolean;
};
