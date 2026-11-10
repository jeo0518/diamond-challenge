import Link from "next/link";
import SampleBadge from "@/components/SampleBadge";
import { formatLeadTime, formatMiles } from "@/lib/format";

type Props = {
  restaurant: {
    id: string;
    name: string;
    cuisine: string;
    isSample: boolean;
    minGroupSize: number;
    maxGroupSize: number | null;
    leadTimeHours: number;
    allowsPickup: boolean;
    allowsDelivery: boolean;
    distanceMiles: number;
  };
  href: string;
};

export default function RestaurantCard({ restaurant: r, href }: Props) {
  const fulfillment = [r.allowsPickup && "Pickup", r.allowsDelivery && "Delivery"].filter(Boolean).join(" · ");
  return (
    <Link
      href={href}
      className="block rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-orange-300 hover:shadow"
    >
      {r.isSample && <SampleBadge className="mb-2" />}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold leading-snug">{r.name}</h2>
          <p className="text-sm text-gray-500">{r.cuisine}</p>
        </div>
        <span className="shrink-0 rounded-full bg-orange-50 px-2 py-0.5 text-sm font-semibold text-orange-700">
          {formatMiles(r.distanceMiles)}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        <dt className="text-gray-500">Group size</dt>
        <dd>
          {r.minGroupSize}
          {r.maxGroupSize ? `–${r.maxGroupSize}` : "+"} items
        </dd>
        <dt className="text-gray-500">Order ahead</dt>
        <dd>{formatLeadTime(r.leadTimeHours)}</dd>
        <dt className="text-gray-500">Options</dt>
        <dd>{fulfillment || "—"}</dd>
      </dl>
    </Link>
  );
}
