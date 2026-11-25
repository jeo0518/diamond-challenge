// Time zone handling. Restaurants' time slots ("4:00 PM on Fridays") are in the
// app's local time zone, but servers (like Vercel's) usually run on UTC.
// So we never use the server's own clock settings for dates. Everything goes
// through APP_TIME_ZONE (an IANA name like "America/Chicago", set in .env).
// v0.1: one time zone for the whole app. TODO: a time zone per restaurant.

export const DEFAULT_TIME_ZONE = "America/Chicago";

/** The app's time zone. In browser code the env var isn't available, so it falls back to the default. */
export function appTimeZone(): string {
  const tz = typeof process !== "undefined" ? process.env.APP_TIME_ZONE?.trim() : undefined;
  return tz && isValidTimeZone(tz) ? tz : DEFAULT_TIME_ZONE;
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export type WallClock = { year: number; month: number; day: number; hour: number; minute: number; weekday: number };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** What a wall clock in `tz` shows at this moment. month is 1–12, weekday 0 = Sunday. */
export function wallClock(date: Date, tz = appTimeZone()): WallClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    weekday: WEEKDAYS.indexOf(get("weekday")),
  };
}

/** How far `tz` is ahead of UTC at this moment, in milliseconds (e.g. Chicago in winter = −6 h). */
function offsetMs(date: Date, tz: string): number {
  const w = wallClock(date, tz);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute);
  return asUtc - Math.floor(date.getTime() / 60_000) * 60_000;
}

/**
 * The exact moment when a wall clock in `tz` shows this date and time.
 * e.g. zonedTime(2026, 11, 13, 16, 0, "America/Chicago") → Fri Nov 13 2026, 4:00 PM Chicago time.
 * Handles daylight saving time. month is 1–12. Day overflow (day 32) rolls into the next month.
 */
export function zonedTime(year: number, month: number, day: number, hour: number, minute: number, tz = appTimeZone()): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let result = guess - offsetMs(new Date(guess), tz);
  // Near a daylight-saving switch the offset can differ at the real moment; correct once.
  const second = guess - offsetMs(new Date(result), tz);
  if (second !== result) result = second;
  return new Date(result);
}

/** "2026-11-13T16:00" (no time zone, as from <input type="datetime-local">) → that time in the app's zone. */
export function parseLocalDateTime(value: string, tz = appTimeZone()): Date | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;
  return zonedTime(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5]), tz);
}

/** Date → "2026-11-13T16:00" in the app's zone, for <input type="datetime-local">. */
export function toLocalDateTimeInput(date: Date, tz = appTimeZone()): string {
  const w = wallClock(date, tz);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${w.year}-${pad(w.month)}-${pad(w.day)}T${pad(w.hour)}:${pad(w.minute)}`;
}
