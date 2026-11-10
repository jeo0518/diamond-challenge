import ComingSoon from "@/components/ComingSoon";
import { requireRole } from "@/lib/session";

export default async function Page() {
  // Server-side role check (redirects anyone else away).
  const user = await requireRole("OWNER");
  return (
    <ComingSoon title="Incoming orders" milestone={7}>
      <p className="text-gray-600">Welcome, {user.name}. New, upcoming, ready, and past orders will show up here.</p>
    </ComingSoon>
  );
}
