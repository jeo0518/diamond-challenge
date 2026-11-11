"use client";

// Small building blocks shared by the owner forms.
import { useState } from "react";
import { useRouter } from "next/navigation";

export const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200 disabled:bg-gray-100";

export function Field({ label, hint, children, className = "" }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

export function Card({ title, children, actions }: { title?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3">
          {title && <h2 className="text-lg font-bold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-orange-600" />
      {label}
    </label>
  );
}

// ----- money inputs: owners type dollars, we store cents -----

/** 1250 → "12.50", null → "" */
export function centsToInput(cents: number | null | undefined): string {
  return cents == null ? "" : (cents / 100).toFixed(2);
}

/** "12.5" → 1250, "" → null, "abc" → NaN (caller shows an error) */
export function inputToCents(value: string): number | null {
  const v = value.trim().replace(/^\$/, "");
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

/** "" → null, "12" → 12 */
export function inputToNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

// ----- saving -----

type SaveState = { status: "idle" | "saving" | "saved" | "error"; message?: string };

/**
 * Sends JSON to an owner API route and refreshes the page data on success.
 *   const { save, state } = useSave();
 *   await save("/api/owner/settings", "PUT", body)
 */
export function useSave() {
  const router = useRouter();
  const [state, setState] = useState<SaveState>({ status: "idle" });

  async function save(url: string, method: string, body?: unknown): Promise<boolean> {
    setState({ status: "saving" });
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState({ status: "error", message: data.error ?? "Something went wrong. Please try again." });
        return false;
      }
      setState({ status: "saved", message: "Saved." });
      router.refresh();
      return true;
    } catch {
      setState({ status: "error", message: "Couldn't reach the server. Check your connection." });
      return false;
    }
  }

  return { save, state, setError: (message: string) => setState({ status: "error", message }), reset: () => setState({ status: "idle" }) };
}

export function SaveStatus({ state }: { state: SaveState }) {
  if (state.status === "error") return <p role="status" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>;
  if (state.status === "saved") return <p role="status" className="text-sm font-medium text-green-700">✓ {state.message}</p>;
  return null;
}

export function SaveButton({ saving, children = "Save changes" }: { saving: boolean; children?: React.ReactNode }) {
  return (
    <button type="submit" disabled={saving} className="rounded-lg bg-orange-600 px-5 py-2.5 font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
      {saving ? "Saving…" : children}
    </button>
  );
}
