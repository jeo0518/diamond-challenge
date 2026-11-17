"use client";

// Re-loads the page's server data every few seconds (simple polling, no websockets).
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);
  return null;
}
