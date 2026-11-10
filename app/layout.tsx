import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "GroupGrub — group food orders made easy",
  description: "Start a group order, share a link, send the restaurant one clean bulk order.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        {/* Nav bar. Milestone 3 makes this change based on the logged-in role. */}
        <header className="bg-white border-b border-gray-200">
          <nav className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
            <Link href="/" className="font-bold text-lg text-orange-600">
              GroupGrub
            </Link>
          </nav>
        </header>
        <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
        <footer className="text-center text-xs text-gray-500 py-4">
          v0.1 — payments happen outside the app (e.g., paid at pickup).
        </footer>
      </body>
    </html>
  );
}
