export type DateFormatOptions = {
  relative?: boolean;
  year?: boolean;
};

export function fmtDate(
  d: string | number | Date,
  opts: DateFormatOptions = {},
): string {
  const date = new Date(d);
  const today = window.__fixtures?.today ?? new Date();
  const daysDiff = Math.round((+today - +date) / 86_400_000);
  if (opts.relative) {
    if (daysDiff === 0) return "Today";
    if (daysDiff === 1) return "Yesterday";
    if (daysDiff < 7) return `${daysDiff} days ago`;
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: opts.year ? "numeric" : undefined,
  });
}

export function fmtDateLong(d: string | number | Date): string {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Mantine's DateInput returns "YYYY-MM-DD" strings which `new Date(...)` parses
 * as UTC midnight — that shifts to the previous day in negative-UTC timezones.
 * Build the date in local time so the picked day round-trips correctly.
 */
export function parseFormDate(value: unknown): Date | null {
  if (value instanceof Date) return new Date(value);
  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }
    return new Date(value);
  }
  return null;
}

/**
 * Local-time YYYY-MM-DD key, used for entry IDs and de-duplication so the day
 * stays consistent regardless of the host's timezone offset.
 */
export function formatLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase();
}
