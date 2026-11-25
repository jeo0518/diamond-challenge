"use client";

// Approve / Hide button on /admin/restaurants.
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ApprovalButton({ id, name, approved }: { id: string; name: string; approved: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const question = approved
      ? `Hide "${name}"? Customers won't be able to find it or start new orders. Orders already sent to it continue.`
      : `Approve "${name}"? It will show up in search for customers right away.`;
    if (!confirm(question)) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/restaurants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: !approved }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError((await res?.json().catch(() => null))?.error ?? "Something went wrong.");
    router.refresh();
  }

  return (
    <div>
      <button
        onClick={toggle}
        disabled={busy}
        className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
          approved ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50" : "bg-green-600 text-white hover:bg-green-700"
        }`}
      >
        {busy ? "Saving…" : approved ? "Hide" : "Approve"}
      </button>
      {error && <p role="alert" className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
