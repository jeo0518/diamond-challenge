// Builds the customer's status timeline: the normal path of an order, marked
// done / current / upcoming, with the time each step happened.
// Rejected or cancelled orders end with that step instead.
import type { OrderStatus } from "@/lib/orderStatus";

const HAPPY_PATH: OrderStatus[] = ["COLLECTING", "SUBMITTED", "ACCEPTED", "PREPARING", "READY", "COMPLETED"];

export type TimelineStep = {
  status: OrderStatus;
  state: "done" | "current" | "upcoming" | "stopped"; // stopped = rejected/cancelled end
  at: Date | null;
  note: string | null;
};

export function buildTimeline(
  current: OrderStatus,
  events: { toStatus: OrderStatus; createdAt: Date; note: string | null }[],
): TimelineStep[] {
  // Latest event for each status.
  const byStatus = new Map(events.map((e) => [e.toStatus, e]));
  const ended = current === "REJECTED" || current === "CANCELLED";

  // Steps that actually happened before the order ended (or all steps, for normal orders).
  const reachedIndex = ended
    ? Math.max(...HAPPY_PATH.map((s, i) => (byStatus.has(s) ? i : -1)))
    : HAPPY_PATH.indexOf(current);
  const path = ended ? HAPPY_PATH.slice(0, reachedIndex + 1) : HAPPY_PATH;

  const steps: TimelineStep[] = path.map((status, i) => ({
    status,
    state: i < reachedIndex ? "done" : i === reachedIndex ? (ended || status === "COMPLETED" ? "done" : "current") : "upcoming",
    at: byStatus.get(status)?.createdAt ?? null,
    note: byStatus.get(status)?.note ?? null,
  }));
  if (ended) {
    const e = byStatus.get(current);
    steps.push({ status: current, state: "stopped", at: e?.createdAt ?? null, note: e?.note ?? null });
  }
  return steps;
}
