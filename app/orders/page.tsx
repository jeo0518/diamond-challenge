import ComingSoon from "@/components/ComingSoon";
import { requireRole } from "@/lib/session";

export default async function Page() {
  // Server-side role check (redirects anyone else away).
  await requireRole("CUSTOMER");
  return (
    <ComingSoon title="My orders" milestone={8}>
      <p className="text-gray-600">Your past and active group orders will be listed here.</p>
    </ComingSoon>
  );
}
