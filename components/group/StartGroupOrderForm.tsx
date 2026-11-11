"use client";

// "Start Group Order" form: event name, time slot, pickup/delivery, headcount, deadline.
import { useState } from "react";
import { useRouter } from "next/navigation";

type SlotOption = { iso: string; time: string; remaining: number };
type Props = {
  restaurantId: string;
  allowsPickup: boolean;
  allowsDelivery: boolean;
  deliveryRadiusMiles: number | null;
  leadTimeHours: number;
  slotsByDay: { day: string; slots: SlotOption[] }[];
};

/** Date → "2026-11-13T16:00" for <input type="datetime-local"> (local time). */
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const field = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2";

export default function StartGroupOrderForm(props: Props) {
  const router = useRouter();
  const firstOpen = props.slotsByDay.flatMap((d) => d.slots).find((s) => s.remaining > 0);
  const [slot, setSlot] = useState(firstOpen?.iso ?? "");
  const [fulfillment, setFulfillment] = useState<"PICKUP" | "DELIVERY">(props.allowsPickup ? "PICKUP" : "DELIVERY");
  const [deadline, setDeadline] = useState(() => (firstOpen ? defaultDeadline(firstOpen.iso) : ""));
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Latest allowed deadline = pickup time minus the restaurant's lead time.
  function defaultDeadline(iso: string) {
    return toLocalInput(new Date(new Date(iso).getTime() - props.leadTimeHours * 3600_000));
  }

  function chooseSlot(iso: string) {
    setSlot(iso);
    setDeadline(defaultDeadline(iso));
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) return setError("Your browser can't share location. Enter the ZIP code.");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
        setError(null);
      },
      () => setError("Couldn't get your location. Enter the ZIP code instead."),
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const headcount = String(form.get("headcount") ?? "").trim();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/group-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantId: props.restaurantId,
        eventName: form.get("eventName"),
        scheduledFor: slot,
        participantDeadline: new Date(deadline).toISOString(),
        fulfillment,
        expectedHeadcount: headcount ? Number(headcount) : null,
        deliveryAddress: fulfillment === "DELIVERY" ? String(form.get("deliveryAddress") ?? "") || null : null,
        deliveryZip: fulfillment === "DELIVERY" ? String(form.get("deliveryZip") ?? "").trim() || null : null,
        deliveryLat: fulfillment === "DELIVERY" ? (coords?.lat ?? null) : null,
        deliveryLng: fulfillment === "DELIVERY" ? (coords?.lng ?? null) : null,
      }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setSaving(false);
    if (!res?.ok) return setError(data?.error ?? "Couldn't start the order. Please try again.");
    router.push(`/group/${data.id}`);
  }

  if (!firstOpen) {
    return (
      <p className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-600">
        No open pickup/delivery times in the next two weeks. Check back later or try another restaurant.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Event name</span>
        <input name="eventName" required maxLength={100} placeholder="Band dinner before Saturday competition" className={field} />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Pickup / delivery time</span>
        <select value={slot} onChange={(e) => chooseSlot(e.target.value)} required className={field} aria-label="Pickup or delivery time">
          {props.slotsByDay.map((d) => (
            <optgroup key={d.day} label={d.day}>
              {d.slots.map((s) => (
                <option key={s.iso} value={s.iso} disabled={s.remaining === 0}>
                  {s.time}
                  {s.remaining === 0 ? " — full" : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <span className="mt-1 block text-xs text-gray-500">Only times at least {props.leadTimeHours} hours from now are shown.</span>
      </label>

      <fieldset>
        <legend className="mb-1 text-sm font-medium">Pickup or delivery</legend>
        <div className="flex gap-3">
          {props.allowsPickup && (
            <label className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <input type="radio" name="fulfillment" checked={fulfillment === "PICKUP"} onChange={() => setFulfillment("PICKUP")} className="accent-orange-600" />
              Pickup
            </label>
          )}
          {props.allowsDelivery && (
            <label className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <input type="radio" name="fulfillment" checked={fulfillment === "DELIVERY"} onChange={() => setFulfillment("DELIVERY")} className="accent-orange-600" />
              Delivery (within {props.deliveryRadiusMiles} mi)
            </label>
          )}
        </div>
      </fieldset>

      {fulfillment === "DELIVERY" && (
        <div className="space-y-3 rounded-lg bg-gray-50 p-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Delivery address</span>
            <input name="deliveryAddress" required maxLength={200} placeholder="School name, street, room/door" className={field} />
          </label>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">ZIP code</span>
              <input name="deliveryZip" maxLength={10} inputMode="numeric" placeholder="78701" className={`${field} w-32`} />
            </label>
            <span className="pb-2 text-sm text-gray-500">or</span>
            <button type="button" onClick={useMyLocation} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50">
              {coords ? "✓ Using my location" : "📍 I'm at the delivery address"}
            </button>
          </div>
          <p className="text-xs text-gray-500">We use this only to check the restaurant delivers that far.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            Expected headcount <span className="font-normal text-gray-500">(optional)</span>
          </span>
          <input name="headcount" type="number" min={1} max={5000} placeholder="e.g. 80" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Deadline for people to add items</span>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            max={slot ? defaultDeadline(slot) : undefined}
            required
            className={field}
            aria-label="Deadline for people to add items"
          />
          <span className="mt-1 block text-xs text-gray-500">Must be at least {props.leadTimeHours}h before pickup, so you can submit in time.</span>
        </label>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button type="submit" disabled={saving} className="w-full rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700 disabled:opacity-60 sm:w-auto">
        {saving ? "Starting…" : "Start group order"}
      </button>
    </form>
  );
}
