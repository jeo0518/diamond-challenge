// PUT /api/owner/restaurant — create (first time) or update the owner's restaurant profile.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRoleApi } from "@/lib/session";
import { badRequest, findOwnerRestaurant, readJson } from "@/lib/owner";
import { profileSchema } from "@/lib/validation/owner";

const SAMPLE_PREFIX = "[SAMPLE] ";

export async function PUT(request: Request) {
  const auth = await requireRoleApi("OWNER");
  if (auth.error) return auth.error;

  const parsed = profileSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest(parsed.error.issues);
  const data = parsed.data;

  const existing = await findOwnerRestaurant(auth.user.id);
  if (existing) {
    // Sample restaurants must always keep the [SAMPLE] prefix (spec Section 5).
    if (existing.isSample && !data.name.startsWith("[SAMPLE]")) data.name = SAMPLE_PREFIX + data.name;
    const restaurant = await prisma.restaurant.update({ where: { id: existing.id }, data });
    return NextResponse.json({ id: restaurant.id });
  }

  // First save creates the restaurant with default rules; the owner adjusts them in Settings.
  const restaurant = await prisma.restaurant.create({ data: { ...data, ownerId: auth.user.id } });
  return NextResponse.json({ id: restaurant.id }, { status: 201 });
}
