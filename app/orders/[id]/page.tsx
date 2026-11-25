// /orders/[id] — one order in the customer's history: status timeline, items by person,
// price breakdown, the restaurant's note, plus Reorder and Cancel.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { buildTimeline } from "@/lib/timeline";
import { canTransition, ACTIVE_STATUSES, STATUS_COLORS, STATUS_LABELS } from "@/lib/orderStatus";
import { describeOptions, lineUnitPrice, readOptions } from "@/lib/orderLines";
import { formatCents, formatDateTime } from "@/lib/format";
import { showSampleRestaurants } from "@/lib/restaurantSearch";
import SampleBadge from "@/components/SampleBadge";
import StatusTimeline from "@/components/StatusTimeline";
import AutoRefresh from "@/components/AutoRefresh";
import CancelOrderButton from "@/components/group/CancelOrderButton";

export const metadata: Metadata = { title: "Order — GroupGrub" };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("CUSTOMER");
  const { id } = await params;
  const order = await prisma.groupOrder.findFirst({
    where: { id, organizerId: user.id }, // only the organizer's own orders
    include: {
      restaurant: true,
      lines: { orderBy: [{ participantName: "asc" }, { createdAt: "asc" }] },
      statusEvents: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) notFound();
  const { restaurant } = order;

  const steps = buildTimeline(order.status, order.statusEvents);
  const totalQty = order.lines.reduce((s, l) => s + l.quantity, 0);
  const byPerson = new Map<string, typeof order.lines>();
  for (const l of order.lines) byPerson.set(l.participantName, [...(byPerson.get(l.participantName) ?? []), l]);

  const collecting = order.status === "COLLECTING";
  const canCancel = canTransition(order.status, "CANCELLED");
  const canReorder = restaurant.acceptsGroupOrders && (!restaurant.isSample || showSampleRestaurants()) && order.lines.length > 0;
  const live = ACTIVE_STATUSES.includes(order.status) && !collecting;

  return (
    <div className="space-y-5">
      {live && <AutoRefresh seconds={30} />}
      <Link href="/orders" className="text-sm text-orange-700 hover:underline">← My orders</Link>

      <header className="space-y-1 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        {restaurant.isSample && <SampleBadge className="mb-1" />}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{order.eventName}</h1>
          <span data-testid="status" className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[order.status]}`}>{STATUS_LABELS[order.status]}</span>
        </div>
        <p className="text-gray-700">{restaurant.name} · <a href={`tel:${restaurant.phone}`} className="hover:underline">{restaurant.phone}</a></p>
        <p className="text-sm text-gray-600">
          {order.fulfillment === "PICKUP" ? `Pickup at ${restaurant.address}` : `Delivery to ${order.deliveryAddress}`} · {formatDateTime(order.scheduledFor)}
        </p>
      </header>

      {(order.rejectReason || order.ownerNote) && (
        <div className="space-y-1 rounded-xl border border-gray-100 bg-white p-4 text-sm shadow-sm" data-testid="restaurant-response">
          {order.rejectReason && <p className="text-red-800"><b>Rejected by the restaurant:</b> {order.rejectReason}</p>}
          {order.ownerNote && <p><b>Note from the restaurant:</b> {order.ownerNote}</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {collecting && (
          <Link href={`/group/${order.id}`} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">
            Manage order & share link
          </Link>
        )}
        {canReorder && (
          <Link href={`/restaurants/${restaurant.id}/start?reorder=${order.id}`} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50">
            ↻ Reorder
          </Link>
        )}
        {canCancel && <CancelOrderButton orderId={order.id} />}
      </div>
      {!canCancel && ["ACCEPTED", "PREPARING", "READY"].includes(order.status) && (
        <p className="text-xs text-gray-500">The restaurant has accepted this order. To change or cancel it, call them at {restaurant.phone}.</p>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-start">
        <section className="space-y-3">
          <h2 className="text-lg font-bold">
            Items <span className="font-normal text-gray-500">({totalQty} items, {byPerson.size} {byPerson.size === 1 ? "person" : "people"})</span>
          </h2>
          {byPerson.size === 0 && <p className="text-sm text-gray-500">No items.</p>}
          {[...byPerson.entries()].map(([person, lines]) => (
            <div key={person} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="mb-1 font-semibold">{person}</p>
              <ul className="space-y-1 text-sm">
                {lines.map((l) => {
                  const options = readOptions(l.selectedOptionsSnapshot);
                  return (
                    <li key={l.id} className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <p>{l.quantity} × {l.itemNameSnapshot}</p>
                        {options.length > 0 && <p className="text-xs text-gray-500">{describeOptions(options)}</p>}
                        {l.specialInstructions && <p className="text-xs italic text-gray-500">“{l.specialInstructions}”</p>}
                      </div>
                      <p className="shrink-0 text-gray-600">{formatCents(lineUnitPrice(l) * l.quantity)}</p>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <p className="text-xs text-gray-500">Item prices shown before the group bulk discount.</p>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="mb-3 font-bold">Status</h2>
            <StatusTimeline steps={steps} />
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="mb-2 font-bold">Price</h2>
            {!collecting && !order.submittedAt ? (
              <p className="text-sm text-gray-500">This order was cancelled before it was sent, so it was never priced.</p>
            ) : collecting ? (
              <p className="text-sm text-gray-500">
                The final price is calculated when you submit. <Link href={`/group/${order.id}`} className="text-orange-700 hover:underline">See the live total</Link>.
              </p>
            ) : (
              <dl className="space-y-1 text-sm">
                <Row label="Subtotal" value={formatCents(order.subtotalCents)} />
                <Row label="Bulk discount" value={order.discountCents ? `−${formatCents(order.discountCents)}` : "—"} />
                <Row label="Fees" value={formatCents(order.feesCents)} />
                <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold">
                  <dt>Total</dt>
                  <dd data-testid="order-total">{formatCents(order.totalCents)}</dd>
                </div>
              </dl>
            )}
            <p className="mt-2 text-xs text-gray-500">Payment happens outside the app (e.g. at pickup).</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-600">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
