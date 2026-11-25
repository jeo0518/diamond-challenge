"use client";

// Shown if something on a page crashes, instead of a blank screen.
import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error); // shows up in the browser console for debugging
  }, [error]);

  return (
    <div className="mx-auto max-w-md space-y-3 py-16 text-center">
      <p className="text-4xl">😕</p>
      <h1 className="text-xl font-bold">Something went wrong</h1>
      <p className="text-gray-600">
        This page hit an error. Your data is safe. Try again, and if it keeps happening, let the team know what you clicked.
      </p>
      <div className="flex justify-center gap-2">
        <button onClick={reset} className="rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white hover:bg-orange-700">Try again</button>
        <Link href="/" className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold hover:bg-gray-50">Home</Link>
      </div>
      {error.digest && <p className="text-xs text-gray-400">Error code: {error.digest}</p>}
    </div>
  );
}
