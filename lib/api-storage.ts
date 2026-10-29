export function getStored<T>(key: string, seed: T): T {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(`lms_demo_${key}`);
    return raw ? (JSON.parse(raw) as T) : seed;
  } catch {
    return seed;
  }
}

/** Slugs of categories that should be `kind: 'general'` — they apply at
 *  every station and never ask the manager to pick one. Used by the local-
 *  Storage migration (and any future fixtures) to backfill `kind` on
 *  pre-existing records that predate the field. */
export function setStored<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`lms_demo_${key}`, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

// One-time purge of pre-live demo payloads: browsers that ran the mock
// era still carry seed rows under these keys, and the readers above would
// keep serving them. Mirrors refill from the API on the next list fetch.
if (typeof window !== "undefined") {
  try {
    if (!window.localStorage.getItem("lms_demo_purged_v1")) {
      for (const key of [
        "locations",
        "roles_v2",
        "stations_v2",
        "categories_v3",
        "employees_v3",
        "procedures_v2",
        "quizzes",
      ]) {
        window.localStorage.removeItem(`lms_demo_${key}`);
      }
      window.localStorage.setItem("lms_demo_purged_v1", "1");
    }
  } catch {
    // Ignore storage errors
  }
}

// Local stores below are write-through mirrors of API rows only (first
// paint via getCachedProcedure, optimistic explorer updates). They are
// seeded from EMPTY defaults — seed constants never materialise here, so
// no mock row can ever render as data.
