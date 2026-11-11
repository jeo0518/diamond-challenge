import type { Metadata } from "next";
import { requireOwnerPage } from "@/lib/owner";
import ProfileForm from "@/components/owner/ProfileForm";
import SampleBadge from "@/components/SampleBadge";

export const metadata: Metadata = { title: "Restaurant profile — GroupGrub" };

export default async function OwnerRestaurantPage() {
  const { restaurant } = await requireOwnerPage();

  const initial = restaurant
    ? {
        name: restaurant.name,
        description: restaurant.description,
        cuisine: restaurant.cuisine,
        address: restaurant.address,
        lat: restaurant.lat,
        lng: restaurant.lng,
        phone: restaurant.phone,
        hours: restaurant.hours,
        imageUrl: restaurant.imageUrl,
      }
    : { name: "", description: "", cuisine: "", address: "", lat: null, lng: null, phone: "", hours: null, imageUrl: null };

  return (
    <div className="space-y-4">
      <div>
        {restaurant?.isSample && <SampleBadge className="mb-2" />}
        <h1 className="text-2xl font-bold">{restaurant ? "Restaurant profile" : "Set up your restaurant"}</h1>
        {!restaurant && <p className="text-gray-600">Customers will see this when they search for places to order from.</p>}
      </div>
      <ProfileForm initial={initial} isNew={!restaurant} isSample={restaurant?.isSample ?? false} />
    </div>
  );
}
