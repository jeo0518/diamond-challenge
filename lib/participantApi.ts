// Shared by the participant (/join) API routes. Participants have no account:
// their browser sends a random token in the "x-participant-token" header, and
// they can only see/change lines saved with that same token.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { participantTokenSchema } from "@/lib/validation/groupOrder";

export function readToken(request: Request): string | null {
  const parsed = participantTokenSchema.safeParse(request.headers.get("x-participant-token"));
  return parsed.success ? parsed.data : null;
}

/**
 * Loads the order by share code and checks it's still open for participants.
 * Returns { order } or { error } (a response to return right away).
 */
export async function openOrderByCode(shareCode: string) {
  const order = await prisma.groupOrder.findUnique({ where: { shareCode } });
  if (!order) return { error: NextResponse.json({ error: "This group order link isn't valid." }, { status: 404 }) };
  if (order.status !== "COLLECTING" || order.participantDeadline <= new Date()) {
    return { error: NextResponse.json({ error: "This group order is closed. Ask the organizer to add anything else." }, { status: 409 }) };
  }
  return { order };
}

export const missingToken = () =>
  NextResponse.json({ error: "Your browser didn't send its order token. Try reloading the page." }, { status: 400 });
