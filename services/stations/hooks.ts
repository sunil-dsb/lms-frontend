"use client";

/**
 * Stations data layer (TanStack Query). Same pattern as categories and
 * library: exported query key for invalidation, provider defaults apply
 * (staleTime 0 — a fresh API call whenever the data is needed; tab focus
 * does not refetch). Consumers read `data` (a plain Station[]).
 */

import { useQuery } from "@tanstack/react-query";
import { fetchStations } from "./api";
import type { StationFilterOptions } from "./types";

export const STATIONS_QUERY_KEY = ["stations"] as const;

export function useStations(options: StationFilterOptions = {}) {
  return useQuery({
    queryKey: [
      ...STATIONS_QUERY_KEY,
      {
        locationId: options.locationId,
        includeArchived: options.includeArchived ?? false,
      },
    ],
    queryFn: () => fetchStations(options).then((r) => r.stations),
  });
}
