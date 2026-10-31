// src/api/budgets.api.ts
// =============================================================================
// Budget-related API calls consumed by React Query hooks.
// =============================================================================

import apiClient from "./client";
import type { EnrichedBudget } from "../components/BudgetProgress";

export interface BudgetProgressResponse {
  month:                   string;
  overall_budgets:         EnrichedBudget[];
  category_budgets:        EnrichedBudget[];
  total_budget_cents:      number;
  total_spent_cents:       number;
  total_remaining_cents:   number;
  total_percent_used:      number;
  budgets_exceeded:        number;
  alerts_triggered:        number;
}

/**
 * Fetches the calculateBudgetProgress summary for a given month.
 * Used by the Budgets screen to render progress bars.
 */
export async function fetchBudgetProgress(month?: string): Promise<BudgetProgressResponse> {
  const params = month ? { month } : {};
  const { data } = await apiClient.get("/budgets/progress", { params });
  return data.data.progress;
}

/**
 * Fetches the flat list of budgets (without progress enrichment).
 * Used for the budget management list.
 */
export async function fetchBudgets(): Promise<EnrichedBudget[]> {
  const { data } = await apiClient.get("/budgets");
  return data.data.budgets;
}
