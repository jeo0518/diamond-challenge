"use client";

// Red count of New orders next to "Orders" in the owner nav. Polls every 30 seconds.
import { useEffect, useState } from "react";

export default function NewOrdersBadge({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch("/api/owner/orders/new-count", { cache: "no-store" });
        if (res.ok) setCount((await res.json()).count);
      } catch {
        // Offline for a moment — keep the last count.
      }
    }, 30_000);
    return () => clearInterval(timer);
  }, []);

  if (count === 0) return null;
  return (
    <span data-testid="new-orders-badge" aria-label={`${count} new orders`} className="ml-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">
      {count}
    </span>
  );
}
