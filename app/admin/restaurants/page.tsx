// /admin/restaurants — approve new restaurants before customers can see them.
// Only emails listed in ADMIN_EMAILS can open this page (everyone else gets a 404).
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin";
import { formatDateTime } from "@/lib/format";
import SampleBadge from "@/components/SampleBadge";
import ApprovalButton from "@/components/admin/ApprovalButton";

export const metadata: Metadata = { title: "Admin · Restaurants — GroupGrub", robots: { index: false } };

export default async function AdminRestaurantsPage() {
  const user = await requireAdminPage("/admin/restaurants");

  const restaurants = await prisma.restaurant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { name: true, email: true, phone: true } },
      _count: {
        select: {
          menuItems: { where: { isDeleted: false, isAvailable: true } },
          timeSlotRules: true,
          groupOrders: true,
        },
      },
    },
  });
  const pending = restaurants.filter((r) => !r.isApproved);
  const approved = restaurants.filter((r) => r.isApproved);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Restaurants</h1>
        <p className="text-sm text-gray-500">
          New restaurants are hidden from customers until approved. Before approving, check that it&apos;s a real business
          you&apos;ve talked to, and that the menu and time slots are set up. Logged in as {user.email}.
        </p>
      </div>

      {[
        { title: "Waiting for approval", list: pending, empty: "Nothing waiting. 🎉" },
        { title: "Approved (visible to customers)", list: approved, empty: "No approved restaurants yet." },
      ].map(({ title, list, empty }) => (
        <section key={title} className="space-y-3">
          <h2 className="text-lg font-bold">
            {title} <span className="font-normal text-gray-500">({list.length})</span>
          </h2>
          {list.length === 0 ? (
            <p className="text-sm text-gray-500">{empty}</p>
          ) : (
            <ul className="space-y-3">
              {list.map((r) => {
                const ready = r._count.menuItems > 0 && r._count.timeSlotRules > 0;
                return (
                  <li key={r.id} data-testid="admin-restaurant" className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-0.5 text-sm">
                      {r.isSample && <SampleBadge className="mb-1" />}
                      <p className="text-base font-semibold">{r.name}</p>
                      <p className="text-gray-600">{r.cuisine} · {r.address} · {r.phone}</p>
                      <p className="text-gray-600">
                        Owner: {r.owner.name} · <a href={`mailto:${r.owner.email}`} className="text-orange-700 hover:underline">{r.owner.email}</a>
                        {r.owner.phone && <> · {r.owner.phone}</>}
                      </p>
                      <p className={ready ? "text-gray-500" : "text-amber-700"}>
                        {r._count.menuItems} menu items · {r._count.timeSlotRules} time slots · {r._count.groupOrders} orders
                        {!ready && " — not set up yet"}
                        {!r.acceptsGroupOrders && " · not accepting orders"}
                      </p>
                      <p className="text-xs text-gray-400">
                        Signed up {formatDateTime(r.createdAt)}
                        {r.approvedAt && ` · approved ${formatDateTime(r.approvedAt)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-start gap-2">
                      {user.role === "CUSTOMER" && (
                        <Link href={`/restaurants/${r.id}`} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50">
                          Preview
                        </Link>
                      )}
                      <ApprovalButton id={r.id} name={r.name} approved={r.isApproved} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
