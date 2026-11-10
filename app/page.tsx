import Link from "next/link";

// Landing page: explains the app and links to customer and owner sign-up.
export default function Home() {
  return (
    <div className="space-y-10">
      <section className="text-center space-y-4 pt-6">
        <h1 className="text-3xl sm:text-4xl font-bold">Feed the whole team, without the group chat chaos.</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Find a nearby restaurant, start a group order, and share one link. Everyone adds their own
          food, and the restaurant gets a single clean, scheduled bulk order.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/signup" className="rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700">
            I&apos;m organizing an order
          </Link>
          <Link href="/owner/signup" className="rounded-lg border border-gray-300 bg-white px-5 py-3 font-semibold hover:bg-gray-100">
            I own a restaurant
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["1. Pick a restaurant", "Search nearby places that accept group orders, with bulk pricing up front."],
          ["2. Share the link", "Members open it, type their name, and add their items. No account needed."],
          ["3. Submit one order", "The restaurant gets everything labeled by person, plus a kitchen summary."],
        ].map(([title, body]) => (
          <div key={title} className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold mb-1">{title}</h2>
            <p className="text-sm text-gray-600">{body}</p>
          </div>
        ))}
      </section>

      <p className="text-center text-sm text-gray-500">
        Not a delivery-driver service: restaurants handle pickup or their own delivery.
      </p>
    </div>
  );
}
