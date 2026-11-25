// POST /api/group-orders — an organizer (logged-in customer) starts a group order.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRoleApi } from "@/lib/session";
import { badRequest, readJson } from "@/lib/owner";
import { createGroupOrderSchema } from "@/lib/validation/groupOrder";
import { availableSlots, makeOrganizerToken } from "@/lib/groupOrders";
import { copyLinesToCurrentMenu } from "@/lib/reorder";
import { makeShareCode } from "@/lib/shareCode";
import { haversineMiles, isValidLatLng } from "@/lib/geo";
import { lookupPlace } from "@/lib/zipLookup";
import { showSampleRestaurants } from "@/lib/restaurantSearch";

const error = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function POST(request: Request) {
  const auth = await requireRoleApi("CUSTOMER");
  if (auth.error) return auth.error;

  const parsed = createGroupOrderSchema.safeParse(await readJson(request));
  if (!parsed.success) return badRequest(parsed.error.issues);
  const input = parsed.data;

  const restaurant = await prisma.restaurant.findUnique({ where: { id: input.restaurantId } });
  if (!restaurant || (restaurant.isSample && !showSampleRestaurants())) return error("Restaurant not found.", 404);
  if (!restaurant.acceptsGroupOrders) return error("This restaurant isn't taking group orders right now.");

  // Pickup or delivery must be something the restaurant offers.
  if (input.fulfillment === "PICKUP" && !restaurant.allowsPickup) return error("This restaurant doesn't offer pickup.");
  if (input.fulfillment === "DELIVERY") {
    if (!restaurant.allowsDelivery) return error("This restaurant doesn't deliver.");
    // Find the delivery point: ZIP from the placeholder table, or the browser's coordinates.
    const fromZip = input.deliveryZip ? lookupPlace(input.deliveryZip) : null;
    if (input.deliveryZip && !fromZip) {
      return error(`We can't check ZIP ${input.deliveryZip} yet (placeholder list). Try "Use my location" instead.`);
    }
    const point =
      fromZip ??
      (input.deliveryLat != null && input.deliveryLng != null && isValidLatLng(input.deliveryLat, input.deliveryLng)
        ? { lat: input.deliveryLat, lng: input.deliveryLng }
        : null);
    if (!point) return error("Enter the delivery ZIP code (or use your location) so we can check the delivery distance.");
    const miles = haversineMiles(point, restaurant);
    const radius = restaurant.deliveryRadiusMiles ?? 0;
    if (miles > radius) {
      return error(`That address is ${miles.toFixed(1)} mi away. This restaurant only delivers within ${radius} mi.`);
    }
  }

  // The time must be one of the restaurant's open slots (respects lead time) with room left.
  const now = new Date();
  const slots = await availableSlots(restaurant, now);
  const slot = slots.find((s) => s.time.getTime() === input.scheduledFor.getTime());
  if (!slot) return error("Pick one of the available pickup/delivery times.");
  if (slot.remaining === 0) return error("That time is full. Please pick another time.");

  // The deadline for adding items must be in the future and leave the restaurant its lead time.
  const latestDeadline = new Date(slot.time.getTime() - restaurant.leadTimeHours * 60 * 60 * 1000);
  if (input.participantDeadline <= now) return error("The deadline for adding items must be in the future.");
  if (input.participantDeadline > latestDeadline) {
    return error(`The deadline must be at least ${restaurant.leadTimeHours} hours before pickup/delivery, so there's time to submit.`);
  }

  // Reorder: load the earlier order's lines (only if it's this organizer's order at this restaurant).
  let copied: ReturnType<typeof copyLinesToCurrentMenu> = { copied: [], skipped: [] };
  let reorderNote: string | null = null;
  if (input.reorderFromId) {
    const source = await prisma.groupOrder.findFirst({
      where: { id: input.reorderFromId, organizerId: auth.user.id, restaurantId: restaurant.id },
      include: { lines: { orderBy: { createdAt: "asc" } } },
    });
    if (!source) return error("The order to copy wasn't found.", 404);
    const items = await prisma.menuItem.findMany({
      where: { restaurantId: restaurant.id, id: { in: source.lines.map((l) => l.menuItemId) }, category: { isDeleted: false } },
      include: { optionGroups: { include: { options: true } } },
    });
    copied = copyLinesToCurrentMenu(source.lines, new Map(items.map((i) => [i.id, i])));
    reorderNote = `Reordered from "${source.eventName}"`;
  }

  // One token per person, so each person's copied items stay together.
  const tokens = new Map<string, string>();
  const tokenFor = (name: string) => tokens.get(name) ?? tokens.set(name, makeOrganizerToken()).get(name)!;

  const order = await prisma.groupOrder.create({
    data: {
      restaurantId: restaurant.id,
      organizerId: auth.user.id,
      eventName: input.eventName,
      shareCode: makeShareCode(),
      fulfillment: input.fulfillment,
      deliveryAddress: input.fulfillment === "DELIVERY" ? input.deliveryAddress : null, // only collected for delivery
      scheduledFor: slot.time,
      participantDeadline: input.participantDeadline,
      expectedHeadcount: input.expectedHeadcount,
      status: "COLLECTING",
      statusEvents: {
        create: { fromStatus: null, toStatus: "COLLECTING", changedByUserId: auth.user.id, note: reorderNote ?? "Group order started" },
      },
      lines: {
        create: copied.copied.map((l) => ({ ...l, participantToken: tokenFor(l.participantName) })),
      },
    },
  });
  // `copied` = number of items (sum of quantities) copied over.
  const copiedItems = copied.copied.reduce((n, l) => n + l.quantity, 0);
  return NextResponse.json({ id: order.id, copied: copiedItems, skipped: copied.skipped }, { status: 201 });
}
