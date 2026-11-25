// Zod schemas for creating group orders and adding items.
import { z } from "zod";
import { parseLocalDateTime } from "@/lib/timezone";

/**
 * A date from a form: a full ISO time ("2026-11-13T22:00:00.000Z"), or
 * "2026-11-13T16:00" from <input type="datetime-local">, which means 4 PM in the app's time zone.
 */
const toDate = (s: string) => parseLocalDateTime(s) ?? new Date(s);
const dateString = z
  .string()
  .max(40)
  .refine((s) => !Number.isNaN(toDate(s).getTime()), "Invalid date.")
  .transform(toDate);

export const createGroupOrderSchema = z
  .object({
    restaurantId: z.string().min(1),
    eventName: z.string().trim().min(1, "Give your event a name.").max(100),
    scheduledFor: dateString,
    participantDeadline: dateString,
    fulfillment: z.enum(["PICKUP", "DELIVERY"]),
    expectedHeadcount: z.number().int().min(1).max(5000).nullable(),
    // Delivery only. We check the distance using the ZIP (placeholder lookup) or browser coordinates.
    deliveryAddress: z.string().trim().max(200).nullable(),
    deliveryZip: z.string().trim().max(10).nullable(),
    deliveryLat: z.number().min(-90).max(90).nullable(),
    deliveryLng: z.number().min(-180).max(180).nullable(),
    // Reorder: copy the items from this earlier order (must be the same organizer + restaurant).
    reorderFromId: z.string().min(1).max(50).nullable().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.fulfillment === "DELIVERY" && !v.deliveryAddress) {
      ctx.addIssue({ code: "custom", message: "Enter the delivery address." });
    }
  });

export const participantNameSchema = z.string().trim().min(1, "Enter your name.").max(40, "Name is too long.");

/** Random token a participant's browser keeps so they can edit their own items. */
export const participantTokenSchema = z.string().min(16).max(100);

export const addLineSchema = z.object({
  participantName: participantNameSchema,
  menuItemId: z.string().min(1),
  quantity: z.number().int().min(1, "Quantity must be at least 1.").max(100, "Max 100 per line."),
  optionIds: z.array(z.string()).max(50),
  specialInstructions: z
    .string()
    .trim()
    .max(200)
    .nullable()
    .transform((s) => s || null),
});

export const updateQuantitySchema = z.object({
  quantity: z.number().int().min(1).max(100),
});

export const cancelSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});
