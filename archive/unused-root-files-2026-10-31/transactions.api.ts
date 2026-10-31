// src/api/transactions.api.ts
// =============================================================================
// Transaction API — final version.
//
// New additions vs previous version:
//   fetchTransactionById()  → single transaction for the Detail screen
//   uploadReceipt()         → multipart/form-data image upload
//   removeReceipt()         → deletes an attached receipt
// =============================================================================

import apiClient from "./client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Transaction {
  id:                string;
  account_id:        string;
  category_id:       string | null;
  amount_cents:      number;
  type:              "expense" | "income" | "transfer";
  date:              string;        // YYYY-MM-DD
  note:              string | null;
  receipt_image_url: string | null; // S3/CDN URL once uploaded
  category_name:     string | null;
  category_icon:     string | null;
  category_color:    string | null;
  account_name:      string | null;
  created_at:        string;
  updated_at:        string;
}

export interface Pagination {
  page:        number;
  limit:       number;
  total:       number;
  total_pages: number;
  has_more:    boolean;
}

export interface TransactionListResponse {
  transactions: Transaction[];
  pagination:   Pagination;
}

export interface TransactionFetchParams {
  page?:        number;
  limit?:       number;
  search?:      string;
  type?:        "expense" | "income" | "transfer" | "";
  category_id?: string;
  date_from?:   string;
  date_to?:     string;
  sort_by?:     string;
  sort_order?:  "asc" | "desc";
}

export interface ReceiptUploadResult {
  receipt_image_url: string;
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function fetchTransactionsPage(
  params: TransactionFetchParams = {}
): Promise<TransactionListResponse> {
  const { data } = await apiClient.get("/transactions", {
    params: { limit: 20, sort_by: "date", sort_order: "desc", ...params },
  });
  return data.data;
}

export async function fetchRecentTransactions(limit = 5): Promise<TransactionListResponse> {
  return fetchTransactionsPage({ limit, page: 1 });
}

// ── Single transaction ────────────────────────────────────────────────────────

/**
 * Fetches a single transaction by its UUID.
 * Used by the Detail screen via React Query.
 */
export async function fetchTransactionById(id: string): Promise<Transaction> {
  const { data } = await apiClient.get(`/transactions/${id}`);
  return data.data.transaction;
}

// ── Receipt upload ────────────────────────────────────────────────────────────

/**
 * Uploads a receipt image for a transaction via multipart/form-data.
 *
 * React Native FormData quirks:
 *   1. The file value must be { uri, type, name } — not a File/Blob object.
 *   2. Axios MUST NOT set an explicit "Content-Type" header. If we write
 *      "multipart/form-data" without the boundary, the server can't parse
 *      the body. Passing `undefined` forces Axios to auto-generate the header
 *      with the correct boundary string — the #1 React Native upload gotcha.
 *
 * @param transactionId - UUID of the transaction to attach the receipt to
 * @param localUri      - Local file URI from expo-image-picker (file:// or content://)
 * @param mimeType      - e.g. "image/jpeg", "image/png", "image/heic"
 * @returns             - The updated receipt_image_url (CDN/S3 URL)
 */
export async function uploadReceipt(
  transactionId: string,
  localUri:      string,
  mimeType:      string = "image/jpeg"
): Promise<ReceiptUploadResult> {
  const formData = new FormData();

  // React Native's FormData file shape
  formData.append("receipt", {
    uri:  localUri,
    type: mimeType,
    name: `receipt_${transactionId}_${Date.now()}.${mimeType.split("/")[1] ?? "jpg"}`,
  } as any);  // "as any" because TypeScript's FormData types expect a Blob

  const { data } = await apiClient.patch(
    `/transactions/${transactionId}/receipt`,
    formData,
    {
      headers: {
        // Let Axios regenerate Content-Type with the multipart boundary.
        // Explicit "multipart/form-data" without boundary = server parse failure.
        "Content-Type": undefined as any,
      },
    }
  );

  return data.data;
}

/**
 * Removes a previously uploaded receipt.
 * Sets receipt_image_url = null on the transaction.
 */
export async function removeReceipt(transactionId: string): Promise<void> {
  await apiClient.delete(`/transactions/${transactionId}/receipt`);
}
