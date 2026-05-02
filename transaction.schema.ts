// src/validations/transaction.schema.ts
// =============================================================================
// Zod schema for the Quick Add transaction form.
//
// Key design decision — amountInput as string:
//   The amount field is typed as a string (not number) because:
//     1. React Native TextInput always yields strings
//     2. We need to allow partial inputs like "1." or "12.5" during typing
//        without triggering validation errors mid-keystroke
//     3. The conversion toCents(parseFloat(data.amountInput)) happens at
//        submit time in the screen component, NOT in the schema
//
//   We do validate the string here to ensure it represents a valid positive
//   decimal before the form can be submitted.
// =============================================================================

import { z } from "zod";

export const transactionSchema = z.object({
  // "expense" | "income" — transfer is a separate flow
  type: z.enum(["expense", "income"], {
    required_error:     "Please select a type",
    invalid_type_error: "Type must be expense or income",
  }),

  // String amount — validated as a parseable positive number
  amountInput: z
    .string({ required_error: "Please enter an amount" })
    .min(1, "Please enter an amount")
    .refine(
      (val) => {
        const n = parseFloat(val.replace(/,/g, ""));
        return !isNaN(n) && n > 0;
      },
      { message: "Amount must be a positive number" }
    )
    .refine(
      (val) => {
        // Max 2 decimal places
        const clean = val.replace(/,/g, "");
        const parts = clean.split(".");
        return parts.length <= 2 && (parts[1]?.length ?? 0) <= 2;
      },
      { message: "Amount can have at most 2 decimal places" }
    ),

  // Category UUID — required for submission, selected via CategoryPicker
  category_id: z
    .string({ required_error: "Please select a category" })
    .uuid("Please select a valid category")
    .min(1, "Please select a category"),

  // Account UUID — required, selected via account picker
  account_id: z
    .string({ required_error: "Please select an account" })
    .uuid("Please select a valid account")
    .min(1, "Please select an account"),

  // ISO date string YYYY-MM-DD — defaults to today
  date: z
    .string({ required_error: "Please select a date" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),

  // Optional free-text note
  notes: z
    .string()
    .max(500, "Note must be under 500 characters")
    .optional(),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;
