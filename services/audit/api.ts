import http from "@/lib/http";
import { AUDIT_ENDPOINTS } from "./endpoints";
import type {
  AuditLogFilters,
  AuditLogMeta,
  AuditLogRow,
  AuditAction,
  AuditItemType,
} from "./types";

export interface AuditLogPage {
  auditLogs: AuditLogRow[];
  meta: AuditLogMeta;
}

/**
 * One page of the audit log, newest first.
 *
 * All filters are optional — omitting one (or passing "all") leaves it out of
 * the query string entirely rather than sending a value the backend would
 * have to ignore.
 */
export async function fetchAuditLogs(
  filters: AuditLogFilters = {},
  cookieHeader?: string,
): Promise<AuditLogPage> {
  const headers: Record<string, string> = {};

  if (cookieHeader) {
    headers["Cookie"] = cookieHeader;
    const tokenMatch = cookieHeader.match(/(?:^|;\s*)lms_token=([^;]+)/);
    if (tokenMatch) {
      headers["Authorization"] = `Bearer ${decodeURIComponent(tokenMatch[1])}`;
    }
  }

  const params: Record<string, string | number> = {
    page: filters.page ?? 1,
    limit: 20,
  };

  if (filters.itemType && filters.itemType !== "all") {
    params.itemType = filters.itemType satisfies AuditItemType;
  }
  if (filters.action && filters.action !== "all") {
    params.action = filters.action satisfies AuditAction;
  }
  if (filters.search?.trim()) params.search = filters.search.trim();
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;

  const { data } = await http.get<{
    success: boolean;
    data: { auditLogs: AuditLogRow[]; meta: AuditLogMeta };
  }>(AUDIT_ENDPOINTS.LIST, {
    headers: Object.keys(headers).length ? headers : undefined,
    params,
  });

  return {
    auditLogs: data.data?.auditLogs ?? [],
    meta: data.data?.meta ?? {
      page: params.page as number,
      limit: 20,
      total: 0,
      totalPages: 0,
    },
  };
}
