"use client";

// /owner/menu: categories and items. Item details and option groups are edited in ItemEditor.
import { useState } from "react";
import ItemEditor, { type ItemData } from "@/components/owner/ItemEditor";
import { Card, SaveStatus, inputClass, useSave } from "@/components/owner/ui";
import { formatCents, formatDelta } from "@/lib/format";

export type MenuCategoryData = {
  id: string;
  name: string;
  items: (ItemData & { id: string; bulkPrice: number | null; bulkMinQty: number | null })[];
};

export default function MenuManager({ categories }: { categories: MenuCategoryData[] }) {
  // Which editor is open: an item id, "new:<categoryId>", or null.
  const [editing, setEditing] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const { save, state } = useSave();
  const categoryChoices = categories.map((c) => ({ id: c.id, name: c.name }));

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (await save("/api/owner/menu/categories", "POST", { name: newCategory })) setNewCategory("");
  }

  async function renameCategory(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name") ?? "");
    if (await save(`/api/owner/menu/categories/${id}`, "PATCH", { name })) setRenaming(null);
  }

  // Swap a category with its neighbor, then save everyone's new position.
  async function move(index: number, direction: -1 | 1) {
    const order = categories.map((c) => c.id);
    const target = index + direction;
    [order[index], order[target]] = [order[target], order[index]];
    for (const [sortOrder, id] of order.entries()) {
      if (!(await save(`/api/owner/menu/categories/${id}`, "PATCH", { sortOrder }))) return;
    }
  }

  async function deleteCategory(id: string, name: string) {
    if (confirm(`Delete the category "${name}"?`)) await save(`/api/owner/menu/categories/${id}`, "DELETE");
  }

  async function deleteItem(id: string, name: string) {
    if (confirm(`Delete "${name}"? It disappears from your menu, but past orders still show it.`)) {
      await save(`/api/owner/menu/items/${id}`, "DELETE");
    }
  }

  return (
    <div className="space-y-4">
      <SaveStatus state={state} />

      {categories.length === 0 && (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-600">
          Your menu is empty. Start by adding a category like &quot;Pizzas&quot; or &quot;Drinks&quot;.
        </p>
      )}

      {categories.map((category, index) => (
        <Card
          key={category.id}
          actions={
            <div className="flex shrink-0 items-center gap-1 text-sm">
              <button onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up" className="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-30">↑</button>
              <button onClick={() => move(index, 1)} disabled={index === categories.length - 1} aria-label="Move down" className="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-30">↓</button>
              <button onClick={() => setRenaming(category.id)} className="rounded px-2 py-1 text-gray-600 hover:bg-gray-100">Rename</button>
              <button onClick={() => deleteCategory(category.id, category.name)} className="rounded px-2 py-1 text-red-600 hover:bg-red-50">Delete</button>
            </div>
          }
          title={renaming === category.id ? undefined : category.name}
        >
          {renaming === category.id && (
            <form onSubmit={(e) => renameCategory(e, category.id)} className="-mt-2 flex gap-2">
              <input name="name" defaultValue={category.name} required maxLength={60} autoFocus className={inputClass} />
              <button className="rounded-lg bg-gray-900 px-3 text-sm font-semibold text-white">Save</button>
              <button type="button" onClick={() => setRenaming(null)} className="px-2 text-sm text-gray-600">Cancel</button>
            </form>
          )}

          <ul className="divide-y divide-gray-100">
            {category.items.length === 0 && <li className="py-2 text-sm text-gray-500">No items yet.</li>}
            {category.items.map((item) =>
              editing === item.id ? (
                <li key={item.id} className="py-3">
                  <ItemEditor item={item} categories={categoryChoices} onDone={() => setEditing(null)} />
                </li>
              ) : (
                <li key={item.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className={`min-w-0 ${item.isAvailable ? "" : "opacity-50"}`}>
                    <p className="font-medium">
                      {item.name} <span className="font-normal text-gray-600">· {formatCents(item.basePrice)}</span>
                      {!item.isAvailable && <span className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-xs">Unavailable</span>}
                    </p>
                    {item.description && <p className="text-sm text-gray-500">{item.description}</p>}
                    {item.optionGroups.map((g) => (
                      <p key={g.name} className="text-xs text-gray-500">
                        <span className="font-medium text-gray-700">{g.name}</span> ({g.required ? "required" : "optional"}, pick {g.minSelect === g.maxSelect ? g.maxSelect : `${g.minSelect}–${g.maxSelect}`}):{" "}
                        {g.options.map((o) => `${o.name}${o.priceDelta ? ` ${formatDelta(o.priceDelta)}` : ""}`).join(", ")}
                      </p>
                    ))}
                    {item.bulkPrice != null && (
                      <p className="text-xs text-green-700">Bulk: {formatCents(item.bulkPrice)} each for {item.bulkMinQty}+ (set on Pricing)</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1 text-sm">
                    <button
                      onClick={() => save(`/api/owner/menu/items/${item.id}`, "PATCH", { isAvailable: !item.isAvailable })}
                      className="rounded px-2 py-1 text-gray-600 hover:bg-gray-100"
                    >
                      {item.isAvailable ? "Mark unavailable" : "Mark available"}
                    </button>
                    <button onClick={() => setEditing(item.id)} className="rounded px-2 py-1 font-medium text-orange-700 hover:bg-orange-50">Edit</button>
                    <button onClick={() => deleteItem(item.id, item.name)} className="rounded px-2 py-1 text-red-600 hover:bg-red-50">Delete</button>
                  </div>
                </li>
              ),
            )}
          </ul>

          {editing === `new:${category.id}` ? (
            <ItemEditor
              item={{ categoryId: category.id, name: "", description: "", basePrice: 0, isAvailable: true, optionGroups: [] }}
              categories={categoryChoices}
              onDone={() => setEditing(null)}
            />
          ) : (
            <button onClick={() => setEditing(`new:${category.id}`)} className="text-sm font-medium text-orange-700 hover:underline">
              + Add item to {category.name}
            </button>
          )}
        </Card>
      ))}

      <Card title="Add a category">
        <form onSubmit={addCategory} className="flex gap-2">
          <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} required maxLength={60} placeholder="e.g. Drinks" className={inputClass} />
          <button className="shrink-0 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-700">Add</button>
        </form>
      </Card>
    </div>
  );
}
