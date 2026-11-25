// Wraps every /owner page. Shows the "waiting for approval" banner when the
// logged-in owner's restaurant hasn't been approved yet.
import { getCurrentUser } from "@/lib/session";
import { findOwnerRestaurant } from "@/lib/owner";
import ApprovalBanner from "@/components/owner/ApprovalBanner";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const restaurant = user?.role === "OWNER" ? await findOwnerRestaurant(user.id) : null;
  return (
    <>
      {restaurant && !restaurant.isApproved && <ApprovalBanner />}
      {children}
    </>
  );
}
