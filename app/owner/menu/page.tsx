import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireOwnerPage } from "@/lib/owner";
import MenuManager from "@/components/owner/MenuManager";
import NeedsRestaurant from "@/components/owner/NeedsRestaurant";
import SampleBadge from "@/components/SampleBadge";

export const metadata: Metadata = { title: "Menu — GroupGrub" };

export default async function OwnerMenuPage() {
  const { restaurant } = await requireOwnerPage();
  if (!restaurant) return <NeedsRestaurant title="Menu" />;

  // Only this owner's restaurant; deleted categories/items are hidden.
  const categories = await prisma.menuCategory.findMany({
    where: { restaurantId: restaurant.id, isDeleted: false },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      items: {
        where: { isDeleted: false },
        orderBy: { name: "asc" },
        include: { optionGroups: { orderBy: { sortOrder: "asc" }, include: { options: { orderBy: { sortOrder: "asc" } } } } },
      },
    },
  });

  const data = categories.map((c) => ({
    id: c.id,
    name: c.name,
    items: c.items.map((i) => ({
      id: i.id,
      categoryId: i.categoryId,
      name: i.name,
      description: i.description,
      basePrice: i.basePrice,
      isAvailable: i.isAvailable,
      bulkPrice: i.bulkPrice,
      bulkMinQty: i.bulkMinQty,
      optionGroups: i.optionGroups.map((g) => ({
        name: g.name,
        required: g.required,
        minSelect: g.minSelect,
        maxSelect: g.maxSelect,
        options: g.options.map((o) => ({ name: o.name, priceDelta: o.priceDelta })),
      })),
    })),
  }));

  return (
    <div className="space-y-4">
      <div>
        {restaurant.isSample && <SampleBadge className="mb-2" />}
        <h1 className="text-2xl font-bold">Menu</h1>
        <p className="text-gray-600">
          Unavailable items are hidden from new orders. Deleted items are removed from your menu but still appear in past orders.
        </p>
      </div>
      <MenuManager categories={data} />
    </div>
  );
}
