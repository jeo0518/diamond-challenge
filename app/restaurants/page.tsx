import ComingSoon from "@/components/ComingSoon";
import { requireRole } from "@/lib/session";

export default async function Page() {
  // Server-side role check (redirects anyone else away).
  const user = await requireRole("CUSTOMER");
  return (
    <ComingSoon title="Find a restaurant" milestone={4}>
      <p className="text-gray-600">Hi {user.name}! Nearby restaurants that take group orders will be listed here.</p>
    </ComingSoon>
  );
}
