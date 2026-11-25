// /restaurants/[id]/start — the organizer fills in event details to start a group order.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { isVisibleToCustomers } from "@/lib/visibility";
import { availableSlots } from "@/lib/groupOrders";
import { formatClock, formatDay, formatLeadTime } from "@/lib/format";
import { appTimeZone, toLocalDateTimeInput } from "@/lib/timezone";
import SampleBadge from "@/components/SampleBadge";
import StartGroupOrderForm from "@/components/group/StartGroupOrderForm";

export const metadata: Metadata = { title: "Start a group order — GroupGrub" };

export default async function StartGroupOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reorder?: string }>;
}) {
  const user = await requireRole("CUSTOMER");
  const { id } = await params;
  const { reorder: reorderId } = await searchParams;
  const restaurant = await prisma.restaurant.findUnique({ where: { id } });
  if (!restaurant || !isVisibleToCustomers(restaurant)) notFound();

  // Reorder: pre-fill from the organizer's own earlier order at this restaurant.
  const source = reorderId
    ? await prisma.groupOrder.findFirst({
        where: { id: reorderId, organizerId: user.id, restaurantId: restaurant.id },
        include: { lines: { select: { quantity: true, participantName: true } } },
      })
    : null;

  // Group slots by day for the dropdown. Times are formatted here (server time zone).
  const slots = await availableSlots(restaurant);
  const slotsByDay: { day: string; slots: { iso: string; time: string; remaining: number; latestDeadline: string }[] }[] = [];
  for (const s of slots) {
    const day = formatDay(s.time);
    if (slotsByDay.at(-1)?.day !== day) slotsByDay.push({ day, slots: [] });
    slotsByDay.at(-1)!.slots.push({
      iso: s.time.toISOString(),
      time: formatClock(s.time),
      remaining: s.remaining,
      latestDeadline: toLocalDateTimeInput(new Date(s.time.getTime() - restaurant.leadTimeHours * 3600_000)),
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href={`/restaurants/${restaurant.id}`} className="text-sm text-orange-700 hover:underline">← Back to menu</Link>
      <div>
        {restaurant.isSample && <SampleBadge className="mb-2" />}
        <h1 className="text-2xl font-bold">{source ? "Reorder" : "Start a group order"}</h1>
        <p className="text-gray-600">
          at <b>{restaurant.name}</b> · {restaurant.minGroupSize}
          {restaurant.maxGroupSize ? `–${restaurant.maxGroupSize}` : "+"} items · order {formatLeadTime(restaurant.leadTimeHours)} ahead
        </p>
      </div>
      {source && (
        <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">
          Copying <b>{source.lines.reduce((n, l) => n + l.quantity, 0)} items</b> for{" "}
          {new Set(source.lines.map((l) => l.participantName)).size} people from &quot;{source.eventName}&quot; at today&apos;s prices.
          Pick a new time below — you can change items afterwards.
        </p>
      )}
      {!restaurant.acceptsGroupOrders ? (
        <p className="rounded-lg bg-gray-100 p-4 text-sm">This restaurant isn&apos;t taking group orders right now.</p>
      ) : (
        <StartGroupOrderForm
          restaurantId={restaurant.id}
          allowsPickup={restaurant.allowsPickup}
          allowsDelivery={restaurant.allowsDelivery}
          deliveryRadiusMiles={restaurant.deliveryRadiusMiles}
          leadTimeHours={restaurant.leadTimeHours}
          timeZoneLabel={timeZoneLabel()}
          slotsByDay={slotsByDay}
          reorder={
            source
              ? {
                  fromId: source.id,
                  eventName: source.eventName,
                  fulfillment: source.fulfillment,
                  deliveryAddress: source.deliveryAddress,
                  expectedHeadcount: source.expectedHeadcount,
                }
              : undefined
          }
        />
      )}
      <p className="text-xs text-gray-500">
        Next you&apos;ll get a link to share. People add their own food — no account needed. You can also add everything yourself.
      </p>
    </div>
  );
}

/** "Central Time" style name for the app's time zone, shown on the form. */
function timeZoneLabel() {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: appTimeZone(), timeZoneName: "long" })
    .formatToParts(new Date())
    .find((p) => p.type === "timeZoneName")?.value;
  return name ? name.replace(/ (Standard|Daylight) /, " ") : appTimeZone();
}
