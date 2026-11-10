// /restaurants/[id] — menu, bulk pricing tiers, and order rules (customers only).
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { haversineMiles, isValidLatLng } from "@/lib/geo";
import { lookupPlace } from "@/lib/zipLookup";
import { showSampleRestaurants } from "@/lib/restaurantSearch";
import { DAY_NAMES, formatCents, formatDelta, formatLeadTime, formatMiles, formatTime } from "@/lib/format";
import SampleBadge from "@/components/SampleBadge";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function loadRestaurant(id: string) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    include: {
      categories: {
        orderBy: { sortOrder: "asc" },
        include: {
          // Customers only see items that are available and not deleted.
          items: {
            where: { isAvailable: true, isDeleted: false },
            orderBy: { name: "asc" },
            include: {
              optionGroups: {
                orderBy: { sortOrder: "asc" },
                include: { options: { orderBy: { sortOrder: "asc" } } },
              },
            },
          },
        },
      },
      discountTiers: { orderBy: { minQuantity: "asc" } },
      timeSlotRules: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
    },
  });
  // Hidden samples behave as if they don't exist.
  if (!restaurant || (restaurant.isSample && !showSampleRestaurants())) return null;
  return restaurant;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const r = await prisma.restaurant.findUnique({ where: { id }, select: { name: true } });
  return { title: r ? `${r.name} — GroupGrub` : "Restaurant — GroupGrub" };
}

export default async function RestaurantDetailPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  await requireRole("CUSTOMER");
  const { id } = await params;
  const restaurant = await loadRestaurant(id);
  if (!restaurant) notFound();

  // Distance, if the search page passed along a location.
  const sp = await searchParams;
  const lat = Number(sp.lat);
  const lng = Number(sp.lng);
  const place = typeof sp.place === "string" ? lookupPlace(sp.place) : null;
  const from = isValidLatLng(lat, lng) && sp.lat && sp.lng ? { lat, lng } : place;
  const distance = from ? haversineMiles(from, restaurant) : null;
  const backQuery = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])),
  ).toString();

  // Group time slot rules by weekday: { 5: ["11:00 AM–2:00 PM", ...] }
  const slotsByDay = new Map<number, string[]>();
  for (const rule of restaurant.timeSlotRules) {
    const list = slotsByDay.get(rule.dayOfWeek) ?? [];
    list.push(`${formatTime(rule.startTime)}–${formatTime(rule.endTime)}`);
    slotsByDay.set(rule.dayOfWeek, list);
  }

  const categories = restaurant.categories.filter((c) => c.items.length > 0);
  const hasBulkOverrides = categories.some((c) => c.items.some((i) => i.bulkPrice != null));

  return (
    <div className="space-y-6">
      <Link href={`/restaurants${backQuery ? `?${backQuery}` : ""}`} className="text-sm text-orange-700 hover:underline">
        ← Back to search
      </Link>

      {/* Header */}
      <section className="space-y-2 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        {restaurant.isSample && <SampleBadge />}
        <h1 className="text-2xl font-bold">{restaurant.name}</h1>
        <p className="text-gray-600">
          {restaurant.cuisine}
          {distance != null && <> · {formatMiles(distance)} away</>}
        </p>
        {restaurant.description && <p className="text-gray-700">{restaurant.description}</p>}
        <p className="text-sm text-gray-500">
          {restaurant.address} · {restaurant.phone}
          {restaurant.hours && <> · {restaurant.hours}</>}
        </p>

        <div className="pt-2">
          {restaurant.acceptsGroupOrders ? (
            // TODO (Milestone 6): link to the "Start Group Order" form.
            <button
              disabled
              title="Coming in Milestone 6"
              className="w-full cursor-not-allowed rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white opacity-60 sm:w-auto"
            >
              Start Group Order <span className="text-xs font-normal">(coming in Milestone 6)</span>
            </button>
          ) : (
            <p className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600">This restaurant isn&apos;t taking group orders right now.</p>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Menu */}
        <section className="space-y-5">
          <h2 className="text-xl font-bold">Menu</h2>
          {categories.length === 0 && <p className="text-sm text-gray-500">No menu items yet.</p>}
          {categories.map((category) => (
            <div key={category.id} className="space-y-2">
              <h3 className="font-semibold text-gray-800">{category.name}</h3>
              <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white shadow-sm">
                {category.items.map((item) => (
                  <li key={item.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{item.name}</p>
                        {item.description && <p className="text-sm text-gray-500">{item.description}</p>}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold">{formatCents(item.basePrice)}</p>
                        {item.bulkPrice != null && item.bulkMinQty != null && (
                          <p className="text-xs font-medium text-green-700">
                            {formatCents(item.bulkPrice)} each for {item.bulkMinQty}+
                          </p>
                        )}
                      </div>
                    </div>
                    {item.optionGroups.length > 0 && (
                      <ul className="mt-2 space-y-0.5 text-xs text-gray-500">
                        {item.optionGroups.map((g) => (
                          <li key={g.id}>
                            <span className="font-medium text-gray-700">{g.name}</span>
                            {g.required ? " (required)" : g.maxSelect > 1 ? ` (optional, up to ${g.maxSelect})` : " (optional)"}:{" "}
                            {g.options.map((o) => `${o.name}${o.priceDelta ? ` ${formatDelta(o.priceDelta)}` : ""}`).join(", ")}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        {/* Sidebar: pricing + rules */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="mb-2 font-bold">Bulk discounts</h2>
            {restaurant.discountTiers.length === 0 ? (
              <p className="text-sm text-gray-500">No bulk discount tiers.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="pb-1 font-medium">Total items</th>
                    <th className="pb-1 text-right font-medium">Discount</th>
                  </tr>
                </thead>
                <tbody>
                  {restaurant.discountTiers.map((t) => (
                    <tr key={t.id} className="border-t border-gray-100">
                      <td className="py-1">{t.minQuantity}+</td>
                      <td className="py-1 text-right font-semibold text-green-700">{t.discountPercent}% off</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {hasBulkOverrides && (
              <p className="mt-2 text-xs text-gray-500">
                Items with a bulk price (shown in green on the menu) use that price instead — the % discount doesn&apos;t stack on them.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="mb-2 font-bold">Order rules</h2>
            <dl className="space-y-1 text-sm">
              <Row label="Group order size">
                {restaurant.minGroupSize}
                {restaurant.maxGroupSize ? `–${restaurant.maxGroupSize}` : "+"} items
              </Row>
              <Row label="Order ahead">{formatLeadTime(restaurant.leadTimeHours)}</Row>
              <Row label="Pickup">{restaurant.allowsPickup ? "Yes" : "No"}</Row>
              <Row label="Delivery">
                {restaurant.allowsDelivery
                  ? `Within ${restaurant.deliveryRadiusMiles ?? "?"} mi${restaurant.deliveryFee ? `, ${formatCents(restaurant.deliveryFee)} fee` : ""}`
                  : "No"}
              </Row>
              {restaurant.serviceFee ? <Row label="Service fee">{formatCents(restaurant.serviceFee)}</Row> : null}
            </dl>
            {restaurant.organizerNotes && (
              <p className="mt-3 rounded-lg bg-orange-50 p-2 text-sm text-orange-900">📝 {restaurant.organizerNotes}</p>
            )}
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="mb-2 font-bold">Pickup / delivery times</h2>
            {slotsByDay.size === 0 ? (
              <p className="text-sm text-gray-500">No time slots set yet.</p>
            ) : (
              <dl className="space-y-1 text-sm">
                {[...slotsByDay.entries()].map(([day, windows]) => (
                  <Row key={day} label={DAY_NAMES[day].slice(0, 3)}>{windows.join(", ")}</Row>
                ))}
              </dl>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
