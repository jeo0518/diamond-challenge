// PUT /api/owner/settings — order rules and time slots (spec 7.4).
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { badRequest, readJson, requireOwnerApi } from "@/lib/owner";
import { settingsSchema } from "@/lib/validation/owner";

export async function PUT(request: Request) {
  const auth = await requireOwnerApi();
  if (auth.error) return auth.error;

  const parsed = settingsSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest(parsed.error.issues);
  const { timeSlots, ...rules } = parsed.data;
  const restaurantId = auth.restaurant.id;

  // Save rules and replace all time slot rules together (all or nothing).
  await prisma.$transaction([
    prisma.restaurant.update({
      where: { id: restaurantId },
      data: { ...rules, deliveryRadiusMiles: rules.allowsDelivery ? rules.deliveryRadiusMiles : null },
    }),
    prisma.timeSlotRule.deleteMany({ where: { restaurantId } }),
    prisma.timeSlotRule.createMany({ data: timeSlots.map((s) => ({ ...s, restaurantId })) }),
  ]);
  return NextResponse.json({ ok: true });
}
