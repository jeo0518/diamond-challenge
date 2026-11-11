// Database helpers for group orders, shared by pages and API routes.
import { randomBytes } from "node:crypto";
import type { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ACTIVE_STATUSES, canTransition } from "@/lib/orderStatus";
import { listSlots } from "@/lib/timeSlots";
import { buildLineSnapshot } from "@/lib/orderLines";
import type { z } from "zod";
import type { addLineSchema } from "@/lib/validation/groupOrder";

/** Menu shown to people adding items: visible categories, available items, options in order. */
export function loadOrderableMenu(restaurantId: string) {
  return prisma.menuCategory.findMany({
    where: { restaurantId, isDeleted: false },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      items: {
        where: { isAvailable: true, isDeleted: false },
        orderBy: { name: "asc" },
        include: { optionGroups: { orderBy: { sortOrder: "asc" }, include: { options: { orderBy: { sortOrder: "asc" } } } } },
      },
    },
  });
}
export type OrderableMenu = Awaited<ReturnType<typeof loadOrderableMenu>>;

/** How many active group orders are already booked at `time` (optionally ignoring one order). */
export function countOrdersInSlot(restaurantId: string, time: Date, excludeOrderId?: string) {
  return prisma.groupOrder.count({
    where: {
      restaurantId,
      scheduledFor: time,
      status: { in: ACTIVE_STATUSES },
      ...(excludeOrderId ? { id: { not: excludeOrderId } } : {}),
    },
  });
}

/** Bookable slots for the next two weeks, with remaining capacity. */
export async function availableSlots(restaurant: { id: string; leadTimeHours: number }, now = new Date()) {
  const [rules, booked] = await Promise.all([
    prisma.timeSlotRule.findMany({ where: { restaurantId: restaurant.id } }),
    prisma.groupOrder.groupBy({
      by: ["scheduledFor"],
      where: { restaurantId: restaurant.id, status: { in: ACTIVE_STATUSES }, scheduledFor: { gte: now } },
      _count: true,
    }),
  ]);
  const taken = new Map(booked.map((b) => [b.scheduledFor.toISOString(), b._count]));
  return listSlots(rules, restaurant.leadTimeHours, taken, now);
}

/**
 * Changes an order's status and logs it to OrderStatusEvent, in one transaction.
 * Throws if the move isn't allowed (see lib/orderStatus.ts).
 */
export async function changeStatus(
  tx: Prisma.TransactionClient,
  order: { id: string; status: OrderStatus },
  to: OrderStatus,
  changedByUserId: string | null,
  note?: string,
  extraData: Prisma.GroupOrderUpdateManyMutationInput = {},
) {
  if (!canTransition(order.status, to)) throw new Error(`Can't change an order from ${order.status} to ${to}.`);
  // `where status` guards against two people changing it at the same moment.
  const updated = await tx.groupOrder.updateMany({
    where: { id: order.id, status: order.status },
    data: { ...extraData, status: to },
  });
  if (updated.count !== 1) throw new Error("This order was just changed by someone else. Refresh and try again.");
  await tx.orderStatusEvent.create({
    data: { groupOrderId: order.id, fromStatus: order.status, toStatus: to, changedByUserId, note },
  });
}

/** Validates the item + options against the menu and saves an order line with snapshots. */
export async function addOrderLine(
  order: { id: string; restaurantId: string },
  input: z.infer<typeof addLineSchema>,
  participantToken: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string; status: number }> {
  const item = await prisma.menuItem.findFirst({
    where: { id: input.menuItemId, restaurantId: order.restaurantId, category: { isDeleted: false } },
    include: { optionGroups: { include: { options: true } } },
  });
  if (!item) return { ok: false, error: "That item isn't on this restaurant's menu.", status: 404 };

  const result = buildLineSnapshot(item, input.optionIds);
  if (!result.ok) return { ok: false, error: result.error, status: 400 };

  const line = await prisma.orderLine.create({
    data: {
      groupOrderId: order.id,
      participantName: input.participantName,
      participantToken,
      menuItemId: item.id,
      quantity: input.quantity,
      specialInstructions: input.specialInstructions,
      ...result.snapshot,
    },
  });
  return { ok: true, id: line.id };
}

/** A random token for lines the organizer adds on someone's behalf. */
export function makeOrganizerToken() {
  return "org_" + randomBytes(16).toString("hex");
}

/** The organizer's own order (or null if it isn't theirs), with everything the summary page needs. */
export function loadOrganizerOrder(id: string, organizerId: string) {
  return prisma.groupOrder.findFirst({
    where: { id, organizerId },
    include: {
      restaurant: { include: { discountTiers: true } },
      lines: { orderBy: [{ participantName: "asc" }, { createdAt: "asc" }], include: { menuItem: true } },
    },
  });
}

/** Plain menu data for the client-side item picker. */
export type PickerMenu = {
  id: string;
  name: string;
  items: {
    id: string;
    name: string;
    description: string;
    basePrice: number;
    optionGroups: { id: string; name: string; required: boolean; minSelect: number; maxSelect: number; options: { id: string; name: string; priceDelta: number }[] }[];
  }[];
}[];

export function toPickerMenu(menu: OrderableMenu): PickerMenu {
  return menu
    .filter((c) => c.items.length > 0)
    .map((c) => ({
      id: c.id,
      name: c.name,
      items: c.items.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        basePrice: i.basePrice,
        optionGroups: i.optionGroups.map((g) => ({
          id: g.id,
          name: g.name,
          required: g.required,
          minSelect: g.minSelect,
          maxSelect: g.maxSelect,
          options: g.options.map((o) => ({ id: o.id, name: o.name, priceDelta: o.priceDelta })),
        })),
      })),
    }));
}
