import Link from "next/link";

// Shown on owner pages until the owner has created their restaurant profile.
export default function NeedsRestaurant({ title }: { title: string }) {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center">
        <p className="font-medium">First, set up your restaurant profile.</p>
        <p className="mt-1 text-sm text-gray-500">Add your name, address, and phone — then you can build your menu and rules.</p>
        <Link href="/owner/restaurant" className="mt-4 inline-block rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white hover:bg-orange-700">
          Set up profile
        </Link>
      </div>
    </div>
  );
}
