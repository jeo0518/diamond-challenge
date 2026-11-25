"use client";

// Lets the organizer cancel while the order is collecting or waiting for the restaurant.
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/group-orders/${orderId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() || undefined }),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    setBusy(false);
    if (!res?.ok) return setError(data?.error ?? "Couldn't cancel. Please try again.");
    setOpen(false);
    // Cancelled orders live on the order history page.
    router.push(`/orders/${orderId}`);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
        Cancel order…
      </button>
    );
  }
  return (
    <form onSubmit={cancel} className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3">
      <p className="text-sm font-medium">Cancel this group order? This can&apos;t be undone.</p>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={500}
        placeholder="Reason (optional) — the restaurant will see it"
        aria-label="Cancel reason"
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button disabled={busy} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
          {busy ? "Cancelling…" : "Yes, cancel order"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100">
          Keep order
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </form>
  );
}
