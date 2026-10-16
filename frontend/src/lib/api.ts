import type { StoredAuth, TokenResponse, UserType } from "./api-types";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || "";
const STORAGE_KEY = "autoshare.auth";

export function getAuth(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredAuth) : null;
  } catch {
    return null;
  }
}

export function setAuth(a: StoredAuth | null) {
  if (typeof window === "undefined") return;
  if (a) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
  else window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("autoshare-auth-change"));
}

export function saveTokens(tokens: TokenResponse, userType: UserType) {
  setAuth({ access_token: tokens.access_token, refresh_token: tokens.refresh_token, user_type: userType });
}

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

function buildUrl(path: string, query?: Record<string, unknown>) {
  const full = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const url = new URL(full, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.pathname + url.search;
}

async function parseError(res: Response): Promise<ApiError> {
  let detail: unknown = undefined;
  let msg = `HTTP ${res.status}`;
  try {
    const body = await res.json();
    detail = body;
    if (typeof body?.detail === "string") msg = body.detail;
    else if (Array.isArray(body?.detail))
      msg = body.detail.map((d: { msg?: string; loc?: unknown[] }) => d.msg ?? "Ошибка").join("; ");
  } catch {
    /* ignore */
  }
  return new ApiError(res.status, msg, detail);
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  const current = getAuth();
  if (!current) return null;
  refreshInFlight = (async () => {
    try {
      const res = await fetch(buildUrl("/api/v1/auth/refresh"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: current.refresh_token }),
      });
      if (!res.ok) {
        setAuth(null);
        return null;
      }
      const tokens = (await res.json()) as TokenResponse;
      setAuth({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        user_type: current.user_type,
      });
      return tokens.access_token;
    } catch {
      setAuth(null);
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

interface RequestOptions {
  method?: string;
  query?: Record<string, unknown>;
  body?: unknown;
  auth?: boolean; // default true
  signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", query, body, auth = true, signal } = opts;
  const doFetch = async (token: string | null): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (auth && token) headers["Authorization"] = `Bearer ${token}`;
    return fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  };

  const initial = getAuth();
  let res = await doFetch(auth ? initial?.access_token ?? null : null);

  if (res.status === 401 && auth && initial) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await doFetch(newToken);
    }
  }

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

export const api = {
  get: <T,>(path: string, query?: Record<string, unknown>) => apiRequest<T>(path, { query }),
  post: <T,>(path: string, body?: unknown) => apiRequest<T>(path, { method: "POST", body }),
  patch: <T,>(path: string, body?: unknown) => apiRequest<T>(path, { method: "PATCH", body }),
  del: <T,>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
};

export function decodeJwt<T = Record<string, unknown>>(token: string): T | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("utf-8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export { STORAGE_KEY, BASE_URL };