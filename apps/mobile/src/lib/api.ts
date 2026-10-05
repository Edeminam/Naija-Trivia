import { SERVER_URL } from "./config";
import { getToken, useSession } from "../stores/session";

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
  get offline() {
    return this.status === 0;
  }
}

async function request<T>(method: string, path: string, body?: unknown, opts: { auth?: boolean; timeoutMs?: number } = {}): Promise<T> {
  const token = getToken();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 12_000);
  let res: Response;
  try {
    res = await fetch(`${SERVER_URL}/api${path}`, {
      method,
      signal: ctrl.signal,
      headers: { "content-type": "application/json", ...(token && opts.auth !== false ? { authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e: any) {
    throw new ApiError(0, e?.name === "AbortError" ? "The network is slow right now. Try again." : "Can't reach the server. Check your connection.", "offline");
  } finally {
    clearTimeout(timer);
  }
  const json = await res.json().catch(() => ({}));
  if (res.status === 401 && token) {
    // Session expired or account removed — drop back to onboarding cleanly.
    await useSession.getState().clear();
  }
  if (!res.ok) throw new ApiError(res.status, json.error ?? "Something went wrong", json.code);
  return json as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown = {}) => request<T>("POST", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
  open: <T>(path: string) => request<T>("GET", path, undefined, { auth: false }),
};
