// /owner/orders/[id] — everything the restaurant needs to make and hand off one group order.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwnerPage } from "@/lib/owner";
import { loadOwnerOrder, isDueSoon } from "@/lib/ownerOrders";
import { kitchenSummary } from "@/lib/kitchenSummary";
import { describeOptions, lineUnitPrice, readOptions } from "@/lib/orderLines";
import { formatCents, formatDateTime } from "@/lib/format";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/orderStatus";
import NeedsRestaurant from "@/components/owner/NeedsRestaurant";
import SampleBadge from "@/components/SampleBadge";
import OwnerOrderActions from "@/components/owner/OwnerOrderActions";

export const metadata: Metadata = { title: "Order — GroupGrub" };

export default async function OwnerOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { restaurant } = await requireOwnerPage();
  if (!restaurant) return <NeedsRestaurant title="Order" />;
  const { id } = await params;
  const order = await loadOwnerOrder(id, restaurant.id);
  if (!order) notFound(); // missing, still collecting, or another restaurant's order

  const kitchen = kitchenSummary(order.lines);
  const totalQty = order.lines.reduce((s, l) => s + l.quantity, 0);
  const byPerson = new Map<string, typeof order.lines>();
  for (const l of order.lines) byPerson.set(l.participantName, [...(byPerson.get(l.participantName) ?? []), l]);
  const soon = isDueSoon(order);

  return (
    <div className="space-y-5">
      <Link href="/owner/dashboard" className="text-sm text-orange-700 hover:underline">← All orders</Link>

      <header className="space-y-2 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        {order.restaurant.isSample && <SampleBadge />}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{order.eventName}</h1>
          <span data-testid="status" className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[order.status]}`}>{STATUS_LABELS[order.status]}</span>
          {soon && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">Due within 24h</span>}
        </div>
        <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <Info label="When">{formatDateTime(order.scheduledFor)}</Info>
          <Info label={order.fulfillment === "PICKUP" ? "Pickup" : "Delivery to"}>
            {order.fulfillment === "PICKUP" ? "Customer picks up" : order.deliveryAddress}
          </Info>
          <Info label="Organizer">{order.organizer.name}</Info>
          <Info label="Contact">
            <a href={`mailto:${order.organizer.email}`} className="text-orange-700 hover:underline">{order.organizer.email}</a>
            {order.organizer.phone && <> · <a href={`tel:${order.organizer.phone}`} className="text-orange-700 hover:underline">{order.organizer.phone}</a></>}
          </Info>
          <Info label="Size">{totalQty} items · {byPerson.size} people{order.expectedHeadcount ? ` (expected ${order.expectedHeadcount})` : ""}</Info>
          {order.submittedAt && <Info label="Submitted">{formatDateTime(order.submittedAt)}</Info>}
        </dl>
        {order.rejectReason && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">Rejected: {order.rejectReason}</p>}
      </header>

      <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-bold">Actions</h2>
        <OwnerOrderActions orderId={order.id} status={order.status} ownerNote={order.ownerNote} />
      </section>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {/* Kitchen summary */}
        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">Kitchen summary</h2>
          <p className="mb-3 text-sm text-gray-500">Total to make, for each item and option combo.</p>
          <table className="w-full text-sm" data-testid="kitchen">
            <tbody>
              {kitchen.map((row) => (
                <tr key={row.item + row.options} className="border-t border-gray-100 align-top">
                  <td className="py-2 pr-3">
                    <span className="font-medium">{row.item}</span>
                    {row.options && <span className="text-gray-600">, {row.options}</span>}
                    {row.notes.map((n) => <span key={n} className="block text-xs italic text-gray-500">“{n}”</span>)}
                  </td>
                  <td className="py-2 text-right text-base font-bold">× {row.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* By participant — for labeling bags */}
        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">By person</h2>
          <p className="mb-3 text-sm text-gray-500">For labeling each person&apos;s bag.</p>
          <div className="space-y-3">
            {[...byPerson.entries()].map(([person, lines]) => (
              <div key={person} className="rounded-lg border border-gray-100 p-3">
                <p className="font-semibold">🏷️ {person}</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {lines.map((l) => {
                    const options = readOptions(l.selectedOptionsSnapshot);
                    return (
                      <li key={l.id}>
                        {l.quantity} × {l.itemNameSnapshot}
                        {options.length > 0 && <span className="text-gray-600"> — {describeOptions(options)}</span>}
                        {l.specialInstructions && <span className="block text-xs italic text-gray-500">“{l.specialInstructions}”</span>}
                        <span className="sr-only"> ({formatCents(lineUnitPrice(l))} each)</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-lg font-bold">Price (frozen at submit)</h2>
          <dl className="space-y-1 text-sm">
            <Row label="Subtotal" value={formatCents(order.subtotalCents)} />
            <Row label="Bulk discount" value={order.discountCents ? `−${formatCents(order.discountCents)}` : "—"} />
            <Row label="Fees" value={formatCents(order.feesCents)} />
            <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold">
              <dt>Total</dt>
              <dd>{formatCents(order.totalCents)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-gray-500">Payment is collected outside the app (e.g. at pickup).</p>
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-lg font-bold">History</h2>
          <ol className="space-y-2 text-sm">
            {order.statusEvents.map((e) => (
              <li key={e.id} className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
                <div>
                  <p>
                    <span className="font-medium">{STATUS_LABELS[e.toStatus]}</span>
                    <span className="text-gray-500"> · {formatDateTime(e.createdAt)}{e.changedBy ? ` · ${e.changedBy.name}` : ""}</span>
                  </p>
                  {e.note && <p className="text-xs text-gray-500">{e.note}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-gray-500">{label}</dt>
      <dd>{children}</dd>
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
