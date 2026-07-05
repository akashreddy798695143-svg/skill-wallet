/**
 * Frontend API client — thin wrapper around fetch for the SPA.
 * All requests use relative paths (required by the gateway).
 */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function handle<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "error" in data
        ? String((data as Record<string, unknown>).error)
        : typeof data === "string"
          ? data
          : res.statusText) || "Request failed";
    throw new ApiError(message, res.status);
  }
  return data as T;
}

export const api = {
  get: <T>(url: string, init?: RequestInit) =>
    fetch(url, { ...init, method: "GET" }).then(handle<T>),
  post: <T>(url: string, body?: unknown, init?: RequestInit) =>
    fetch(url, {
      ...init,
      method: "POST",
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }).then(handle<T>),
  postForm: <T>(url: string, form: FormData, init?: RequestInit) =>
    fetch(url, { ...init, method: "POST", body: form }).then(handle<T>),
  put: <T>(url: string, body?: unknown, init?: RequestInit) =>
    fetch(url, {
      ...init,
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    }).then(handle<T>),
  del: <T>(url: string, init?: RequestInit) =>
    fetch(url, { ...init, method: "DELETE" }).then(handle<T>),
};
