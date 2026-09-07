export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!res.ok) {
    let code = "ERROR";
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) {
        code = body.error.code ?? code;
        message = body.error.message ?? message;
      }
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, code, message);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export const apiPost = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

export const apiPut = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) });

export const apiDelete = <T>(path: string) => api<T>(path, { method: "DELETE" });
