"use client";

// Status buttons and the owner's note on /owner/orders/[id].
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@prisma/client";

const NEXT_ACTIONS: Partial<Record<OrderStatus, { to: OrderStatus; label: string; style: string }[]>> = {
  SUBMITTED: [{ to: "ACCEPTED", label: "Accept order", style: "bg-green-600 hover:bg-green-700 text-white" }],
  ACCEPTED: [{ to: "PREPARING", label: "Mark Preparing", style: "bg-amber-500 hover:bg-amber-600 text-white" }],
  PREPARING: [{ to: "READY", label: "Mark Ready", style: "bg-emerald-600 hover:bg-emerald-700 text-white" }],
  READY: [{ to: "COMPLETED", label: "Mark Completed", style: "bg-gray-800 hover:bg-gray-900 text-white" }],
};

async function send(url: string, method: string, body: unknown): Promise<string | null> {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  const data = await res?.json().catch(() => ({}));
  return res?.ok ? null : (data?.error ?? "Something went wrong. Please try again.");
}

export default function OwnerOrderActions({ orderId, status, ownerNote }: { orderId: string; status: OrderStatus; ownerNote: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState(ownerNote ?? "");
  const [noteSaved, setNoteSaved] = useState(false);

  async function changeTo(to: OrderStatus, extra: { reason?: string } = {}) {
    setBusy(true);
    setError(null);
    const err = await send(`/api/owner/orders/${orderId}/status`, "POST", { to, ...extra });
    setBusy(false);
    if (err) return setError(err);
    setRejecting(false);
    router.refresh();
  }

  async function saveNote(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const err = await send(`/api/owner/orders/${orderId}/note`, "PUT", { note });
    setBusy(false);
    if (err) return setError(err);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    router.refresh();
  }

  const actions = NEXT_ACTIONS[status] ?? [];

  return (
    <div className="space-y-4">
      {(actions.length > 0 || status === "SUBMITTED") && (
        <div className="flex flex-col gap-2 sm:flex-row">
          {actions.map((a) => (
            <button key={a.to} disabled={busy} onClick={() => changeTo(a.to)} className={`rounded-lg px-5 py-3 font-semibold disabled:opacity-50 ${a.style}`}>
              {a.label}
            </button>
          ))}
          {status === "SUBMITTED" && !rejecting && (
            <button disabled={busy} onClick={() => setRejecting(true)} className="rounded-lg border border-red-300 bg-white px-5 py-3 font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
              Reject…
            </button>
          )}
        </div>
      )}

      {rejecting && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            changeTo("REJECTED", { reason });
          }}
          className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3"
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Reason for rejecting (the organizer will see this)</span>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} required maxLength={500} rows={2} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2" placeholder="e.g. We're closed for a private event that evening." />
          </label>
          <div className="flex gap-2">
            <button disabled={busy || !reason.trim()} className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50">Reject order</button>
            <button type="button" onClick={() => setRejecting(false)} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          </div>
        </form>
      )}

      <form onSubmit={saveNote} className="space-y-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Note to the organizer</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder='e.g. "Pull up to the side door — we will bring it out."' />
        </label>
        <button disabled={busy} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">
          {noteSaved ? "✓ Note saved" : "Save note"}
        </button>
      </form>

      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
