"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMe } from "./api";
import type { Employee } from "@/lib/types";

export const ME_QUERY_KEY = ["auth", "me"] as const;

/**
 * Session owner through TanStack Query (provider defaults: staleTime 0 —
 * a fresh API call on every mount; 4xx never retried — a
 * 401 surfaces immediately so callers can bounce to /login). Replaces the
 * per-navigation server `fetchMe` round-trips on employee surfaces: a
 * returning view renders its retained copy instantly with no loading state
 * while the refetch runs in the background.
 */
export function useMe(): {
  employee: Employee | null;
  isLoading: boolean;
  error: unknown;
} {
  const query = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: () => fetchMe().then((r) => r.employee),
  });

  return {
    employee: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}
