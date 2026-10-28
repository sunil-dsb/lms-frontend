import type {
  ActiveSeason,
  AdminEmployee,
  ApiError,
  Category,
  ClearanceLevel,
  CreateProcedureInput,
  Employee,
  Procedure,
  ProcedureQuizMode,
  Subcategory,
} from "../types";
import { http } from "../http";
import { ApiException } from "../errors";
import { SEED_QUIZZES, type Quiz } from "../quizzes";
import { getStored, setStored } from "../api-storage";
import { fetchMe } from "./account";

let mockProcedures: Procedure[] = getStored("procedures_v2", []);
// Centralised quizzes table. The wizard authors quizzes locally in form
// state and on save calls `createQuiz()` to materialise a row here and
// stamp its id onto the procedure. Stage 3 (course creation) writes to
// the same store — that is the whole point of having one table.
let mockQuizzes: Quiz[] = getStored("quizzes", SEED_QUIZZES);

function getProceduresStore(): Procedure[] {
  if (typeof window !== "undefined") {
    mockProcedures = getStored("procedures_v2", []);
  }
  return mockProcedures;
}
export function getQuizzesStore(): Quiz[] {
  if (typeof window !== "undefined")
    mockQuizzes = getStored("quizzes", SEED_QUIZZES);
  return mockQuizzes;
}

// ----------------------------------------------------------------------------
// Typed endpoints (Zero Backend Demo Mode)
// ----------------------------------------------------------------------------

function uniqueSlug(title: string, exceptId?: string): string {
  const base =
    title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `procedure-${Date.now()}`;
  const taken = new Set(
    getProceduresStore()
      .filter((p) => p.id !== exceptId)
      .map((p) => p.slug),
  );
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

export async function createProcedure(
  input: CreateProcedureInput,
): Promise<{ procedure: Procedure }> {
  // Always live data — no mock fallback. The backend validates the full
  // payload; failures propagate so the editor shows them.
  const { createProcedure: apiCreate } = await import("@/services/library/api");
  const proc = await apiCreate(input);
  if (!proc) {
    throw new Error("Backend did not return created procedure");
  }
  mockProcedures = [
    proc,
    ...getProceduresStore().filter(
      (p) => p.id !== proc.id && p.slug !== proc.slug,
    ),
  ];
  setStored("procedures_v2", mockProcedures);
  clearLibraryListCache();
  return { procedure: proc };
}

export type UpdateProcedureInput = Partial<
  Omit<CreateProcedureInput, "titleEn">
> & {
  titleEn?: string;
};

export async function updateProcedure(
  id: string,
  patch: UpdateProcedureInput,
): Promise<{ procedure: Procedure }> {
  // Always live data — PUT /:id with the whole body (the route validates
  // against the full create schema — partial bodies 400). Failures
  // propagate so the editor shows them instead of pretending the save
  // landed; no local-store fallback.
  const { updateProcedure: apiUpdate } = await import("@/services/library/api");
  const proc = await apiUpdate(id, patch);
  if (!proc) {
    throw new Error("Backend did not return updated procedure");
  }
  mockProcedures = [
    proc,
    ...getProceduresStore().filter(
      (p) => p.id !== proc.id && p.slug !== proc.slug,
    ),
  ];
  setStored("procedures_v2", mockProcedures);
  clearLibraryListCache();
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("lms_procedures_updated"));
  return { procedure: proc };
}

export interface AccessLogEntry {
  procedureId: string;
  employeeId: string;
  employeeName: string;
  at: string;
  device: string;
}

/** Every open of a confidential or master recipe, admins included
 *  (PROJECT_OVERVIEW §04: "opening one is recorded in the same way as for any
 *  other user"). Called by the reading page once it is on screen, since the
 *  page itself is often rendered on the server. Mock: kept in the browser,
 *  newest first, capped. */
export function logRestrictedView(p: Procedure, viewer: Employee): void {
  if (typeof window === "undefined") return;
  const log = getStored<AccessLogEntry[]>("access_log", []);
  const entry: AccessLogEntry = {
    procedureId: p.id,
    employeeId: viewer.id,
    employeeName: viewer.name,
    at: new Date().toISOString(),
    device: navigator.userAgent,
  };
  setStored("access_log", [entry, ...log].slice(0, 500));
}

export async function listAccessLog(): Promise<{ entries: AccessLogEntry[] }> {
  return { entries: getStored<AccessLogEntry[]>("access_log", []) };
}

const CLEARANCE_RANK: Record<ClearanceLevel, number> = {
  general: 0,
  station: 1,
  confidential: 2,
  master: 3,
};

/**
 * Can this person open this procedure? The backend enforces the same rule in
 * the database (PROJECT_OVERVIEW §04: "a mistake in the interface cannot
 * expose the wrong data"); the mock enforces it where the backend would, in
 * the list and in the single lookup, so no screen has to remember to.
 *
 * Admins and managers read everything. Anyone else reads what is published,
 * not archived, meant for them (everyone, or one of the stations, roles or
 * people named), and within their clearance: a confidential recipe needs
 * confidential clearance, a master recipe needs master.
 */
export function canRead(p: Procedure, viewer: Employee): boolean {
  if (
    viewer.role === "admin" ||
    viewer.role === "super_admin" ||
    viewer.role === "manager" ||
    viewer.accessLevel === "manager"
  )
    return true;
  if (p.status !== "published" || p.isArchived) return false;
  const a = p.audience;
  if (a && a.mode === "some") {
    const meant =
      a.employeeIds.includes(viewer.id) ||
      a.stationIds.some((id) => viewer.stationIds.includes(id)) ||
      a.roleIds.some((id) => viewer.roleIds.includes(id));
    if (!meant) return false;
  }
  const needs: ClearanceLevel =
    p.protection === "master"
      ? "master"
      : p.protection === "confidential"
        ? "confidential"
        : "general";
  return (
    CLEARANCE_RANK[viewer.roleClearance ?? "general"] >= CLEARANCE_RANK[needs]
  );
}

// ----------------------------------------------------------------------------
// Server-side list cache (procedures & categories)
// ----------------------------------------------------------------------------
// Every server page (library, procedures browse, edit wizard, …) re-calls
// listProcedures on each request, so even a second look pays
// the full API round-trip. Server calls (the ones that carry a cookieHeader)
// are cached per session for a short TTL and concurrent loads are deduped —
// the same pattern fetchMe uses. Client calls (no cookieHeader) pass straight
// through: TanStack Query already caches there, and caching would also break
// the storage-event cross-tab freshness. Every mutation below clears the map —
// an edit must be visible to every session on the next request.

const LIST_CACHE_TTL_MS = 30_000;

const proceduresListCache = new Map<
  string,
  { data: Procedure[]; expiresAt: number }
>();
const proceduresListInFlight = new Map<string, Promise<Procedure[]>>();

/** Drop every cached/in-flight list read. Called by each mutation so a saved
 *  change shows up on the very next request, not up to the TTL later. */
export function clearLibraryListCache(): void {
  proceduresListCache.clear();
  proceduresListInFlight.clear();
}

export async function listProcedures(
  filter: { status?: Procedure["status"] } = {},
  cookieHeader?: string,
): Promise<{ procedures: Procedure[] }> {
  // Client-side or cookieless: no shared cache.
  if (!cookieHeader)
    return { procedures: await loadProceduresList(filter, cookieHeader) };

  const cacheKey = `${cookieHeader}::${filter.status ?? "*"}`;
  const cached = proceduresListCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now())
    return { procedures: cached.data };

  const inFlight = proceduresListInFlight.get(cacheKey);
  if (inFlight) return { procedures: await inFlight };

  const promise = loadProceduresList(filter, cookieHeader)
    .then((procedures) => {
      proceduresListCache.set(cacheKey, {
        data: procedures,
        expiresAt: Date.now() + LIST_CACHE_TTL_MS,
      });
      return procedures;
    })
    .finally(() => proceduresListInFlight.delete(cacheKey));
  proceduresListInFlight.set(cacheKey, promise);
  return { procedures: await promise };
}

async function loadProceduresList(
  filter: { status?: Procedure["status"] },
  cookieHeader?: string,
): Promise<Procedure[]> {
  // Always live data — no mock fallback and no demo-row merge. The rows
  // and the viewer resolve together: canRead filtering is local, so
  // awaiting fetchMe after fetchProcedures wastes a full backend
  // round-trip on every procedure list.
  const { fetchProcedures } = await import("@/services/library/api");
  const [apiRes, { employee: viewer }] = await Promise.all([
    fetchProcedures({ status: filter.status }, false, cookieHeader),
    fetchMe(cookieHeader),
  ]);
  const dbProcs = apiRes.procedures || [];

  if (typeof window !== "undefined") {
    // Persist what the API handed us so detail pages can paint instantly
    // via getCachedProcedure (and a fresh tab keeps it). Server truth
    // wins: rows the API didn't return are dropped from the mirror.
    mockProcedures = [...dbProcs];
    setStored("procedures_v2", mockProcedures);
  }
  const visible = dbProcs.filter((p) => canRead(p, viewer));
  const filtered = filter.status
    ? visible.filter((p) => p.status === filter.status)
    : visible;
  return filtered;
}

/** One procedure by id, for the editor. Always live — no mock fallback. */
export async function getProcedureById(
  id: string,
): Promise<{ procedure: Procedure }> {
  const { fetchProcedureById } = await import("@/services/library/api");
  const apiProc = await fetchProcedureById(id);
  if (!apiProc) throw new ApiException(404, "NOT_FOUND", "Procedure not found");
  return { procedure: apiProc };
}

/** Publishing rule (multi-station): a procedure may go live only when it
 *  knows where it works — at least one station in `stationIds`. General
 *  procedures carry EVERY station id (the wizard allocates them at save),
 *  so they pass naturally; an unplaced row (empty / null) stays a draft
 *  until someone places it. Legacy single-station shapes (stationScope /
 *  stationId) still resolve for rows created before the array landed. */
export function canPublishProcedure(p: Procedure): boolean {
  const ids = (p as { stationIds?: string[] | null }).stationIds;
  if (Array.isArray(ids)) return ids.length > 0;
  if (!p.category && !p.subcategoryId) return true;
  const scope = p.stationScope;
  if (scope && scope.mode === "specific") return scope.stationIds.length > 0;
  const stationId = (p as { stationId?: string | null }).stationId;
  return Boolean(stationId);
}

/** Move a procedure through its states: draft -> published -> archived, and
 *  back. Publishing bumps the version, which the printed QR code points at.
 *
 *  Backend-backed rows go through the dedicated routes (POST /:id/publish,
 *  /:id/archive, /:id/unarchive); failures propagate so the UI can show
 *  them. Demo-only rows (non-UUID, never existed server-side) flip in the
 *  local mirror instead. */
export async function setProcedureState(
  id: string,
  change: { status?: Procedure["status"]; isArchived?: boolean },
  context?: { row?: Procedure },
): Promise<Procedure> {
  if (change.status === "published") {
    // Gate on the row the caller just showed the user when it has one: list
    // and detail screens hold freshly fetched data, while the mirrored store
    // copy can lag behind — a stale mirror would block publishes the UI just
    // verified, or wave unplaced rows through. The store stays as the
    // fallback for callers with no row in hand (demo/mock ids).
    const existing =
      context?.row ??
      getProceduresStore().find((p) => p.id === id || p.slug === id);
    if (existing && !canPublishProcedure(existing)) {
      throw new ApiException(
        400,
        "PUBLISH_BLOCKED",
        "Only procedures with stations, or General procedures, can be published",
      );
    }
  }

  const { isUuid } = await import("@/services/library/api");
  if (!isUuid(id)) {
    // Demo-only row (never existed server-side): flip it in the local
    // mirror. Backend-backed rows always go through the API below.
    const now = new Date().toISOString();
    mockProcedures = getProceduresStore().map((p) =>
      p.id === id
        ? {
            ...p,
            ...change,
            updatedAt: now,
            version:
              change.status === "published" && p.status !== "published"
                ? (p.version ?? 0) + 1
                : p.version,
          }
        : p,
    );
    setStored("procedures_v2", mockProcedures);
    if (typeof window !== "undefined")
      window.dispatchEvent(new Event("lms_procedures_updated"));
    clearLibraryListCache();
    const updated = mockProcedures.find((p) => p.id === id);
    if (!updated)
      throw new ApiException(404, "NOT_FOUND", "Procedure not found");
    return updated;
  }

  // Backend-backed row: dedicated routes, failures propagate (no silent
  // local flip — a failed archive must never render as archived).
  const { archiveProcedure, unarchiveProcedure, publishProcedure } =
    await import("@/services/library/api");
  let updated: Procedure;
  if (change.isArchived !== undefined) {
    updated = change.isArchived
      ? await archiveProcedure(id)
      : await unarchiveProcedure(id);
  } else if (change.status === "published") {
    updated = await publishProcedure(id);
  } else {
    throw new ApiException(400, "INVALID_INPUT", "Nothing to update");
  }
  mockProcedures = getProceduresStore().map((p) =>
    p.id === id || p.slug === id ? { ...updated, id: p.id } : p,
  );
  setStored("procedures_v2", mockProcedures);
  clearLibraryListCache();
  return { ...updated, id };
}

export async function deleteProcedure(id: string): Promise<{ ok: true }> {
  // Live backend first: DELETE /api/v1/procedures/:id (super_admin,
  // permanent). A backend 404 means the row is already gone server-side,
  // so the local mirror is still dropped to converge with that truth.
  // Rows that live only on this device (non-UUID demo ids the backend
  // will never know) are removed locally instead.
  const { isUuid, deleteProcedure: apiDelete } =
    await import("@/services/library/api");
  if (isUuid(id)) {
    try {
      await apiDelete(id);
    } catch (err) {
      if (!(err instanceof ApiException) || err.status !== 404) throw err;
    }
  }
  const procs = getProceduresStore();
  mockProcedures = procs.filter((p) => p.id !== id && p.slug !== id);
  setStored("procedures_v2", mockProcedures);
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("lms_procedures_updated"));
  clearLibraryListCache();
  return { ok: true };
}

// ----------------------------------------------------------------------------
// Library — quizzes (centralised table)
// ----------------------------------------------------------------------------

function normalizeQuiz(raw: any): Quiz {
  const rawQuestions = Array.isArray(raw?.questions) ? raw.questions : [];
  const questions = rawQuestions.map((q: any) => {
    const promptText = q.prompt ?? q.question ?? { en: "", es: "" };
    return {
      id: q.id || `q-${Math.random().toString(36).slice(2, 7)}`,
      prompt: promptText,
      question: promptText,
      choices: (q.choices ?? []).map((c: any) => ({
        id: c.id,
        label: c.label ?? { en: "", es: "" },
      })),
      correctChoiceId: q.correctChoiceId ?? "",
    };
  });

  return {
    id: raw.id || raw._id || `quiz-${Date.now()}`,
    nameEn: raw.nameEn || "",
    nameEs: raw.nameEs || "",
    quizType: raw.quizType || "procedure",
    questions,
    attached: raw.attached ?? true,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

/** Look up every quiz in the centralised store / backend API.
 *  Uses GET /api/v1/quizzes and keeps local cache in sync. */
export async function listQuizzes(): Promise<{ quizzes: Quiz[] }> {
  try {
    const res = await http.get<any>("/api/v1/quizzes");
    const raw = res.data?.data ?? res.data;
    const items = Array.isArray(raw) ? raw : (raw?.quizzes ?? []);
    if (Array.isArray(items) && items.length > 0) {
      const normalized = items.map(normalizeQuiz);
      normalized.forEach((q) => {
        const store = getQuizzesStore();
        const existingIdx = store.findIndex((s) => s.id === q.id);
        if (existingIdx !== -1) {
          store[existingIdx] = q;
        } else {
          store.unshift(q);
        }
        setStored("quizzes", store);
      });
      return { quizzes: normalized };
    }
  } catch (err) {
    console.warn("listQuizzes API call failed, using store fallback:", err);
  }
  return { quizzes: [...getQuizzesStore()] };
}

const quizCache = new Map<string, Quiz>();
const quizInFlight = new Map<string, Promise<Quiz | null>>();

export function invalidateQuizCache(id?: string): void {
  if (id) quizCache.delete(id);
  else quizCache.clear();
}

/** Fetch a single quiz from GET /api/v1/quizzes/:id and cache it locally. */
export async function fetchQuizById(id: string): Promise<Quiz | null> {
  if (!id) return null;
  if (quizCache.has(id)) {
    return quizCache.get(id)!;
  }
  if (quizInFlight.has(id)) {
    return quizInFlight.get(id)!;
  }

  const promise = (async () => {
    try {
      const res = await http.get<any>(`/api/v1/quizzes/${id}`);
      const raw = res.data?.data?.quiz ?? res.data?.data ?? res.data;
      if (raw && (raw.id || raw.questions)) {
        const q = normalizeQuiz(raw);
        const store = getQuizzesStore();
        const idx = store.findIndex((s) => s.id === q.id);
        if (idx !== -1) {
          store[idx] = q;
        } else {
          store.unshift(q);
        }
        setStored("quizzes", store);
        quizCache.set(id, q);
        if (q.id) quizCache.set(q.id, q);
        return q;
      }
    } catch (err) {
      console.warn(
        `fetchQuizById(${id}) API call failed, using cached fallback:`,
        err,
      );
    } finally {
      quizInFlight.delete(id);
    }
    const fallback = getQuizById(id);
    if (fallback) quizCache.set(id, fallback);
    return fallback;
  })();

  quizInFlight.set(id, promise);
  return promise;
}

/** Sync lookup for a single quiz by id from the cached store. */
export function getQuizById(id: string | null): Quiz | null {
  if (!id) return null;
  const store = getQuizzesStore();
  const found = store.find((q) => q.id === id);
  if (found) return found;
  return SEED_QUIZZES.find((q) => q.id === id) ?? null;
}

/** Backend question ids are UUIDs; the editor stamps new rows with `q-…` /
 *  `id-…` handles. Only UUIDs travel as `id` — anything else omits it so
 *  the backend generates one (PUT semantics: id present = edit in place,
 *  absent = add new, missing existing = delete). */
function isUuidLike(v: string | undefined): boolean {
  return Boolean(
    v &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      v,
    ),
  );
}

/** A question the manager actually wrote — prompt or any choice has text.
 *  Blank seeded rows never travel to the backend. */
export function isQuizQuestionAuthored(q: Quiz["questions"][number]): boolean {
  return Boolean(
    q.prompt?.en?.trim() ||
    q.prompt?.es?.trim() ||
    (q as { question?: { en?: string; es?: string } }).question?.en?.trim() ||
    (q as { question?: { en?: string; es?: string } }).question?.es?.trim() ||
    q.choices?.some((c) => c.label?.en?.trim() || c.label?.es?.trim()),
  );
}

/** Editor questions → backend payload. New rows drop their client `id`;
 *  existing UUID rows keep it; blank rows are dropped. */
function mapQuestionsForBackend(
  questions: Quiz["questions"],
): Record<string, any>[] {
  return questions.filter(isQuizQuestionAuthored).map((q) => ({
    ...(isUuidLike(q.id) ? { id: q.id } : {}),
    question: q.question ?? q.prompt,
    choices: (q.choices ?? []).map((c) => ({
      ...(c.id ? { id: c.id } : {}),
      label: c.label ?? { en: "", es: "" },
    })),
    correctChoiceId: q.correctChoiceId,
  }));
}

/** Create a quiz via POST /api/v1/quizzes.
 *  Payload matches: { nameEn, nameEs, quizType, questions: [...] } */
export async function createQuiz(input: {
  nameEn?: string;
  nameEs?: string;
  quizType?: string;
  questions: Quiz["questions"];
  attached?: boolean;
}): Promise<{ quiz: Quiz }> {
  const payload = {
    nameEn: input.nameEn || "Procedure Quiz",
    nameEs: input.nameEs || "Cuestionario de Procedimiento",
    quizType: input.quizType || "procedure",
    questions: mapQuestionsForBackend(input.questions),
  };

  try {
    const res = await http.post<any>("/api/v1/quizzes", payload);
    const raw = res.data?.data?.quiz ?? res.data?.data ?? res.data;
    if (raw && (raw.id || raw.questions)) {
      const created = normalizeQuiz({
        ...raw,
        attached: input.attached ?? true,
      });
      const store = getQuizzesStore();
      store.unshift(created);
      setStored("quizzes", store);
      return { quiz: created };
    }
  } catch (err) {
    console.warn("createQuiz API call failed, saving to local store:", err);
  }

  const now = new Date().toISOString();
  const fallbackQuiz: Quiz = {
    id: `quiz-${Date.now()}`,
    nameEn: payload.nameEn,
    nameEs: payload.nameEs,
    quizType: payload.quizType,
    questions: input.questions,
    attached: input.attached ?? true,
    createdAt: now,
    updatedAt: now,
  };
  mockQuizzes = [fallbackQuiz, ...getQuizzesStore()];
  setStored("quizzes", mockQuizzes);
  return { quiz: fallbackQuiz };
}

/** Update a quiz via PUT /api/v1/quizzes/:id (single-payload edit).
 *  Question `id` present (UUID) = edit in place; absent = add new (backend
 *  generates a UUID); an existing question omitted from the array = delete.
 *  Falls back to the local store when the API is unreachable. */
export async function updateQuiz(
  id: string,
  patch: Partial<Pick<Quiz, "attached" | "questions" | "nameEn" | "nameEs">> & {
    quizType?: string;
    procedureId?: string;
  },
): Promise<{ quiz: Quiz }> {
  try {
    const putPayload: Record<string, any> = {
      quizType: patch.quizType || "procedure",
    };
    if (patch.nameEn) putPayload.nameEn = patch.nameEn;
    if (patch.nameEs) putPayload.nameEs = patch.nameEs;
    if (patch.procedureId && isUuidLike(patch.procedureId)) {
      putPayload.procedureId = patch.procedureId;
    }
    if (patch.questions) {
      putPayload.questions = mapQuestionsForBackend(patch.questions);
    }
    const res = await http.patch<any>(`/api/v1/quizzes/${id}`, putPayload);
    const raw = res.data?.data?.quiz ?? res.data?.data ?? res.data;
    if (raw && (raw.id || raw.questions)) {
      const updated = normalizeQuiz({
        ...raw,
        attached: patch.attached ?? true,
      });
      const store = getQuizzesStore();
      const idx = store.findIndex((s) => s.id === id);
      if (idx !== -1) store[idx] = updated;
      else store.unshift(updated);
      setStored("quizzes", store);
      return { quiz: updated };
    }
  } catch (err) {
    console.warn(
      `updateQuiz(${id}) API call failed, updating local store:`,
      err,
    );
  }

  const store = getQuizzesStore();
  const idx = store.findIndex((q) => q.id === id);
  if (idx === -1) {
    throw new ApiException(404, "NOT_FOUND", `Quiz ${id} not found`);
  }
  const updated: Quiz = {
    ...store[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  const next = [...store];
  next[idx] = updated;
  mockQuizzes = next;
  setStored("quizzes", mockQuizzes);
  return { quiz: updated };
}

/** Delete a quiz via DELETE /api/v1/quizzes/:id and evict it locally.
 *  The backend nulls `quizId` on procedures referencing it. A 404 (already
 *  gone) still counts as success; demo/local ids skip the network call. */
export async function deleteQuiz(id: string): Promise<{ ok: true }> {
  if (isUuidLike(id)) {
    try {
      await http.delete(`/api/v1/quizzes/${id}`);
    } catch (err) {
      // Already deleted server-side — local eviction below still applies.
      if (!(err instanceof ApiException) || err.status !== 404) throw err;
    }
  }
  const store = getQuizzesStore().filter((q) => q.id !== id);
  mockQuizzes = store;
  setStored("quizzes", store);
  return { ok: true };
}

export async function getProcedureBySlug(
  slug: string,
  cookieHeader?: string,
): Promise<{ procedure: Procedure }> {
  // Always live data — no mock fallback. A miss is a real 404.
  const { fetchProcedureById } = await import("@/services/library/api");
  const apiProc = await fetchProcedureById(slug, false, cookieHeader);
  if (!apiProc) {
    throw new ApiException(
      404,
      "PROCEDURE_NOT_FOUND",
      `Procedure ${slug} not found`,
    );
  }
  const { employee: viewer } = await fetchMe(cookieHeader);
  // Not cleared reads exactly as not there: the cook is not told it exists.
  if (!canRead(apiProc, viewer)) {
    throw new ApiException(
      404,
      "PROCEDURE_NOT_FOUND",
      `Procedure ${slug} not found`,
    );
  }
  return { procedure: apiProc };
}

/** The procedure as cached on this device (the procedures list keeps
 *  every fetched procedure in localStorage), matched by slug or id.
 *  Returns null when absent — callers must still apply `canRead` and
 *  refresh from the API; this is a first paint, not the source of
 *  truth. */
export function getCachedProcedure(slugOrId: string): Procedure | null {
  const norm = slugOrId.toLowerCase();
  return (
    getProceduresStore().find(
      (p) => p.slug.toLowerCase() === norm || p.id.toLowerCase() === norm,
    ) ?? null
  );
}

// ----------------------------------------------------------------------------
// Library — categories: live backend only.
// Reads go through `services/categories/api.ts → fetchBackendCategories`
// (GET /api/v1/categories) and writes through the category hooks
// (create → POST /, rename → PATCH /:id, archive → POST /:id/archive,
// unarchive → POST /:id/unarchive). No mock store on this path.
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Uploads & AI Import (Mock Presigned Uploads)
// ----------------------------------------------------------------------------
