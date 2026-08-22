import { useAuthStore } from "../store/authStore";

// In local dev, Vite's proxy (vite.config.ts) forwards a relative "/api/v1" to localhost:4000, so
// no env var is needed. In production the client and server are typically deployed as separate
// services with different origins, so VITE_API_URL must point at the deployed server's full
// origin (e.g. "https://erp-server.up.railway.app") — set at build time, since Vite inlines
// import.meta.env values into the bundle rather than reading them at runtime.
const BASE = `${import.meta.env.VITE_API_URL ?? ""}/api/v1`;

export class ApiClientError extends Error {
  status: number;
  code: string;
  field?: string;
  constructor(status: number, code: string, message: string, field?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setAccessToken, clear } = useAuthStore.getState();
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      clear();
      return null;
    }
    const data = await res.json();
    setAccessToken(data.accessToken);
    return data.accessToken as string;
  } catch {
    clear();
    return null;
  }
}

async function request<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
  const { accessToken } = useAuthStore.getState();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401 && !retried) {
    if (!refreshPromise) refreshPromise = refreshAccessToken().finally(() => (refreshPromise = null));
    const newToken = await refreshPromise;
    if (newToken) return request<T>(path, options, true);
  }

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = body?.error || {};
    throw new ApiClientError(res.status, err.code || "UNKNOWN", err.message || res.statusText, err.field);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, body?: unknown) => request<T>(path, { method: "DELETE", body: body ? JSON.stringify(body) : undefined }),
};
