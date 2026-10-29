"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJobs, fetchRoles } from "./api";

export const JOBS_QUERY_KEY = ["jobs"] as const;
export const ROLES_QUERY_KEY = ["roles"] as const;

/**
 * Jobs / roles through TanStack Query (5 min staleTime, no refetch on
 * focus — provider defaults). Previously hand-rolled useState+useEffect
 * loaders with no dedup or TTL, so every mount paid a backend round-trip.
 */
export function useJobs() {
  const query = useQuery({
    queryKey: JOBS_QUERY_KEY,
    queryFn: () => fetchJobs().then((r) => r.jobs),
  });

  return {
    jobs: query.data ?? [],
    isLoading: query.isLoading,
    error:
      query.error instanceof Error
        ? query.error
        : query.error
          ? new Error("Failed to fetch jobs")
          : null,
    refetch: () => void query.refetch(),
  };
}

export function useRoles() {
  const query = useQuery({
    queryKey: ROLES_QUERY_KEY,
    queryFn: () => fetchRoles().then((r) => r.roles),
  });

  return {
    roles: query.data ?? [],
    isLoading: query.isLoading,
    error:
      query.error instanceof Error
        ? query.error
        : query.error
          ? new Error("Failed to fetch roles")
          : null,
    refetch: () => void query.refetch(),
  };
}
