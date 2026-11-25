// /orders — the customer's order history: active orders first, then past ones, newest first.
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { formatCents, formatDateTime } from "@/lib/format";
import { ACTIVE_STATUSES, STATUS_COLORS, STATUS_LABELS } from "@/lib/orderStatus";
import SampleBadge from "@/components/SampleBadge";

export const metadata: Metadata = { title: "My orders — GroupGrub" };

export default async function OrdersPage() {
  const user = await requireRole("CUSTOMER");
  const orders = await prisma.groupOrder.findMany({
    where: { organizerId: user.id }, // only this customer's orders
    orderBy: { createdAt: "desc" },
    include: { restaurant: { select: { name: true, isSample: true } }, lines: { select: { quantity: true } } },
  });
  const active = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const past = orders.filter((o) => !ACTIVE_STATUSES.includes(o.status));

  if (orders.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">My orders</h1>
        <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-600">
          No group orders yet. <Link href="/restaurants" className="font-medium text-orange-700 hover:underline">Find a restaurant</Link> to start one.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My orders</h1>
      {[
        { title: "Active", list: active, empty: "No active orders." },
        { title: "Past", list: past, empty: "No past orders yet." },
      ].map(({ title, list, empty }) => (
        <section key={title} className="space-y-3">
          <h2 className="text-lg font-bold">
            {title} <span className="font-normal text-gray-500">({list.length})</span>
          </h2>
          {list.length === 0 ? (
            <p className="text-sm text-gray-500">{empty}</p>
          ) : (
            <ul className="space-y-3">
              {list.map((o) => {
                const items = o.lines.reduce((s, l) => s + l.quantity, 0);
                return (
                  <li key={o.id}>
                    <Link href={`/orders/${o.id}`} className="block rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:border-orange-300">
                      {o.restaurant.isSample && <SampleBadge className="mb-1" />}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold">{o.eventName}</p>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[o.status]}`}>{STATUS_LABELS[o.status]}</span>
                      </div>
                      <p className="text-sm text-gray-600">{o.restaurant.name} · {formatDateTime(o.scheduledFor)}</p>
                      <p className="text-sm text-gray-500">
                        {items} {items === 1 ? "item" : "items"} ·{" "}
                        {o.status === "COLLECTING" ? "still collecting" : o.submittedAt ? formatCents(o.totalCents) : "never submitted"}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
