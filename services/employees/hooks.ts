"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchEmployees } from "./api";
import type { EmployeeFilterOptions } from "./types";

export const EMPLOYEES_QUERY_KEY = ["employees"] as const;

/**
 * Employees list through TanStack Query (5 min staleTime, no refetch on
 * focus — provider defaults). Previously a hand-rolled useState+useEffect
 * loader with no dedup or TTL, so every mount paid a backend round-trip.
 */
export function useEmployees(options: EmployeeFilterOptions = {}) {
  const status = options.status ?? "all";
  const q = options.q?.trim() ?? "";
  const query = useQuery({
    queryKey: [...EMPLOYEES_QUERY_KEY, { status, q }],
    queryFn: () => fetchEmployees({ status, q }).then((r) => r.employees),
    // The key swaps on every debounced keystroke — keep the previous rows
    // on screen instead of flashing the loading state (v5 API).
    placeholderData: keepPreviousData,
  });

  return {
    employees: query.data ?? [],
    isLoading: query.isLoading,
    error:
      query.error instanceof Error
        ? query.error
        : query.error
          ? new Error("Failed to fetch employees")
          : null,
    refetch: () => void query.refetch(),
  };
}
