// Helpers for owner pages and API routes. Every owner query goes through the
// owner's id, so an owner can never read or change another restaurant's data.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole, requireRoleApi, type SessionUser } from "@/lib/session";

/**
 * The owner's restaurant (v0.1 UI manages one restaurant per owner — the first
 * one they created). Returns null if they haven't created one yet.
 */
export function findOwnerRestaurant(ownerId: string) {
  return prisma.restaurant.findFirst({ where: { ownerId }, orderBy: { createdAt: "asc" } });
}

/** For owner PAGES: the logged-in owner and their restaurant (or null). */
export async function requireOwnerPage() {
  const user = await requireRole("OWNER");
  const restaurant = await findOwnerRestaurant(user.id);
  return { user, restaurant };
}

type Restaurant = NonNullable<Awaited<ReturnType<typeof findOwnerRestaurant>>>;

/**
 * For owner API ROUTES: checks the role AND that the owner has a restaurant.
 *
 *   const auth = await requireOwnerApi();
 *   if (auth.error) return auth.error;
 *   auth.restaurant.id  // always the caller's own restaurant
 */
export async function requireOwnerApi(): Promise<
  { user: SessionUser; restaurant: Restaurant; error?: undefined } | { error: NextResponse }
> {
  const auth = await requireRoleApi("OWNER");
  if (auth.error) return { error: auth.error };
  const restaurant = await findOwnerRestaurant(auth.user.id);
  if (!restaurant) {
    return { error: NextResponse.json({ error: "Create your restaurant profile first." }, { status: 404 }) };
  }
  return { user: auth.user, restaurant };
}

/** Turns a Zod error into a 400 response with the first readable message. */
export function badRequest(issues: { message: string; path: PropertyKey[] }[]) {
  const first = issues[0];
  const where = first?.path.length ? ` (${first.path.join(".")})` : "";
  return NextResponse.json({ error: (first?.message ?? "Invalid input.") + where }, { status: 400 });
}

/** Read a JSON body without crashing on bad JSON. */
export async function readJson(request: Request): Promise<unknown> {
  return request.json().catch(() => null);
}
