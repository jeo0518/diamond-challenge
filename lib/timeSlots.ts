// Turns a restaurant's weekly time slot rules into concrete bookable times.
//
// v0.1 note: slot times like "16:00" are read in the SERVER's time zone.
// That's fine when everyone runs the app on one computer in one place.
// TODO: store a time zone per restaurant before supporting multiple regions.

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
): Slot[] {
  const earliest = now.getTime() + leadTimeHours * 60 * 60 * 1000;
  const slots = new Map<string, Slot>(); // keyed by ISO time, in case two rules overlap

  for (let d = 0; d <= days; d++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
    for (const rule of rules.filter((r) => r.dayOfWeek === day.getDay())) {
      // A slot starts every `slotMinutes`, and must start before the window ends.
      for (let m = toMinutes(rule.startTime); m < toMinutes(rule.endTime); m += rule.slotMinutes) {
        const time = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(m / 60), m % 60);
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
export function isSlotTime(rules: SlotRule[], time: Date): boolean {
  const m = time.getHours() * 60 + time.getMinutes();
  return (
    time.getSeconds() === 0 &&
    rules.some(
      (r) =>
        r.dayOfWeek === time.getDay() &&
        m >= toMinutes(r.startTime) &&
        m < toMinutes(r.endTime) &&
        (m - toMinutes(r.startTime)) % r.slotMinutes === 0,
    )
  );
}
