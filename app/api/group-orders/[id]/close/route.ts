// POST /api/group-orders/[id]/close — stop participants adding items now (before the deadline).
// The status stays COLLECTING so the organizer can still review and submit.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { notCollecting, requireOrganizerApi } from "@/lib/organizerApi";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireOrganizerApi(id);
  if (auth.error) return auth.error;
  if (auth.order.status !== "COLLECTING") return notCollecting();

  const now = new Date();
  if (auth.order.participantDeadline > now) {
    await prisma.groupOrder.update({ where: { id }, data: { participantDeadline: now } });
  }
  return NextResponse.json({ ok: true });
}
