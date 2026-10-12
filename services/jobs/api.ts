import http from '@/lib/http';
import { JOBS_ENDPOINTS } from './endpoints';
import type { Job, Role, JobWithStations, CreateRoleInput, UpdateRoleInput } from './types';

export async function fetchJobs(
  cookieHeader?: string,
): Promise<{ jobs: Job[] }> {
  const headers: Record<string, string> = {};

  if (cookieHeader) {
    headers['Cookie'] = cookieHeader;
    const tokenMatch = cookieHeader.match(/(?:^|;\s*)lms_token=([^;]+)/);
    if (tokenMatch) {
      headers['Authorization'] = `Bearer ${decodeURIComponent(tokenMatch[1])}`;
    }
  }

  const { data } = await http.get<{
    success: boolean;
    data: { jobs: Job[] };
  }>(JOBS_ENDPOINTS.LIST, {
    headers: Object.keys(headers).length ? headers : undefined,
    // Backend paginates (default 10) — the roles catalog is small, take all.
    params: { limit: 200 },
  });

  return { jobs: data.data?.jobs ?? [] };
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
    stationIds: j.stations.map((s) => s.id),
    createdAt: j.createdAt || new Date().toISOString(),
  }));
  return { roles };
}

export async function fetchJobStations(
  jobIds: string[],
  cookieHeader?: string,
): Promise<{ stations: Array<{ id: string; name: string }> }> {
  if (!jobIds.length) {
    return { stations: [] };
  }

  // No dedicated backend route derivable through the proxy
  // (GET /jobs/stations is QUERY-only) — resolve locally instead: jobs
  // carry their stationIds, names come from the stations list. Both
  // calls below are cached, so this costs no extra round-trips.
  const [{ jobs }, { stations }] = await Promise.all([
    fetchJobs(cookieHeader),
    import('@/services/stations/api').then((m) => m.fetchStations({}, cookieHeader)),
  ]);
  const wanted = new Set(jobIds);
  const ids = new Set<string>();
  for (const job of jobs) {
    if (!wanted.has(job.id)) continue;
    for (const sid of job.stationIds ?? []) ids.add(sid);
  }
  const byId = new Map(stations.map((s) => [s.id, s.name] as const));
  return {
    stations: [...ids]
      .filter((id) => byId.has(id))
      .map((id) => ({ id, name: byId.get(id)! }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export async function createJob(
  input: { name: string },
): Promise<{ job: Job }> {
  const { data } = await http.post<{
    success: boolean;
    data: { job: Job };
  }>(JOBS_ENDPOINTS.CREATE, input);

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

  return { job: data.data.job };
}

export async function deleteJob(id: string): Promise<{ ok: true }> {
  await http.delete(JOBS_ENDPOINTS.DELETE(id));
  return { ok: true };
}
