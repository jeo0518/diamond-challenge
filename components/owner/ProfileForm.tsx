"use client";

// /owner/restaurant form: name, description, cuisine, address, lat/lng, phone, hours, photo.
import { useState } from "react";
import { Card, Field, SaveButton, SaveStatus, inputClass, inputToNumber, useSave } from "@/components/owner/ui";

export type ProfileValues = {
  name: string;
  description: string;
  cuisine: string;
  address: string;
  lat: number | null;
  lng: number | null;
  phone: string;
  hours: string | null;
  imageUrl: string | null;
};

export default function ProfileForm({ initial, isNew, isSample }: { initial: ProfileValues; isNew: boolean; isSample: boolean }) {
  const [v, setV] = useState({
    ...initial,
    lat: initial.lat?.toString() ?? "",
    lng: initial.lng?.toString() ?? "",
    hours: initial.hours ?? "",
    imageUrl: initial.imageUrl ?? "",
  });
  const [locating, setLocating] = useState(false);
  const { save, state, setError } = useSave();
  const set = (key: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setV({ ...v, [key]: e.target.value });

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) return setError("Your browser can't share location. Type the numbers instead.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setV((cur) => ({ ...cur, lat: pos.coords.latitude.toFixed(5), lng: pos.coords.longitude.toFixed(5) }));
      },
      () => {
        setLocating(false);
        setError("Couldn't get your location. Type the latitude and longitude instead.");
      },
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const lat = inputToNumber(v.lat);
    const lng = inputToNumber(v.lng);
    if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
      return setError("Enter a latitude and longitude (numbers), or use your current location.");
    }
    await save("/api/owner/restaurant", "PUT", {
      ...v,
      lat,
      lng,
      hours: v.hours.trim() || null,
      imageUrl: v.imageUrl.trim() || null,
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Card title="Basics">
        {isSample && (
          <p className="rounded-lg bg-yellow-100 px-3 py-2 text-sm text-yellow-900">
            This is a SAMPLE restaurant. Its name always keeps the <b>[SAMPLE]</b> prefix.
          </p>
        )}
        <Field label="Restaurant name">
          <input value={v.name} onChange={set("name")} required maxLength={100} className={inputClass} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cuisine" hint="e.g. Pizza, Mexican, Korean">
            <input value={v.cuisine} onChange={set("cuisine")} required maxLength={50} className={inputClass} />
          </Field>
          <Field label="Phone">
            <input value={v.phone} onChange={set("phone")} required maxLength={30} type="tel" className={inputClass} />
          </Field>
        </div>
        <Field label="Description">
          <textarea value={v.description} onChange={set("description")} rows={3} maxLength={1000} className={inputClass} />
        </Field>
        <Field label="Hours" hint='Free text, e.g. "Mon–Sat 11am–9pm". Group order time slots are set in Settings.'>
          <input value={v.hours} onChange={set("hours")} maxLength={200} className={inputClass} />
        </Field>
        <Field label="Photo URL (optional)" hint="A link to a photo already online (https://…).">
          <input value={v.imageUrl} onChange={set("imageUrl")} type="url" maxLength={500} className={inputClass} />
        </Field>
      </Card>

      <Card title="Location">
        <Field label="Street address">
          <input value={v.address} onChange={set("address")} required maxLength={200} className={inputClass} />
        </Field>
        <p className="text-sm text-gray-500">
          Customers find you by distance, so we need your map coordinates. Standing at the restaurant? Use the button.
          Otherwise, find them on a free map site (right-click your location) and paste them in.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Latitude">
            <input value={v.lat} onChange={set("lat")} required inputMode="decimal" placeholder="30.2672" className={inputClass} />
          </Field>
          <Field label="Longitude">
            <input value={v.lng} onChange={set("lng")} required inputMode="decimal" placeholder="-97.7431" className={inputClass} />
          </Field>
        </div>
        <button type="button" onClick={useCurrentLocation} disabled={locating} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-60">
          {locating ? "Getting location…" : "📍 Use my current location"}
        </button>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <SaveButton saving={state.status === "saving"}>{isNew ? "Create restaurant" : "Save changes"}</SaveButton>
        <SaveStatus state={state} />
      </div>
    </form>
  );
}
