// Small display helpers. Money is always stored as integer cents.

/** 1250 → "$12.50" */
export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** Price delta for an option: 0 → "", 150 → "+$1.50", -100 → "−$1.00" */
export function formatDelta(cents: number): string {
  if (cents === 0) return "";
  return `${cents > 0 ? "+" : "−"}${formatCents(Math.abs(cents))}`;
}

/** 3.456 → "3.5 mi", 0.42 → "0.4 mi" */
export function formatMiles(miles: number): string {
  return `${miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi`;
}

/** "16:00" → "4:00 PM" */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** 24 → "24 hours", 1 → "1 hour", 48 → "48 hours (2 days)" */
export function formatLeadTime(hours: number): string {
  const base = `${hours} hour${hours === 1 ? "" : "s"}`;
  return hours >= 48 && hours % 24 === 0 ? `${base} (${hours / 24} days)` : base;
}

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
