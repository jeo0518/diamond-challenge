// POST /api/owner/menu/items — add a menu item with its option groups.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { badRequest, readJson, requireOwnerApi } from "@/lib/owner";
import { menuItemSchema } from "@/lib/validation/owner";
import { optionGroupsCreateData } from "@/lib/menuData";

export async function POST(request: Request) {
  const auth = await requireOwnerApi();
  if (auth.error) return auth.error;

  const parsed = menuItemSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest(parsed.error.issues);
  const { optionGroups, ...item } = parsed.data;

  // The category must belong to this owner's restaurant.
  const category = await prisma.menuCategory.findFirst({
    where: { id: item.categoryId, restaurantId: auth.restaurant.id, isDeleted: false },
  });
  if (!category) return NextResponse.json({ error: "Category not found." }, { status: 404 });

  const created = await prisma.menuItem.create({
    data: { ...item, restaurantId: auth.restaurant.id, optionGroups: optionGroupsCreateData(optionGroups) },
  });
  return NextResponse.json({ id: created.id }, { status: 201 });
}
