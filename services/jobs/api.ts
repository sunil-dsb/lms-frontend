import http from '@/lib/http';
import { JOBS_ENDPOINTS } from './endpoints';
import { ApiException } from '@/lib/errors';
import type { Job, Role, JobWithStations, CreateRoleInput, UpdateRoleInput } from './types';

const cacheTtlMs = 5 * 60 * 1000;
const jobsCache = new Map<string, { value: { jobs: Job[] }; expiresAt: number }>();
const jobsRequests = new Map<string, Promise<{ jobs: Job[] }>>();
const stationsCache = new Map<string, { value: { stations: Array<{ id: string; name: string }> }; expiresAt: number }>();
const stationsRequests = new Map<string, Promise<{ stations: Array<{ id: string; name: string }> }>>();

function requestHeaders(cookieHeader?: string): Record<string, string> | undefined {
  if (!cookieHeader) return undefined;
  const headers: Record<string, string> = { Cookie: cookieHeader };
  const tokenMatch = cookieHeader.match(/(?:^|;\s*)lms_token=([^;]+)/);
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
  // Module-level caches live per runtime. The browser copy is cleared on
  // every mutation (clearJobsCache), but the server copy survives across
  // requests in the same process — after a client-side create followed by
  // router.refresh(), the re-run Server Component would keep serving the
  // pre-create list until the 5-minute TTL expired. So caching applies in
  // the browser only; the server always reads fresh (SSR renders once per
  // request, so there is nothing useful to memoize there anyway).
  if (typeof window === 'undefined') {
    const { data } = await http.get<{ success: boolean; data: { jobs: Job[] } }>(JOBS_ENDPOINTS.LIST, {
      headers: requestHeaders(cookieHeader),
      // Backend paginates (default 10) — org scale fits one page.
      params: { page: 1, limit: 200 },
    });
    return { jobs: data.data?.jobs ?? [] };
  }
  const key = cookieHeader || 'client';
  const cached = jobsCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const pending = jobsRequests.get(key);
  if (pending) return pending;
  const request = http.get<{ success: boolean; data: { jobs: Job[] } }>(JOBS_ENDPOINTS.LIST, {
    headers: requestHeaders(cookieHeader),
    // Backend paginates (default 10) — org scale fits one page.
    params: { page: 1, limit: 200 },
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
  // Browser-only cache (see fetchJobs) — the server always reads fresh.
  if (typeof window === 'undefined') {
    const { data } = await http.post<{
      success: boolean;
      data: { stations: Array<{ id: string; name: string }> };
    }>('/api/backend/jobs/stations', {
      jobIds: ids,
    }, {
      headers: requestHeaders(cookieHeader),
    });
    return { stations: data.data?.stations ?? [] };
  }
  const key = `${cookieHeader || 'client'}:${ids.join(',')}`;
  const cached = stationsCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const pending = stationsRequests.get(key);
  if (pending) return pending;
  const request = http.post<{
    success: boolean;
    data: { stations: Array<{ id: string; name: string }> };
  }>('/api/backend/jobs/stations', {
    jobIds: ids,
  }, {
    headers: requestHeaders(cookieHeader),
  }).then(({ data }) => {
    const value = { stations: data.data?.stations ?? [] };
    stationsCache.set(key, { value, expiresAt: Date.now() + cacheTtlMs });
    return value;
  }).finally(() => stationsRequests.delete(key));
  stationsRequests.set(key, request);
  return request;
}
export async function createJob(
  input: { name: string; stationIds?: string[] },
): Promise<{ job: Job }> {
  // Backend `jobCreateSchema` = `{ name, stationIds?: uuid[] }` — no
  // clearance tier. `clearanceLevel` must not be sent.
  const payload: { name: string; stationIds?: string[] } = { name: input.name };
  if (input.stationIds !== undefined) payload.stationIds = input.stationIds;
  const { data } = await http.post<{
    success: boolean;
    data: { job: Job };
  }>(JOBS_ENDPOINTS.CREATE, payload);

  clearJobsCache();
  return { job: data.data.job };
}

export async function updateJob(
  id: string,
  patch: { name?: string; stationIds?: string[] },
): Promise<{ job: Job }> {
  const payload: { name?: string; stationIds?: string[] } = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.stationIds !== undefined) payload.stationIds = patch.stationIds;
  if (Object.keys(payload).length === 0) {
    throw new ApiException(400, 'INVALID_INPUT', 'Nothing to update');
  }
  const { data } = await http.patch<{
    success: boolean;
    data: { job: Job };
  }>(JOBS_ENDPOINTS.UPDATE(id), payload);

  clearJobsCache();
  return { job: data.data.job };
}

export async function deleteJob(id: string): Promise<{ ok: true }> {
  await http.delete(JOBS_ENDPOINTS.DELETE(id));
  clearJobsCache();
  return { ok: true };
}
