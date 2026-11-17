// POST /api/owner/orders/[id]/status — Accept, Reject (with reason), Preparing, Ready, Completed.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { badRequest, readJson, requireOwnerApi } from "@/lib/owner";
import { ownerStatusSchema } from "@/lib/validation/ownerOrder";
import { changeStatus } from "@/lib/groupOrders";
import { canTransition } from "@/lib/orderStatus";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOwnerApi();
  if (auth.error) return auth.error;
  const { id } = await params;

  // Only orders for the caller's own restaurant.
  const order = await prisma.groupOrder.findFirst({ where: { id, restaurantId: auth.restaurant.id } });
  if (!order || order.status === "COLLECTING") return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const parsed = ownerStatusSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest(parsed.error.issues);
  const { to, reason } = parsed.data;

  if (!canTransition(order.status, to)) {
    return NextResponse.json({ error: `This order is ${order.status.toLowerCase()} and can't be marked ${to.toLowerCase()}.` }, { status: 409 });
  }

  try {
    await prisma.$transaction((tx) =>
      changeStatus(tx, order, to, auth.user.id, to === "REJECTED" ? reason : undefined, to === "REJECTED" ? { rejectReason: reason } : {}),
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
