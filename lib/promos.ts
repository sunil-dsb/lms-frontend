import type { Procedure } from "@/lib/types";

/**
 * Promo dishes — limited-time items (typically 1–2 months) the home page surfaces
 * in their own row before the station procedures.
 *
 * Frontend-only: the backend does not yet carry a `promo` flag on procedures,
 * so the home decides what counts as a promo by reading this list of slugs.
 * When the backend column lands, swap `pickPromoProcedures` for a server-side
 * filter and delete `PROMO_SLUGS` — every caller already goes through this
 * helper, so the swap is a one-line change.
 *
 * Order is the display order on the home page (most prominent first). Add a
 * slug here only when the corresponding procedure has been seeded in
 * `SEED_PROCEDURES` (or will arrive via the backend).
 */
export const PROMO_SLUGS: readonly string[] = [
  "herb-crusted-sea-bass",
  "truffle-mushroom-risotto",
] as const;

/** Hard cap on the number of promos shown on the home page. */
export const MAX_PROMOS = 3;

const PROMO_SLUG_SET = new Set(PROMO_SLUGS);

/**
 * Filter an already-readable list of procedures down to the promos in display
 * order, capped at `MAX_PROMOS`. The list is passed in by the caller (the home
 * page) so we benefit from the audience/clearance filter that ran before us;
 * a promo the cook may not read should not show up here.
 */
export function pickPromoProcedures(
  procedures: readonly Procedure[],
): Procedure[] {
  const found: Procedure[] = [];
  for (const slug of PROMO_SLUGS) {
    const match = procedures.find((p) => p.slug === slug);
    if (match) found.push(match);
    if (found.length === MAX_PROMOS) break;
  }
  return found;
}

/** Convenience predicate for callers that only need a yes/no (e.g. row rendering). */
export function isPromoSlug(slug: string): boolean {
  return PROMO_SLUG_SET.has(slug);
}
