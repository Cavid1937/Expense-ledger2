// src/api/user.api.ts
// =============================================================================
// User-related API calls — push token registration and profile updates.
// =============================================================================

import apiClient from "./client";

// ── Push token registration ───────────────────────────────────────────────────

/**
 * Sends the device's Expo Push Token to the backend so the cron job
 * knows which device to ping when a budget threshold is crossed.
 *
 * Endpoint: POST /v1/users/push-token
 * Body:     { fcm_token: string }
 *
 * The backend stores this in users.fcm_token (see 001_create_users migration).
 * We send the Expo Push Token in the fcm_token column — the Expo push
 * service translates it to the underlying FCM/APNs token transparently.
 *
 * Idempotent: calling this with the same token multiple times is safe —
 * the backend should upsert rather than duplicate.
 *
 * @param token - Expo Push Token string e.g. "ExponentPushToken[xxxxxx]"
 */
export async function registerPushToken(token: string): Promise<void> {
  await apiClient.post("/users/push-token", { fcm_token: token });
}

/**
 * Removes the push token from the backend (called on logout so the server
 * doesn't send notifications to a logged-out device).
 */
export async function deregisterPushToken(): Promise<void> {
  await apiClient.delete("/users/push-token");
}

// ── User profile ──────────────────────────────────────────────────────────────

export interface UpdateProfilePayload {
  full_name?:       string | null;
  currency_code?:   string;
  currency_symbol?: string;
  timezone?:        string;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<void> {
  await apiClient.patch("/users/me", payload);
}
