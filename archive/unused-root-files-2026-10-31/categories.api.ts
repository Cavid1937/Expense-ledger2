// src/api/categories.api.ts
// =============================================================================
// Category-related API calls consumed by React Query hooks in the Settings screen.
// =============================================================================

import apiClient from "./client";

export interface Category {
  id:          string;
  name:        string;
  icon:        string;
  color:       string;
  type:        "expense" | "income" | "both";
  is_system:   boolean;
  is_custom:   boolean;
  is_archived: boolean;
  parent_name: string | null;
}

/** Fetches all categories (system + user's custom) visible to the user. */
export async function fetchCategories(): Promise<Category[]> {
  const { data } = await apiClient.get("/categories");
  return data.data.categories;
}

/** Creates a new custom category. */
export async function createCategory(payload: {
  name:  string;
  icon:  string;
  color: string;
  type:  "expense" | "income" | "both";
}): Promise<Category> {
  const { data } = await apiClient.post("/categories", payload);
  return data.data.category;
}

/** Deletes a custom category. */
export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`/categories/${id}`);
}
