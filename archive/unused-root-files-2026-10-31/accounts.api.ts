// src/api/accounts.api.ts
// =============================================================================
// Account-related API calls — final version.
// Adds: createAccount, updateAccount (includes archive toggle).
// =============================================================================

import apiClient from "./client";

export interface Account {
  id:               string;
  name:             string;
  type:             string;
  balance_cents:    number;
  balance_decimal:  number;  // backend appends this convenience field
  currency_code:    string;
  color:            string | null;
  icon:             string | null;
  include_in_total: boolean;
  is_archived:      boolean;
}

export interface AccountSummary {
  accounts:              Account[];
  total_balance_cents:   number;
  total_balance_decimal: number;
}

export async function fetchAccountsSummary(includeArchived = false): Promise<AccountSummary> {
  const { data } = await apiClient.get("/accounts", {
    params: includeArchived ? { include_archived: true } : {},
  });
  return data.data;
}

export async function fetchAccountById(id: string): Promise<Account> {
  const { data } = await apiClient.get(`/accounts/${id}`);
  return data.data.account;
}

export async function createAccount(payload: {
  name:             string;
  type:             string;
  initial_balance:  number;   // decimal (e.g. 50.25), backend converts to cents
  currency_code:    string;
  color?:           string | null;
  include_in_total: boolean;
}): Promise<Account> {
  const { data } = await apiClient.post("/accounts", payload);
  return data.data.account;
}

export async function updateAccount(
  id: string,
  payload: {
    name?:             string;
    type?:             string;
    color?:            string | null;
    include_in_total?: boolean;
    is_archived?:      boolean;
    adjust_balance?:   number;  // decimal; triggers manual balance correction
  }
): Promise<Account> {
  const { data } = await apiClient.patch(`/accounts/${id}`, payload);
  return data.data.account;
}
