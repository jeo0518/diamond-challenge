// POST /api/group-orders/[id]/submit — checks the rules, prices the order ON THE SERVER,
// freezes the totals, and sends it to the restaurant (status → SUBMITTED).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { changeStatus, countOrdersInSlot, loadOrganizerOrder } from "@/lib/groupOrders";
import { priceGroupOrder } from "@/lib/groupOrderPricing";
import { submitProblems } from "@/lib/submitChecks";
import { isSlotTime } from "@/lib/timeSlots";
import { requireRoleApi } from "@/lib/session";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRoleApi("CUSTOMER");
  if (auth.error) return auth.error;
  const { id } = await params;
  const order = await loadOrganizerOrder(id, auth.user.id);
  if (!order) return NextResponse.json({ error: "Group order not found." }, { status: 404 });
  const { restaurant } = order;

  // Prices are calculated here from the database — never from numbers sent by the browser.
  const bulkRules = new Map(order.lines.map((l) => [l.menuItemId, l.menuItem]));
  const price = priceGroupOrder(order.lines, bulkRules, restaurant, order.fulfillment);

  // Capacity: other active orders in the same slot (this order already holds one place).
  const dayRules = await prisma.timeSlotRule.findMany({
    where: { restaurantId: restaurant.id, dayOfWeek: order.scheduledFor.getDay() },
  });
  const coveringRules = dayRules.filter((r) => isSlotTime([r], order.scheduledFor));
  const capacity = Math.max(0, ...coveringRules.map((r) => r.maxOrdersPerSlot));
  const others = await countOrdersInSlot(restaurant.id, order.scheduledFor, order.id);

  const problems = submitProblems({
    status: order.status,
    acceptsGroupOrders: restaurant.acceptsGroupOrders,
    totalQty: price.totalQty,
    minGroupSize: restaurant.minGroupSize,
    maxGroupSize: restaurant.maxGroupSize,
    scheduledFor: order.scheduledFor,
    leadTimeHours: restaurant.leadTimeHours,
    now: new Date(),
    unavailableItems: [...new Set(order.lines.filter((l) => !l.menuItem.isAvailable || l.menuItem.isDeleted).map((l) => l.itemNameSnapshot))],
    // If the owner removed this time slot, capacity is 0 and the order can't be submitted.
    slotIsFull: others >= capacity,
  });
  if (problems.length > 0) return NextResponse.json({ error: problems.join(" "), problems }, { status: 400 });

  // TODO: payments — v0.1 has no online payment. The total is shown and paid outside the app
  // (e.g. at pickup). A payment step (e.g. Stripe) would go here, before the order is submitted.

  try {
    await prisma.$transaction((tx) =>
      changeStatus(tx, order, "SUBMITTED", auth.user.id, `${price.totalQty} items sent to the restaurant`, {
        subtotalCents: price.subtotal,
        discountCents: price.discount,
        feesCents: price.fees,
        totalCents: price.total,
        submittedAt: new Date(),
        participantDeadline: order.participantDeadline > new Date() ? new Date() : undefined, // close collection
      }),
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }
  return NextResponse.json({ ok: true, totalCents: price.total });
}
