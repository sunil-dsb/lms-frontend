"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchEmployees } from "./api";
import type { EmployeeFilterOptions } from "./types";

export const EMPLOYEES_QUERY_KEY = ["employees"] as const;

/**
 * Employees list through TanStack Query (provider defaults: staleTime 0 —
 * a fresh API call whenever the data is needed). Previously a hand-rolled
 * useState+useEffect loader with no dedup, so concurrent mounts each paid a
 * backend round-trip.
 */
export function useEmployees(options: EmployeeFilterOptions = {}) {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const status = options.status ?? "all";
  const role = options.role ?? "all";
  const stationId = options.stationId ?? "all";
  const jobId = options.jobId ?? "all";
  const q = options.q?.trim() ?? "";
  const query = useQuery({
    queryKey: [
      ...EMPLOYEES_QUERY_KEY,
      { page, limit, status, role, stationId, jobId, q },
    ],
    queryFn: () =>
      fetchEmployees({ page, limit, status, role, stationId, jobId, q }),
    // The key swaps on every debounced keystroke / filter / page change — keep
    // the previous rows on screen instead of flashing the loading state (v5 API).
    placeholderData: keepPreviousData,
  });

  return {
    employees: query.data?.employees ?? [],
    meta: query.data?.meta,
    statusCounts: query.data?.statusCounts,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error:
      query.error instanceof Error
        ? query.error
        : query.error
          ? new Error("Failed to fetch employees")
          : null,
    refetch: () => void query.refetch(),
  };
}
