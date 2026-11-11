"use client";

// The menu with "Add" buttons. Opening an item shows its options, quantity, and notes.
// Used by participants (/join) and by the organizer ("add items for someone").
import { useState } from "react";
import type { PickerMenu } from "@/lib/groupOrders";
import { formatCents, formatDelta } from "@/lib/format";

export type AddItemInput = { menuItemId: string; quantity: number; optionIds: string[]; specialInstructions: string | null };

type Props = {
  menu: PickerMenu;
  /** Saves the item. Return an error message, or null on success. */
  onAdd: (input: AddItemInput) => Promise<string | null>;
  disabled?: boolean;
};

type Item = PickerMenu[number]["items"][number];

export default function ItemPicker({ menu, onAdd, disabled }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  if (menu.length === 0) return <p className="text-sm text-gray-500">This restaurant has no items available right now.</p>;

  return (
    <div className="space-y-5">
      {menu.map((category) => (
        <div key={category.id}>
          <h3 className="mb-2 font-semibold text-gray-800">{category.name}</h3>
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white shadow-sm">
            {category.items.map((item) => (
              <li key={item.id} className="p-3">
                {openId === item.id ? (
                  <ItemForm
                    item={item}
                    onCancel={() => setOpenId(null)}
                    onSave={async (input) => {
                      const error = await onAdd(input);
                      if (!error) {
                        setOpenId(null);
                        setJustAdded(item.id);
                        setTimeout(() => setJustAdded((cur) => (cur === item.id ? null : cur)), 2500);
                      }
                      return error;
                    }}
                  />
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{item.name}</p>
                      {item.description && <p className="text-sm text-gray-500">{item.description}</p>}
                      <p className="text-sm text-gray-700">{formatCents(item.basePrice)}</p>
                    </div>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => setOpenId(item.id)}
                      className="shrink-0 rounded-lg border border-orange-300 px-3 py-1.5 text-sm font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-40"
                    >
                      {justAdded === item.id ? "✓ Added" : "Add"}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ItemForm({ item, onSave, onCancel }: { item: Item; onSave: (i: AddItemInput) => Promise<string | null>; onCancel: () => void }) {
  // Pre-select the first option of required pick-one groups, so most items are one tap.
  const [picked, setPicked] = useState<Set<string>>(
    () => new Set(item.optionGroups.filter((g) => g.required && g.maxSelect === 1).map((g) => g.options[0]?.id).filter(Boolean)),
  );
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function toggle(groupId: string, optionId: string) {
    const group = item.optionGroups.find((g) => g.id === groupId)!;
    const next = new Set(picked);
    if (group.maxSelect === 1) {
      // Radio-style: replace the choice in this group.
      group.options.forEach((o) => next.delete(o.id));
      if (!picked.has(optionId) || group.required) next.add(optionId);
    } else if (next.has(optionId)) {
      next.delete(optionId);
    } else {
      const inGroup = group.options.filter((o) => next.has(o.id)).length;
      if (inGroup >= group.maxSelect) return setError(`Choose at most ${group.maxSelect} for ${group.name}.`);
      next.add(optionId);
    }
    setError(null);
    setPicked(next);
  }

  const optionsTotal = item.optionGroups.flatMap((g) => g.options).filter((o) => picked.has(o.id)).reduce((s, o) => s + o.priceDelta, 0);
  const unit = item.basePrice + optionsTotal;

  async function submit() {
    setSaving(true);
    const err = await onSave({ menuItemId: item.id, quantity, optionIds: [...picked], specialInstructions: notes.trim() || null });
    setSaving(false);
    setError(err);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold">{item.name}</p>
        <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:underline">Cancel</button>
      </div>

      {item.optionGroups.map((g) => (
        <fieldset key={g.id}>
          <legend className="mb-1 text-sm font-medium">
            {g.name}{" "}
            <span className="font-normal text-gray-500">
              {g.required ? (g.maxSelect === 1 ? "(choose 1)" : `(choose ${g.minSelect}–${g.maxSelect})`) : `(optional, up to ${g.maxSelect})`}
            </span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {g.options.map((o) => {
              const on = picked.has(o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(g.id, o.id)}
                  className={`rounded-full border px-3 py-1 text-sm ${on ? "border-orange-600 bg-orange-600 text-white" : "border-gray-300 bg-white hover:bg-gray-50"}`}
                >
                  {o.name}
                  {o.priceDelta ? ` ${formatDelta(o.priceDelta)}` : ""}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        maxLength={200}
        placeholder="Special instructions (optional)"
        aria-label="Special instructions"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-lg border border-gray-300">
          <button type="button" aria-label="Less" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 py-1.5 text-lg">−</button>
          <span aria-label="Quantity" className="w-8 text-center font-semibold">{quantity}</span>
          <button type="button" aria-label="More" onClick={() => setQuantity(Math.min(100, quantity + 1))} className="px-3 py-1.5 text-lg">+</button>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
        >
          {saving ? "Adding…" : `Add ${quantity} · ${formatCents(unit * quantity)}`}
        </button>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
