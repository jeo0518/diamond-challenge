// POST /api/group-orders/[id]/lines — the organizer adds items (for themselves or someone else).
// The organizer can keep adding after the participant deadline, until they submit.
import { NextResponse } from "next/server";
import { badRequest, readJson } from "@/lib/owner";
import { addLineSchema } from "@/lib/validation/groupOrder";
import { addOrderLine, makeOrganizerToken } from "@/lib/groupOrders";
import { notCollecting, requireOrganizerApi } from "@/lib/organizerApi";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireOrganizerApi(id);
  if (auth.error) return auth.error;
  if (auth.order.status !== "COLLECTING") return notCollecting();

  const parsed = addLineSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest(parsed.error.issues);

  const result = await addOrderLine(auth.order, parsed.data, makeOrganizerToken());
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ id: result.id }, { status: 201 });
}
