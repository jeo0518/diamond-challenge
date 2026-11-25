// Turns a restaurant's weekly time slot rules into concrete bookable times.
// Slot times like "16:00" are in the app's time zone (APP_TIME_ZONE in .env),
// NOT the server's — hosting servers usually run on UTC.
import { appTimeZone, wallClock, zonedTime } from "@/lib/timezone";

export type SlotRule = {
  dayOfWeek: number; // 0 = Sunday
  startTime: string; // "16:00"
  endTime: string; // "20:00"
  slotMinutes: number;
  maxOrdersPerSlot: number;
};

export type Slot = {
  time: Date;
  remaining: number; // how many more group orders fit in this slot
};

const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/**
 * Every slot from now through `days` days ahead that respects the lead time.
 * `taken` maps a slot's ISO time → number of active orders already in it.
 * Full slots are included with remaining = 0 so the UI can show them as full.
 */
export function listSlots(
  rules: SlotRule[],
  leadTimeHours: number,
  taken: Map<string, number>,
  now: Date,
  days = 14,
  tz = appTimeZone(),
): Slot[] {
  const earliest = now.getTime() + leadTimeHours * 60 * 60 * 1000;
  const slots = new Map<string, Slot>(); // keyed by ISO time, in case two rules overlap

  const today = wallClock(now, tz); // today's date where the restaurants are
  for (let d = 0; d <= days; d++) {
    // Noon on that calendar day tells us its weekday (noon avoids daylight-saving edges).
    const weekday = wallClock(zonedTime(today.year, today.month, today.day + d, 12, 0, tz), tz).weekday;
    for (const rule of rules.filter((r) => r.dayOfWeek === weekday)) {
      // A slot starts every `slotMinutes`, and must start before the window ends.
      for (let m = toMinutes(rule.startTime); m < toMinutes(rule.endTime); m += rule.slotMinutes) {
        const time = zonedTime(today.year, today.month, today.day + d, Math.floor(m / 60), m % 60, tz);
        if (time.getTime() < earliest) continue;
        const key = time.toISOString();
        const remaining = Math.max(0, rule.maxOrdersPerSlot - (taken.get(key) ?? 0));
        const existing = slots.get(key);
        slots.set(key, { time, remaining: Math.max(remaining, existing?.remaining ?? 0) });
      }
    }
  }
  return [...slots.values()].sort((a, b) => a.time.getTime() - b.time.getTime());
}

/** True if `time` (lead time ignored) is one of the restaurant's weekly slot start times. */
export function isSlotTime(rules: SlotRule[], time: Date, tz = appTimeZone()): boolean {
  const w = wallClock(time, tz);
  const m = w.hour * 60 + w.minute;
  return (
    time.getUTCSeconds() === 0 &&
    rules.some(
      (r) =>
        r.dayOfWeek === w.weekday &&
        m >= toMinutes(r.startTime) &&
        m < toMinutes(r.endTime) &&
        (m - toMinutes(r.startTime)) % r.slotMinutes === 0,
    )
  );
}
