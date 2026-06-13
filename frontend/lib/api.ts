import { setHubSessionCookie } from './hub-session-cookie';

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
    if (token) {
      localStorage.setItem('nacos_access_token', token);
      setHubSessionCookie(true);
    } else {
      localStorage.removeItem('nacos_access_token');
      setHubSessionCookie(false);
    }
  }
}

export function loadStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  const t = localStorage.getItem('nacos_access_token');
  accessToken = t;
  if (t) setHubSessionCookie(true);
  return t;
}

export async function refreshAccessToken(): Promise<string | null> {
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

function apiErrorMessage(status: number, code?: string, fallback?: string): string {
  if (status === 429 || code === 'RATE_LIMIT') {
    return 'Too many attempts. Wait a few minutes and try again. If you are on campus WiFi, try mobile data or stagger signups in small groups.';
  }
  if (status === 401) {
    return code === 'AUTH_ERROR' || fallback === 'Unauthorized'
      ? 'Session expired. Please log out and log in again, then retry.'
      : (fallback ?? 'Session expired. Please log in again.');
  }
  if (status === 403 && code === 'PIN_ISSUER_FORBIDDEN') {
    return 'You do not have permission to issue PINs. Ask a super admin to enable “Can issue PINs” on your account, then log in again.';
  }
  return fallback ?? 'Request failed';
}

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
};

type PaginatedApiSuccess<T> = ApiSuccess<T> & { meta: PaginationMeta };

export async function apiFetchPaginated<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<{ items: T[]; meta: PaginationMeta }> {
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
    if (newToken) return apiFetchPaginated<T>(path, options, false);
    setAccessToken(null);
  }

  const json = (await res.json()) as PaginatedApiSuccess<T[]> | ApiError;
  if (!res.ok || !json.success) {
    const err = json as ApiError;
    throw new ApiClientError(
      apiErrorMessage(res.status, err.code, err.error),
      res.status,
      err.code,
    );
  }
  const ok = json as PaginatedApiSuccess<T[]>;
  return { items: ok.data ?? [], meta: ok.meta };
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
    throw new ApiClientError(
      apiErrorMessage(res.status, err.code, err.error),
      res.status,
      err.code,
    );
  }
  return (json as ApiSuccess<T>).data;
}

export { API_BASE };
