// /group/[id] — the organizer's live summary: who ordered what, totals with the
// bulk discount, rule checks, and the Submit button. Only the organizer can see it.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { requireRole } from "@/lib/session";
import { loadOrderableMenu, loadOrganizerOrder, toPickerMenu, countOrdersInSlot } from "@/lib/groupOrders";
import { priceGroupOrder } from "@/lib/groupOrderPricing";
import { submitProblems } from "@/lib/submitChecks";
import { describeOptions, readOptions } from "@/lib/orderLines";
import { formatCents, formatDateTime } from "@/lib/format";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/orderStatus";
import { prisma } from "@/lib/db";
import { isSlotTime } from "@/lib/timeSlots";
import SampleBadge from "@/components/SampleBadge";
import { AddForSomeone, AutoRefresh, OrganizerActions, RemoveLineButton, ShareLink } from "@/components/group/OrganizerControls";

export const metadata: Metadata = { title: "Group order — GroupGrub" };

export default async function GroupOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("CUSTOMER");
  const { id } = await params;
  const order = await loadOrganizerOrder(id, user.id);
  if (!order) notFound(); // not found OR not this user's order
  const { restaurant } = order;

  const now = new Date();
  const collecting = order.status === "COLLECTING";
  const collectionOpen = collecting && order.participantDeadline > now;

  // Live price while collecting; frozen totals after submit.
  const bulkRules = new Map(order.lines.map((l) => [l.menuItemId, l.menuItem]));
  const price = priceGroupOrder(order.lines, bulkRules, restaurant, order.fulfillment);
  const pricedById = new Map(order.lines.map((l, i) => [l.id, price.lines[i]]));
  const totals = collecting
    ? { subtotal: price.subtotal, discount: price.discount, fees: price.fees, total: price.total }
    : { subtotal: order.subtotalCents, discount: order.discountCents, fees: order.feesCents, total: order.totalCents };

  // Rule checks (the server checks again when Submit is pressed).
  let problems: string[] = [];
  if (collecting) {
    const rules = await prisma.timeSlotRule.findMany({ where: { restaurantId: restaurant.id, dayOfWeek: order.scheduledFor.getDay() } });
    const capacity = Math.max(0, ...rules.filter((r) => isSlotTime([r], order.scheduledFor)).map((r) => r.maxOrdersPerSlot));
    problems = submitProblems({
      status: order.status,
      acceptsGroupOrders: restaurant.acceptsGroupOrders,
      totalQty: price.totalQty,
      minGroupSize: restaurant.minGroupSize,
      maxGroupSize: restaurant.maxGroupSize,
      scheduledFor: order.scheduledFor,
      leadTimeHours: restaurant.leadTimeHours,
      now,
      unavailableItems: [...new Set(order.lines.filter((l) => !l.menuItem.isAvailable || l.menuItem.isDeleted).map((l) => l.itemNameSnapshot))],
      slotIsFull: (await countOrdersInSlot(restaurant.id, order.scheduledFor, order.id)) >= capacity,
    });
  }

  // Group lines by participant name.
  const byPerson = new Map<string, typeof order.lines>();
  for (const line of order.lines) byPerson.set(line.participantName, [...(byPerson.get(line.participantName) ?? []), line]);

  // Item totals: how many of each item across everyone.
  const itemTotals = new Map<string, number>();
  for (const line of order.lines) itemTotals.set(line.itemNameSnapshot, (itemTotals.get(line.itemNameSnapshot) ?? 0) + line.quantity);

  // Full share URL using the address this page was opened at (e.g. localhost:3000 or a LAN IP).
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const shareUrl = `${proto}://${host}/join/${order.shareCode}`;

  const menu = collecting ? toPickerMenu(await loadOrderableMenu(restaurant.id)) : [];

  return (
    <div className="space-y-5">
      {collecting && <AutoRefresh />}

      <header className="space-y-1 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        {restaurant.isSample && <SampleBadge className="mb-1" />}
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{order.eventName}</h1>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[order.status]}`}>{STATUS_LABELS[order.status]}</span>
        </div>
        <p className="text-gray-700">
          <Link href={`/restaurants/${restaurant.id}`} className="font-medium hover:underline">{restaurant.name}</Link> · {restaurant.phone}
        </p>
        <p className="text-sm text-gray-600">
          {order.fulfillment === "PICKUP" ? `Pickup at ${restaurant.address}` : `Delivery to ${order.deliveryAddress}`} · {formatDateTime(order.scheduledFor)}
        </p>
        {collecting && (
          <p className="text-sm text-gray-600">
            {collectionOpen ? `People can add items until ${formatDateTime(order.participantDeadline)}.` : "Collection is closed — only you can change items now."}
            {order.expectedHeadcount ? ` Expecting ${order.expectedHeadcount} people.` : ""}
          </p>
        )}
      </header>

      {collectionOpen && <ShareLink url={shareUrl} />}

      {!collecting && (
        <p className="rounded-xl bg-purple-50 p-4 text-sm text-purple-900">
          {order.status === "SUBMITTED"
            ? "Sent! The restaurant will accept or reject it. Check back here for updates."
            : `Status: ${STATUS_LABELS[order.status]}.`}{" "}
          <Link href="/orders" className="font-semibold underline">My orders</Link>
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_340px] lg:items-start">
        {/* Who ordered what */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">
            Who ordered what <span className="font-normal text-gray-500">({byPerson.size} {byPerson.size === 1 ? "person" : "people"})</span>
          </h2>
          {order.lines.length === 0 && (
            <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
              No items yet. Share the link, or add items yourself below.
            </p>
          )}
          {[...byPerson.entries()].map(([person, lines]) => (
            <div key={person} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="mb-2 font-semibold">{person}</p>
              <ul className="space-y-2">
                {lines.map((l) => {
                  const priced = pricedById.get(l.id)!;
                  const options = readOptions(l.selectedOptionsSnapshot);
                  return (
                    <li key={l.id} className="flex justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p>
                          {l.quantity} × {l.itemNameSnapshot}
                          {(!l.menuItem.isAvailable || l.menuItem.isDeleted) && collecting && (
                            <span className="ml-2 rounded bg-red-100 px-1.5 text-xs text-red-700">no longer available</span>
                          )}
                        </p>
                        {options.length > 0 && <p className="text-xs text-gray-500">{describeOptions(options)}</p>}
                        {l.specialInstructions && <p className="text-xs italic text-gray-500">“{l.specialInstructions}”</p>}
                      </div>
                      <div className="shrink-0 text-right">
                        <p>{formatCents(priced.lineTotal)}</p>
                        {priced.usedBulkPrice && <p className="text-xs text-green-700">bulk price</p>}
                        {collecting && <RemoveLineButton orderId={order.id} lineId={l.id} label={`${l.quantity} × ${l.itemNameSnapshot} for ${person}`} />}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {collecting && <AddForSomeone orderId={order.id} menu={menu} defaultName={user.name} />}
        </section>

        {/* Totals + submit */}
        <aside className="space-y-4 lg:sticky lg:top-4">
          <div className="space-y-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <h2 className="font-bold">Order total</h2>
            <dl className="space-y-1 text-sm">
              <Row label={`Items (${price.totalQty})`} value={formatCents(totals.subtotal)} />
              <Row
                label={price.tier && collecting ? `Bulk discount (${price.tier.discountPercent}%)` : "Bulk discount"}
                value={totals.discount ? `−${formatCents(totals.discount)}` : "—"}
                green
              />
              <Row label={order.fulfillment === "DELIVERY" ? "Service + delivery fees" : "Service fee"} value={formatCents(totals.fees)} />
              <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold">
                <dt>Total</dt>
                <dd data-testid="order-total">{formatCents(totals.total)}</dd>
              </div>
            </dl>
            {collecting && restaurant.discountTiers.length > 0 && (
              <p className="text-xs text-gray-500">
                Discounts: {[...restaurant.discountTiers].sort((a, b) => a.minQuantity - b.minQuantity).map((t) => `${t.minQuantity}+ items ${t.discountPercent}% off`).join(" · ")}.
                Bulk-priced items don&apos;t get the % discount.
              </p>
            )}
            <p className="text-xs text-gray-500">Payment happens outside the app (e.g. at pickup).</p>
          </div>

          {itemTotals.size > 0 && (
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <h2 className="mb-2 font-bold">Item totals</h2>
              <ul className="space-y-0.5 text-sm">
                {[...itemTotals.entries()].sort((a, b) => b[1] - a[1]).map(([name, qty]) => (
                  <li key={name} className="flex justify-between"><span>{name}</span><span className="font-medium">× {qty}</span></li>
                ))}
              </ul>
            </div>
          )}

          {collecting && (
            <div className="space-y-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <h2 className="font-bold">Ready to send?</h2>
              {problems.length > 0 ? (
                <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800" data-testid="problems">
                  {problems.map((p) => <li key={p}>{p}</li>)}
                </ul>
              ) : (
                <p className="text-sm text-green-700">✓ Meets the restaurant&apos;s rules ({restaurant.minGroupSize}+ items).</p>
              )}
              <OrganizerActions orderId={order.id} canSubmit={problems.length === 0} collectionOpen={collectionOpen} />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-600">{label}</dt>
      <dd className={green && value !== "—" ? "text-green-700" : ""}>{value}</dd>
    </div>
  );
}
