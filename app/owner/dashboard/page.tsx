// /owner/dashboard — incoming group orders in tabs: New, Upcoming, Ready, Past.
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOwnerPage } from "@/lib/owner";
import { DASHBOARD_TABS, isDueSoon, type DashboardTab } from "@/lib/ownerOrders";
import { formatCents, formatDateTime } from "@/lib/format";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/orderStatus";
import NeedsRestaurant from "@/components/owner/NeedsRestaurant";
import SampleBadge from "@/components/SampleBadge";
import AutoRefresh from "@/components/AutoRefresh";

export const metadata: Metadata = { title: "Orders — GroupGrub" };

export default async function OwnerDashboardPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { restaurant } = await requireOwnerPage();
  if (!restaurant) return <NeedsRestaurant title="Incoming orders" />;

  const { tab: rawTab } = await searchParams;
  const tab: DashboardTab = rawTab && rawTab in DASHBOARD_TABS ? (rawTab as DashboardTab) : "new";

  // Counts for every tab, then the orders in the selected tab (only THIS restaurant's).
  const counts = await prisma.groupOrder.groupBy({ by: ["status"], where: { restaurantId: restaurant.id }, _count: true });
  const countFor = (t: DashboardTab) =>
    counts.filter((c) => (DASHBOARD_TABS[t].statuses as string[]).includes(c.status)).reduce((s, c) => s + c._count, 0);

  const orders = await prisma.groupOrder.findMany({
    where: { restaurantId: restaurant.id, status: { in: DASHBOARD_TABS[tab].statuses } },
    // Soonest first for active tabs; most recent first for Past.
    orderBy: { scheduledFor: tab === "past" ? "desc" : "asc" },
    take: tab === "past" ? 100 : undefined,
    include: { organizer: { select: { name: true } }, lines: { select: { quantity: true, participantName: true } } },
  });
  const now = new Date();

  return (
    <div className="space-y-4">
      <AutoRefresh seconds={30} />
      <div>
        {restaurant.isSample && <SampleBadge className="mb-2" />}
        <h1 className="text-2xl font-bold">Incoming orders</h1>
        <p className="text-sm text-gray-500">{restaurant.name} · updates every 30 seconds</p>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-gray-200" aria-label="Order tabs">
        {(Object.keys(DASHBOARD_TABS) as DashboardTab[]).map((t) => (
          <Link
            key={t}
            href={`/owner/dashboard?tab=${t}`}
            aria-current={t === tab ? "page" : undefined}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-semibold ${t === tab ? "border-orange-600 text-orange-700" : "border-transparent text-gray-500 hover:text-gray-800"}`}
          >
            {DASHBOARD_TABS[t].label}
            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${t === "new" && countFor(t) > 0 ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600"}`}>{countFor(t)}</span>
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
          {tab === "new" ? "No new orders right now. New ones show up here automatically." : `No ${DASHBOARD_TABS[tab].label.toLowerCase()} orders.`}
        </p>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => {
            const soon = isDueSoon(o, now);
            const overdue = soon && o.scheduledFor < now;
            const items = o.lines.reduce((s, l) => s + l.quantity, 0);
            const people = new Set(o.lines.map((l) => l.participantName)).size;
            return (
              <li key={o.id}>
                <Link
                  href={`/owner/orders/${o.id}`}
                  className={`block rounded-xl border bg-white p-4 shadow-sm hover:border-orange-300 ${soon ? "border-l-4 border-amber-400" : "border-gray-100"}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{o.eventName}</p>
                    <div className="flex items-center gap-2">
                      {soon && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${overdue ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                          {overdue ? "Overdue" : "Due within 24h"}
                        </span>
                      )}
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[o.status]}`}>{STATUS_LABELS[o.status]}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">
                    {o.fulfillment === "PICKUP" ? "Pickup" : "Delivery"} · <b>{formatDateTime(o.scheduledFor)}</b>
                  </p>
                  <p className="text-sm text-gray-500">
                    {items} items · {people} {people === 1 ? "person" : "people"} · {formatCents(o.totalCents)} · organizer {o.organizer.name}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
