"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAuditLogs } from "./api";
import type { AuditLogFilters } from "./types";

export const AUDIT_QUERY_KEY = ["audit-logs"] as const;

/**
 * Audit log page through TanStack Query. The full filter set is part of the
 * query key, so changing a filter is a cache miss + refetch while paging
 * back to a seen combination is served from cache.
 */
export function useAuditLogs(filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: [...AUDIT_QUERY_KEY, filters],
    queryFn: () => fetchAuditLogs(filters),
    // The log is append-only and changes on every admin action — keep it
    // fresh rather than serving a stale page after a mutation elsewhere.
    staleTime: 30_000,
  });
}
