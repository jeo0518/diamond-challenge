import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireOwnerPage } from "@/lib/owner";
import SettingsForm from "@/components/owner/SettingsForm";
import NeedsRestaurant from "@/components/owner/NeedsRestaurant";
import SampleBadge from "@/components/SampleBadge";

export const metadata: Metadata = { title: "Order rules — GroupGrub" };

export default async function OwnerSettingsPage() {
  const { restaurant } = await requireOwnerPage();
  if (!restaurant) return <NeedsRestaurant title="Order rules" />;

  const timeSlots = await prisma.timeSlotRule.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  return (
    <div className="space-y-4">
      <div>
        {restaurant.isSample && <SampleBadge className="mb-2" />}
        <h1 className="text-2xl font-bold">Order rules</h1>
      </div>
      <SettingsForm
        initial={{
          acceptsGroupOrders: restaurant.acceptsGroupOrders,
          minGroupSize: restaurant.minGroupSize,
          maxGroupSize: restaurant.maxGroupSize,
          leadTimeHours: restaurant.leadTimeHours,
          allowsPickup: restaurant.allowsPickup,
          allowsDelivery: restaurant.allowsDelivery,
          deliveryRadiusMiles: restaurant.deliveryRadiusMiles,
          organizerNotes: restaurant.organizerNotes,
          timeSlots: timeSlots.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            slotMinutes: s.slotMinutes,
            maxOrdersPerSlot: s.maxOrdersPerSlot,
          })),
        }}
      />
    </div>
  );
}
