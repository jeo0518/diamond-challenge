// GET /api/owner/orders/new-count — number of New orders, polled by the nav badge every 30 seconds.
import { NextResponse } from "next/server";
import { requireRoleApi } from "@/lib/session";
import { findOwnerRestaurant } from "@/lib/owner";
import { countNewOrders } from "@/lib/ownerOrders";

export async function GET() {
  const auth = await requireRoleApi("OWNER");
  if (auth.error) return auth.error;
  const restaurant = await findOwnerRestaurant(auth.user.id);
  const count = restaurant ? await countNewOrders(restaurant.id) : 0;
  return NextResponse.json({ count }, { headers: { "Cache-Control": "no-store" } });
}
