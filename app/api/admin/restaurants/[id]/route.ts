// PATCH /api/admin/restaurants/[id] — approve (show to customers) or hide a restaurant. Admins only.
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdminApi } from "@/lib/admin";
import { badRequest, readJson } from "@/lib/owner";

const schema = z.object({ approved: z.boolean() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (auth.error) return auth.error;
  const { id } = await params;

  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest(parsed.error.issues);

  const updated = await prisma.restaurant.updateMany({
    where: { id },
    data: { isApproved: parsed.data.approved, approvedAt: parsed.data.approved ? new Date() : null },
  });
  if (updated.count === 0) return NextResponse.json({ error: "Restaurant not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
