"use client";

// Shows where we're searching from, asks the browser for location,
// and lets the user type a ZIP code or city instead.
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  /** What we're currently searching around, e.g. "your location" or "Austin, TX 78701". */
  centerLabel: string;
  /** "gps" | "place" | "default" */
  source: string;
  /** Error from an unknown ZIP/city, if any. */
  placeError?: string;
};

const ASKED_KEY = "groupgrub:askedForLocation";

export default function LocationBar({ centerLabel, source, placeError }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"idle" | "asking" | "denied" | "unsupported">("idle");

  // Put coordinates in the URL (dropping any typed place) so the server can search around them.
  function goToCoords(lat: number, lng: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("place");
    params.set("lat", lat.toFixed(5));
    params.set("lng", lng.toFixed(5));
    router.replace(`${pathname}?${params.toString()}`);
  }

  function askForLocation() {
    if (!("geolocation" in navigator)) {
      setStatus("unsupported");
      return;
    }
    setStatus("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStatus("idle");
        goToCoords(pos.coords.latitude, pos.coords.longitude);
      },
      () => setStatus("denied"), // denied, timed out, or unavailable
      { timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  }

  // On first visit (no location chosen yet), ask the browser once per browser session.
  useEffect(() => {
    if (source !== "default") return;
    let alreadyAsked = false;
    try {
      alreadyAsked = sessionStorage.getItem(ASKED_KEY) === "1";
      sessionStorage.setItem(ASKED_KEY, "1");
    } catch {
      // Storage can be blocked (private mode). Just ask anyway.
    }
    if (!alreadyAsked) askForLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on load
  }, []);

  function submitPlace(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const place = String(new FormData(e.currentTarget).get("place") ?? "").trim();
    const params = new URLSearchParams(searchParams.toString());
    params.delete("lat");
    params.delete("lng");
    if (place) params.set("place", place);
    else params.delete("place");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-sm">
        <span className="text-gray-500">Showing restaurants near </span>
        <span className="font-semibold">{centerLabel}</span>
      </p>

      {status === "asking" && <p className="text-sm text-gray-500">Asking your browser for your location…</p>}
      {status === "denied" && (
        <p className="text-sm text-amber-700">
          We couldn&apos;t get your location. Type a ZIP code or city below, or keep using the default area.
        </p>
      )}
      {status === "unsupported" && (
        <p className="text-sm text-amber-700">Your browser can&apos;t share location. Type a ZIP code or city below.</p>
      )}
      {placeError && <p className="text-sm text-red-700">{placeError}</p>}

      <div className="flex flex-col gap-2 sm:flex-row">
        <form onSubmit={submitPlace} className="flex flex-1 gap-2">
          <input
            name="place"
            defaultValue={searchParams.get("place") ?? ""}
            placeholder="ZIP code or city (e.g. 78701)"
            aria-label="ZIP code or city"
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2"
          />
          <button type="submit" className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700">
            Go
          </button>
        </form>
        <button
          type="button"
          onClick={askForLocation}
          disabled={status === "asking"}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60"
        >
          📍 Use my location
        </button>
      </div>
    </div>
  );
}
