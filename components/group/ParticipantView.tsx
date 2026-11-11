"use client";

// What someone sees after opening a share link: enter a name, add items,
// and edit/remove ONLY their own items. No account needed.
// Their name and a random token are saved in this browser (localStorage).
import { useCallback, useEffect, useState } from "react";
import ItemPicker, { type AddItemInput } from "@/components/group/ItemPicker";
import type { PickerMenu } from "@/lib/groupOrders";
import { describeOptions, lineUnitPrice, readOptions } from "@/lib/orderLines";
import { formatCents } from "@/lib/format";

type Line = {
  id: string;
  participantName: string;
  itemNameSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  selectedOptionsSnapshot: unknown;
  specialInstructions: string | null;
};

type Saved = { name: string; token: string };

/** 32 random hex characters. getRandomValues works even on plain-http LAN addresses (phones testing). */
function randomToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export default function ParticipantView({ shareCode, menu, isOpen }: { shareCode: string; menu: PickerMenu; isOpen: boolean }) {
  const storageKey = `groupgrub:join:${shareCode}`;
  const [me, setMe] = useState<Saved | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);

  // Load the saved name/token for this order (if this browser joined before).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setMe(JSON.parse(raw));
    } catch {
      // Storage blocked — they'll just enter their name again.
    }
    setLoaded(true);
  }, [storageKey]);

  const api = useCallback(
    async (path: string, method = "GET", body?: unknown) => {
      if (!me) return { ok: false, data: { error: "Enter your name first." } };
      const res = await fetch(`/api/join/${shareCode}/lines${path}`, {
        method,
        headers: { "Content-Type": "application/json", "x-participant-token": me.token },
        body: body === undefined ? undefined : JSON.stringify(body),
      }).catch(() => null);
      const data = await res?.json().catch(() => ({}));
      return { ok: Boolean(res?.ok), data: data ?? { error: "Couldn't reach the server." } };
    },
    [me, shareCode],
  );

  const refresh = useCallback(async () => {
    const { ok, data } = await api("");
    if (ok) setLines(data.lines);
  }, [api]);

  useEffect(() => {
    if (me) refresh();
  }, [me, refresh]);

  function saveName(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name") ?? "").trim().slice(0, 40);
    if (!name) return;
    const next = { name, token: me?.token ?? randomToken() };
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Not saved across visits, but works for now.
    }
    setMe(next);
    setEditingName(false);
  }

  async function add(input: AddItemInput) {
    const { ok, data } = await api("", "POST", { ...input, participantName: me!.name });
    if (!ok) return data.error ?? "Couldn't add that item.";
    await refresh();
    return null;
  }

  async function setQuantity(line: Line, quantity: number) {
    setError(null);
    const { ok, data } = quantity < 1 ? await api(`/${line.id}`, "DELETE") : await api(`/${line.id}`, "PATCH", { quantity });
    if (!ok) setError(data.error);
    await refresh();
  }

  if (!loaded) return null;

  // Step 1: name
  if (!me || editingName) {
    if (!isOpen) return null;
    return (
      <form onSubmit={saveName} className="space-y-3 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <label className="block">
          <span className="mb-1 block font-semibold">What&apos;s your name?</span>
          <span className="mb-2 block text-sm text-gray-500">So the restaurant can label your food. That&apos;s all we ask for.</span>
          <input name="name" defaultValue={me?.name ?? ""} required maxLength={40} autoFocus autoComplete="name" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
        </label>
        <button className="rounded-lg bg-orange-600 px-5 py-2.5 font-semibold text-white hover:bg-orange-700">Continue</button>
      </form>
    );
  }

  const myTotal = lines.reduce((sum, l) => sum + lineUnitPrice(l) * l.quantity, 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-start">
      <div className="order-2 space-y-3 lg:order-1">
        <h2 className="text-lg font-bold">Menu</h2>
        {isOpen ? (
          <ItemPicker menu={menu} onAdd={add} />
        ) : (
          <p className="text-sm text-gray-500">Adding items is closed.</p>
        )}
      </div>

      <aside className="order-1 space-y-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:order-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold">Your items, {me.name}</h2>
          {isOpen && (
            <button onClick={() => setEditingName(true)} className="text-xs text-gray-500 hover:underline">Not {me.name}?</button>
          )}
        </div>
        {lines.length === 0 ? (
          <p className="text-sm text-gray-500">{isOpen ? "Nothing yet — add something from the menu." : "You didn't add anything."}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {lines.map((l) => (
              <li key={l.id} className="py-2 text-sm">
                <div className="flex justify-between gap-2">
                  <p className="font-medium">{l.itemNameSnapshot}</p>
                  <p>{formatCents(lineUnitPrice(l) * l.quantity)}</p>
                </div>
                {readOptions(l.selectedOptionsSnapshot).length > 0 && <p className="text-xs text-gray-500">{describeOptions(readOptions(l.selectedOptionsSnapshot))}</p>}
                {l.specialInstructions && <p className="text-xs italic text-gray-500">“{l.specialInstructions}”</p>}
                {isOpen ? (
                  <div className="mt-1 flex items-center gap-2">
                    <button aria-label={`Fewer ${l.itemNameSnapshot}`} onClick={() => setQuantity(l, l.quantity - 1)} className="h-7 w-7 rounded border border-gray-300">−</button>
                    <span className="w-6 text-center">{l.quantity}</span>
                    <button aria-label={`More ${l.itemNameSnapshot}`} onClick={() => setQuantity(l, l.quantity + 1)} className="h-7 w-7 rounded border border-gray-300">+</button>
                    <button onClick={() => setQuantity(l, 0)} className="ml-auto text-xs text-red-600 hover:underline">Remove</button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Qty {l.quantity}</p>
                )}
              </li>
            ))}
          </ul>
        )}
        {lines.length > 0 && (
          <p className="flex justify-between border-t border-gray-100 pt-2 text-sm font-semibold">
            <span>Your items</span>
            <span>{formatCents(myTotal)}</span>
          </p>
        )}
        <p className="text-xs text-gray-500">Group bulk discounts are applied to the whole order. Payment is arranged by your organizer.</p>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      </aside>
    </div>
  );
}
