"use client";

// /owner/pricing: bulk discount tiers, fees, per-item bulk prices, and a live price preview.
import { useState } from "react";
import { Card, Field, SaveButton, SaveStatus, centsToInput, inputClass, inputToCents, inputToNumber, useSave } from "@/components/owner/ui";
import { calculatePrice, type Fulfillment } from "@/lib/pricing";
import { formatCents } from "@/lib/format";

type Item = { id: string; name: string; category: string; basePrice: number; bulkPrice: number | null; bulkMinQty: number | null };

type Props = {
  tiers: { minQuantity: number; discountPercent: number }[];
  serviceFee: number | null;
  deliveryFee: number | null;
  allowsDelivery: boolean;
  items: Item[];
};

export default function PricingForm(props: Props) {
  const [tiers, setTiers] = useState(props.tiers.map((t) => ({ min: String(t.minQuantity), pct: String(t.discountPercent) })));
  const [serviceFee, setServiceFee] = useState(centsToInput(props.serviceFee));
  const [deliveryFee, setDeliveryFee] = useState(centsToInput(props.deliveryFee));
  const [overrides, setOverrides] = useState(
    Object.fromEntries(props.items.map((i) => [i.id, { price: centsToInput(i.bulkPrice), min: i.bulkMinQty?.toString() ?? "" }])),
  );
  const { save, state, setError } = useSave();

  // Preview inputs
  const [previewItem, setPreviewItem] = useState(props.items[0]?.id ?? "");
  const [previewQty, setPreviewQty] = useState("25");
  const [previewFulfillment, setPreviewFulfillment] = useState<Fulfillment>("PICKUP");

  const updateTier = (i: number, patch: Partial<{ min: string; pct: string }>) =>
    setTiers(tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const updateOverride = (id: string, patch: Partial<{ price: string; min: string }>) =>
    setOverrides({ ...overrides, [id]: { ...overrides[id], ...patch } });

  // Turn the form text into numbers (NaN where invalid). Used by both preview and save.
  const parsedTiers = tiers.map((t) => ({ minQuantity: Number(t.min), discountPercent: Number(t.pct) }));
  const parsedService = inputToCents(serviceFee);
  const parsedDelivery = inputToCents(deliveryFee);
  const parsedOverrides = props.items.map((i) => {
    const o = overrides[i.id];
    return { menuItemId: i.id, bulkPrice: inputToCents(o.price), bulkMinQty: inputToNumber(o.min) };
  });

  // ----- live preview (uses the unsaved values on screen) -----
  const item = props.items.find((i) => i.id === previewItem);
  const qty = Math.max(0, Math.floor(Number(previewQty) || 0));
  const override = parsedOverrides.find((o) => o.menuItemId === previewItem);
  const preview =
    item && qty > 0
      ? calculatePrice(
          [
            {
              menuItemId: item.id,
              quantity: qty,
              basePrice: item.basePrice,
              optionsDelta: 0,
              bulkPrice: override?.bulkPrice != null && !Number.isNaN(override.bulkPrice) ? override.bulkPrice : null,
              bulkMinQty: override?.bulkMinQty != null && !Number.isNaN(override.bulkMinQty) ? override.bulkMinQty : null,
            },
          ],
          {
            tiers: parsedTiers.filter((t) => t.minQuantity > 0 && t.discountPercent > 0),
            serviceFee: parsedService != null && !Number.isNaN(parsedService) ? parsedService : null,
            deliveryFee: parsedDelivery != null && !Number.isNaN(parsedDelivery) ? parsedDelivery : null,
          },
          previewFulfillment,
        )
      : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (parsedTiers.some((t) => !Number.isInteger(t.minQuantity) || !Number.isInteger(t.discountPercent))) {
      return setError("Tier minimums and discounts must be whole numbers.");
    }
    if ([parsedService, parsedDelivery].some((v) => Number.isNaN(v))) return setError("Fees must be dollar amounts, like 5.00.");
    for (const o of parsedOverrides) {
      if (Number.isNaN(o.bulkPrice) || Number.isNaN(o.bulkMinQty)) {
        return setError(`Check the bulk price for "${props.items.find((i) => i.id === o.menuItemId)?.name}".`);
      }
    }
    await save("/api/owner/pricing", "PUT", {
      tiers: [...parsedTiers].sort((a, b) => a.minQuantity - b.minQuantity),
      serviceFee: parsedService,
      deliveryFee: parsedDelivery,
      overrides: parsedOverrides,
    });
  }

  const small = "rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm";

  return (
    <form onSubmit={onSubmit} className="grid gap-4 lg:grid-cols-[1fr_340px] lg:items-start">
      <div className="space-y-4">
        <Card title="Bulk discount tiers">
          <p className="text-sm text-gray-500">
            Based on the <b>total number of items</b> in the group order. Only the highest tier the order reaches applies.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="pb-1 font-medium">Minimum items</th>
                <th className="pb-1 font-medium">Discount %</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tiers.map((t, i) => (
                <tr key={i}>
                  <td className="py-1 pr-2"><input value={t.min} onChange={(e) => updateTier(i, { min: e.target.value })} type="number" min={1} required aria-label="Minimum items" className={`${small} w-24`} /></td>
                  <td className="py-1 pr-2"><input value={t.pct} onChange={(e) => updateTier(i, { pct: e.target.value })} type="number" min={1} max={90} required aria-label="Discount percent" className={`${small} w-20`} /> %</td>
                  <td className="py-1 text-right"><button type="button" onClick={() => setTiers(tiers.filter((_, j) => j !== i))} className="text-red-600 hover:underline">Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {tiers.length === 0 && <p className="text-sm text-gray-500">No tiers — groups pay full price.</p>}
          <button type="button" onClick={() => setTiers([...tiers, { min: "", pct: "" }])} className="text-sm font-medium text-orange-700 hover:underline">
            + Add tier
          </button>
        </Card>

        <Card title="Fees">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Service / packaging fee ($)" hint="Flat fee added to every group order. Leave blank for none.">
              <input value={serviceFee} onChange={(e) => setServiceFee(e.target.value)} inputMode="decimal" placeholder="0.00" className={inputClass} />
            </Field>
            <Field label="Delivery fee ($)" hint={props.allowsDelivery ? "Added only to delivery orders." : "Delivery is off — turn it on in Settings."}>
              <input value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} inputMode="decimal" placeholder="0.00" className={inputClass} />
            </Field>
          </div>
        </Card>

        <Card title="Per-item bulk prices (optional)">
          <p className="text-sm text-gray-500">
            A fixed price used instead of the menu price once the order has at least that many of <b>this item</b> (e.g. Cheese Pizza
            $18 normally, $14 each for 10+).{" "}
            <b className="text-gray-700">When an item&apos;s bulk price is used, the tier discount does not also apply to that item.</b>
          </p>
          {props.items.length === 0 ? (
            <p className="text-sm text-gray-500">Add menu items first.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="pb-1 font-medium">Item</th>
                    <th className="pb-1 font-medium">Menu price</th>
                    <th className="pb-1 font-medium">Bulk price ($)</th>
                    <th className="pb-1 font-medium">When ordering</th>
                  </tr>
                </thead>
                <tbody>
                  {props.items.map((i) => (
                    <tr key={i.id} className="border-t border-gray-100">
                      <td className="py-1.5 pr-2">{i.name}<span className="block text-xs text-gray-400">{i.category}</span></td>
                      <td className="py-1.5 pr-2 text-gray-600">{formatCents(i.basePrice)}</td>
                      <td className="py-1.5 pr-2"><input value={overrides[i.id].price} onChange={(e) => updateOverride(i.id, { price: e.target.value })} inputMode="decimal" placeholder="—" aria-label={`Bulk price for ${i.name}`} className={`${small} w-20`} /></td>
                      <td className="py-1.5"><input value={overrides[i.id].min} onChange={(e) => updateOverride(i.id, { min: e.target.value })} type="number" min={2} placeholder="—" aria-label={`Minimum quantity for ${i.name}`} className={`${small} w-16`} /> or more</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <SaveButton saving={state.status === "saving"} />
          <SaveStatus state={state} />
        </div>
      </div>

      {/* Live price preview */}
      <aside className="lg:sticky lg:top-4">
        <Card title="Price preview">
          <p className="text-sm text-gray-500">What a customer would pay, using the values on this page (even before saving).</p>
          {props.items.length === 0 ? (
            <p className="text-sm text-gray-500">Add menu items to preview prices.</p>
          ) : (
            <>
              <Field label="Item">
                <select value={previewItem} onChange={(e) => setPreviewItem(e.target.value)} className={inputClass}>
                  {props.items.map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Quantity">
                  <input value={previewQty} onChange={(e) => setPreviewQty(e.target.value)} type="number" min={1} className={inputClass} />
                </Field>
                <Field label="Fulfillment">
                  <select value={previewFulfillment} onChange={(e) => setPreviewFulfillment(e.target.value as Fulfillment)} className={inputClass}>
                    <option value="PICKUP">Pickup</option>
                    <option value="DELIVERY">Delivery</option>
                  </select>
                </Field>
              </div>
              {preview && (
                <dl className="space-y-1 border-t border-gray-100 pt-3 text-sm" data-testid="preview">
                  <PreviewRow label={`${qty} × ${formatCents(preview.lines[0].itemPrice)}${preview.lines[0].usedBulkPrice ? " (bulk price)" : ""}`} value={formatCents(preview.subtotal)} />
                  <PreviewRow
                    label={preview.tier ? `Tier discount (${preview.tier.discountPercent}%)` : "Tier discount"}
                    value={preview.discount ? `−${formatCents(preview.discount)}` : "—"}
                  />
                  {preview.lines[0].usedBulkPrice && preview.tier && (
                    <p className="text-xs text-gray-500">No tier discount: this item already uses its bulk price.</p>
                  )}
                  <PreviewRow label="Fees" value={formatCents(preview.fees)} />
                  <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold">
                    <dt>Total</dt>
                    <dd data-testid="preview-total">{formatCents(preview.total)}</dd>
                  </div>
                  <p className="text-xs text-gray-500">≈ {formatCents(Math.round(preview.total / qty))} per item</p>
                </dl>
              )}
            </>
          )}
        </Card>
      </aside>
    </form>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-600">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
