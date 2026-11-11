"use client";

// /owner/settings: group order rules and the weekly pickup/delivery time slots.
import Link from "next/link";
import { useState } from "react";
import { Card, Field, SaveButton, SaveStatus, Toggle, inputClass, inputToNumber, useSave } from "@/components/owner/ui";
import { DAY_NAMES } from "@/lib/format";

export type SettingsValues = {
  acceptsGroupOrders: boolean;
  minGroupSize: number;
  maxGroupSize: number | null;
  leadTimeHours: number;
  allowsPickup: boolean;
  allowsDelivery: boolean;
  deliveryRadiusMiles: number | null;
  organizerNotes: string | null;
  timeSlots: { dayOfWeek: number; startTime: string; endTime: string; slotMinutes: number; maxOrdersPerSlot: number }[];
};

type SlotForm = { day: string; start: string; end: string; minutes: string; max: string };

/** How many slots fit in a window, e.g. 16:00–20:00 in 30-min slots = 8. */
function slotCount(s: SlotForm): number {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const n = Math.floor((toMin(s.end) - toMin(s.start)) / Number(s.minutes));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export default function SettingsForm({ initial }: { initial: SettingsValues }) {
  const [accepts, setAccepts] = useState(initial.acceptsGroupOrders);
  const [minSize, setMinSize] = useState(String(initial.minGroupSize));
  const [maxSize, setMaxSize] = useState(initial.maxGroupSize?.toString() ?? "");
  const [leadTime, setLeadTime] = useState(String(initial.leadTimeHours));
  const [pickup, setPickup] = useState(initial.allowsPickup);
  const [delivery, setDelivery] = useState(initial.allowsDelivery);
  const [radius, setRadius] = useState(initial.deliveryRadiusMiles?.toString() ?? "");
  const [notes, setNotes] = useState(initial.organizerNotes ?? "");
  const [slots, setSlots] = useState<SlotForm[]>(
    initial.timeSlots.map((s) => ({ day: String(s.dayOfWeek), start: s.startTime, end: s.endTime, minutes: String(s.slotMinutes), max: String(s.maxOrdersPerSlot) })),
  );
  const { save, state, setError } = useSave();

  const updateSlot = (i: number, patch: Partial<SlotForm>) => setSlots(slots.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const addSlot = () => {
    // Start from the last row so adding several similar windows is quick.
    const last = slots[slots.length - 1];
    setSlots([...slots, last ? { ...last, day: String((Number(last.day) + 1) % 7) } : { day: "5", start: "16:00", end: "20:00", minutes: "30", max: "2" }]);
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const maxGroupSize = inputToNumber(maxSize);
    const deliveryRadiusMiles = inputToNumber(radius);
    if (Number.isNaN(maxGroupSize) || Number.isNaN(deliveryRadiusMiles)) return setError("Check the number fields.");
    await save("/api/owner/settings", "PUT", {
      acceptsGroupOrders: accepts,
      minGroupSize: Number(minSize),
      maxGroupSize,
      leadTimeHours: Number(leadTime),
      allowsPickup: pickup,
      allowsDelivery: delivery,
      deliveryRadiusMiles: delivery ? deliveryRadiusMiles : null,
      organizerNotes: notes.trim() || null,
      timeSlots: slots.map((s) => ({
        dayOfWeek: Number(s.day),
        startTime: s.start,
        endTime: s.end,
        slotMinutes: Number(s.minutes),
        maxOrdersPerSlot: Number(s.max),
      })),
    });
  }

  const small = "rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Card title="Group orders">
        <Toggle checked={accepts} onChange={setAccepts} label="Accepting group orders" />
        {!accepts && <p className="text-sm text-amber-700">You&apos;re hidden from search and customers can&apos;t start new group orders.</p>}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Minimum order (items)">
            <input value={minSize} onChange={(e) => setMinSize(e.target.value)} type="number" min={1} required className={inputClass} />
          </Field>
          <Field label="Maximum order (items)" hint="Leave blank for no limit.">
            <input value={maxSize} onChange={(e) => setMaxSize(e.target.value)} type="number" min={1} className={inputClass} />
          </Field>
          <Field label="Lead time (hours)" hint="How far ahead orders must be placed.">
            <input value={leadTime} onChange={(e) => setLeadTime(e.target.value)} type="number" min={0} required className={inputClass} />
          </Field>
        </div>
      </Card>

      <Card title="Pickup & delivery">
        <div className="flex flex-wrap gap-6">
          <Toggle checked={pickup} onChange={setPickup} label="Pickup" />
          <Toggle checked={delivery} onChange={setDelivery} label="Delivery (by your own staff)" />
        </div>
        {delivery && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Delivery radius (miles)">
              <input value={radius} onChange={(e) => setRadius(e.target.value)} type="number" min={0.5} step={0.5} required className={inputClass} />
            </Field>
            <p className="self-end text-sm text-gray-500">
              The delivery fee is set on the{" "}
              <Link href="/owner/pricing" className="font-medium text-orange-700 hover:underline">Pricing page</Link>.
            </p>
          </div>
        )}
      </Card>

      <Card title="Available time slots">
        <p className="text-sm text-gray-500">
          When groups can pick up or get delivery. Each window is split into slots; &quot;max orders&quot; is how many group orders you
          can handle in one slot.
        </p>
        {slots.length === 0 && <p className="text-sm text-amber-700">No time slots yet — customers won&apos;t be able to pick a time.</p>}
        <div className="space-y-2">
          {slots.map((s, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-100 p-2 text-sm">
              <select value={s.day} onChange={(e) => updateSlot(i, { day: e.target.value })} aria-label="Day" className={small}>
                {DAY_NAMES.map((d, n) => (
                  <option key={n} value={n}>{d}</option>
                ))}
              </select>
              <input value={s.start} onChange={(e) => updateSlot(i, { start: e.target.value })} type="time" required aria-label="Start time" className={small} />
              <span>to</span>
              <input value={s.end} onChange={(e) => updateSlot(i, { end: e.target.value })} type="time" required aria-label="End time" className={small} />
              <select value={s.minutes} onChange={(e) => updateSlot(i, { minutes: e.target.value })} aria-label="Slot length" className={small}>
                <option value="15">15-min slots</option>
                <option value="30">30-min slots</option>
                <option value="60">60-min slots</option>
              </select>
              <label className="flex items-center gap-1">
                max
                <input value={s.max} onChange={(e) => updateSlot(i, { max: e.target.value })} type="number" min={1} max={50} required aria-label="Max orders per slot" className={`${small} w-14`} />
                orders/slot
              </label>
              <span className="text-xs text-gray-400">({slotCount(s)} slots)</span>
              <button type="button" onClick={() => setSlots(slots.filter((_, j) => j !== i))} className="ml-auto text-red-600 hover:underline">
                Remove
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addSlot} className="text-sm font-medium text-orange-700 hover:underline">
          + Add time window
        </button>
      </Card>

      <Card title="Notes for organizers">
        <Field label="Shown on your restaurant page" hint='e.g. "Large orders come in labeled bags per person."'>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={1000} className={inputClass} />
        </Field>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <SaveButton saving={state.status === "saving"} />
        <SaveStatus state={state} />
      </div>
    </form>
  );
}
