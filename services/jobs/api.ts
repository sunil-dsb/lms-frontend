import http from '@/lib/http';
import { JOBS_ENDPOINTS } from './endpoints';
import type { Job, Role, JobWithStations, CreateRoleInput, UpdateRoleInput } from './types';

const cacheTtlMs = 5 * 60 * 1000;
const jobsCache = new Map<string, { value: { jobs: Job[] }; expiresAt: number }>();
const jobsRequests = new Map<string, Promise<{ jobs: Job[] }>>();
const stationsCache = new Map<string, { value: { stations: Array<{ id: string; name: string }> }; expiresAt: number }>();
const stationsRequests = new Map<string, Promise<{ stations: Array<{ id: string; name: string }> }>>();

function requestHeaders(cookieHeader?: string): Record<string, string> | undefined {
  if (!cookieHeader) return undefined;
  const headers: Record<string, string> = { Cookie: cookieHeader };
  const tokenMatch = cookieHeader.match(/(?:^|;\\s*)lms_token=([^;]+)/);
  if (tokenMatch) headers.Authorization = `Bearer ${decodeURIComponent(tokenMatch[1])}`;
  return headers;
}

export function clearJobsCache(): void {
  jobsCache.clear();
  jobsRequests.clear();
  stationsCache.clear();
  stationsRequests.clear();
}

export async function fetchJobs(cookieHeader?: string): Promise<{ jobs: Job[] }> {
  const key = cookieHeader || 'client';
  const cached = jobsCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const pending = jobsRequests.get(key);
  if (pending) return pending;
  const request = http.get<{ success: boolean; data: { jobs: Job[] } }>(JOBS_ENDPOINTS.LIST, {
    headers: requestHeaders(cookieHeader),
    params: { page: 1, limit: 10, search: '' },
  }).then(({ data }) => {
    const value = { jobs: data.data?.jobs ?? [] };
    jobsCache.set(key, { value, expiresAt: Date.now() + cacheTtlMs });
    return value;
  }).finally(() => jobsRequests.delete(key));
  jobsRequests.set(key, request);
  return request;
}
export async function fetchJobsWithStations(
  cookieHeader?: string,
): Promise<{ jobs: JobWithStations[] }> {
  const { jobs } = await fetchJobs(cookieHeader);
  return {
    jobs: jobs.map((j) => ({
      ...j,
      stations: [],
    })),
  };
}

export async function fetchRoles(
  cookieHeader?: string,
): Promise<{ roles: Role[] }> {
  const { jobs } = await fetchJobsWithStations(cookieHeader);
  const roles: Role[] = jobs.map((j) => ({
    id: j.id,
    name: j.name,
    clearanceLevel: 'general',
    stationIds: j.stationIds ?? [],
    createdAt: j.createdAt || new Date().toISOString(),
  }));
  return { roles };
}

export async function fetchJobStations(
  jobIds: string[],
  cookieHeader?: string,
): Promise<{ stations: Array<{ id: string; name: string }> }> {
  if (!jobIds.length) return { stations: [] };
  const ids = [...new Set(jobIds)].sort();
  const key = `${cookieHeader || 'client'}:${ids.join(',')}`;
  const cached = stationsCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const pending = stationsRequests.get(key);
  if (pending) return pending;
  const request = http.request<{
    success: boolean;
    data: { stations: Array<{ id: string; name: string }> };
  }>({
    method: 'QUERY',
    url: JOBS_ENDPOINTS.STATIONS,
    headers: requestHeaders(cookieHeader),
    params: { jobIds: ids.join(',') },
  }).then(({ data }) => {
    const value = { stations: data.data?.stations ?? [] };
    stationsCache.set(key, { value, expiresAt: Date.now() + cacheTtlMs });
    return value;
  }).finally(() => stationsRequests.delete(key));
  stationsRequests.set(key, request);
  return request;
}
export async function createJob(
  input: { name: string },
): Promise<{ job: Job }> {
  const { data } = await http.post<{
    success: boolean;
    data: { job: Job };
  }>(JOBS_ENDPOINTS.CREATE, input);

  clearJobsCache();
  return { job: data.data.job };
}

export async function updateJob(
  id: string,
  patch: { name: string },
): Promise<{ job: Job }> {
  const { data } = await http.patch<{
    success: boolean;
    data: { job: Job };
  }>(JOBS_ENDPOINTS.UPDATE(id), patch);

  clearJobsCache();
  return { job: data.data.job };
}

export async function deleteJob(id: string): Promise<{ ok: true }> {
  await http.delete(JOBS_ENDPOINTS.DELETE(id));
  clearJobsCache();
  return { ok: true };
}
