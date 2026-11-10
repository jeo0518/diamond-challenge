// Zod schemas for sign-up and login input. Always checked on the server.
import { z } from "zod";

export const roleSchema = z.enum(["CUSTOMER", "OWNER"]);

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(100),
  email: z.string().trim().toLowerCase().email("Please enter a valid email."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(100, "Password is too long."),
  // Optional. For customers it's the organizer contact restaurants see.
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((v) => (v ? v : undefined)),
  role: roleSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(100),
  role: roleSchema, // which login page they used
});
