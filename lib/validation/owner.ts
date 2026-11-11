// Zod schemas for everything owners can edit. These run on the server for
// every request. Money is sent as integer CENTS.
import { z } from "zod";

const cents = z.number().int("Prices must be whole cents.").min(0, "Prices can't be negative.").max(1_000_000);
const optionalCents = cents.nullable();
const text = (max: number) => z.string().trim().max(max);
const requiredText = (label: string, max: number) => text(max).min(1, `${label} is required.`);

// ---------- 7.1 profile ----------
export const profileSchema = z.object({
  name: requiredText("Name", 100),
  description: text(1000),
  cuisine: requiredText("Cuisine", 50),
  address: requiredText("Address", 200),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  phone: requiredText("Phone", 30),
  hours: text(200).nullable(),
  imageUrl: z
    .string()
    .trim()
    .max(500)
    .url("Photo URL must be a full web address (https://…).")
    .refine((u) => u.startsWith("https://") || u.startsWith("http://"), "Photo URL must start with http(s)://")
    .nullable(),
});

// ---------- 7.2 menu ----------
export const categorySchema = z.object({
  name: requiredText("Category name", 60),
  sortOrder: z.number().int().min(0).max(1000).optional(),
});

const optionSchema = z.object({
  name: requiredText("Option name", 60),
  priceDelta: z.number().int().min(-100_000).max(100_000), // cents; can be negative (e.g. "No cheese −$0.50")
});

export const optionGroupSchema = z
  .object({
    name: requiredText("Option group name", 60),
    required: z.boolean(),
    minSelect: z.number().int().min(0).max(20),
    maxSelect: z.number().int().min(1).max(20),
    options: z.array(optionSchema).min(1, "Each option group needs at least one option.").max(30),
  })
  .superRefine((g, ctx) => {
    const problem = (message: string) => ctx.addIssue({ code: "custom", message: `"${g.name}": ${message}` });
    if (g.required && g.minSelect < 1) problem("required groups must have a minimum of at least 1.");
    if (!g.required && g.minSelect > 0) problem("optional groups must have a minimum of 0.");
    if (g.minSelect > g.maxSelect) problem("minimum can't be more than maximum.");
    if (g.minSelect > g.options.length) problem("minimum is more than the number of options.");
  });

export const menuItemSchema = z.object({
  categoryId: z.string().min(1, "Pick a category."),
  name: requiredText("Item name", 100),
  description: text(500),
  basePrice: cents,
  isAvailable: z.boolean(),
  optionGroups: z.array(optionGroupSchema).max(10),
});

export const availabilitySchema = z.object({ isAvailable: z.boolean() });

// ---------- 7.3 pricing ----------
export const pricingSchema = z.object({
  tiers: z
    .array(
      z.object({
        minQuantity: z.number().int().min(1, "Tier minimums must be at least 1.").max(100_000),
        discountPercent: z.number().int().min(1, "Discounts must be 1–90%.").max(90, "Discounts must be 1–90%."),
      }),
    )
    .max(10)
    .refine((t) => new Set(t.map((x) => x.minQuantity)).size === t.length, "Two tiers have the same minimum."),
  serviceFee: optionalCents,
  deliveryFee: optionalCents,
  overrides: z
    .array(
      z
        .object({
          menuItemId: z.string().min(1),
          bulkPrice: optionalCents,
          bulkMinQty: z.number().int().min(2).max(100_000).nullable(),
        })
        .refine((o) => (o.bulkPrice == null) === (o.bulkMinQty == null), "Bulk price needs both a price and a minimum quantity."),
    )
    .max(500),
});

// ---------- 7.4 settings ----------
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Times must look like 16:00.");

export const settingsSchema = z
  .object({
    acceptsGroupOrders: z.boolean(),
    minGroupSize: z.number().int().min(1).max(10_000),
    maxGroupSize: z.number().int().min(1).max(10_000).nullable(),
    leadTimeHours: z.number().int().min(0).max(24 * 30),
    allowsPickup: z.boolean(),
    allowsDelivery: z.boolean(),
    deliveryRadiusMiles: z.number().positive().max(100).nullable(),
    organizerNotes: text(1000).nullable(),
    timeSlots: z
      .array(
        z
          .object({
            dayOfWeek: z.number().int().min(0).max(6),
            startTime: hhmm,
            endTime: hhmm,
            slotMinutes: z.union([z.literal(15), z.literal(30), z.literal(60)]),
            maxOrdersPerSlot: z.number().int().min(1).max(50),
          })
          .refine((s) => s.endTime > s.startTime, "Each time window must end after it starts."),
      )
      .max(50),
  })
  .superRefine((s, ctx) => {
    const problem = (message: string) => ctx.addIssue({ code: "custom", message });
    if (!s.allowsPickup && !s.allowsDelivery) problem("Turn on pickup, delivery, or both.");
    if (s.allowsDelivery && s.deliveryRadiusMiles == null) problem("Set a delivery radius.");
    if (s.maxGroupSize != null && s.maxGroupSize < s.minGroupSize) problem("Maximum order size must be at least the minimum.");
  });
