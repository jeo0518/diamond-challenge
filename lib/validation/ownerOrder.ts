import { z } from "zod";

// The status moves an OWNER may make. Cancelling is the organizer's choice, not the owner's.
export const ownerStatusSchema = z
  .object({
    to: z.enum(["ACCEPTED", "REJECTED", "PREPARING", "READY", "COMPLETED"]),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.to !== "REJECTED" || (v.reason && v.reason.length > 0), "Please give a reason for rejecting.");

export const ownerNoteSchema = z.object({
  note: z.string().trim().max(1000).transform((s) => s || null),
});
