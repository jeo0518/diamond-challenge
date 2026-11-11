// PUT    /api/owner/menu/items/[id] — edit an item (replaces its option groups)
// PATCH  /api/owner/menu/items/[id] — quick available on/off toggle
// DELETE /api/owner/menu/items/[id] — soft delete (never removes items used in past orders)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { badRequest, readJson, requireOwnerApi } from "@/lib/owner";
import { availabilitySchema, menuItemSchema } from "@/lib/validation/owner";
import { optionGroupsCreateData } from "@/lib/menuData";

type Ctx = { params: Promise<{ id: string }> };

/** Finds the item only if it belongs to the caller's restaurant. */
function findOwnItem(id: string, restaurantId: string) {
  return prisma.menuItem.findFirst({ where: { id, restaurantId, isDeleted: false } });
}

const notFound = () => NextResponse.json({ error: "Menu item not found." }, { status: 404 });

export async function PUT(request: Request, { params }: Ctx) {
  const auth = await requireOwnerApi();
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!(await findOwnItem(id, auth.restaurant.id))) return notFound();

  const parsed = menuItemSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest(parsed.error.issues);
  const { optionGroups, ...item } = parsed.data;

  const category = await prisma.menuCategory.findFirst({
    where: { id: item.categoryId, restaurantId: auth.restaurant.id, isDeleted: false },
  });
  if (!category) return NextResponse.json({ error: "Category not found." }, { status: 404 });

  // Replacing option groups is safe: past orders keep their own snapshot of chosen options.
  await prisma.$transaction([
    prisma.optionGroup.deleteMany({ where: { menuItemId: id } }),
    prisma.menuItem.update({ where: { id }, data: { ...item, optionGroups: optionGroupsCreateData(optionGroups) } }),
  ]);
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireOwnerApi();
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!(await findOwnItem(id, auth.restaurant.id))) return notFound();

  const parsed = availabilitySchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest(parsed.error.issues);
  await prisma.menuItem.update({ where: { id }, data: { isAvailable: parsed.data.isAvailable } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const auth = await requireOwnerApi();
  if (auth.error) return auth.error;
  const { id } = await params;
  if (!(await findOwnItem(id, auth.restaurant.id))) return notFound();

  // Soft delete: hidden everywhere, but past orders still show it.
  await prisma.menuItem.update({ where: { id }, data: { isDeleted: true, isAvailable: false } });
  return NextResponse.json({ ok: true });
}
