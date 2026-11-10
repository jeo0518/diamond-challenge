// Server-side role checks. Use these at the top of EVERY protected page
// and API route — hiding buttons in the UI is not enough.
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { HOME_FOR_ROLE, LOGIN_FOR_ROLE, type Role } from "@/lib/roles";

export type SessionUser = { id: string; name: string; email: string; role: Role };

/** The logged-in user, or null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

/**
 * For pages: returns the user if they have `role`. Otherwise redirects:
 *   - not logged in → that role's login page
 *   - wrong role    → their own home page
 */
export async function requireRole(role: Role): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(LOGIN_FOR_ROLE[role]);
  if (user.role !== role) redirect(HOME_FOR_ROLE[user.role]);
  return user;
}

/**
 * For API routes: returns { user } if they have `role`, otherwise
 * { error } holding a 401/403 response to return right away.
 *
 *   const auth = await requireRoleApi("OWNER");
 *   if (auth.error) return auth.error;
 */
export async function requireRoleApi(
  role: Role,
): Promise<{ user: SessionUser; error?: undefined } | { user?: undefined; error: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Please log in." }, { status: 401 }) };
  }
  if (user.role !== role) {
    return { error: NextResponse.json({ error: "Not allowed for your account type." }, { status: 403 }) };
  }
  return { user };
}
