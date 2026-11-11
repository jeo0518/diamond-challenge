// Checks a customer's option choices against the menu item's option groups,
// then builds the SNAPSHOT saved on the order line (name, price, options).
// Snapshots mean later menu edits never change an existing order.

export type SelectedOption = { group: string; option: string; priceDelta: number };

export type OrderableItem = {
  id: string;
  name: string;
  basePrice: number;
  isAvailable: boolean;
  isDeleted: boolean;
  optionGroups: {
    id: string;
    name: string;
    required: boolean;
    minSelect: number;
    maxSelect: number;
    options: { id: string; name: string; priceDelta: number }[];
  }[];
};

export type LineSnapshot = {
  itemNameSnapshot: string;
  unitPriceSnapshot: number; // the item's base price in cents (options are stored separately)
  selectedOptionsSnapshot: SelectedOption[];
};

export function buildLineSnapshot(
  item: OrderableItem,
  optionIds: string[],
): { ok: true; snapshot: LineSnapshot } | { ok: false; error: string } {
  if (!item.isAvailable || item.isDeleted) return { ok: false, error: `${item.name} isn't available right now.` };
  if (new Set(optionIds).size !== optionIds.length) return { ok: false, error: "The same option was picked twice." };

  const chosen = new Set(optionIds);
  const selected: SelectedOption[] = [];
  let matched = 0;

  for (const group of item.optionGroups) {
    const picks = group.options.filter((o) => chosen.has(o.id));
    matched += picks.length;
    const min = group.required ? Math.max(1, group.minSelect) : group.minSelect;
    if (picks.length < min) {
      return { ok: false, error: min === 1 ? `Choose a ${group.name.toLowerCase()}.` : `Choose at least ${min} for ${group.name}.` };
    }
    if (picks.length > group.maxSelect) {
      return { ok: false, error: `Choose at most ${group.maxSelect} for ${group.name}.` };
    }
    for (const o of picks) selected.push({ group: group.name, option: o.name, priceDelta: o.priceDelta });
  }
  // Every option id must belong to this item.
  if (matched !== optionIds.length) return { ok: false, error: "Some options don't belong to this item." };

  return {
    ok: true,
    snapshot: { itemNameSnapshot: item.name, unitPriceSnapshot: item.basePrice, selectedOptionsSnapshot: selected },
  };
}

/** Reads the JSON snapshot column back as a typed list. */
export function readOptions(json: unknown): SelectedOption[] {
  return Array.isArray(json) ? (json as SelectedOption[]) : [];
}

/** "Large, Bacon, Extra cheese" */
export function describeOptions(options: SelectedOption[]): string {
  return options.map((o) => o.option).join(", ");
}

/** Unit price of a line as the participant sees it: base price + options (before any group discount). */
export function lineUnitPrice(line: { unitPriceSnapshot: number; selectedOptionsSnapshot: unknown }): number {
  return line.unitPriceSnapshot + readOptions(line.selectedOptionsSnapshot).reduce((sum, o) => sum + o.priceDelta, 0);
}
