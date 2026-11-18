import http from "@/lib/http";
import { JOBS_ENDPOINTS } from "./endpoints";
import { ApiException } from "@/lib/errors";
import type {
  Job,
  Role,
  JobWithStations,
  CreateRoleInput,
  UpdateRoleInput,
} from "./types";

// No result cache — every call hits the API (in-flight requests only are coalesced).
const jobsRequests = new Map<string, Promise<{ jobs: Job[] }>>();
const stationsRequests = new Map<
  string,
  Promise<{ stations: Array<{ id: string; name: string }> }>
>();

function requestHeaders(
  cookieHeader?: string,
): Record<string, string> | undefined {
  if (!cookieHeader) return undefined;
  const headers: Record<string, string> = { Cookie: cookieHeader };
  const tokenMatch = cookieHeader.match(/(?:^|;\s*)lms_token=([^;]+)/);
  if (tokenMatch)
    headers.Authorization = `Bearer ${decodeURIComponent(tokenMatch[1])}`;
  return headers;
}

// Drops in-flight reads only — there is no result cache left to clear.
export function clearJobsCache(): void {
  jobsRequests.clear();
  stationsRequests.clear();
}

export async function fetchJobs(
  cookieHeader?: string,
): Promise<{ jobs: Job[] }> {
  if (typeof window === "undefined") {
    const { data } = await http.get<{
      success: boolean;
      data: { jobs: Job[] };
    }>(JOBS_ENDPOINTS.LIST, {
      headers: requestHeaders(cookieHeader),
      // Backend paginates (default 10) — org scale fits one page.
      params: { page: 1, limit: 200 },
    });
    return { jobs: data.data?.jobs ?? [] };
  }
  const key = cookieHeader || "client";
  const pending = jobsRequests.get(key);
  if (pending) return pending;
  const request = http
    .get<{ success: boolean; data: { jobs: Job[] } }>(JOBS_ENDPOINTS.LIST, {
      headers: requestHeaders(cookieHeader),
      // Backend paginates (default 10) — org scale fits one page.
      params: { page: 1, limit: 200 },
    })
    .then(({ data }) => ({ jobs: data.data?.jobs ?? [] }))
    .finally(() => jobsRequests.delete(key));
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
    clearanceLevel: "general",
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
  // Browser-only in-flight coalescing (see fetchJobs) — the server always reads fresh.
  if (typeof window === "undefined") {
    const { data } = await http.request<{
      success: boolean;
      data: { stations: Array<{ id: string; name: string }> };
    }>({
      method: "QUERY",
      url: JOBS_ENDPOINTS.STATIONS,
      params: { jobIds: ids.join(",") },
      headers: requestHeaders(cookieHeader),
    });
    return { stations: data.data?.stations ?? [] };
  }
  const key = `${cookieHeader || "client"}:${ids.join(",")}`;
  const pending = stationsRequests.get(key);
  if (pending) return pending;
  const request = http
    .request<{
      success: boolean;
      data: { stations: Array<{ id: string; name: string }> };
    }>({
      method: "QUERY",
      url: JOBS_ENDPOINTS.STATIONS,
      params: { jobIds: ids.join(",") },
      headers: requestHeaders(cookieHeader),
    })
    .then(({ data }) => ({ stations: data.data?.stations ?? [] }))
    .finally(() => stationsRequests.delete(key));
  stationsRequests.set(key, request);
  return request;
}
export async function createJob(input: {
  name: string;
  stationIds?: string[];
}): Promise<{ job: Job }> {
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
    throw new ApiException(400, "INVALID_INPUT", "Nothing to update");
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
