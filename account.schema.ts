// src/validations/account.schema.ts
// =============================================================================
// Zod schemas for the Account management forms.
//
// Balance input follows the same string-based pattern as transactionSchema:
//   - Accepted as a decimal string (e.g. "1250.00")
//   - Validated to be a parseable number (positive OR negative — credit cards
//     and loans can legitimately have negative starting balances)
//   - Converted to cents by the service at submit time via toCents()
// =============================================================================

import { z } from "zod";

export const ACCOUNT_TYPES = [
  "cash",
  "checking",
  "savings",
  "credit_card",
  "investment",
  "loan",
  "other",
] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash:        "Cash",
  checking:    "Checking",
  savings:     "Savings",
  credit_card: "Credit Card",
  investment:  "Investment",
  loan:        "Loan",
  other:       "Other",
};

// ── Create / Edit account ─────────────────────────────────────────────────────
export const accountSchema = z.object({
  name: z
    .string({ required_error: "Please give this account a name" })
    .trim()
    .min(1,   "Account name cannot be empty")
    .max(100, "Account name must be under 100 characters"),

  type: z.enum(ACCOUNT_TYPES, {
    required_error:     "Please select an account type",
    invalid_type_error: "Invalid account type",
  }).default("checking"),

  // String decimal — we validate it's a finite number (negative allowed)
  balanceInput: z
    .string({ required_error: "Please enter a starting balance" })
    .min(1, "Please enter a starting balance")
    .refine(
      (v) => {
        const n = parseFloat(v.replace(/,/g, ""));
        return !isNaN(n) && isFinite(n);
      },
      { message: "Please enter a valid number" }
    )
    .refine(
      (v) => {
        const parts = v.replace(/,/g, "").split(".");
        return parts.length <= 2 && (parts[1]?.length ?? 0) <= 2;
      },
      { message: "Balance can have at most 2 decimal places" }
    ),

  currency_code: z
    .string()
    .trim()
    .length(3, "Must be a 3-letter code (e.g. USD)")
    .toUpperCase()
    .default("USD"),

  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a hex code e.g. #FF6B6B")
    .optional()
    .nullable(),

  include_in_total: z.boolean().default(true),
});

export type AccountFormValues = z.infer<typeof accountSchema>;
