import ComingSoon from "@/components/ComingSoon";
import { requireRole } from "@/lib/session";

export default async function Page() {
  // Server-side role check (redirects anyone else away).
  await requireRole("OWNER");
  return (
    <ComingSoon title="Order rules" milestone={5}>
      <p className="text-gray-600">Set minimum size, lead time, pickup/delivery, and time slots here.</p>
    </ComingSoon>
  );
}
