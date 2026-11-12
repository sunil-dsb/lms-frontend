/** Mirrors `auditEntityTypes` in the backend schema. */
export type AuditItemType =
  | "course"
  | "chapter"
  | "quiz"
  | "procedure"
  | "assignment"
  | "station"
  | "location"
  | "job";

/** Mirrors `auditActions` in the backend schema. */
export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "publish"
  | "archive"
  | "unarchive"
  | "assign"
  | "unassign"
  | "reorder"
  | "override"
  | "revoke_override";

/** Field-level before/after: `{ "dueDate": { from: "…", to: "…" } }`. */
export type AuditChanges = Record<string, { from: unknown; to: unknown }>;

export interface AuditLogRow {
  id: string;
  /** user.id (text/nanoid); null once the user row is deleted. */
  userId: string | null;
  /** Actor name as it was at the time of the action. */
  userName: string;
  itemType: AuditItemType;
  itemId: string;
  /** Title/name snapshot — present even after a hard delete. */
  itemName: string | null;
  action: AuditAction;
  changes: AuditChanges | null;
  createdAt: string;
}

export interface AuditLogMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuditLogFilters {
  itemType?: AuditItemType | "all";
  action?: AuditAction | "all";
  search?: string;
  from?: string;
  to?: string;
  page?: number;
}
