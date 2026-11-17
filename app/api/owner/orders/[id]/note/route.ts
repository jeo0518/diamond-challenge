// PUT /api/owner/orders/[id]/note — a note from the restaurant that the organizer can see.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { badRequest, readJson, requireOwnerApi } from "@/lib/owner";
import { ownerNoteSchema } from "@/lib/validation/ownerOrder";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOwnerApi();
  if (auth.error) return auth.error;
  const { id } = await params;

  const parsed = ownerNoteSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest(parsed.error.issues);

  // updateMany with restaurantId = only the caller's own orders.
  const updated = await prisma.groupOrder.updateMany({
    where: { id, restaurantId: auth.restaurant.id, status: { not: "COLLECTING" } },
    data: { ownerNote: parsed.data.note },
  });
  if (updated.count === 0) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
