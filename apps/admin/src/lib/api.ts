"use client";

export const SERVER_URL = (process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:2567").replace(/\/$/, "");
const KEY = "ntc.admin.session";

export interface AdminSession {
  token: string;
  userId: string;
}

export const session = {
  get(): AdminSession | null {
    if (typeof window === "undefined") return null;
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? "null");
    } catch {
      return null;
    }
  },
  set(s: AdminSession | null) {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  },
};

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

export async function api<T = any>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const s = session.get();
  let res: Response;
  try {
    res = await fetch(`${SERVER_URL}/api${path}`, {
      method: init.method ?? (init.body ? "POST" : "GET"),
      headers: { "content-type": "application/json", ...(s ? { authorization: `Bearer ${s.token}` } : {}) },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError(0, `Can't reach the game server at ${SERVER_URL}`);
  }
  const json = await res.json().catch(() => ({}));
  if (res.status === 401 || res.status === 403) {
    if (typeof window !== "undefined" && !location.pathname.startsWith("/login")) {
      session.set(null);
      location.href = "/login";
    }
  }
  if (!res.ok) throw new ApiError(res.status, json.error ?? "Request failed", json.code);
  return json as T;
}
