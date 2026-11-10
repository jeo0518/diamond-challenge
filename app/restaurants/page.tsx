// /restaurants — location-based restaurant search (customers only).
// All search state lives in the URL (?lat=&lng= or ?place=, plus filters),
// so the server does the filtering and results can be bookmarked/shared.
import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { isValidLatLng, type LatLng } from "@/lib/geo";
import { lookupPlace, KNOWN_PLACE_EXAMPLES } from "@/lib/zipLookup";
import { defaultCenter, searchRestaurants, showSampleRestaurants } from "@/lib/restaurantSearch";
import LocationBar from "@/components/LocationBar";
import RestaurantCard from "@/components/RestaurantCard";

export const metadata: Metadata = { title: "Find a restaurant — GroupGrub" };

const DISTANCE_CHOICES = [2, 5, 10, 25];
const DEFAULT_MILES = 25; // used when no distance is picked; "any" turns the limit off

// Validate the URL's query string. Bad values are ignored instead of crashing.
const optionalNumber = z.coerce.number().finite().positive().optional().catch(undefined);
const paramsSchema = z.object({
  lat: z.coerce.number().optional().catch(undefined),
  lng: z.coerce.number().optional().catch(undefined),
  place: z.string().max(60).optional().catch(undefined),
  q: z.string().max(100).optional().catch(undefined),
  miles: z.union([z.literal("any"), optionalNumber]).optional().catch(undefined),
  size: z.coerce.number().int().positive().max(10000).optional().catch(undefined),
  cuisine: z.string().max(50).optional().catch(undefined),
});

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function RestaurantsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole("CUSTOMER");

  const raw = await searchParams;
  const flat = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const params = paramsSchema.parse(flat);

  // Where are we searching from? Browser location > typed ZIP/city > default from .env
  let center: LatLng = defaultCenter();
  let centerLabel = "the default area";
  let source = "default";
  let placeError: string | undefined;

  if (params.lat != null && params.lng != null && isValidLatLng(params.lat, params.lng)) {
    center = { lat: params.lat, lng: params.lng };
    centerLabel = "your location";
    source = "gps";
  } else if (params.place) {
    const place = lookupPlace(params.place);
    if (place) {
      center = place;
      centerLabel = place.label;
      source = "place";
    } else {
      placeError = `We don't know "${params.place}" yet. Try one of: ${KNOWN_PLACE_EXAMPLES.join(", ")}. (ZIP lookup is a small placeholder list for now.)`;
    }
  }

  const showSamples = showSampleRestaurants();
  const restaurants = await prisma.restaurant.findMany({
    where: showSamples ? {} : { isSample: false },
    select: {
      id: true, name: true, cuisine: true, lat: true, lng: true, isSample: true,
      acceptsGroupOrders: true, minGroupSize: true, maxGroupSize: true,
      leadTimeHours: true, allowsPickup: true, allowsDelivery: true,
    },
  });

  // Cuisine dropdown choices come from whatever is in the database.
  const cuisines = [...new Set(restaurants.filter((r) => r.acceptsGroupOrders).map((r) => r.cuisine))].sort();

  const maxMiles = params.miles === "any" ? undefined : (params.miles ?? DEFAULT_MILES);
  const results = searchRestaurants(restaurants, center, {
    text: params.q,
    maxMiles,
    groupSize: params.size,
    cuisine: params.cuisine,
    showSamples,
  });

  const hasFilters = Boolean(params.q || (params.miles && params.miles !== DEFAULT_MILES) || params.size || params.cuisine);
  // Keep the location in links to detail pages so they can show distance too.
  const locationQuery =
    source === "gps" ? `?lat=${center.lat}&lng=${center.lng}` : source === "place" ? `?place=${encodeURIComponent(params.place!)}` : "";

  const field = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2";

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Find a restaurant</h1>

      <LocationBar centerLabel={centerLabel} source={source} placeError={placeError} />

      {/* Filters: a plain GET form, so the filters end up in the URL. */}
      <form method="get" className="grid grid-cols-2 gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:grid-cols-5 sm:items-end">
        {/* Keep the current location when filters change */}
        {source === "gps" && (
          <>
            <input type="hidden" name="lat" value={center.lat} />
            <input type="hidden" name="lng" value={center.lng} />
          </>
        )}
        {params.place && <input type="hidden" name="place" value={params.place} />}

        <label className="col-span-2 block sm:col-span-2">
          <span className="mb-1 block text-sm font-medium">Search</span>
          <input name="q" defaultValue={params.q ?? ""} placeholder="Name or cuisine" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Distance</span>
          <select name="miles" defaultValue={params.miles?.toString() ?? String(DEFAULT_MILES)} className={field}>
            {DISTANCE_CHOICES.map((m) => (
              <option key={m} value={m}>Within {m} mi</option>
            ))}
            <option value="any">Any distance</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Cuisine</span>
          <select name="cuisine" defaultValue={params.cuisine ?? ""} className={field}>
            <option value="">All</option>
            {cuisines.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Group of at least</span>
          <input name="size" type="number" min={1} inputMode="numeric" defaultValue={params.size ?? ""} placeholder="e.g. 40" className={field} />
        </label>
        <div className="col-span-2 flex gap-2 sm:col-span-5">
          <button type="submit" className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">
            Apply filters
          </button>
          {hasFilters && (
            <Link href={`/restaurants${locationQuery}`} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
              Clear
            </Link>
          )}
        </div>
      </form>

      <p className="text-sm text-gray-500">
        {results.length} restaurant{results.length === 1 ? "" : "s"} taking group orders
        {maxMiles ? ` within ${maxMiles} mi` : ""}
        {params.size ? ` for ${params.size} people` : ""}, closest first.
      </p>

      {results.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-600">
          <p className="font-medium">No restaurants match.</p>
          {hasFilters && <p className="mt-1">Try a larger distance or fewer filters.</p>}
          {source !== "default" && (
            <p className="mt-1">
              The sample restaurants are placed around the default area.{" "}
              <Link href="/restaurants" className="font-medium text-orange-700 hover:underline">
                Search the default area
              </Link>
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {results.map((r) => (
            <RestaurantCard key={r.id} restaurant={r} href={`/restaurants/${r.id}${locationQuery}`} />
          ))}
        </div>
      )}
    </div>
  );
}
