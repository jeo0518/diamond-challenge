// GET  /api/join/[shareCode]/lines — the participant's OWN lines (by token)
// POST /api/join/[shareCode]/lines — a participant adds an item
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { badRequest, readJson } from "@/lib/owner";
import { addLineSchema } from "@/lib/validation/groupOrder";
import { addOrderLine } from "@/lib/groupOrders";
import { missingToken, openOrderByCode, readToken } from "@/lib/participantApi";

type Ctx = { params: Promise<{ shareCode: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { shareCode } = await params;
  const token = readToken(request);
  if (!token) return missingToken();

  const order = await prisma.groupOrder.findUnique({ where: { shareCode }, select: { id: true } });
  if (!order) return NextResponse.json({ error: "This group order link isn't valid." }, { status: 404 });

  // Only this participant's lines — never other people's.
  const lines = await prisma.orderLine.findMany({
    where: { groupOrderId: order.id, participantToken: token },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, participantName: true, itemNameSnapshot: true, unitPriceSnapshot: true,
      quantity: true, selectedOptionsSnapshot: true, specialInstructions: true,
    },
  });
  return NextResponse.json({ lines });
}

export async function POST(request: Request, { params }: Ctx) {
  const { shareCode } = await params;
  const token = readToken(request);
  if (!token) return missingToken();

  const open = await openOrderByCode(shareCode);
  if (open.error) return open.error;

  const parsed = addLineSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest(parsed.error.issues);

  const result = await addOrderLine(open.order, parsed.data, token);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ id: result.id }, { status: 201 });
}
