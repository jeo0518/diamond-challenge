// Everything that must be true before a group order can be sent to the restaurant (spec 6.2 step 5).
// Returns a list of problems in plain English; an empty list means "OK to submit".

export type SubmitCheckInput = {
  status: string;
  acceptsGroupOrders: boolean;
  totalQty: number;
  minGroupSize: number;
  maxGroupSize: number | null;
  scheduledFor: Date;
  leadTimeHours: number;
  now: Date;
  unavailableItems: string[]; // names of items that were removed/turned off after being added
  slotIsFull: boolean;
};

export function submitProblems(input: SubmitCheckInput): string[] {
  const problems: string[] = [];
  if (input.status !== "COLLECTING") return ["This order has already been submitted or closed."];
  if (!input.acceptsGroupOrders) problems.push("This restaurant isn't taking group orders right now.");
  if (input.totalQty === 0) problems.push("Add some items first.");
  else if (input.totalQty < input.minGroupSize) {
    problems.push(`The restaurant needs at least ${input.minGroupSize} items. You have ${input.totalQty}.`);
  }
  if (input.maxGroupSize != null && input.totalQty > input.maxGroupSize) {
    problems.push(`The restaurant takes at most ${input.maxGroupSize} items. You have ${input.totalQty}.`);
  }
  const hoursAhead = (input.scheduledFor.getTime() - input.now.getTime()) / (60 * 60 * 1000);
  if (hoursAhead < input.leadTimeHours) {
    problems.push(
      `Orders must be sent at least ${input.leadTimeHours} hours before pickup/delivery. Start a new order with a later time.`,
    );
  }
  if (input.unavailableItems.length > 0) {
    problems.push(`These items are no longer available — remove them: ${input.unavailableItems.join(", ")}.`);
  }
  if (input.slotIsFull) problems.push("That time slot is now full. Start a new order with another time.");
  return problems;
}
