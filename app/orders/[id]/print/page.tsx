// /orders/[id]/print — a one-page summary for the band director or coach:
// who ordered what (with check boxes for handing out food) and who owes what.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { orderMoney } from "@/lib/groupOrderPricing";
import { describeOptions, readOptions } from "@/lib/orderLines";
import { formatCents, formatDateTime } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/orderStatus";
import SampleBadge from "@/components/SampleBadge";
import SplitCostTable from "@/components/SplitCostTable";
import PrintButton from "@/components/PrintButton";

export const metadata: Metadata = { title: "Order summary — GroupGrub" };

export default async function PrintOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("CUSTOMER");
  const { id } = await params;
  const order = await prisma.groupOrder.findFirst({
    where: { id, organizerId: user.id },
    include: {
      restaurant: { include: { discountTiers: true } },
      lines: { orderBy: [{ participantName: "asc" }, { createdAt: "asc" }], include: { menuItem: true } },
    },
  });
  if (!order) notFound();
  const { restaurant } = order;
  const money = orderMoney(order);
  const neverPriced = order.status !== "COLLECTING" && !order.submittedAt;

  const byPerson = new Map<string, typeof order.lines>();
  for (const l of order.lines) byPerson.set(l.participantName, [...(byPerson.get(l.participantName) ?? []), l]);

  return (
    <div className="mx-auto max-w-3xl space-y-5 bg-white p-6 print:p-0 sm:rounded-xl sm:border sm:border-gray-100 sm:shadow-sm print:border-0 print:shadow-none">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Link href={`/orders/${order.id}`} className="text-sm text-orange-700 hover:underline">← Back to order</Link>
        <PrintButton />
      </div>

      <header className="space-y-1 border-b border-gray-200 pb-3">
        {restaurant.isSample && <SampleBadge />}
        <h1 className="text-2xl font-bold">{order.eventName}</h1>
        <p>{restaurant.name} · {restaurant.phone}</p>
        <p className="text-sm text-gray-700">
          {order.fulfillment === "PICKUP" ? `Pickup at ${restaurant.address}` : `Delivery to ${order.deliveryAddress}`} · {formatDateTime(order.scheduledFor)}
        </p>
        <p className="text-sm text-gray-600">
          Status: {STATUS_LABELS[order.status]} · {money.totalQty} items · {byPerson.size} people · Organizer: {user.name}
        </p>
      </header>

      <section>
        <h2 className="mb-2 text-lg font-bold">Who gets what</h2>
        <div className="grid gap-x-6 sm:grid-cols-2 print:grid-cols-2">
          {[...byPerson.entries()].map(([person, lines]) => (
            <div key={person} className="break-inside-avoid border-t border-gray-200 py-2">
              <p className="font-semibold">☐ {person}</p>
              <ul className="ml-5 text-sm">
                {lines.map((l) => {
                  const options = readOptions(l.selectedOptionsSnapshot);
                  return (
                    <li key={l.id}>
                      {l.quantity} × {l.itemNameSnapshot}
                      {options.length > 0 && <span className="text-gray-600"> — {describeOptions(options)}</span>}
                      {l.specialInstructions && <span className="italic text-gray-500"> (“{l.specialInstructions}”)</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="break-inside-avoid">
        <h2 className="mb-2 text-lg font-bold">Who owes what</h2>
        {neverPriced ? (
          <p className="text-sm text-gray-500">This order was cancelled before it was sent, so it was never priced.</p>
        ) : (
          <>
            <SplitCostTable perPerson={money.perPerson} total={money.total} isEstimate={money.isEstimate} />
            <p className="mt-3 text-sm text-gray-700">
              Items {formatCents(money.subtotal)}
              {money.discount ? ` − bulk discount ${formatCents(money.discount)}` : ""} + fees {formatCents(money.fees)} ={" "}
              <b>{formatCents(money.total)}</b>. Payment is made directly to the restaurant (e.g. at pickup).
            </p>
          </>
        )}
      </section>
    </div>
  );
}
