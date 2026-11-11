// Shared by the organizer's /api/group-orders/[id]/... routes.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRoleApi } from "@/lib/session";

/**
 * Checks the caller is a customer AND the organizer of this order.
 * Returns { user, order } or { error }.
 */
export async function requireOrganizerApi(orderId: string) {
  const auth = await requireRoleApi("CUSTOMER");
  if (auth.error) return { error: auth.error };
  const order = await prisma.groupOrder.findFirst({ where: { id: orderId, organizerId: auth.user.id } });
  if (!order) return { error: NextResponse.json({ error: "Group order not found." }, { status: 404 }) };
  return { user: auth.user, order };
}

export const notCollecting = () =>
  NextResponse.json({ error: "This order has already been submitted or closed." }, { status: 409 });
