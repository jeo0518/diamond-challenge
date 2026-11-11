// Group order statuses: which moves are allowed, plus labels for the UI.
// The ONE place that decides valid status changes (spec Section 8).
import type { OrderStatus } from "@prisma/client";

export type { OrderStatus };

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  COLLECTING: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["ACCEPTED", "REJECTED", "CANCELLED"],
  ACCEPTED: ["PREPARING"],
  PREPARING: ["READY"],
  READY: ["COMPLETED"],
  REJECTED: [],
  COMPLETED: [],
  CANCELLED: [],
};

/** True if an order may move from `from` to `to`. */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** Statuses that still hold a time slot (count toward the restaurant's capacity). */
export const ACTIVE_STATUSES: OrderStatus[] = ["COLLECTING", "SUBMITTED", "ACCEPTED", "PREPARING", "READY"];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  COLLECTING: "Collecting items",
  SUBMITTED: "Sent to restaurant",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  PREPARING: "Preparing",
  READY: "Ready",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const STATUS_COLORS: Record<OrderStatus, string> = {
  COLLECTING: "bg-blue-100 text-blue-800",
  SUBMITTED: "bg-purple-100 text-purple-800",
  ACCEPTED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  PREPARING: "bg-amber-100 text-amber-800",
  READY: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-gray-200 text-gray-700",
  CANCELLED: "bg-gray-200 text-gray-500",
};
