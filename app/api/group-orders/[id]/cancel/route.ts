// POST /api/group-orders/[id]/cancel — the organizer cancels while COLLECTING or SUBMITTED.
// Not allowed after the restaurant accepts (lib/orderStatus.ts).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { badRequest, readJson } from "@/lib/owner";
import { cancelSchema } from "@/lib/validation/groupOrder";
import { changeStatus } from "@/lib/groupOrders";
import { canTransition } from "@/lib/orderStatus";
import { requireOrganizerApi } from "@/lib/organizerApi";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireOrganizerApi(id);
  if (auth.error) return auth.error;

  const parsed = cancelSchema.safeParse((await readJson(request)) ?? {});
  if (!parsed.success) return badRequest(parsed.error.issues);

  if (!canTransition(auth.order.status, "CANCELLED")) {
    return NextResponse.json(
      { error: "This order can't be cancelled anymore — the restaurant already accepted it. Please call them." },
      { status: 409 },
    );
  }
  const note = parsed.data.reason ? `Cancelled by organizer: ${parsed.data.reason}` : "Cancelled by organizer";
  try {
    await prisma.$transaction((tx) => changeStatus(tx, auth.order, "CANCELLED", auth.user.id, note));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
