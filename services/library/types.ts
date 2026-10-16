import type { Procedure, CreateProcedureInput } from "@/lib/types";

export type { Procedure, CreateProcedureInput };

export interface ProcedureFilterOptions {
  locationId?: string;
  categoryId?: string;
  status?: string;
  q?: string;
  page?: number;
  /** Full-text search (backend `search` param, matches titleEn/titleEs). */
  search?: string;
  /** ID-list filters — sent to GET /procedures/filter (OR semantics). */
  categoryIds?: string[];
  subcategoryIds?: string[];
  stationIds?: string[];
  /** Page size. Backend defaults to 10 when omitted — always pass an
   *  explicit limit so lists never silently truncate. */
  limit?: number;
}

export interface AssignedProceduresFilterOptions {
  scope?: "all" | "mine";
  categoryId?: string;
  page?: number;
  limit?: number;
  search?: string;
}
