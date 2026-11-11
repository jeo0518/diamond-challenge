// PATCH  /api/owner/menu/categories/[id] — rename / reorder
// DELETE /api/owner/menu/categories/[id] — remove (only if it has no active items)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { badRequest, readJson, requireOwnerApi } from "@/lib/owner";
import { categorySchema } from "@/lib/validation/owner";

type Ctx = { params: Promise<{ id: string }> };

/** Finds the category only if it belongs to the caller's restaurant. */
async function findOwnCategory(id: string, restaurantId: string) {
  return prisma.menuCategory.findFirst({ where: { id, restaurantId, isDeleted: false } });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireOwnerApi();
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!(await findOwnCategory(id, auth.restaurant.id))) {
    return NextResponse.json({ error: "Category not found." }, { status: 404 });
  }

  const parsed = categorySchema.partial().safeParse(await readJson(request));
  if (!parsed.success) return badRequest(parsed.error.issues);
  await prisma.menuCategory.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const auth = await requireOwnerApi();
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!(await findOwnCategory(id, auth.restaurant.id))) {
    return NextResponse.json({ error: "Category not found." }, { status: 404 });
  }

  const activeItems = await prisma.menuItem.count({ where: { categoryId: id, isDeleted: false } });
  if (activeItems > 0) {
    return NextResponse.json(
      { error: "Move or delete the items in this category first." },
      { status: 409 },
    );
  }
  // Soft delete: past orders may still point at items inside it.
  await prisma.menuCategory.update({ where: { id }, data: { isDeleted: true } });
  return NextResponse.json({ ok: true });
}
