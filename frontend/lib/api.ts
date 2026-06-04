const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

export type ApiSuccess<T> = { success: true; data: T; message?: string };
export type ApiError = { success: false; error: string; code?: string };

export class ApiClientError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
  if (typeof window !== 'undefined') {
    if (token) localStorage.setItem('nacos_access_token', token);
    else localStorage.removeItem('nacos_access_token');
  }
}

export function loadStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  const t = localStorage.getItem('nacos_access_token');
  accessToken = t;
  return t;
}

async function refreshAccessToken(): Promise<string | null> {
  const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) return null;
  const json = (await res.json()) as ApiSuccess<{ access_token: string }>;
  if (json.success && json.data.access_token) {
    setAccessToken(json.data.access_token);
    return json.data.access_token;
  }
  return null;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    ...options,
    headers,
    credentials: options.credentials ?? 'include',
  });

  if (res.status === 401 && retry && path !== '/auth/refresh' && path !== '/auth/login') {
    const newToken = await refreshAccessToken();
    if (newToken) return apiFetch<T>(path, options, false);
    setAccessToken(null);
  }

  const json = (await res.json()) as ApiSuccess<T> | ApiError;
  if (!res.ok || !json.success) {
    const err = json as ApiError;
    throw new ApiClientError(err.error ?? 'Request failed', res.status, err.code);
  }
  return (json as ApiSuccess<T>).data;
}

export { API_BASE };
