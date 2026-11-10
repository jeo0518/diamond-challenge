// Runs before every matching page loads. First line of defense for roles:
//   - customers can't open /owner/* pages
//   - owners can't open customer pages
//   - logged-in users skip the login/sign-up pages
// Each page ALSO checks the role itself (lib/session.ts), so this isn't the only guard.
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { HOME_FOR_ROLE, LOGIN_FOR_ROLE, type Role } from "@/lib/roles";

const AUTH_PAGES = ["/login", "/signup", "/owner/login", "/owner/signup"];
const CUSTOMER_PAGES = ["/restaurants", "/orders", "/group"];

const startsWithAny = (path: string, prefixes: string[]) =>
  prefixes.some((p) => path === p || path.startsWith(p + "/"));

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });
  const role = token?.role as Role | undefined;

  const goTo = (path: string, withCallback = false) => {
    const url = new URL(path, request.url);
    if (withCallback) url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  };

  // Already logged in? Skip the login/sign-up pages.
  if (AUTH_PAGES.includes(pathname)) {
    return role ? goTo(HOME_FOR_ROLE[role]) : NextResponse.next();
  }

  // Owner-only area.
  if (startsWithAny(pathname, ["/owner"])) {
    if (!role) return goTo(LOGIN_FOR_ROLE.OWNER, true);
    if (role !== "OWNER") return goTo(HOME_FOR_ROLE[role]);
  }

  // Customer-only area.
  if (startsWithAny(pathname, CUSTOMER_PAGES)) {
    if (!role) return goTo(LOGIN_FOR_ROLE.CUSTOMER, true);
    if (role !== "CUSTOMER") return goTo(HOME_FOR_ROLE[role]);
  }

  return NextResponse.next();
}

// Only run on page routes that need checking (not on API routes, images, etc.).
export const config = {
  matcher: [
    "/login",
    "/signup",
    "/owner/:path*",
    "/restaurants/:path*",
    "/orders/:path*",
    "/group/:path*",
  ],
};
