// Kitchen summary: how many of each item + option combination to make,
// across everyone in the order. e.g. "Burrito — Chicken, Mild × 23".
import { readOptions } from "@/lib/orderLines";

type Line = { itemNameSnapshot: string; quantity: number; selectedOptionsSnapshot: unknown; specialInstructions: string | null };

export type KitchenRow = {
  item: string;
  options: string; // "Chicken, Mild" ("" if no options)
  quantity: number;
  notes: string[]; // special instructions, e.g. ["no onions (×2)"]
};

export function kitchenSummary(lines: Line[]): KitchenRow[] {
  const rows = new Map<string, KitchenRow & { noteCounts: Map<string, number> }>();
  for (const line of lines) {
    const options = readOptions(line.selectedOptionsSnapshot).map((o) => o.option).join(", ");
    const key = `${line.itemNameSnapshot}|${options}`;
    const row = rows.get(key) ?? { item: line.itemNameSnapshot, options, quantity: 0, notes: [], noteCounts: new Map() };
    row.quantity += line.quantity;
    if (line.specialInstructions) {
      row.noteCounts.set(line.specialInstructions, (row.noteCounts.get(line.specialInstructions) ?? 0) + line.quantity);
    }
    rows.set(key, row);
  }
  return [...rows.values()]
    .map(({ noteCounts, ...row }) => ({
      ...row,
      notes: [...noteCounts.entries()].map(([note, n]) => (n > 1 ? `${note} (×${n})` : note)),
    }))
    .sort((a, b) => a.item.localeCompare(b.item) || b.quantity - a.quantity);
}
