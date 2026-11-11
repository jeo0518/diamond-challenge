// /orders — the customer's group orders. Milestone 8 adds the full history/detail pages;
// for now this lists orders so organizers can get back to them.
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { formatCents, formatDateTime } from "@/lib/format";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/orderStatus";
import SampleBadge from "@/components/SampleBadge";

export const metadata: Metadata = { title: "My orders — GroupGrub" };

export default async function OrdersPage() {
  const user = await requireRole("CUSTOMER");
  const orders = await prisma.groupOrder.findMany({
    where: { organizerId: user.id }, // only this customer's orders
    orderBy: { createdAt: "desc" },
    include: { restaurant: { select: { name: true, isSample: true } }, lines: { select: { quantity: true } } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My orders</h1>
      {orders.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-600">
          No group orders yet. <Link href="/restaurants" className="font-medium text-orange-700 hover:underline">Find a restaurant</Link> to start one.
        </p>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/group/${o.id}`} className="block rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:border-orange-300">
                {o.restaurant.isSample && <SampleBadge className="mb-1" />}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{o.eventName}</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[o.status]}`}>{STATUS_LABELS[o.status]}</span>
                </div>
                <p className="text-sm text-gray-600">{o.restaurant.name} · {formatDateTime(o.scheduledFor)}</p>
                <p className="text-sm text-gray-500">
                  {o.lines.reduce((s, l) => s + l.quantity, 0)} items
                  {o.status !== "COLLECTING" && o.status !== "CANCELLED" ? ` · ${formatCents(o.totalCents)}` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
