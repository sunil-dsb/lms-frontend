"use client";

import { useQuery } from "@tanstack/react-query";
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
  const query = useQuery({
    queryKey: [...EMPLOYEES_QUERY_KEY, { status }],
    queryFn: () => fetchEmployees({ status }).then((r) => r.employees),
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
