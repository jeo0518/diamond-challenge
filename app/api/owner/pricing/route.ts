// PUT /api/owner/pricing — bulk discount tiers, fees, and per-item bulk price overrides (spec 7.3).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { badRequest, readJson, requireOwnerApi } from "@/lib/owner";
import { pricingSchema } from "@/lib/validation/owner";

export async function PUT(request: Request) {
  const auth = await requireOwnerApi();
  if (auth.error) return auth.error;

  const parsed = pricingSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest(parsed.error.issues);
  const { tiers, serviceFee, deliveryFee, overrides } = parsed.data;
  const restaurantId = auth.restaurant.id;

  // Ownership check: every overridden item must belong to THIS restaurant.
  const ownItems = await prisma.menuItem.findMany({
    where: { restaurantId, id: { in: overrides.map((o) => o.menuItemId) } },
    select: { id: true },
  });
  if (ownItems.length !== new Set(overrides.map((o) => o.menuItemId)).size) {
    return NextResponse.json({ error: "Some menu items weren't found." }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.restaurant.update({ where: { id: restaurantId }, data: { serviceFee, deliveryFee } }),
    prisma.bulkDiscountTier.deleteMany({ where: { restaurantId } }),
    prisma.bulkDiscountTier.createMany({ data: tiers.map((t) => ({ ...t, restaurantId })) }),
    ...overrides.map((o) =>
      prisma.menuItem.update({
        where: { id: o.menuItemId, restaurantId },
        data: { bulkPrice: o.bulkPrice, bulkMinQty: o.bulkMinQty },
      }),
    ),
  ]);
  return NextResponse.json({ ok: true });
}
