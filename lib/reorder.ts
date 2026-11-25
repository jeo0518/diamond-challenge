// Reorder: copy an old order's lines onto the restaurant's CURRENT menu.
// Old lines store option NAMES (snapshots), so we match them back to today's
// option ids by group name + option name, then re-check them like a new item.
// Lines that no longer fit (item removed, option gone, new required choice)
// are skipped and reported to the organizer.
import { buildLineSnapshot, readOptions, type LineSnapshot, type OrderableItem } from "@/lib/orderLines";

type OldLine = {
  menuItemId: string;
  itemNameSnapshot: string;
  participantName: string;
  quantity: number;
  selectedOptionsSnapshot: unknown;
  specialInstructions: string | null;
};

export type CopiedLine = {
  participantName: string;
  menuItemId: string;
  quantity: number;
  specialInstructions: string | null;
} & LineSnapshot;

export function copyLinesToCurrentMenu(oldLines: OldLine[], currentItems: Map<string, OrderableItem>) {
  const copied: CopiedLine[] = [];
  const skipped: string[] = [];

  for (const line of oldLines) {
    const item = currentItems.get(line.menuItemId);
    const label = `${line.itemNameSnapshot} (${line.participantName})`;
    if (!item) {
      skipped.push(label);
      continue;
    }
    // Find today's option id for each old choice.
    const optionIds: string[] = [];
    let missing = false;
    for (const old of readOptions(line.selectedOptionsSnapshot)) {
      const option = item.optionGroups.find((g) => g.name === old.group)?.options.find((o) => o.name === old.option);
      if (!option) missing = true;
      else optionIds.push(option.id);
    }
    const result = missing ? null : buildLineSnapshot(item, optionIds);
    if (!result || !result.ok) {
      skipped.push(label);
      continue;
    }
    copied.push({
      participantName: line.participantName,
      menuItemId: item.id,
      quantity: line.quantity,
      specialInstructions: line.specialInstructions,
      ...result.snapshot, // today's name and price
    });
  }
  return { copied, skipped };
}
