// DELETE /api/group-orders/[id]/lines/[lineId] — the organizer can remove ANY line in their order.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notCollecting, requireOrganizerApi } from "@/lib/organizerApi";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; lineId: string }> }) {
  const { id, lineId } = await params;
  const auth = await requireOrganizerApi(id);
  if (auth.error) return auth.error;
  if (auth.order.status !== "COLLECTING") return notCollecting();

  const removed = await prisma.orderLine.deleteMany({ where: { id: lineId, groupOrderId: auth.order.id } });
  if (removed.count === 0) return NextResponse.json({ error: "Item not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
