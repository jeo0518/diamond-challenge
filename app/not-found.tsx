// Friendly 404 page.
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md space-y-3 py-16 text-center">
      <p className="text-5xl font-bold text-orange-600">404</p>
      <h1 className="text-xl font-bold">We couldn&apos;t find that page</h1>
      <p className="text-gray-600">
        The link may be wrong, or the order or restaurant may not exist — or it may belong to another account.
      </p>
      <Link href="/" className="inline-block rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white hover:bg-orange-700">Go home</Link>
    </div>
  );
}
