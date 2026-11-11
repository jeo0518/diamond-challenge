// POST /api/owner/menu/categories — add a menu category.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { badRequest, readJson, requireOwnerApi } from "@/lib/owner";
import { categorySchema } from "@/lib/validation/owner";

export async function POST(request: Request) {
  const auth = await requireOwnerApi();
  if (auth.error) return auth.error;

  const parsed = categorySchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest(parsed.error.issues);

  // New categories go to the bottom of the menu unless a position is given.
  const last = await prisma.menuCategory.findFirst({
    where: { restaurantId: auth.restaurant.id, isDeleted: false },
    orderBy: { sortOrder: "desc" },
  });
  const category = await prisma.menuCategory.create({
    data: {
      restaurantId: auth.restaurant.id,
      name: parsed.data.name,
      sortOrder: parsed.data.sortOrder ?? (last ? last.sortOrder + 1 : 0),
    },
  });
  return NextResponse.json({ id: category.id }, { status: 201 });
}
