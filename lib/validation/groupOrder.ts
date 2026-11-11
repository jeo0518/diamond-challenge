// Zod schemas for creating group orders and adding items.
import { z } from "zod";

/** A date from a form: ISO string or "2026-11-13T16:00" (datetime-local). */
const dateString = z
  .string()
  .max(40)
  .refine((s) => !Number.isNaN(new Date(s).getTime()), "Invalid date.")
  .transform((s) => new Date(s));

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
