// Owner order dashboard helpers. Owners only see orders that were submitted
// (COLLECTING orders are still being put together by the organizer).
import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

export const DASHBOARD_TABS = {
  new: { label: "New", statuses: ["SUBMITTED"] },
  upcoming: { label: "Upcoming", statuses: ["ACCEPTED", "PREPARING"] },
  ready: { label: "Ready", statuses: ["READY"] },
  past: { label: "Past", statuses: ["COMPLETED", "REJECTED", "CANCELLED"] },
} satisfies Record<string, { label: string; statuses: OrderStatus[] }>;

export type DashboardTab = keyof typeof DASHBOARD_TABS;

/** Statuses an owner can see at all. */
export const OWNER_VISIBLE_STATUSES: OrderStatus[] = Object.values(DASHBOARD_TABS).flatMap((t) => t.statuses);

/** Number of new (submitted, not yet accepted/rejected) orders — powers the nav badge. */
export function countNewOrders(restaurantId: string) {
  return prisma.groupOrder.count({ where: { restaurantId, status: "SUBMITTED" } });
}

/** True if the order is due within the next 24 hours (and not finished). */
export function isDueSoon(order: { scheduledFor: Date; status: OrderStatus }, now = new Date()) {
  const hours = (order.scheduledFor.getTime() - now.getTime()) / 3_600_000;
  return ["SUBMITTED", "ACCEPTED", "PREPARING", "READY"].includes(order.status) && hours <= 24;
}

/** An order of THIS restaurant (never another one's), with everything the detail page needs. */
export function loadOwnerOrder(id: string, restaurantId: string) {
  return prisma.groupOrder.findFirst({
    where: { id, restaurantId, status: { in: OWNER_VISIBLE_STATUSES } },
    include: {
      organizer: { select: { name: true, email: true, phone: true } },
      lines: { orderBy: [{ participantName: "asc" }, { createdAt: "asc" }] },
      statusEvents: { orderBy: { createdAt: "asc" }, include: { changedBy: { select: { name: true, role: true } } } },
      restaurant: { select: { name: true, isSample: true, address: true } },
    },
  });
}
