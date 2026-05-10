import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type {
  Entry,
  Household,
  Member,
  MemberAccess,
  Sex,
  Units,
} from "../lib/types";

export type { Entry, Member } from "../lib/types";

type CurrentUser = {
  id: string;
  displayName: string;
  fromHomeAssistant: boolean;
};

// SQLite stores everything as TEXT/INTEGER/REAL. These row shapes describe
// what we expect each column to come back as so that toMember/toEntry/etc.
// can do the narrowing in one place.
type MemberRow = {
  id: string;
  display_name: string;
  initials: string;
  height_cm: number | null;
  age: number | null;
  sex: string | null;
  activity_level: number | null;
  start_weight_kg: number | null;
  goal_weight_kg: number | null;
  target_date: string | null;
  units: string | null;
  theme: string;
  share_details: number;
  reminder_time: string;
  milestone_alerts: number;
  reset_grace_period_days: number;
  tone: string;
  profile_complete: number;
  owner_id: string | null;
};

type EntryRow = {
  id: string;
  member_id: string;
  date: string;
  weight_kg: number;
  body_fat_pct: number | null;
  waist_cm: number | null;
  note: string | null;
};

type MemberAccessRow = {
  id: string;
  owner_id: string | null;
  profile_complete: number;
};

type HouseholdRow = {
  id: string;
  name: string;
  created_at: string;
  locale: string;
};

type MemberIdRow = { member_id: string };
type CountRow = { count: number };
type ColumnInfoRow = { name: string; notnull: number };
type CsvExportRow = {
  display_name: string;
  date: string;
  weight_kg: number;
  body_fat_pct: number | null;
  waist_cm: number | null;
  note: string | null;
};

const DAY = 86_400_000;
const DEV_USER = {
  id: "dev-user-001",
  displayName: "Development User",
};
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
  const username =
    headers.get("x-ha-user-name") ??
    headers.get("x-remote-user-name") ??
    headers.get("x-user-name");
  const displayName =
    headers.get("x-ha-user-display-name") ??
    headers.get("x-remote-user-display-name") ??
    username ??
    "Home Assistant User";

  if (id) {
    return { id, displayName, fromHomeAssistant: true };
  }

  if (Bun.env.NODE_ENV !== "production") {
    return {
      id: DEV_USER.id,
      displayName: DEV_USER.displayName,
      fromHomeAssistant: true,
    };
  }

  throw new Response("Home Assistant ingress user is required", {
    status: 401,
  });
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
      height_cm                REAL,
      age                      INTEGER,
      sex                      TEXT CHECK (sex IN ('M', 'F') OR sex IS NULL),
      activity_level           REAL,
      start_weight_kg          REAL,
      goal_weight_kg           REAL,
      target_date              TEXT,
      units                    TEXT CHECK (units IN ('metric', 'imperial', 'uk') OR units IS NULL),
      theme                    TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('system', 'light', 'dark')),
      share_details            INTEGER NOT NULL,
      reminder_time            TEXT NOT NULL,
      milestone_alerts         INTEGER NOT NULL,
      reset_grace_period_days  INTEGER NOT NULL,
      tone                     TEXT NOT NULL,
      profile_complete         INTEGER NOT NULL DEFAULT 0,
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
  const columns = database
    .prepare<ColumnInfoRow, []>("PRAGMA table_info(members)")
    .all();
  const columnNames = new Set(columns.map((column) => column.name));
  if (!columns.some((column) => column.name === "owner_id")) {
    database.exec("ALTER TABLE members ADD COLUMN owner_id TEXT");
  }
  if (!columns.some((column) => column.name === "profile_complete")) {
    database.exec(
      "ALTER TABLE members ADD COLUMN profile_complete INTEGER NOT NULL DEFAULT 0",
    );
  }
  if (!columns.some((column) => column.name === "theme")) {
    database.exec(
      "ALTER TABLE members ADD COLUMN theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('system', 'light', 'dark'))",
    );
  }

  if (
    [
      "height_cm",
      "age",
      "sex",
      "activity_level",
      "start_weight_kg",
      "goal_weight_kg",
      "target_date",
      "units",
    ].some((columnName) =>
      columns.some(
        (column) => column.name === columnName && column.notnull === 1,
      ),
    )
  ) {
    rebuildMembersTable(database, columnNames);
  }

  clearHardcodedProfileDefaults(database);
  refreshAllProfileComplete(database);
}

function rebuildMembersTable(
  database: Database,
  oldColumns: Set<string>,
): void {
  const ownerId = oldColumns.has("owner_id") ? "owner_id" : "NULL";
  const profileComplete = oldColumns.has("profile_complete")
    ? "profile_complete"
    : "0";
  const theme = oldColumns.has("theme") ? "theme" : "'system'";

  database.exec("PRAGMA foreign_keys = OFF");
  try {
    database.exec(`
      BEGIN;

      CREATE TABLE members_new (
        id                       TEXT PRIMARY KEY,
        owner_id                 TEXT,
        display_name             TEXT NOT NULL,
        initials                 TEXT NOT NULL,
        height_cm                REAL,
        age                      INTEGER,
        sex                      TEXT CHECK (sex IN ('M', 'F') OR sex IS NULL),
        activity_level           REAL,
        start_weight_kg          REAL,
        goal_weight_kg           REAL,
        target_date              TEXT,
        units                    TEXT CHECK (units IN ('metric', 'imperial', 'uk') OR units IS NULL),
        theme                    TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('system', 'light', 'dark')),
        share_details            INTEGER NOT NULL,
        reminder_time            TEXT NOT NULL,
        milestone_alerts         INTEGER NOT NULL,
        reset_grace_period_days  INTEGER NOT NULL,
        tone                     TEXT NOT NULL,
        profile_complete         INTEGER NOT NULL DEFAULT 0,
        created_at               TEXT DEFAULT (datetime('now')),
        updated_at               TEXT DEFAULT (datetime('now'))
      );

      INSERT INTO members_new (
        id, owner_id, display_name, initials, height_cm, age, sex,
        activity_level, start_weight_kg, goal_weight_kg, target_date,
        units, theme, share_details, reminder_time, milestone_alerts,
        reset_grace_period_days, tone, profile_complete, created_at, updated_at
      )
      SELECT
        id, ${ownerId}, display_name, initials, height_cm, age, sex,
        activity_level, start_weight_kg, goal_weight_kg, target_date,
        units, ${theme}, share_details, reminder_time, milestone_alerts,
        reset_grace_period_days, tone, ${profileComplete}, created_at, updated_at
      FROM members;

      DROP TABLE members;
      ALTER TABLE members_new RENAME TO members;

      COMMIT;
    `);
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  } finally {
    database.exec("PRAGMA foreign_keys = ON");
  }
}

function clearHardcodedProfileDefaults(database: Database): void {
  database
    .prepare(`
      UPDATE members
      SET height_cm = NULL,
          age = NULL,
          sex = NULL,
          activity_level = NULL,
          start_weight_kg = NULL,
          goal_weight_kg = NULL,
          target_date = NULL,
          units = NULL,
          profile_complete = 0,
          updated_at = datetime('now')
      WHERE height_cm = 170
        AND age = 35
        AND sex = 'F'
        AND activity_level = 1.375
        AND start_weight_kg = 75
        AND goal_weight_kg = 68
        AND NOT EXISTS (
          SELECT 1 FROM entries WHERE entries.member_id = members.id
        )
    `)
    .run();
}

function refreshAllProfileComplete(database: Database): void {
  database.exec(`
    UPDATE members
    SET profile_complete = CASE
      WHEN height_cm IS NOT NULL
        AND age IS NOT NULL
        AND sex IS NOT NULL
        AND activity_level IS NOT NULL
        AND start_weight_kg IS NOT NULL
        AND goal_weight_kg IS NOT NULL
        AND target_date IS NOT NULL
        AND units IS NOT NULL
      THEN 1
      ELSE 0
    END
  `);
}

function refreshProfileComplete(database: Database, memberId: string): void {
  database
    .prepare(`
      UPDATE members
      SET profile_complete = CASE
        WHEN height_cm IS NOT NULL
          AND age IS NOT NULL
          AND sex IS NOT NULL
          AND activity_level IS NOT NULL
          AND start_weight_kg IS NOT NULL
          AND goal_weight_kg IS NOT NULL
          AND target_date IS NOT NULL
          AND units IS NOT NULL
        THEN 1
        ELSE 0
      END
      WHERE id = ?
    `)
    .run(memberId);
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
      theme: "system",
      shareDetails: true,
      reminderTime: "07:30",
      milestoneAlerts: true,
      resetGracePeriodDays: 1,
      tone: "iris",
      profileComplete: true,
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
      theme: "system",
      shareDetails: false,
      reminderTime: "06:45",
      milestoneAlerts: true,
      resetGracePeriodDays: 1,
      tone: "theo",
      profileComplete: true,
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
      theme: "system",
      shareDetails: true,
      reminderTime: "08:00",
      milestoneAlerts: false,
      resetGracePeriodDays: 2,
      tone: "margot",
      profileComplete: true,
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
      theme: "system",
      shareDetails: false,
      reminderTime: "07:00",
      milestoneAlerts: true,
      resetGracePeriodDays: 1,
      tone: "sam",
      profileComplete: true,
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
    .prepare<CountRow, []>("SELECT COUNT(*) AS count FROM members")
    .get();
  if (row && row.count > 0) {
    return;
  }

  ensureHousehold(database);

  const insertMember = database.prepare(`
    INSERT INTO members (
      id, owner_id, display_name, initials, height_cm, age, sex, activity_level,
      start_weight_kg, goal_weight_kg, target_date, units, theme, share_details,
      reminder_time, milestone_alerts, reset_grace_period_days, tone,
      profile_complete
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      member.theme,
      member.shareDetails ? 1 : 0,
      member.reminderTime,
      member.milestoneAlerts ? 1 : 0,
      member.resetGracePeriodDays,
      member.tone,
      member.profileComplete ? 1 : 0,
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
        id, owner_id, display_name, initials, units, theme, share_details,
        reminder_time, milestone_alerts, reset_grace_period_days, tone,
        profile_complete
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      currentUser.id,
      currentUser.id,
      currentUser.displayName,
      initials(currentUser.displayName) || "ME",
      null,
      "system",
      0,
      "08:00",
      1,
      1,
      "iris",
      0,
    );
}

function toMember(row: MemberRow, currentUserId: string): Member {
  return {
    id: row.id,
    displayName: row.display_name,
    initials: row.initials,
    heightCm: row.height_cm,
    age: row.age,
    sex: row.sex == null ? null : (row.sex as Sex),
    activityLevel: row.activity_level,
    startWeightKg: row.start_weight_kg,
    goalWeightKg: row.goal_weight_kg,
    targetDate: row.target_date,
    units: row.units == null ? null : (row.units as Units),
    theme: row.theme === "light" || row.theme === "dark" ? row.theme : "system",
    shareDetails: bool(row.share_details),
    reminderTime: row.reminder_time,
    milestoneAlerts: bool(row.milestone_alerts),
    resetGracePeriodDays: row.reset_grace_period_days,
    isMe: row.id === currentUserId,
    tone: row.tone,
    profileComplete: bool(row.profile_complete),
  };
}

function toEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    memberId: row.member_id,
    date: row.date,
    weightKg: row.weight_kg,
    bodyFatPct: row.body_fat_pct,
    waistCm: row.waist_cm,
    note: row.note,
  };
}

function getMemberAccess(
  database: Database,
  memberId: string,
): MemberAccess | null {
  const row = database
    .prepare<MemberAccessRow, [string]>(
      "SELECT id, owner_id, profile_complete FROM members WHERE id = ?",
    )
    .get(memberId);

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    ownerId: row.owner_id,
    profileComplete: bool(row.profile_complete),
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

function validateProfilePatch(patch: Partial<Member>): void {
  if (
    patch.heightCm !== undefined &&
    patch.heightCm !== null &&
    (!Number.isFinite(patch.heightCm) ||
      patch.heightCm < 90 ||
      patch.heightCm > 250)
  ) {
    throw new Response("Height must be between 90 and 250 cm", { status: 422 });
  }
  if (
    patch.age !== undefined &&
    patch.age !== null &&
    (!Number.isFinite(patch.age) || patch.age < 5 || patch.age > 110)
  ) {
    throw new Response("Age must be between 5 and 110", { status: 422 });
  }
  if (
    patch.sex !== undefined &&
    patch.sex !== null &&
    patch.sex !== "M" &&
    patch.sex !== "F"
  ) {
    throw new Response("Sex must be M or F", { status: 422 });
  }
  if (
    patch.activityLevel !== undefined &&
    patch.activityLevel !== null &&
    (!Number.isFinite(patch.activityLevel) ||
      patch.activityLevel < 1 ||
      patch.activityLevel > 2.5)
  ) {
    throw new Response("Activity level must be between 1 and 2.5", {
      status: 422,
    });
  }
  if (
    patch.startWeightKg !== undefined &&
    patch.startWeightKg !== null &&
    (!Number.isFinite(patch.startWeightKg) ||
      patch.startWeightKg < 20 ||
      patch.startWeightKg > 300)
  ) {
    throw new Response("Starting weight must be between 20 and 300 kg", {
      status: 422,
    });
  }
  if (
    patch.goalWeightKg !== undefined &&
    patch.goalWeightKg !== null &&
    (!Number.isFinite(patch.goalWeightKg) ||
      patch.goalWeightKg < 20 ||
      patch.goalWeightKg > 300)
  ) {
    throw new Response("Target weight must be between 20 and 300 kg", {
      status: 422,
    });
  }
  if (
    patch.units !== undefined &&
    patch.units !== null &&
    patch.units !== "metric" &&
    patch.units !== "imperial" &&
    patch.units !== "uk"
  ) {
    throw new Response("Units must be metric, imperial, or uk", {
      status: 422,
    });
  }
  if (
    patch.targetDate !== undefined &&
    patch.targetDate !== null &&
    Number.isNaN(new Date(patch.targetDate).getTime())
  ) {
    throw new Response("Target date must be a valid date", { status: 422 });
  }
  if (
    patch.theme !== undefined &&
    patch.theme !== "system" &&
    patch.theme !== "light" &&
    patch.theme !== "dark"
  ) {
    throw new Response("Theme must be system, light, or dark", {
      status: 422,
    });
  }
}

function requireCompleteProfile(member: MemberAccess): void {
  if (!member.profileComplete) {
    throw new Response("Member profile is incomplete", { status: 422 });
  }
}

function listMembers(database: Database, currentUserId: string): Member[] {
  const rows = database
    .prepare<MemberRow, []>("SELECT * FROM members ORDER BY created_at, id")
    .all();
  const members = rows.map((row) => toMember(row, currentUserId));
  if (!members.some((member) => member.isMe) && members[0]) {
    members[0].isMe = true;
  }
  return members;
}

function listEntries(database: Database, currentUser: CurrentUser): Entry[] {
  if (!currentUser.fromHomeAssistant) {
    const rows = database
      .prepare<EntryRow, []>("SELECT * FROM entries ORDER BY date DESC")
      .all();
    return rows.map(toEntry);
  }

  const rows = database
    .prepare<EntryRow, [string, string]>(`
      SELECT entries.*
      FROM entries
      JOIN members ON members.id = entries.member_id
      WHERE members.id = ?
        OR members.owner_id = ?
        OR members.share_details = 1
      ORDER BY entries.date DESC
    `)
    .all(currentUser.id, currentUser.id);
  return rows.map(toEntry);
}

function household(database: Database): Household {
  const row = database
    .prepare<HouseholdRow, [string]>("SELECT * FROM household WHERE id = ?")
    .get("h1");

  if (!row) {
    return {
      id: "h1",
      name: "Household",
      createdAt: new Date().toISOString(),
      locale: "en-US",
    };
  }

  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    locale: row.locale,
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
    .prepare<MemberIdRow, [string]>(
      "SELECT member_id FROM entries WHERE id = ?",
    )
    .get(entry.id);
  if (existingEntry) {
    requireMemberWriteAccess(database, currentUser, existingEntry.member_id);
  }
  const member = requireMemberWriteAccess(
    database,
    currentUser,
    entry.memberId,
  );
  requireCompleteProfile(member);

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
    .prepare<MemberIdRow, [string]>(
      "SELECT member_id FROM entries WHERE id = ?",
    )
    .get(id);
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
  validateProfilePatch(member);
  const heightCm = member.heightCm;
  const age = member.age;
  const sex = member.sex;
  const activityLevel = member.activityLevel;
  const startWeightKg = member.startWeightKg;
  const goalWeightKg = member.goalWeightKg;
  const targetDate = member.targetDate;
  const units = member.units;
  const theme = member.theme ?? "system";
  if (
    !Number.isFinite(heightCm) ||
    heightCm === null ||
    heightCm < 90 ||
    heightCm > 250
  ) {
    throw new Response("Height must be between 90 and 250 cm", { status: 422 });
  }
  if (!Number.isFinite(age) || age === null || age < 5 || age > 110) {
    throw new Response("Age must be between 5 and 110", { status: 422 });
  }
  if (sex !== "M" && sex !== "F") {
    throw new Response("Sex must be M or F", { status: 422 });
  }
  if (
    !Number.isFinite(activityLevel) ||
    activityLevel === null ||
    activityLevel < 1 ||
    activityLevel > 2.5
  ) {
    throw new Response("Activity level must be between 1 and 2.5", {
      status: 422,
    });
  }
  if (
    !Number.isFinite(startWeightKg) ||
    startWeightKg === null ||
    startWeightKg < 20 ||
    startWeightKg > 300
  ) {
    throw new Response("Starting weight must be between 20 and 300 kg", {
      status: 422,
    });
  }
  if (
    !Number.isFinite(goalWeightKg) ||
    goalWeightKg === null ||
    goalWeightKg < 20 ||
    goalWeightKg > 300
  ) {
    throw new Response("Target weight must be between 20 and 300 kg", {
      status: 422,
    });
  }
  if (!targetDate || Number.isNaN(new Date(targetDate).getTime())) {
    throw new Response("Target date must be a valid date", { status: 422 });
  }
  if (!units) {
    throw new Response("Units are required", { status: 422 });
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
        start_weight_kg, goal_weight_kg, target_date, units, theme, share_details,
        reminder_time, milestone_alerts, reset_grace_period_days, tone,
        profile_complete
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        theme = excluded.theme,
        share_details = excluded.share_details,
        reminder_time = excluded.reminder_time,
        milestone_alerts = excluded.milestone_alerts,
        reset_grace_period_days = excluded.reset_grace_period_days,
        tone = excluded.tone,
        profile_complete = excluded.profile_complete,
        updated_at = datetime('now')
    `)
    .run(
      member.id,
      ownerId,
      member.displayName,
      member.initials || initials(member.displayName),
      heightCm,
      age,
      sex,
      activityLevel,
      startWeightKg,
      goalWeightKg,
      targetDate,
      units,
      theme,
      member.shareDetails ? 1 : 0,
      member.reminderTime,
      member.milestoneAlerts ? 1 : 0,
      member.resetGracePeriodDays,
      member.tone,
      1,
    );

  return { ...member, theme, profileComplete: true };
}

export function updateMember(
  headers: Headers,
  id: string,
  patch: Partial<Member>,
): void {
  validateProfilePatch(patch);

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
    ["theme", "theme"],
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
  refreshProfileComplete(database, id);
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
  const rows = currentUser.fromHomeAssistant
    ? database
        .prepare<CsvExportRow, [string, string]>(query)
        .all(currentUser.id, currentUser.id)
    : database.prepare<CsvExportRow, []>(query).all();

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
