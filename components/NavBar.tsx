// Top nav bar. It's a server component, so it reads the session directly
// and shows different links for logged-out visitors, customers, and owners.
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import LogoutButton from "@/components/LogoutButton";

const CUSTOMER_LINKS = [
  { href: "/restaurants", label: "Restaurants" },
  { href: "/orders", label: "My Orders" },
];

const OWNER_LINKS = [
  { href: "/owner/dashboard", label: "Orders" }, // M7 adds a "new orders" badge here
  { href: "/owner/restaurant", label: "Profile" },
  { href: "/owner/menu", label: "Menu" },
  { href: "/owner/pricing", label: "Pricing" },
  { href: "/owner/settings", label: "Settings" },
];

export default async function NavBar() {
  const user = await getCurrentUser();
  const links = user?.role === "OWNER" ? OWNER_LINKS : user?.role === "CUSTOMER" ? CUSTOMER_LINKS : [];
  const homeHref = user?.role === "OWNER" ? "/owner/dashboard" : user ? "/restaurants" : "/";

  return (
    <header className="border-b border-gray-200 bg-white">
      <nav className="mx-auto max-w-5xl px-4">
        <div className="flex h-14 items-center justify-between gap-3">
          <Link href={homeHref} className="shrink-0 text-lg font-bold text-orange-600">
            GroupGrub
            {user?.role === "OWNER" && (
              <span className="ml-2 rounded bg-gray-900 px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-white">
                Owner
              </span>
            )}
          </Link>

          {/* Desktop links */}
          <div className="hidden flex-1 items-center gap-1 sm:flex">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-md px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100">
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden max-w-40 truncate text-sm text-gray-500 md:inline">{user.name}</span>
                <LogoutButton />
              </>
            ) : (
              <>
                <Link href="/login" className="rounded-md px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100">
                  Log in
                </Link>
                <Link href="/signup" className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-700">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Phone links: a scrollable row under the bar */}
        {links.length > 0 && (
          <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 sm:hidden">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="shrink-0 rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700">
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </header>
  );
}
