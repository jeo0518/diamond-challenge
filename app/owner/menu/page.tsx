import ComingSoon from "@/components/ComingSoon";
import { requireRole } from "@/lib/session";

export default async function Page() {
  // Server-side role check (redirects anyone else away).
  await requireRole("OWNER");
  return (
    <ComingSoon title="Menu" milestone={5}>
      <p className="text-gray-600">Manage categories, items, and option groups here.</p>
    </ComingSoon>
  );
}
