import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireOwnerPage } from "@/lib/owner";
import PricingForm from "@/components/owner/PricingForm";
import NeedsRestaurant from "@/components/owner/NeedsRestaurant";
import SampleBadge from "@/components/SampleBadge";

export const metadata: Metadata = { title: "Bulk pricing — GroupGrub" };

export default async function OwnerPricingPage() {
  const { restaurant } = await requireOwnerPage();
  if (!restaurant) return <NeedsRestaurant title="Bulk pricing" />;

  const [tiers, items] = await Promise.all([
    prisma.bulkDiscountTier.findMany({ where: { restaurantId: restaurant.id }, orderBy: { minQuantity: "asc" } }),
    prisma.menuItem.findMany({
      where: { restaurantId: restaurant.id, isDeleted: false, category: { isDeleted: false } },
      include: { category: true },
      orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        {restaurant.isSample && <SampleBadge className="mb-2" />}
        <h1 className="text-2xl font-bold">Bulk pricing</h1>
      </div>
      <PricingForm
        tiers={tiers.map((t) => ({ minQuantity: t.minQuantity, discountPercent: t.discountPercent }))}
        serviceFee={restaurant.serviceFee}
        deliveryFee={restaurant.deliveryFee}
        allowsDelivery={restaurant.allowsDelivery}
        items={items.map((i) => ({
          id: i.id,
          name: i.name,
          category: i.category.name,
          basePrice: i.basePrice,
          bulkPrice: i.bulkPrice,
          bulkMinQty: i.bulkMinQty,
        }))}
      />
    </div>
  );
}
