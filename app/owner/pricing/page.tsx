import ComingSoon from "@/components/ComingSoon";
import { requireRole } from "@/lib/session";

export default async function Page() {
  // Server-side role check (redirects anyone else away).
  await requireRole("OWNER");
  return (
    <ComingSoon title="Bulk pricing" milestone={5}>
      <p className="text-gray-600">Set discount tiers, bulk price overrides, fees, and preview prices here.</p>
    </ComingSoon>
  );
}
