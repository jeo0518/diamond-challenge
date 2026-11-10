// Deletes every SAMPLE (made-up) restaurant and everything attached to it:
// group orders (+ their lines and status history), menus, pricing tiers,
// time slots, the sample owner accounts, and the sample customer account.
//
// Run with:  npm run db:remove-samples
// Use this before launching with real restaurant partners.
//
// Real restaurants (isSample = false) and real users are never touched.
import { PrismaClient } from "@prisma/client";

// Test accounts created by prisma/seed.ts. They all use @example.com emails,
// which can never belong to a real person.
export const SAMPLE_CUSTOMER_EMAIL = "customer@example.com";

export async function removeSamples(prisma: PrismaClient) {
  const samples = await prisma.restaurant.findMany({
    where: { isSample: true },
    select: { id: true, ownerId: true },
  });
  const restaurantIds = samples.map((r) => r.id);
  const ownerIds = [...new Set(samples.map((r) => r.ownerId))];

  // Order matters: group orders must go before restaurants/menu items
  // (the database blocks deleting a restaurant or menu item that still has orders).
  const orders = await prisma.groupOrder.deleteMany({
    where: { restaurantId: { in: restaurantIds } },
  });
  // Deleting a restaurant also deletes its categories, items, options, tiers, and time slots.
  const restaurants = await prisma.restaurant.deleteMany({
    where: { id: { in: restaurantIds } },
  });

  // Only delete an owner account if it is a sample account (@example.com)
  // and it no longer owns any restaurant.
  const owners = await prisma.user.deleteMany({
    where: {
      id: { in: ownerIds },
      email: { endsWith: "@example.com" },
      restaurants: { none: {} },
    },
  });

  // The sample customer: delete only if they have no orders left at real restaurants.
  const customer = await prisma.user.deleteMany({
    where: { email: SAMPLE_CUSTOMER_EMAIL, organizedOrders: { none: {} } },
  });

  return {
    restaurants: restaurants.count,
    groupOrders: orders.count,
    users: owners.count + customer.count,
  };
}

// When run directly from the command line (not imported by seed.ts):
if (process.argv[1]?.endsWith("removeSamples.ts")) {
  const prisma = new PrismaClient();
  removeSamples(prisma)
    .then((r) => {
      console.log(
        `Removed ${r.restaurants} sample restaurants, ${r.groupOrders} group orders, and ${r.users} sample accounts.`,
      );
    })
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
