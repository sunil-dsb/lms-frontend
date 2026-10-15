/**
 * Library data layer — integrates with backend /api/v1/procedures endpoints.
 *
 * Endpoints:
 * - GET  /api/v1/procedures       (List Procedures, Bearer auth)
 * - GET  /api/v1/procedures/:slug  (Get Procedure by slug)
 * - POST /api/v1/procedures       (Create Procedure, Bearer auth)
 */

import http from '@/lib/http';
import { LIBRARY_ENDPOINTS } from './endpoints';
import type { Procedure, CreateProcedureInput } from '@/lib/types';
import type { ProcedureFilterOptions, AssignedProceduresFilterOptions } from './types';
import { normalizeBackendProcedure, normalizeBlocks } from './normalization';
export { normalizeBackendProcedure } from './normalization';

function makeHeaders(cookieHeader?: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (cookieHeader) {
    headers['Cookie'] = cookieHeader;
    const tokenMatch = cookieHeader.match(/(?:^|;\s*)lms_token=([^;]+)/);
    if (tokenMatch) {
      headers['Authorization'] = `Bearer ${decodeURIComponent(tokenMatch[1])}`;
    }
  }
  return headers;
}

export function isUuid(val: string | null | undefined): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

/** POST /api/v1/procedures/import — upload a doc/pdf/txt file and get back
 *  a generated draft procedure. Multipart `file` field; the server creates
 *  the draft (status: draft) and returns it. AI generation is slow, so
 *  callers should pass a long timeout + AbortSignal. */
export async function importProcedure(
  file: File,
  opts?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<Procedure> {
  const form = new FormData();
  form.append('file', file, file.name);
  const { data } = await http.post<{
    success: boolean;
    message: string;
    data: { procedure: Procedure };
  }>(LIBRARY_ENDPOINTS.IMPORT, form, {
    signal: opts?.signal,
    timeout: opts?.timeoutMs ?? 120_000,
  });
  if (!data.data?.procedure) {
    throw new Error('Backend did not return imported procedure');
  }
  return normalizeBackendProcedure(data.data.procedure);
}

/** Default page size for full-list reads (counts, client filters). The backend
 *  defaults to `limit=10` when omitted — restaurant scale (50–100 docs) fits
 *  comfortably in one page, so one bounded request replaces paging logic. */
export const PROCEDURES_LIST_LIMIT = 200;

export async function fetchProcedures(
  options: ProcedureFilterOptions = {},
  _isAdmin = false,
  cookieHeader?: string,
): Promise<{ procedures: Procedure[]; total?: number }> {
  const headers = makeHeaders(cookieHeader);
  const limit = options.limit ?? PROCEDURES_LIST_LIMIT;
  const page = options.page ?? 1;
  const search = options.search ?? options.q ?? undefined;

  const validCategoryIds = options.categoryIds?.filter((id) => isUuid(id));
  const validSubcategoryIds = options.subcategoryIds?.filter((id) => isUuid(id));
  const validStationIds = options.stationIds?.filter((id) => isUuid(id));
  const validStatus = options.status && ['draft', 'published', 'archived'].includes(options.status) ? options.status : undefined;

  // ID-list filters and status filters live on GET /procedures/filter; plain search/page
  // stay on GET /procedures. Both return { procedures, meta }.
  const useFilter =
    (validCategoryIds?.length ?? 0) > 0 ||
    (validSubcategoryIds?.length ?? 0) > 0 ||
    (validStationIds?.length ?? 0) > 0 ||
    Boolean(validStatus);

  const params: Record<string, any> = { page, limit };
  if (validStatus) params.status = validStatus;
  if (search) params.search = search;
  if (useFilter) {
    if (validCategoryIds?.length) params.categoryIds = validCategoryIds.join(',');
    if (validSubcategoryIds?.length) params.subcategoryIds = validSubcategoryIds.join(',');
    if (validStationIds?.length) params.stationIds = validStationIds.join(',');
  }

  const { data } = await http.get<{
    success: boolean;
    data: { procedures: Procedure[]; meta?: { total: number; totalPages: number } };
  }>(useFilter ? LIBRARY_ENDPOINTS.FILTER : LIBRARY_ENDPOINTS.LIST, {
    headers: Object.keys(headers).length ? headers : undefined,
    params,
  });

  const rawList = Array.isArray(data.data?.procedures) ? data.data.procedures : [];
  const procedures = rawList.map(normalizeBackendProcedure);
  await resolveBackendCategories(procedures, cookieHeader);
  const total = data.data?.meta?.total ?? procedures.length;
  return { procedures, total };
}

/** Backend procedures carry `subcategory: { id, categoryId, … }` but no
 *  category object, so every backend row reads as "General" and no category
 *  filter can match it. This resolves each row's category from the backend
 *  category list (one batched call, in parallel-safe position) and folds the
 *  in-use subcategories into their categories for the dropdowns. Failures
 *  keep the old behavior (null category) — the list still renders. */
async function resolveBackendCategories(procedures: Procedure[], cookieHeader?: string): Promise<void> {
  const needsResolution = procedures.some((p) => !p.category && p.subcategoryId);
  if (!needsResolution) return;
  try {
    const { fetchBackendCategories, backendSlug } = await import('@/services/categories/api');
    const cats = await fetchBackendCategories({}, cookieHeader);
    const byId = new Map(cats.map((c) => [c.id, c]));
    const subSeen = new Set<string>();
    for (const p of procedures) {
      const sub = (
        p as unknown as {
          subcategory?: { id: string; categoryId: string; nameEn: string; nameEs: string } | null;
        }
      ).subcategory;
      if (!sub) continue;
      const cat = byId.get(sub.categoryId);
      if (!cat) continue;
      if (!p.category) p.category = cat;
      if (!subSeen.has(sub.id)) {
        subSeen.add(sub.id);
        cat.subcategories = [
          ...(cat.subcategories ?? []),
          {
            id: sub.id,
            slug: backendSlug(sub.nameEn),
            nameEn: sub.nameEn,
            nameEs: sub.nameEs,
            categoryId: sub.categoryId,
          },
        ];
      }
    }
  } catch {
    // Backend categories unavailable — rows keep category: null (General).
  }
}

export async function fetchAssignedProcedures(
  options: AssignedProceduresFilterOptions = {},
  cookieHeader?: string,
): Promise<{ procedures: Procedure[]; total: number; meta?: { page: number; limit: number; total: number; totalPages: number } }> {
  const headers = makeHeaders(cookieHeader);
  const params: Record<string, any> = {};

  if (options.scope === 'mine' || options.scope === 'all') {
    params.scope = options.scope;
  }
  if (options.categoryId && isUuid(options.categoryId)) {
    params.categoryId = options.categoryId;
  }
  if (options.page != null) {
    params.page = options.page;
  }
  if (options.limit != null) {
    params.limit = options.limit;
  }
  if (options.search && options.search.trim()) {
    params.search = options.search.trim();
  }

  const { data } = await http.get<{
    success: boolean;
    data: {
      procedures: any[];
      meta?: { page: number; limit: number; total: number; totalPages: number };
    };
  }>(LIBRARY_ENDPOINTS.ASSIGNED, {
    headers: Object.keys(headers).length ? headers : undefined,
    params,
  });

  const rawList = Array.isArray(data.data?.procedures) ? data.data.procedures : [];
  const procedures = rawList.map(normalizeBackendProcedure);
  await resolveBackendCategories(procedures, cookieHeader);
  const total = data.data?.meta?.total ?? procedures.length;
  return { procedures, total, meta: data.data?.meta };
}

export async function fetchProcedureById(
  slugOrId: string,
  _isAdmin = false,
  cookieHeader?: string,
): Promise<Procedure> {
  const headers = makeHeaders(cookieHeader);
  try {
    const { data } = await http.get<{
      success: boolean;
      data: { procedure: Procedure };
    }>(LIBRARY_ENDPOINTS.GET(slugOrId), {
      headers: Object.keys(headers).length ? headers : undefined,
    });

    if (data.data?.procedure) {
      const proc = normalizeBackendProcedure(data.data.procedure);
      await resolveBackendCategories([proc], cookieHeader);
      return proc;
    }
  } catch (err) {
    // Slugs go straight through; anything else falls to the id path below.
    if (!isUuid(slugOrId)) throw err;
  }

  // Admin list links used to carry the row id (UUID), which never matches
  // the backend's slug column — resolve it through the (cached) list, then
  // fetch the whole procedure by the resolved slug so detail views always
  // get full bodies, never a metadata row.
  if (!isUuid(slugOrId)) {
    throw new Error(`Procedure not found: ${slugOrId}`);
  }
  const { procedures } = await fetchProcedures({}, _isAdmin, cookieHeader);
  const match = procedures.find((p) => p.id === slugOrId);
  if (!match) {
    throw new Error(`Procedure not found: ${slugOrId}`);
  }
  if (match.slug && match.slug !== slugOrId) {
    return fetchProcedureById(match.slug, _isAdmin, cookieHeader);
  }
  return match;
}

/** Backend PUT/POST validate against the full create schema, so every
 *  write must ship the complete payload. Shared between create and
 *  update: titles/purposes fall back across languages, blocks get
 *  normalised, and mock-only ids are mapped to their real UUIDs. */
function buildProcedurePayload(input: Partial<CreateProcedureInput>): Record<string, any> {
  let titleEn = (input.titleEn || input.titleEs || 'Untitled Procedure').trim();
  let titleEs = (input.titleEs || input.titleEn || 'Procedimiento sin título').trim();
  if (titleEn.length > 200) titleEn = titleEn.slice(0, 200);
  if (titleEs.length > 200) titleEs = titleEs.slice(0, 200);

  const purposeEn = (input.purposeEn || input.purposeEs || titleEn).trim() || titleEn;
  const purposeEs = (input.purposeEs || input.purposeEn || titleEs).trim() || titleEs;

  const blocksEn = normalizeBlocks(input.bodyEn?.blocks ?? []);
  const blocksEs = normalizeBlocks(input.bodyEs?.blocks ?? []);

  const finalBlocksEn = blocksEn.length > 0
    ? blocksEn
    : [{ id: 'b-init-1', kind: 'text', body: { en: purposeEn, es: purposeEs } }];
  const finalBlocksEs = blocksEs.length > 0
    ? blocksEs
    : [{ id: 'b-init-1', kind: 'text', body: { en: purposeEn, es: purposeEs } }];

  // Only live UUIDs go out — the wizard resolves mock picks to live ids
  // before calling. Anything else becomes null (backend-valid: a
  // procedure may live without a subcategory) instead of a dead UUID
  // that dies with SUBCATEGORY_NOT_FOUND.
  const subcategoryId = isUuid(input.subcategoryId) ? input.subcategoryId : null;
  const stationId = isUuid(input.stationId)
    ? input.stationId
    : input.stationScope?.stationIds?.[0] && isUuid(input.stationScope.stationIds[0])
      ? input.stationScope.stationIds[0]
      : input.audience?.stationIds?.[0] && isUuid(input.audience.stationIds[0])
        ? input.audience.stationIds[0]
        : null;
  const quizId = isUuid(input.quizId) ? input.quizId : null;
  const procedureImage =
    typeof input.procedureImage === 'string' && input.procedureImage.length > 0
      ? input.procedureImage
      : typeof input.iconImageUrl === 'string' && input.iconImageUrl.length > 0
        ? input.iconImageUrl
        : null;

  const rawAssignUsers =
    Array.isArray(input.assignUsers) && input.assignUsers.length > 0
      ? input.assignUsers
      : Array.isArray(input.audience?.employeeIds) && input.audience.employeeIds.length > 0
        ? input.audience.employeeIds
        : [];
  const validUsers = rawAssignUsers.filter(isUuid);

  const payload: Record<string, any> = {
    titleEn,
    titleEs,
    purposeEn,
    purposeEs,
    status: input.status === 'published' ? 'published' : 'draft',
    bodyEn: { blocks: finalBlocksEn },
    bodyEs: { blocks: finalBlocksEs },
  };

  if (subcategoryId) payload.subcategoryId = subcategoryId;
  // Always explicit: a UUID for station-specific, or null for general
  // categories (applies to all stations). Backend also defaults omission
  // to null, but sending it states the intent.
  payload.stationId = stationId;
  // Full station allocation. General categories send every station id;
  // station-specific ones the single pick. Resolution chain: explicit
  // `stationIds` → stationScope → audience. The live backend is
  // non-strict zod, so the array is stripped today and applied the
  // moment the API accepts multi-station.
  const stationIds = (
    Array.isArray(input.stationIds) && input.stationIds.length > 0
      ? input.stationIds
      : input.stationScope?.stationIds?.length
        ? input.stationScope.stationIds
        : input.audience?.stationIds ?? []
  ).filter(isUuid);
  if (stationIds.length > 0) payload.stationIds = stationIds;
  if (quizId) payload.quizId = quizId;
  if (procedureImage) {
    payload.procedureImage = procedureImage;
  } else if (input.procedureImage === null || input.iconImageUrl === null) {
    payload.procedureImage = null;
  }
  if (validUsers.length > 0) payload.assignUsers = validUsers;

  return payload;
}

/** The backend's returned row, merged back onto the caller's intent so
 *  fields the API doesn't echo (stationScope, audience, …) survive. */
function normalizeWrittenProcedure(
  apiProcedure: Procedure,
  input: Partial<CreateProcedureInput>,
): Procedure {
  return {
    ...apiProcedure,
    subcategoryId: 'subcategoryId' in input ? (input.subcategoryId ?? null) : apiProcedure.subcategoryId,
    stationScope: input.stationScope ?? null,
    iconImageUrl: input.iconImageUrl ?? apiProcedure.iconImageUrl ?? (apiProcedure as { procedureImage?: string | null }).procedureImage ?? null,
    version: apiProcedure.version ?? input.version ?? 1,
    isArchived: apiProcedure.isArchived ?? false,
    audience: input.audience ?? null,
    protection: input.protection ?? 'standard',
    quizId: input.quizId ?? null,
    linkedTrainingId: input.linkedTrainingId ?? null,
    quizMode: input.quizMode ?? 'training',
  };
}

export async function createProcedure(
  input: CreateProcedureInput,
  cookieHeader?: string,
): Promise<Procedure> {
  const payload = buildProcedurePayload(input);
  const headers = makeHeaders(cookieHeader);

  const { data } = await http.post<{
    success: boolean;
    message: string;
    data: { procedure: Procedure };
  }>(LIBRARY_ENDPOINTS.CREATE, payload, {
    headers: Object.keys(headers).length ? headers : undefined,
  });

  if (data.data?.procedure) {
    return normalizeWrittenProcedure(data.data.procedure, input);
  }

  throw new Error('Backend did not return created procedure');
}

/** PUT /api/v1/procedures/:id — the backend validates with the same
 *  full create schema, so this ships a complete payload, not a patch. */
export async function updateProcedure(
  id: string,
  input: Partial<CreateProcedureInput>,
  cookieHeader?: string,
): Promise<Procedure> {
  const payload = buildProcedurePayload(input);
  const headers = makeHeaders(cookieHeader);

  const { data } = await http.put<{
    success: boolean;
    message: string;
    data: { procedure: Procedure };
  }>(LIBRARY_ENDPOINTS.UPDATE(id), payload, {
    headers: Object.keys(headers).length ? headers : undefined,
  });

  if (data.data?.procedure) {
    return normalizeWrittenProcedure(data.data.procedure, input);
  }

  throw new Error('Backend did not return updated procedure');
}

/** PATCH /api/v1/procedures/:id/station — replace the station allocation.
 *  Sends the array form (`stationIds`) the multi-station backend expects;
 *  `null` / empty clears the allocation (general = every station). The
 *  backend also still accepts a single `stationId` for older clients.
 *  Super_admin only. Returns the updated row. */
export async function updateProcedureStation(
  id: string,
  stationIdOrIds: string | string[] | null,
): Promise<Procedure> {
  const ids = Array.isArray(stationIdOrIds)
    ? stationIdOrIds
    : stationIdOrIds
      ? [stationIdOrIds]
      : null;

  const { data } = await http.patch<{
    success: boolean;
    message: string;
    data: { procedure: Procedure };
  }>(LIBRARY_ENDPOINTS.UPDATE_STATION(id), {
    stationIds: ids && ids.length > 0 ? ids : null,
  });

  if (data.data?.procedure) {
    return normalizeBackendProcedure(data.data.procedure);
  }

  throw new Error('Backend did not return updated procedure');
}

export const updateProcedureStations = updateProcedureStation;

/** POST /api/v1/procedures/:id/publish — one-click draft → published.
 *  409 when already published or archived. */
export async function publishProcedure(id: string): Promise<Procedure> {
  const { data } = await http.post<{
    success: boolean;
    message: string;
    data: { procedure: Procedure };
  }>(LIBRARY_ENDPOINTS.PUBLISH(id));

  if (data.data?.procedure) {
    return normalizeBackendProcedure(data.data.procedure);
  }

  throw new Error('Backend did not return published procedure');
}

/** POST /api/v1/procedures/:id/archive — soft delete (recoverable via
 *  unarchive). For permanent removal see `deleteProcedure` (DELETE). */
export async function archiveProcedure(id: string): Promise<Procedure> {
  const { data } = await http.post<{
    success: boolean;
    message: string;
    data: { procedure: Procedure };
  }>(LIBRARY_ENDPOINTS.ARCHIVE(id));

  if (data.data?.procedure) {
    return normalizeBackendProcedure(data.data.procedure);
  }

  throw new Error('Backend did not return archived procedure');
}

/** POST /api/v1/procedures/:id/unarchive — restores an archived procedure. */
export async function unarchiveProcedure(id: string): Promise<Procedure> {
  const { data } = await http.post<{
    success: boolean;
    message: string;
    data: { procedure: Procedure };
  }>(LIBRARY_ENDPOINTS.UNARCHIVE(id));

  if (data.data?.procedure) {
    return normalizeBackendProcedure(data.data.procedure);
  }

  throw new Error('Backend did not return unarchived procedure');
}

/** DELETE /api/v1/procedures/:id — permanent removal (super_admin).
 *  404 when the row doesn't exist. */
export async function deleteProcedure(id: string): Promise<{ ok: true }> {
  await http.delete(LIBRARY_ENDPOINTS.DELETE(id));
  return { ok: true };
}

/** Fields a partial update may carry. The backend PATCH (when it lands)
 *  validates only present fields — same rules as the full schema, applied
 *  per field. `isArchived` is NOT sent here: archiving stays on the
 *  dedicated archive/unarchive routes (zod strips unknown keys, so sending
 *  it via PATCH would silently no-op). */
export interface ProcedurePatchInput {
  titleEn?: string;
  titleEs?: string;
  purposeEn?: string;
  purposeEs?: string;
  subcategoryId?: string | null;
  stationId?: string | null;
  quizId?: string | null;
  procedureImage?: string | null;
  assignUsers?: string[];
  status?: Procedure['status'];
}

/** PATCH /api/v1/procedures/:id — partial update: only changed fields.
 *  Throws the backend's ApiException on real failures (400 validation,
 *  401/403 auth). A 404 with an empty/HTML body (`code 'UNKNOWN'`) or 405
 *  means the route doesn't exist yet — callers fall back while waiting. */
export async function patchProcedure(id: string, patch: ProcedurePatchInput): Promise<Procedure> {
  const { data } = await http.patch<{
    success: boolean;
    message: string;
    data: { procedure: Procedure };
  }>(LIBRARY_ENDPOINTS.UPDATE(id), patch);

  if (data.data?.procedure) {
    return normalizeBackendProcedure(data.data.procedure);
  }

  throw new Error('Backend did not return patched procedure');
}
