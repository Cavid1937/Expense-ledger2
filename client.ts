// src/api/client.ts
// =============================================================================
// Axios HTTP client — uses ENV.API_URL which resolves per build environment.
// =============================================================================

import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import { ENV }          from "../config/env";
import { useAuthStore } from "../store/auth.store";

const BASE_URL = ENV.API_URL;

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: ENV.IS_DEV ? 15_000 : 20_000,
  headers: {
    "Content-Type": "application/json",
    "Accept":       "application/json",
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject:  (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null): void {
  failedQueue.forEach((cb) => {
    if (error) { cb.reject(error); } else if (token) { cb.resolve(token); }
  });
  failedQueue = [];
}

// ── Request: attach access token ──────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response: handle 401 with token refresh ───────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status !== 401) return Promise.reject(error);

    if (originalRequest._retry) {
      await useAuthStore.getState().logout();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing            = true;

    try {
      const { getRefreshToken, updateTokens, logout } = useAuthStore.getState();
      const refreshToken = await getRefreshToken();
      if (!refreshToken) {
        await logout();
        processQueue(new Error("No refresh token"), null);
        return Promise.reject(error);
      }

      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      });
      const newTokens = data.data.tokens;
      await updateTokens(newTokens);
      processQueue(null, newTokens.accessToken);

      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
      }
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      await useAuthStore.getState().logout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;
