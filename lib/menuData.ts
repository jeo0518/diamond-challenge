// Shared by the menu item create and update API routes.
import type { z } from "zod";
import type { optionGroupSchema } from "@/lib/validation/owner";

/** Prisma "create" data for an item's option groups and their options, in display order. */
export function optionGroupsCreateData(groups: z.infer<typeof optionGroupSchema>[]) {
  return {
    create: groups.map((g, gi) => ({
      name: g.name,
      required: g.required,
      minSelect: g.minSelect,
      maxSelect: g.maxSelect,
      sortOrder: gi,
      options: { create: g.options.map((o, oi) => ({ name: o.name, priceDelta: o.priceDelta, sortOrder: oi })) },
    })),
  };
}
