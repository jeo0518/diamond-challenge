"use client";

// Small interactive pieces of the organizer page (/group/[id]).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ItemPicker, { type AddItemInput } from "@/components/group/ItemPicker";
import type { PickerMenu } from "@/lib/groupOrders";

/** POST/DELETE to an organizer API route, then refresh the page. Returns an error message or null. */
function useOrganizerApi() {
  const router = useRouter();
  return async (url: string, method: string, body?: unknown): Promise<string | null> => {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok) return data?.error ?? "Something went wrong. Please try again.";
    router.refresh();
    return null;
  };
}

/** Re-loads the page data every 15 seconds so new participant items show up. */
export function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);
  return null;
}

export function ShareLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (e.g. plain-http on a phone) — the link is selectable below.
    }
  }

  return (
    <div className="space-y-2 rounded-xl border-2 border-orange-200 bg-orange-50 p-4">
      <p className="font-semibold">Share this link so people can add their own food</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Share link" className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm" />
        <button onClick={copy} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">
          {copied ? "✓ Copied" : "Copy link"}
        </button>
      </div>
      <p className="text-xs text-gray-600">Paste it in your group chat. Nobody needs an account — just their name.</p>
    </div>
  );
}

export function RemoveLineButton({ orderId, lineId, label }: { orderId: string; lineId: string; label: string }) {
  const call = useOrganizerApi();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      aria-label={`Remove ${label}`}
      onClick={async () => {
        if (!confirm(`Remove ${label}?`)) return;
        setBusy(true);
        const err = await call(`/api/group-orders/${orderId}/lines/${lineId}`, "DELETE");
        setBusy(false);
        if (err) alert(err);
      }}
      className="text-xs text-red-600 hover:underline disabled:opacity-50"
    >
      Remove
    </button>
  );
}

export function AddForSomeone({ orderId, menu, defaultName }: { orderId: string; menu: PickerMenu; defaultName: string }) {
  const call = useOrganizerApi();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50">
        + Add items yourself (for you or someone else)
      </button>
    );
  }
  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block flex-1">
          <span className="mb-1 block text-sm font-medium">Adding items for</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2" />
        </label>
        <button onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100">Done</button>
      </div>
      <ItemPicker
        menu={menu}
        onAdd={(input: AddItemInput) =>
          name.trim() ? call(`/api/group-orders/${orderId}/lines`, "POST", { ...input, participantName: name.trim() }) : Promise.resolve("Enter a name first.")
        }
      />
    </div>
  );
}

export function OrganizerActions({ orderId, canSubmit, collectionOpen }: { orderId: string; canSubmit: boolean; collectionOpen: boolean }) {
  const call = useOrganizerApi();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: string, url: string, question: string) {
    if (!confirm(question)) return;
    setBusy(kind);
    setError(await call(url, "POST"));
    setBusy(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          disabled={!canSubmit || busy !== null}
          onClick={() => run("submit", `/api/group-orders/${orderId}/submit`, "Send this order to the restaurant? People won't be able to add or change items after this.")}
          className="rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "submit" ? "Submitting…" : "Submit to Restaurant"}
        </button>
        {collectionOpen && (
          <button
            disabled={busy !== null}
            onClick={() => run("close", `/api/group-orders/${orderId}/close`, "Stop people from adding items now? You can still review and submit.")}
            className="rounded-lg border border-gray-300 bg-white px-5 py-3 font-semibold hover:bg-gray-50 disabled:opacity-50"
          >
            {busy === "close" ? "Closing…" : "Close collection early"}
          </button>
        )}
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
