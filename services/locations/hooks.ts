"use client";

/**
 * Locations data layer (TanStack Query).
 *
 * Same pattern as services/categories and services/library: the query
 * key is exported so mutations elsewhere can invalidate the list, and
 * the provider defaults apply (5 min staleTime, no refetch on focus,
 * 4xx never retried). Consumers read `data?.locations`.
 */

import { useQuery } from "@tanstack/react-query";
import { fetchLocations } from "./api";

export const LOCATIONS_QUERY_KEY = ["locations"] as const;

export function useLocations() {
  return useQuery({
    queryKey: LOCATIONS_QUERY_KEY,
    queryFn: () => fetchLocations(),
  });
}
