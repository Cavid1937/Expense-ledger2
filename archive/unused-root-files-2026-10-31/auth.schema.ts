// src/validations/auth.schema.ts
// =============================================================================
// Zod schemas for all authentication forms.
//
// These schemas serve double duty:
//   1. Runtime validation via react-hook-form's zodResolver (client-side)
//   2. TypeScript type inference — we derive the form types from the schemas
//      so form field types and validation rules are always in sync.
//
// Error messages are written for end users, not developers.
// They appear directly inside the form fields — no technical jargon.
// =============================================================================

import { z } from "zod";

// ── Login ─────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z
    .string({ required_error: "Please enter your email" })
    .trim()
    .min(1, "Please enter your email")
    .email("That doesn't look like a valid email address"),

  password: z
    .string({ required_error: "Please enter your password" })
    .min(1, "Please enter your password"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

// ── Register ──────────────────────────────────────────────────────────────────
export const registerSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .max(100, "Name must be under 100 characters")
      .optional(),

    email: z
      .string({ required_error: "Please enter your email" })
      .trim()
      .min(1, "Please enter your email")
      .email("That doesn't look like a valid email address")
      // Normalise before submitting so the backend gets a clean value
      .transform((val) => val.toLowerCase()),

    password: z
      .string({ required_error: "Please choose a password" })
      .min(8,  "Password must be at least 8 characters")
      .max(72, "Password must be under 72 characters")     // bcrypt hard limit
      .regex(/[a-zA-Z]/, "Password must include at least one letter")
      .regex(/[0-9]/,    "Password must include at least one number"),

    confirm_password: z
      .string({ required_error: "Please confirm your password" })
      .min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path:    ["confirm_password"],  // Error appears on the confirm field
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

// ── Forgot Password ───────────────────────────────────────────────────────────
export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: "Please enter your email" })
    .trim()
    .min(1, "Please enter your email")
    .email("That doesn't look like a valid email address"),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
