import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

type Sex = "M" | "F";
type Units = "metric" | "imperial" | "uk";

export type Member = {
  id: string;
  displayName: string;
  initials: string;
  heightCm: number;
  age: number;
  sex: Sex;
  activityLevel: number;
  startWeightKg: number;
  goalWeightKg: number;
  targetDate: string;
  units: Units;
  shareDetails: boolean;
  reminderTime: string;
  milestoneAlerts: boolean;
  resetGracePeriodDays: number;
  isMe: boolean;
  tone: string;
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

type Household = {
  id: string;
  name: string;
  createdAt: string;
  locale: string;
};

type CurrentUser = {
  id: string;
  displayName: string;
  fromHomeAssistant: boolean;
};

type MemberAccess = {
  id: string;
  ownerId: string | null;
};

const DAY = 86_400_000;
const DEFAULT_DB_PATH =
  Bun.env.NODE_ENV === "production" ? "/config/health.db" : ".data/health.db";
const DB_PATH =
  Bun.env.HEALTH_TRACKER_DB_PATH ?? Bun.env.DB_PATH ?? DEFAULT_DB_PATH;

let db: Database | null = null;

function todayAtMorning(): Date {
  const today = new Date();
  today.setHours(7, 30, 0, 0);
  return today;
}

function daysAgo(days: number): Date {
  return new Date(todayAtMorning().getTime() - days * DAY);
}

function bool(value: unknown): boolean {
  return value === true || value === 1;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function currentUserFromHeaders(headers: Headers): CurrentUser {
  const id =
    headers.get("x-ha-user-id") ??
    headers.get("x-remote-user-id") ??
    headers.get("x-user-id");
  const displayName =
    headers.get("x-ha-user-display-name") ??
    headers.get("x-remote-user-display-name") ??
    headers.get("x-ha-user-name") ??
    headers.get("x-remote-user-name") ??
    "Home Assistant User";

  if (id) {
    return { id, displayName, fromHomeAssistant: true };
  }

  return { id: "demo-user", displayName: "Iris", fromHomeAssistant: false };
}

function getDb(): Database {
  if (!db) {
    if (DB_PATH !== ":memory:") {
      mkdirSync(dirname(DB_PATH), { recursive: true });
    }
    db = new Database(DB_PATH, { create: true });
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");
    initSchema(db);
    migrateSchema(db);
  }

  return db;
}

function initSchema(database: Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS household (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      created_at TEXT NOT NULL,
      locale     TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS members (
      id                       TEXT PRIMARY KEY,
      owner_id                 TEXT,
      display_name             TEXT NOT NULL,
      initials                 TEXT NOT NULL,
      height_cm                REAL NOT NULL,
      age                      INTEGER NOT NULL,
      sex                      TEXT NOT NULL CHECK (sex IN ('M', 'F')),
      activity_level           REAL NOT NULL,
      start_weight_kg          REAL NOT NULL,
      goal_weight_kg           REAL NOT NULL,
      target_date              TEXT NOT NULL,
      units                    TEXT NOT NULL CHECK (units IN ('metric', 'imperial', 'uk')),
      share_details            INTEGER NOT NULL,
      reminder_time            TEXT NOT NULL,
      milestone_alerts         INTEGER NOT NULL,
      reset_grace_period_days  INTEGER NOT NULL,
      tone                     TEXT NOT NULL,
      created_at               TEXT DEFAULT (datetime('now')),
      updated_at               TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS entries (
      id            TEXT PRIMARY KEY,
      member_id     TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      date          TEXT NOT NULL,
      weight_kg     REAL NOT NULL,
      body_fat_pct  REAL,
      waist_cm      REAL,
      note          TEXT,
      created_at    TEXT DEFAULT (datetime('now')),
      updated_at    TEXT DEFAULT (datetime('now')),
      UNIQUE(member_id, date)
    );
  `);
}

function migrateSchema(database: Database): void {
  const columns = database.prepare("PRAGMA table_info(members)").all() as {
    name: string;
  }[];
  if (!columns.some((column) => column.name === "owner_id")) {
    database.exec("ALTER TABLE members ADD COLUMN owner_id TEXT");
  }
}

function seededMembers(currentUser: CurrentUser): Member[] {
  const people: Omit<Member, "isMe">[] = [
    {
      id: currentUser.id,
      displayName: currentUser.displayName,
      initials: initials(currentUser.displayName) || "IR",
      heightCm: 168,
      age: 38,
      sex: "F",
      activityLevel: 1.55,
      startWeightKg: 74.2,
      goalWeightKg: 66,
      targetDate: daysAgo(-60).toISOString(),
      units: "metric",
      shareDetails: true,
      reminderTime: "07:30",
      milestoneAlerts: true,
      resetGracePeriodDays: 1,
      tone: "iris",
    },
    {
      id: "m2",
      displayName: "Theo",
      initials: "TH",
      heightCm: 182,
      age: 41,
      sex: "M",
      activityLevel: 1.4,
      startWeightKg: 92.5,
      goalWeightKg: 84,
      targetDate: daysAgo(-90).toISOString(),
      units: "metric",
      shareDetails: false,
      reminderTime: "06:45",
      milestoneAlerts: true,
      resetGracePeriodDays: 1,
      tone: "theo",
    },
    {
      id: "m3",
      displayName: "Margot",
      initials: "MA",
      heightCm: 162,
      age: 67,
      sex: "F",
      activityLevel: 1.3,
      startWeightKg: 68,
      goalWeightKg: 65,
      targetDate: daysAgo(-120).toISOString(),
      units: "metric",
      shareDetails: true,
      reminderTime: "08:00",
      milestoneAlerts: false,
      resetGracePeriodDays: 2,
      tone: "margot",
    },
    {
      id: "m4",
      displayName: "Sam",
      initials: "SA",
      heightCm: 175,
      age: 16,
      sex: "M",
      activityLevel: 1.7,
      startWeightKg: 64,
      goalWeightKg: 70,
      targetDate: daysAgo(-180).toISOString(),
      units: "metric",
      shareDetails: false,
      reminderTime: "07:00",
      milestoneAlerts: true,
      resetGracePeriodDays: 1,
      tone: "sam",
    },
  ];

  return people.map((member) => ({
    ...member,
    isMe: member.id === currentUser.id,
  }));
}

function rng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

function buildSeries(
  memberId: string,
  startKg: number,
  goalKg: number,
  days: number,
  seed: number,
  missRate: number,
): Entry[] {
  const random = rng(seed);
  const entries: Entry[] = [];
  let weight = startKg;

  for (let i = days; i >= 0; i--) {
    const progress = (days - i) / days;
    const target = startKg + (goalKg - startKg) * progress ** 0.85;
    weight = weight * 0.55 + target * 0.45 + (random() - 0.5) * 0.6;

    if (random() < missRate && i !== 0 && i !== days) {
      continue;
    }

    const date = daysAgo(i);
    entries.push({
      id: `${memberId}-${date.toISOString().slice(0, 10)}`,
      memberId,
      date: date.toISOString(),
      weightKg: Math.round(weight * 10) / 10,
      bodyFatPct:
        i % 7 === 0 ? Math.round((22 + (random() - 0.5) * 4) * 10) / 10 : null,
      waistCm: i % 14 === 0 ? Math.round(82 + (random() - 0.5) * 6) : null,
      note:
        i === 0
          ? "Morning, after coffee."
          : i === 3
            ? "Skipped run yesterday - feeling it."
            : i === 14
              ? "Vacation week, holding steady."
              : null,
    });
  }

  return entries.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

function seededEntries(currentUser: CurrentUser): Entry[] {
  const entries = [
    ...buildSeries(currentUser.id, 74.2, 67.4, 92, 17, 0.14),
    ...buildSeries("m2", 92.5, 87.1, 92, 91, 0.32),
    ...buildSeries("m3", 68, 65.4, 92, 213, 0.1),
    ...buildSeries("m4", 64, 67.8, 92, 404, 0.22),
  ];

  const theoEntries = entries.filter((entry) => entry.memberId === "m2");
  for (const entry of theoEntries.slice(0, 4)) {
    const index = entries.indexOf(entry);
    if (index >= 0) {
      entries.splice(index, 1);
    }
  }

  return entries;
}

function ensureHousehold(database: Database): void {
  const row = database
    .prepare("SELECT id FROM household WHERE id = ?")
    .get("h1");
  if (row) {
    return;
  }

  database
    .prepare(
      "INSERT INTO household (id, name, created_at, locale) VALUES (?, ?, ?, ?)",
    )
    .run("h1", "Home Assistant", daysAgo(220).toISOString(), "en-CA");
}

function ensureSeeded(database: Database, currentUser: CurrentUser): void {
  const row = database
    .prepare("SELECT COUNT(*) AS count FROM members")
    .get() as { count: number };
  if (row.count > 0) {
    return;
  }

  ensureHousehold(database);

  const insertMember = database.prepare(`
    INSERT INTO members (
      id, owner_id, display_name, initials, height_cm, age, sex, activity_level,
      start_weight_kg, goal_weight_kg, target_date, units, share_details,
      reminder_time, milestone_alerts, reset_grace_period_days, tone
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const member of seededMembers(currentUser)) {
    insertMember.run(
      member.id,
      currentUser.id,
      member.displayName,
      member.initials,
      member.heightCm,
      member.age,
      member.sex,
      member.activityLevel,
      member.startWeightKg,
      member.goalWeightKg,
      member.targetDate,
      member.units,
      member.shareDetails ? 1 : 0,
      member.reminderTime,
      member.milestoneAlerts ? 1 : 0,
      member.resetGracePeriodDays,
      member.tone,
    );
  }

  const insertEntry = database.prepare(`
    INSERT INTO entries (id, member_id, date, weight_kg, body_fat_pct, waist_cm, note)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const entry of seededEntries(currentUser)) {
    insertEntry.run(
      entry.id,
      entry.memberId,
      entry.date,
      entry.weightKg,
      entry.bodyFatPct,
      entry.waistCm,
      entry.note,
    );
  }
}

function ensureCurrentMember(
  database: Database,
  currentUser: CurrentUser,
): void {
  const existing = database
    .prepare("SELECT id FROM members WHERE id = ?")
    .get(currentUser.id);
  if (existing) {
    database
      .prepare(
        `UPDATE members
         SET display_name = ?,
             initials = ?,
             owner_id = COALESCE(owner_id, ?),
             updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(
        currentUser.displayName,
        initials(currentUser.displayName) || "ME",
        currentUser.id,
        currentUser.id,
      );
    return;
  }

  database
    .prepare(`
      INSERT INTO members (
        id, owner_id, display_name, initials, height_cm, age, sex, activity_level,
        start_weight_kg, goal_weight_kg, target_date, units, share_details,
        reminder_time, milestone_alerts, reset_grace_period_days, tone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      currentUser.id,
      currentUser.id,
      currentUser.displayName,
      initials(currentUser.displayName) || "ME",
      170,
      35,
      "F",
      1.375,
      75,
      68,
      daysAgo(-90).toISOString(),
      "metric",
      0,
      "08:00",
      1,
      1,
      "iris",
    );
}

function toMember(row: Record<string, unknown>, currentUserId: string): Member {
  return {
    id: String(row.id),
    displayName: String(row.display_name),
    initials: String(row.initials),
    heightCm: Number(row.height_cm),
    age: Number(row.age),
    sex: row.sex as Sex,
    activityLevel: Number(row.activity_level),
    startWeightKg: Number(row.start_weight_kg),
    goalWeightKg: Number(row.goal_weight_kg),
    targetDate: String(row.target_date),
    units: row.units as Units,
    shareDetails: bool(row.share_details),
    reminderTime: String(row.reminder_time),
    milestoneAlerts: bool(row.milestone_alerts),
    resetGracePeriodDays: Number(row.reset_grace_period_days),
    isMe: row.id === currentUserId,
    tone: String(row.tone),
  };
}

function toEntry(row: Record<string, unknown>): Entry {
  return {
    id: String(row.id),
    memberId: String(row.member_id),
    date: String(row.date),
    weightKg: Number(row.weight_kg),
    bodyFatPct: row.body_fat_pct == null ? null : Number(row.body_fat_pct),
    waistCm: row.waist_cm == null ? null : Number(row.waist_cm),
    note: row.note == null ? null : String(row.note),
  };
}

function getMemberAccess(
  database: Database,
  memberId: string,
): MemberAccess | null {
  const row = database
    .prepare("SELECT id, owner_id FROM members WHERE id = ?")
    .get(memberId) as Record<string, unknown> | undefined;

  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    ownerId: row.owner_id == null ? null : String(row.owner_id),
  };
}

function canWriteMember(
  currentUser: CurrentUser,
  member: MemberAccess,
): boolean {
  return (
    !currentUser.fromHomeAssistant ||
    member.id === currentUser.id ||
    member.ownerId === currentUser.id
  );
}

function requireMemberWriteAccess(
  database: Database,
  currentUser: CurrentUser,
  memberId: string,
): MemberAccess {
  const member = getMemberAccess(database, memberId);
  if (!member) {
    throw new Response("Member not found", { status: 404 });
  }
  if (!canWriteMember(currentUser, member)) {
    throw new Response("Member is not available to this user", {
      status: 403,
    });
  }
  return member;
}

function requireWritableNewMemberId(
  currentUser: CurrentUser,
  memberId: string,
): void {
  if (
    !currentUser.fromHomeAssistant ||
    memberId === currentUser.id ||
    memberId.startsWith("m_")
  ) {
    return;
  }

  throw new Response("Member is not available to this user", { status: 403 });
}

function storeForWrite(headers: Headers): {
  database: Database;
  currentUser: CurrentUser;
} {
  const currentUser = currentUserFromHeaders(headers);
  const database = getDb();
  ensureHousehold(database);

  if (currentUser.fromHomeAssistant) {
    ensureCurrentMember(database, currentUser);
  }

  return { database, currentUser };
}

function listMembers(database: Database, currentUserId: string): Member[] {
  const rows = database
    .prepare("SELECT * FROM members ORDER BY created_at, id")
    .all() as Record<string, unknown>[];
  const members = rows.map((row) => toMember(row, currentUserId));
  if (!members.some((member) => member.isMe) && members[0]) {
    members[0].isMe = true;
  }
  return members;
}

function listEntries(database: Database, currentUser: CurrentUser): Entry[] {
  if (!currentUser.fromHomeAssistant) {
    const rows = database
      .prepare("SELECT * FROM entries ORDER BY date DESC")
      .all() as Record<string, unknown>[];
    return rows.map(toEntry);
  }

  const rows = database
    .prepare(`
      SELECT entries.*
      FROM entries
      JOIN members ON members.id = entries.member_id
      WHERE members.id = ?
        OR members.owner_id = ?
        OR members.share_details = 1
      ORDER BY entries.date DESC
    `)
    .all(currentUser.id, currentUser.id) as Record<string, unknown>[];
  return rows.map(toEntry);
}

function household(database: Database): Household {
  const row = database
    .prepare("SELECT * FROM household WHERE id = ?")
    .get("h1") as Record<string, unknown> | undefined;

  if (!row) {
    return {
      id: "h1",
      name: "Household",
      createdAt: new Date().toISOString(),
      locale: "en-US",
    };
  }

  return {
    id: String(row.id),
    name: String(row.name),
    createdAt: String(row.created_at),
    locale: String(row.locale),
  };
}

export function bootstrap(headers: Headers): {
  members: Member[];
  entries: Entry[];
  household: Household;
  today: string;
} {
  const currentUser = currentUserFromHeaders(headers);
  const database = getDb();
  ensureHousehold(database);

  if (currentUser.fromHomeAssistant) {
    ensureCurrentMember(database, currentUser);
  } else {
    ensureSeeded(database, currentUser);
  }

  return {
    members: listMembers(database, currentUser.id),
    entries: listEntries(database, currentUser),
    household: household(database),
    today: todayAtMorning().toISOString(),
  };
}

export function saveEntry(headers: Headers, entry: Entry): Entry {
  if (entry.weightKg < 20 || entry.weightKg > 300) {
    throw new Response("Weight must be between 20 and 300 kg", { status: 422 });
  }

  const entryDate = new Date(entry.date);
  if (entryDate.getTime() > Date.now() + DAY) {
    throw new Response("Entry date cannot be in the future", { status: 422 });
  }

  const { database, currentUser } = storeForWrite(headers);
  const existingEntry = database
    .prepare("SELECT member_id FROM entries WHERE id = ?")
    .get(entry.id) as { member_id: string } | undefined;
  if (existingEntry) {
    requireMemberWriteAccess(database, currentUser, existingEntry.member_id);
  }
  requireMemberWriteAccess(database, currentUser, entry.memberId);

  const savedEntry = {
    ...entry,
    bodyFatPct: entry.bodyFatPct ?? null,
    waistCm: entry.waistCm ?? null,
    note: entry.note ?? null,
  };
  database
    .prepare(`
      INSERT INTO entries (id, member_id, date, weight_kg, body_fat_pct, waist_cm, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        member_id = excluded.member_id,
        date = excluded.date,
        weight_kg = excluded.weight_kg,
        body_fat_pct = excluded.body_fat_pct,
        waist_cm = excluded.waist_cm,
        note = excluded.note,
        updated_at = datetime('now')
    `)
    .run(
      savedEntry.id,
      savedEntry.memberId,
      savedEntry.date,
      savedEntry.weightKg,
      savedEntry.bodyFatPct,
      savedEntry.waistCm,
      savedEntry.note,
    );

  return savedEntry;
}

export function deleteEntry(headers: Headers, id: string): void {
  const { database, currentUser } = storeForWrite(headers);
  const row = database
    .prepare("SELECT member_id FROM entries WHERE id = ?")
    .get(id) as { member_id: string } | undefined;
  if (!row) {
    return;
  }

  requireMemberWriteAccess(database, currentUser, row.member_id);
  database.prepare("DELETE FROM entries WHERE id = ?").run(id);
}

export function saveMember(headers: Headers, member: Member): Member {
  if (!member.displayName?.trim()) {
    throw new Response("Member name is required", { status: 422 });
  }
  if (
    !Number.isFinite(member.heightCm) ||
    member.heightCm < 90 ||
    member.heightCm > 250
  ) {
    throw new Response("Height must be between 90 and 250 cm", { status: 422 });
  }
  if (!Number.isFinite(member.age) || member.age < 5 || member.age > 110) {
    throw new Response("Age must be between 5 and 110", { status: 422 });
  }
  if (
    !Number.isFinite(member.startWeightKg) ||
    member.startWeightKg < 20 ||
    member.startWeightKg > 300
  ) {
    throw new Response("Starting weight must be between 20 and 300 kg", {
      status: 422,
    });
  }
  if (
    !Number.isFinite(member.goalWeightKg) ||
    member.goalWeightKg < 20 ||
    member.goalWeightKg > 300
  ) {
    throw new Response("Target weight must be between 20 and 300 kg", {
      status: 422,
    });
  }

  const { database, currentUser } = storeForWrite(headers);
  const existingMember = getMemberAccess(database, member.id);
  if (existingMember) {
    requireMemberWriteAccess(database, currentUser, member.id);
  } else {
    requireWritableNewMemberId(currentUser, member.id);
  }
  const ownerId = existingMember?.ownerId ?? currentUser.id;

  database
    .prepare(`
      INSERT INTO members (
        id, owner_id, display_name, initials, height_cm, age, sex, activity_level,
        start_weight_kg, goal_weight_kg, target_date, units, share_details,
        reminder_time, milestone_alerts, reset_grace_period_days, tone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        owner_id = COALESCE(members.owner_id, excluded.owner_id),
        display_name = excluded.display_name,
        initials = excluded.initials,
        height_cm = excluded.height_cm,
        age = excluded.age,
        sex = excluded.sex,
        activity_level = excluded.activity_level,
        start_weight_kg = excluded.start_weight_kg,
        goal_weight_kg = excluded.goal_weight_kg,
        target_date = excluded.target_date,
        units = excluded.units,
        share_details = excluded.share_details,
        reminder_time = excluded.reminder_time,
        milestone_alerts = excluded.milestone_alerts,
        reset_grace_period_days = excluded.reset_grace_period_days,
        tone = excluded.tone,
        updated_at = datetime('now')
    `)
    .run(
      member.id,
      ownerId,
      member.displayName,
      member.initials || initials(member.displayName),
      member.heightCm,
      member.age,
      member.sex,
      member.activityLevel,
      member.startWeightKg,
      member.goalWeightKg,
      member.targetDate,
      member.units,
      member.shareDetails ? 1 : 0,
      member.reminderTime,
      member.milestoneAlerts ? 1 : 0,
      member.resetGracePeriodDays,
      member.tone,
    );

  return member;
}

export function updateMember(
  headers: Headers,
  id: string,
  patch: Partial<Member>,
): void {
  const allowed: [keyof Member, string][] = [
    ["displayName", "display_name"],
    ["initials", "initials"],
    ["heightCm", "height_cm"],
    ["age", "age"],
    ["sex", "sex"],
    ["activityLevel", "activity_level"],
    ["startWeightKg", "start_weight_kg"],
    ["goalWeightKg", "goal_weight_kg"],
    ["targetDate", "target_date"],
    ["units", "units"],
    ["shareDetails", "share_details"],
    ["reminderTime", "reminder_time"],
    ["milestoneAlerts", "milestone_alerts"],
    ["resetGracePeriodDays", "reset_grace_period_days"],
    ["tone", "tone"],
  ];

  const sets: string[] = [];
  const values: (string | number | null)[] = [];

  for (const [field, column] of allowed) {
    if (patch[field] !== undefined) {
      sets.push(`${column} = ?`);
      const value = patch[field];
      values.push(
        typeof value === "boolean"
          ? value
            ? 1
            : 0
          : (value as string | number | null),
      );
    }
  }

  if (sets.length === 0) {
    return;
  }

  const { database, currentUser } = storeForWrite(headers);
  requireMemberWriteAccess(database, currentUser, id);

  sets.push("updated_at = datetime('now')");
  values.push(id);
  database
    .prepare(`UPDATE members SET ${sets.join(", ")} WHERE id = ?`)
    .run(...values);
}

export function deleteMember(headers: Headers, id: string): void {
  const { database, currentUser } = storeForWrite(headers);
  requireMemberWriteAccess(database, currentUser, id);
  if (currentUser.fromHomeAssistant && id === currentUser.id) {
    throw new Response("Current user cannot be deleted", { status: 422 });
  }
  database.prepare("DELETE FROM members WHERE id = ?").run(id);
}

export function csvExport(headers: Headers): string {
  const { database, currentUser } = storeForWrite(headers);
  const query = currentUser.fromHomeAssistant
    ? `
      SELECT members.display_name, entries.date, entries.weight_kg, entries.body_fat_pct,
        entries.waist_cm, entries.note
      FROM entries
      JOIN members ON members.id = entries.member_id
      WHERE members.id = ?
        OR members.owner_id = ?
      ORDER BY members.display_name, entries.date
    `
    : `
      SELECT members.display_name, entries.date, entries.weight_kg, entries.body_fat_pct,
        entries.waist_cm, entries.note
      FROM entries
      JOIN members ON members.id = entries.member_id
      ORDER BY members.display_name, entries.date
    `;
  const rows = (
    currentUser.fromHomeAssistant
      ? database.prepare(query).all(currentUser.id, currentUser.id)
      : database.prepare(query).all()
  ) as Record<string, unknown>[];

  const escapeCsv = (value: unknown): string => {
    if (value == null) {
      return "";
    }
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };

  return [
    ["member", "date", "weight_kg", "body_fat_pct", "waist_cm", "note"].join(
      ",",
    ),
    ...rows.map((row) =>
      [
        row.display_name,
        row.date,
        row.weight_kg,
        row.body_fat_pct,
        row.waist_cm,
        row.note,
      ]
        .map(escapeCsv)
        .join(","),
    ),
  ].join("\n");
}
