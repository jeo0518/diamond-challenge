// Admins are the people whose email is listed in ADMIN_EMAILS (in .env / on Vercel).
// They can approve or hide restaurants on /admin/restaurants. There's no separate
// admin account type: an admin logs in with their normal account.
import { notFound, redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getCurrentUser, type SessionUser } from "@/lib/session";

/** "a@x.com, B@y.com" → ["a@x.com", "b@y.com"] */
export function parseAdminEmails(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdmin(user: { email: string } | null | undefined): boolean {
  if (!user) return false;
  return parseAdminEmails(process.env.ADMIN_EMAILS).includes(user.email.toLowerCase());
}

/** For admin PAGES: logged-out people go to login; everyone else who isn't an admin gets a 404. */
export async function requireAdminPage(path: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(path)}`);
  if (!isAdmin(user)) notFound(); // don't even reveal that the page exists
  return user;
}

/** For admin API ROUTES. */
export async function requireAdminApi(): Promise<{ user: SessionUser; error?: undefined } | { error: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Please log in." }, { status: 401 }) };
  if (!isAdmin(user)) return { error: NextResponse.json({ error: "Not found." }, { status: 404 }) };
  return { user };
}
