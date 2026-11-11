// /join/[shareCode] — anyone with the link can add their food. No account needed.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { loadOrderableMenu, toPickerMenu } from "@/lib/groupOrders";
import { formatDateTime } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/orderStatus";
import SampleBadge from "@/components/SampleBadge";
import ParticipantView from "@/components/group/ParticipantView";

export const metadata: Metadata = { title: "Join a group order — GroupGrub", robots: { index: false } };

export default async function JoinPage({ params }: { params: Promise<{ shareCode: string }> }) {
  const { shareCode } = await params;
  const order = await prisma.groupOrder.findUnique({
    where: { shareCode },
    include: { restaurant: true, organizer: { select: { id: true, name: true } } },
  });
  if (!order) notFound();

  const user = await getCurrentUser();
  const isOrganizer = user?.id === order.organizerId;
  const isOpen = order.status === "COLLECTING" && order.participantDeadline > new Date();
  const menu = isOpen ? toPickerMenu(await loadOrderableMenu(order.restaurantId)) : [];
  const organizerFirstName = order.organizer.name.split(" ")[0];

  return (
    <div className="space-y-5">
      <header className="space-y-1 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        {order.restaurant.isSample && <SampleBadge className="mb-1" />}
        <p className="text-sm text-gray-500">{organizerFirstName} is collecting a group order from</p>
        <h1 className="text-2xl font-bold">{order.restaurant.name}</h1>
        <p className="font-medium">{order.eventName}</p>
        <p className="text-sm text-gray-600">
          {order.fulfillment === "PICKUP" ? "Pickup" : "Delivery"} {formatDateTime(order.scheduledFor)}
        </p>
        {isOpen ? (
          <p className="text-sm font-medium text-orange-700">Add your items by {formatDateTime(order.participantDeadline)}</p>
        ) : (
          <p className="rounded-lg bg-gray-100 px-3 py-2 text-sm">
            {order.status === "COLLECTING"
              ? `Adding items is closed. Ask ${organizerFirstName} if you need a change.`
              : `This order is no longer collecting items (${STATUS_LABELS[order.status]}).`}
          </p>
        )}
        {isOrganizer && (
          <Link href={`/group/${order.id}`} className="inline-block pt-1 text-sm font-semibold text-orange-700 hover:underline">
            You&apos;re the organizer → manage this order
          </Link>
        )}
      </header>

      <ParticipantView shareCode={shareCode} menu={menu} isOpen={isOpen} />
    </div>
  );
}
