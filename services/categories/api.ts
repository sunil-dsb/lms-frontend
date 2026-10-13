/**
 * Categories data layer — live backend only (GET /api/v1/categories and
 * the per-category subcategories endpoints). There is no mock store on
 * this path: every read and write goes to the API.
 */

import type { Category } from '@/lib/types';
import http from '@/lib/http';
import { ApiException } from '@/lib/errors';
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from './types';

export async function createCategory(
  input: CreateCategoryInput
): Promise<Category> {
  const { data } = await http.post<{
    success: boolean;
    data: { category: { id: string; nameEn: string; nameEs: string; categoryType: string; categoryIcon: string } };
  }>(CATEGORIES_ENDPOINTS.LIST, {
    nameEn: input.nameEn,
    nameEs: input.nameEs,
    categoryType: input.kind === 'station-tied' ? 'station_based' : 'general',
    categoryIcon: input.icon || 'folder',
  });
  clearBackendCategoriesCache();
  const category = data.data.category;
  return {
    id: category.id,
    slug: backendSlug(category.nameEn),
    nameEn: category.nameEn,
    nameEs: category.nameEs,
    icon: category.categoryIcon,
    isArchived: false,
    kind: /station/i.test(category.categoryType) ? 'station-tied' : 'general',
    subcategories: [],
  };
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<Category> {
  // Live backend PATCH /api/v1/categories/:id. Only backend-known fields
  // travel: `isArchived` is routed to the dedicated archive/unarchive
  // endpoints (the backend PATCH has no such field), and `sortOrder` /
  // `subcategories` have no server equivalent and are dropped.
  if (input.isArchived === true) {
    return archiveBackendCategory(id);
  }
  if (input.isArchived === false) {
    return unarchiveBackendCategory(id);
  }
  const payload: Record<string, string> = {};
  if (input.nameEn !== undefined) payload.nameEn = input.nameEn;
  if (input.nameEs !== undefined) payload.nameEs = input.nameEs;
  if (input.kind !== undefined) {
    payload.categoryType = input.kind === 'station-tied' ? 'station_based' : 'general';
  }
  if (input.icon !== undefined) payload.categoryIcon = input.icon;
  if (Object.keys(payload).length === 0) {
    throw new ApiException(400, 'INVALID_INPUT', 'Nothing to update');
  }
  const { data } = await http.patch<{
    success: boolean;
    data: { category: BackendCategoryRow };
  }>(`${CATEGORIES_ENDPOINTS.LIST}/${id}`, payload);
  clearBackendCategoriesCache();
  return mapBackendCategory(data.data.category);
}

export async function archiveCategory(id: string): Promise<Category> {
  return archiveBackendCategory(id);
}

// ---------------------------------------------------------------------------
// Backend-backed reads (GET /api/v1/categories — any logged-in employee).
// The mock store above holds demo/seed rows only; real categories live in
// the backend since the pagination update. These mappers translate the
// backend shape (no slug, no embedded subcategories) to the frontend
// Category used by the explorer's filters and counts.
// ---------------------------------------------------------------------------

const CATEGORIES_ENDPOINTS = {
  LIST: '/api/v1/categories',
  SUBCATEGORIES_ALL: '/api/v1/categories/subcategories',
} as const;

/** Backend ("Recipes") and mock ("Recipe") names for the same shelf rarely
 *  share a slug. Two slugs match when equal or when one contains the other
 *  after normalization (`recipe`/`recipes`, `cleaning`/`cleaning-schedules`,
 *  `opening-closing`/`opening-and-closing`). Tight enough for a single-digit
 *  category domain; exact equality is checked first. */
export function categorySlugsMatch(a: string | undefined, b: string | undefined): boolean {
  const norm = (s: string): string => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const x = norm(a ?? '');
  const y = norm(b ?? '');
  if (!x || !y) return false;
  if (x === y) return true;
  return x.includes(y) || y.includes(x);
}

/** Backend categories carry no slug — derive it the same way the mock
 *  creator does so backend and mock rows share one stable handle space. */
export function backendSlug(nameEn: string): string {
  return (nameEn || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function makeBackendHeaders(cookieHeader?: string): Record<string, string> {
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

export interface BackendCategoryOptions {
  search?: string;
  page?: number;
  /** Backend defaults to 10 — pass explicitly so the list never truncates. */
  limit?: number;
  /** Backend `?status=` filter. Omitted = all statuses. */
  status?: 'active' | 'archived' | 'all';
}

interface BackendCategoryRow {
  id: string;
  nameEn: string;
  nameEs: string;
  categoryType: string;
  categoryIcon: string;
  status?: 'active' | 'archived';
  proceduresCount?: number;
}

/** Backend row → frontend Category (single mapping point for every
 *  categories read: list, single, create, update, archive). */
function mapBackendCategory(c: BackendCategoryRow): Category {
  const status = c.status ?? 'active';
  return {
    id: c.id,
    slug: backendSlug(c.nameEn),
    nameEn: c.nameEn,
    nameEs: c.nameEs,
    icon: c.categoryIcon || undefined,
    isArchived: status === 'archived',
    status,
    proceduresCount: c.proceduresCount ?? 0,
    kind: /station/i.test(c.categoryType || '') ? 'station-tied' : 'general',
    subcategories: [],
  };
}

const inFlightBackendCategories = new Map<string, Promise<Category[]>>();
const cachedBackendCategories = new Map<string, { data: Category[]; expiresAt: number }>();
const BACKEND_CATEGORIES_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour in-memory cache

export function clearBackendCategoriesCache(): void {
  inFlightBackendCategories.clear();
  cachedBackendCategories.clear();
}

export function clearBackendSubcategoriesCache(categoryId?: string): void {
  for (const key of cachedBackendSubcategories.keys()) {
    if (!categoryId || key.endsWith(`::${categoryId}`)) cachedBackendSubcategories.delete(key);
  }
  for (const key of inFlightBackendSubcategories.keys()) {
    if (!categoryId || key.endsWith(`::${categoryId}`)) inFlightBackendSubcategories.delete(key);
  }
}

export async function fetchBackendCategories(
  options: BackendCategoryOptions = {},
  cookieHeader?: string,
): Promise<Category[]> {
  // The server-rendered categories page is refreshed after a create. A
  // process-wide server cache would keep showing the old list because the
  // browser-side POST cannot clear that server memory. Keep the cache only
  // in the browser, where mutations can invalidate it locally.
  const useLocalCache = typeof window !== 'undefined';
  const cacheKey = `${cookieHeader || 'client'}::${options.search || ''}::${options.page || 1}::${options.limit || 100}`;
  const now = Date.now();

  const cached = cachedBackendCategories.get(cacheKey);
  if (useLocalCache && cached && cached.expiresAt > now) {
    return cached.data;
  }

  const inFlight = inFlightBackendCategories.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const promise = (async () => {
    try {
      const headers = makeBackendHeaders(cookieHeader);
      const { default: http } = await import('@/lib/http');
      const { data } = await http.get<{
        success: boolean;
        data: {
          categories: BackendCategoryRow[];
          meta?: { total: number };
        };
      }>(CATEGORIES_ENDPOINTS.LIST, {
        headers: Object.keys(headers).length ? headers : undefined,
        params: {
          search: options.search || undefined,
          page: options.page ?? 1,
          limit: options.limit ?? 100,
          status: options.status || undefined,
        },
      });

      const rawList = Array.isArray(data.data?.categories) ? data.data.categories : [];
      const res = rawList.map(mapBackendCategory);

      if (useLocalCache) {
        cachedBackendCategories.set(cacheKey, { data: res, expiresAt: Date.now() + BACKEND_CATEGORIES_CACHE_TTL_MS });
      }
      return res;
    } finally {
      inFlightBackendCategories.delete(cacheKey);
    }
  })();

  inFlightBackendCategories.set(cacheKey, promise);
  return promise;
}

/** Single category with its live `proceduresCount`.
 *  GET /api/v1/categories/:id (any logged-in employee, UUID id). */
export async function fetchBackendCategory(
  id: string,
  cookieHeader?: string,
): Promise<Category> {
  const headers = makeBackendHeaders(cookieHeader);
  const { data } = await http.get<{
    success: boolean;
    data: { category: BackendCategoryRow };
  }>(`${CATEGORIES_ENDPOINTS.LIST}/${id}`, {
    headers: Object.keys(headers).length ? headers : undefined,
  });
  return mapBackendCategory(data.data.category);
}

/** POST /api/v1/categories/:id/archive (super_admin).
 *  404 CATEGORY_NOT_FOUND when missing, 409 ALREADY_ARCHIVED when already. */
export async function archiveBackendCategory(id: string): Promise<Category> {
  const { data } = await http.post<{
    success: boolean;
    data: { category: BackendCategoryRow };
  }>(`${CATEGORIES_ENDPOINTS.LIST}/${id}/archive`);
  clearBackendCategoriesCache();
  return mapBackendCategory(data.data.category);
}

/** POST /api/v1/categories/:id/unarchive (super_admin).
 *  404 CATEGORY_NOT_FOUND when missing, 409 NOT_ARCHIVED when not archived. */
export async function unarchiveBackendCategory(id: string): Promise<Category> {
  const { data } = await http.post<{
    success: boolean;
    data: { category: BackendCategoryRow };
  }>(`${CATEGORIES_ENDPOINTS.LIST}/${id}/unarchive`);
  clearBackendCategoriesCache();
  return mapBackendCategory(data.data.category);
}

export interface LiveSubcategory {
  id: string;
  categoryId: string;
  nameEn: string;
  nameEs: string;
  subcategoryIcon: string;
}

const inFlightBackendSubcategories = new Map<string, Promise<LiveSubcategory[]>>();
const cachedBackendSubcategories = new Map<
  string,
  { data: LiveSubcategory[]; expiresAt: number }
>();
const BACKEND_SUBCATEGORIES_CACHE_TTL_MS = 60 * 60 * 1000;

/** Live subcategories of one backend category.
 *  GET /api/v1/categories/:categoryId/subcategories (any logged-in employee). */
export async function fetchBackendSubcategories(
  categoryId: string,
  cookieHeader?: string,
): Promise<LiveSubcategory[]> {
  const cacheKey = `${cookieHeader || 'client'}::${categoryId}`;
  const cached = cachedBackendSubcategories.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const inFlight = inFlightBackendSubcategories.get(cacheKey);
  if (inFlight) return inFlight;

  const request = (async () => {
    try {
      const headers = makeBackendHeaders(cookieHeader);
      const { default: http } = await import('@/lib/http');
      const { data } = await http.get<{
        success: boolean;
        data: { subcategories: LiveSubcategory[]; meta?: { total: number } };
      }>(`/api/v1/categories/${categoryId}/subcategories`, {
        headers: Object.keys(headers).length ? headers : undefined,
        // Backend paginates (default 10) — a category's full shelf fits one page.
        params: { page: 1, limit: 200 },
      });
      const list = Array.isArray(data.data?.subcategories) ? data.data.subcategories : [];
      const mapped: LiveSubcategory[] = list.map((s) => ({
        id: s.id,
        categoryId: s.categoryId,
        nameEn: s.nameEn,
        nameEs: s.nameEs,
        subcategoryIcon: s.subcategoryIcon || '',
      }));
      cachedBackendSubcategories.set(cacheKey, {
        data: mapped,
        expiresAt: Date.now() + BACKEND_SUBCATEGORIES_CACHE_TTL_MS,
      });
      return mapped;
    } finally {
      inFlightBackendSubcategories.delete(cacheKey);
    }
  })();

  inFlightBackendSubcategories.set(cacheKey, request);
  return request;
}

export interface AllSubcategoriesOptions {
  categoryId?: string;
  search?: string;
  page?: number;
  /** Backend defaults to 10 — pass explicitly; "all" means one bounded page. */
  limit?: number;
}

/** Every subcategory in one call — GET /api/v1/categories/subcategories
 *  (any logged-in employee). This is the single-call replacement for the
 *  old per-category fan-out: callers group by `categoryId` client-side.
 *  Prefer it over `fetchBackendSubcategories` whenever more than one
 *  category's subs are needed. */
export async function fetchAllSubcategories(
  options: AllSubcategoriesOptions = {},
  cookieHeader?: string,
): Promise<LiveSubcategory[]> {
  const headers = makeBackendHeaders(cookieHeader);
  const { default: http } = await import('@/lib/http');
  const { data } = await http.get<{
    success: boolean;
    data: {
      subcategories: Array<{
        id: string;
        categoryId: string;
        nameEn: string;
        nameEs: string;
        subcategoryIcon: string;
      }>;
      meta?: { total: number };
    };
  }>(CATEGORIES_ENDPOINTS.SUBCATEGORIES_ALL, {
    headers: Object.keys(headers).length ? headers : undefined,
    params: {
      categoryId: options.categoryId || undefined,
      search: options.search || undefined,
      page: options.page ?? 1,
      limit: options.limit ?? 200,
    },
  });
  const list = Array.isArray(data.data?.subcategories) ? data.data.subcategories : [];
  return list.map((s) => ({
    id: s.id,
    categoryId: s.categoryId,
    nameEn: s.nameEn,
    nameEs: s.nameEs,
    subcategoryIcon: s.subcategoryIcon || '',
  }));
}

export async function createBackendSubcategory(
  categoryId: string,
  input: { nameEn: string; nameEs: string; subcategoryIcon: string },
): Promise<LiveSubcategory> {
  const { data } = await http.post<{
    success: boolean;
    data: { subcategory: LiveSubcategory };
  }>(`/api/v1/categories/${categoryId}/subcategories`, input);
  clearBackendSubcategoriesCache(categoryId);
  return data.data.subcategory;
}

/** Resolve a wizard-picked subcategory to a live backend UUID.
 *
 *  The picker's catalog is the local mock store, so the picked id is
 *  usually a mock handle (`sub-cooking`), not a UUID. Match order per
 *  side: exact id, then slug, then English name. Returns the live UUID,
 *  or `null` when nothing on the server matches — callers must NOT send
 *  the stale pick (the backend answers SUBCATEGORY_NOT_FOUND). */
export async function resolveLiveSubcategoryId(input: {
  categoryId?: string | null;
  categorySlug?: string | null;
  categoryNameEn?: string | null;
  subcategoryId?: string | null;
  subcategorySlug?: string | null;
  subcategoryNameEn?: string | null;
}): Promise<string | null> {
  try {
    const cats = await fetchBackendCategories();
    const normName = (s: string | null | undefined): string => (s || '').trim().toLowerCase();
    const cat =
      cats.find((c) => input.categoryId != null && c.id === input.categoryId) ??
      cats.find(
        (c) =>
          input.categorySlug != null && categorySlugsMatch(c.slug, input.categorySlug),
      ) ??
      cats.find(
        (c) =>
          input.categoryNameEn != null &&
          normName(c.nameEn) === normName(input.categoryNameEn),
      );
    if (!cat) return null;
    const subs = await fetchBackendSubcategories(cat.id);
    const sub =
      subs.find((s) => input.subcategoryId != null && s.id === input.subcategoryId) ??
      subs.find(
        (s) =>
          input.subcategorySlug != null &&
          categorySlugsMatch(backendSlug(s.nameEn), input.subcategorySlug),
      ) ??
      subs.find(
        (s) =>
          input.subcategoryNameEn != null &&
          normName(s.nameEn) === normName(input.subcategoryNameEn),
      );
    return sub?.id ?? null;
  } catch {
    return null;
  }
}
