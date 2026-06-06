import { apiFetch } from './api';

export interface Department {
  id: string;
  name: string;
  code: string;
}

let cached: Department[] | null = null;
let inflight: Promise<Department[]> | null = null;

/** Fetches departments from GET /departments; result is cached for the session. */
export async function getDepartments(force = false): Promise<Department[]> {
  if (!force && cached) return cached;
  if (!force && inflight) return inflight;

  inflight = apiFetch<Department[]>('/departments')
    .then((data) => {
      cached = data;
      return data;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function clearDepartmentsCache(): void {
  cached = null;
}
