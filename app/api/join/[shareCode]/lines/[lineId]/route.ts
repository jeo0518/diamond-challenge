// PATCH  /api/join/[shareCode]/lines/[lineId] — change quantity of your own line
// DELETE /api/join/[shareCode]/lines/[lineId] — remove your own line
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { badRequest, readJson } from "@/lib/owner";
import { updateQuantitySchema } from "@/lib/validation/groupOrder";
import { missingToken, openOrderByCode, readToken } from "@/lib/participantApi";

type Ctx = { params: Promise<{ shareCode: string; lineId: string }> };

/** The line, only if it belongs to this order AND was created with this token. */
async function findOwnLine(request: Request, shareCode: string, lineId: string) {
  const token = readToken(request);
  if (!token) return { error: missingToken() };
  const open = await openOrderByCode(shareCode);
  if (open.error) return { error: open.error };
  const line = await prisma.orderLine.findFirst({
    where: { id: lineId, groupOrderId: open.order.id, participantToken: token },
  });
  if (!line) return { error: NextResponse.json({ error: "You can only change your own items." }, { status: 404 }) };
  return { line };
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { shareCode, lineId } = await params;
  const found = await findOwnLine(request, shareCode, lineId);
  if (found.error) return found.error;

  const parsed = updateQuantitySchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest(parsed.error.issues);
  await prisma.orderLine.update({ where: { id: found.line.id }, data: { quantity: parsed.data.quantity } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const { shareCode, lineId } = await params;
  const found = await findOwnLine(request, shareCode, lineId);
  if (found.error) return found.error;
  await prisma.orderLine.delete({ where: { id: found.line.id } });
  return NextResponse.json({ ok: true });
}
