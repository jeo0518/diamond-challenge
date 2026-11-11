"use client";

// Add/edit one menu item, including its option groups
// (e.g. "Size" — required, pick 1; "Add-ons" — optional, up to 3).
import { useState } from "react";
import { Field, SaveStatus, Toggle, centsToInput, inputClass, inputToCents, useSave } from "@/components/owner/ui";

export type OptionGroupData = {
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  options: { name: string; priceDelta: number }[];
};

export type ItemData = {
  id?: string;
  categoryId: string;
  name: string;
  description: string;
  basePrice: number; // cents
  isAvailable: boolean;
  optionGroups: OptionGroupData[];
};

// Form state keeps numbers as text so people can type freely.
type OptionForm = { name: string; price: string };
type GroupForm = { name: string; required: boolean; min: string; max: string; options: OptionForm[] };

const toGroupForm = (g: OptionGroupData): GroupForm => ({
  name: g.name,
  required: g.required,
  min: String(g.minSelect),
  max: String(g.maxSelect),
  options: g.options.map((o) => ({ name: o.name, price: centsToInput(o.priceDelta) })),
});

const NEW_GROUP: GroupForm = { name: "", required: true, min: "1", max: "1", options: [{ name: "", price: "0.00" }] };

type Props = {
  item: ItemData;
  categories: { id: string; name: string }[];
  onDone: () => void;
};

export default function ItemEditor({ item, categories, onDone }: Props) {
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description);
  const [price, setPrice] = useState(item.id ? centsToInput(item.basePrice) : "");
  const [categoryId, setCategoryId] = useState(item.categoryId);
  const [isAvailable, setIsAvailable] = useState(item.isAvailable);
  const [groups, setGroups] = useState<GroupForm[]>(item.optionGroups.map(toGroupForm));
  const { save, state, setError } = useSave();

  // --- helpers to update nested group/option state ---
  const updateGroup = (gi: number, patch: Partial<GroupForm>) =>
    setGroups(groups.map((g, i) => (i === gi ? { ...g, ...patch } : g)));
  const updateOption = (gi: number, oi: number, patch: Partial<OptionForm>) =>
    updateGroup(gi, { options: groups[gi].options.map((o, i) => (i === oi ? { ...o, ...patch } : o)) });

  function setRequired(gi: number, required: boolean) {
    const g = groups[gi];
    // Required groups need at least 1 choice; optional groups start at 0.
    updateGroup(gi, { required, min: required ? (g.min === "0" ? "1" : g.min) : "0" });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const basePrice = inputToCents(price);
    if (basePrice == null || Number.isNaN(basePrice)) return setError("Enter a price, like 12.50.");

    const optionGroups: OptionGroupData[] = [];
    for (const g of groups) {
      const options = [];
      for (const o of g.options) {
        const delta = inputToCents(o.price) ?? 0;
        if (Number.isNaN(delta)) return setError(`Option "${o.name || "(unnamed)"}" has an invalid price.`);
        options.push({ name: o.name, priceDelta: delta });
      }
      optionGroups.push({ name: g.name, required: g.required, minSelect: Number(g.min) || 0, maxSelect: Number(g.max) || 1, options });
    }

    const body = { categoryId, name, description, basePrice, isAvailable, optionGroups };
    const ok = item.id
      ? await save(`/api/owner/menu/items/${item.id}`, "PUT", body)
      : await save("/api/owner/menu/items", "POST", body);
    if (ok) onDone();
  }

  const small = "rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm";

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border-2 border-orange-200 bg-orange-50/40 p-4">
      <h3 className="font-bold">{item.id ? `Edit "${item.name}"` : "New menu item"}</h3>

      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} className={inputClass} />
        </Field>
        <Field label="Price ($)">
          <input value={price} onChange={(e) => setPrice(e.target.value)} required inputMode="decimal" placeholder="12.50" className={inputClass} />
        </Field>
      </div>
      <Field label="Description">
        <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} className={inputClass} />
      </Field>
      <div className="grid items-end gap-3 sm:grid-cols-2">
        <Field label="Category">
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Toggle checked={isAvailable} onChange={setIsAvailable} label="Available for new orders" />
      </div>

      {/* Option groups */}
      <div className="space-y-3">
        <div>
          <h4 className="font-semibold">Option groups</h4>
          <p className="text-xs text-gray-500">Choices customers make for this item, like Size or Add-ons. Option prices are added to the item price.</p>
        </div>

        {groups.map((g, gi) => (
          <div key={gi} className="space-y-3 rounded-lg border border-gray-200 bg-white p-3">
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Group name" className="min-w-40 flex-1">
                <input value={g.name} onChange={(e) => updateGroup(gi, { name: e.target.value })} required placeholder="Size" maxLength={60} className={inputClass} />
              </Field>
              <Toggle checked={g.required} onChange={(v) => setRequired(gi, v)} label="Required" />
              <label className="text-sm">
                Min
                <input value={g.min} onChange={(e) => updateGroup(gi, { min: e.target.value })} type="number" min={0} max={20} className={`${small} ml-1 w-14`} />
              </label>
              <label className="text-sm">
                Max
                <input value={g.max} onChange={(e) => updateGroup(gi, { max: e.target.value })} type="number" min={1} max={20} className={`${small} ml-1 w-14`} />
              </label>
              <button type="button" onClick={() => setGroups(groups.filter((_, i) => i !== gi))} className="text-sm text-red-600 hover:underline">
                Remove group
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Customers {g.required ? "must" : "may"} pick {g.min === g.max ? g.max : `${g.min}–${g.max}`}.
            </p>

            <ul className="space-y-2">
              {g.options.map((o, oi) => (
                <li key={oi} className="flex items-center gap-2">
                  <input value={o.name} onChange={(e) => updateOption(gi, oi, { name: e.target.value })} required placeholder="Option name (e.g. Large)" maxLength={60} className={`${small} min-w-0 flex-1`} />
                  <span className="text-sm text-gray-500">+$</span>
                  <input value={o.price} onChange={(e) => updateOption(gi, oi, { price: e.target.value })} inputMode="decimal" aria-label="Extra price" className={`${small} w-20`} />
                  <button
                    type="button"
                    aria-label="Remove option"
                    disabled={g.options.length === 1}
                    onClick={() => updateGroup(gi, { options: g.options.filter((_, i) => i !== oi) })}
                    className="px-1 text-lg text-gray-400 hover:text-red-600 disabled:opacity-30"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => updateGroup(gi, { options: [...g.options, { name: "", price: "0.00" }] })} className="text-sm font-medium text-orange-700 hover:underline">
              + Add option
            </button>
          </div>
        ))}

        <button type="button" onClick={() => setGroups([...groups, structuredClone(NEW_GROUP)])} className="rounded-lg border border-dashed border-gray-400 px-3 py-2 text-sm font-medium hover:bg-white">
          + Add option group
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={state.status === "saving"} className="rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
          {state.status === "saving" ? "Saving…" : item.id ? "Save item" : "Add item"}
        </button>
        <button type="button" onClick={onDone} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
          Cancel
        </button>
        <SaveStatus state={state.status === "saved" ? { status: "idle" } : state} />
      </div>
    </form>
  );
}
