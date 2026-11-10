import ComingSoon from "@/components/ComingSoon";
import { requireRole } from "@/lib/session";

export default async function Page() {
  // Server-side role check (redirects anyone else away).
  await requireRole("OWNER");
  return (
    <ComingSoon title="Restaurant profile" milestone={5}>
      <p className="text-gray-600">Edit your name, address, phone, hours, and photo here.</p>
    </ComingSoon>
  );
}
