// /restaurants/[id]/start — the organizer fills in event details to start a group order.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { showSampleRestaurants } from "@/lib/restaurantSearch";
import { availableSlots } from "@/lib/groupOrders";
import { formatClock, formatDay, formatLeadTime } from "@/lib/format";
import SampleBadge from "@/components/SampleBadge";
import StartGroupOrderForm from "@/components/group/StartGroupOrderForm";

export const metadata: Metadata = { title: "Start a group order — GroupGrub" };

export default async function StartGroupOrderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("CUSTOMER");
  const { id } = await params;
  const restaurant = await prisma.restaurant.findUnique({ where: { id } });
  if (!restaurant || (restaurant.isSample && !showSampleRestaurants())) notFound();

  // Group slots by day for the dropdown. Times are formatted here (server time zone).
  const slots = await availableSlots(restaurant);
  const slotsByDay: { day: string; slots: { iso: string; time: string; remaining: number }[] }[] = [];
  for (const s of slots) {
    const day = formatDay(s.time);
    if (slotsByDay.at(-1)?.day !== day) slotsByDay.push({ day, slots: [] });
    slotsByDay.at(-1)!.slots.push({ iso: s.time.toISOString(), time: formatClock(s.time), remaining: s.remaining });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href={`/restaurants/${restaurant.id}`} className="text-sm text-orange-700 hover:underline">← Back to menu</Link>
      <div>
        {restaurant.isSample && <SampleBadge className="mb-2" />}
        <h1 className="text-2xl font-bold">Start a group order</h1>
        <p className="text-gray-600">
          at <b>{restaurant.name}</b> · {restaurant.minGroupSize}
          {restaurant.maxGroupSize ? `–${restaurant.maxGroupSize}` : "+"} items · order {formatLeadTime(restaurant.leadTimeHours)} ahead
        </p>
      </div>
      {!restaurant.acceptsGroupOrders ? (
        <p className="rounded-lg bg-gray-100 p-4 text-sm">This restaurant isn&apos;t taking group orders right now.</p>
      ) : (
        <StartGroupOrderForm
          restaurantId={restaurant.id}
          allowsPickup={restaurant.allowsPickup}
          allowsDelivery={restaurant.allowsDelivery}
          deliveryRadiusMiles={restaurant.deliveryRadiusMiles}
          leadTimeHours={restaurant.leadTimeHours}
          slotsByDay={slotsByDay}
        />
      )}
      <p className="text-xs text-gray-500">
        Next you&apos;ll get a link to share. People add their own food — no account needed. You can also add everything yourself.
      </p>
    </div>
  );
}
