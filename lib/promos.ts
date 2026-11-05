import type { Procedure } from "@/lib/types";

/**
 * Promo dishes — limited-time items the home page surfaces in their own row
 * before the station procedures.
 *
 * Live promo status:
 * 1. Marked as `isPromo === true`
 * 2. Not expired: `now < promoExpiresAt` (or no expiration date set)
 *
 * Once expired (`now >= promoExpiresAt`), `isPromoActive` returns false,
 * automatically removing it from the Promo section and leaving it in the
 * standard station procedures list.
 */
export const MAX_PROMOS = 3;

/** Legacy fallback slugs used only when no database promos are configured yet. */
export const PROMO_SLUGS: readonly string[] = [
  "herb-crusted-sea-bass",
  "truffle-mushroom-risotto",
] as const;

const PROMO_SLUG_SET = new Set(PROMO_SLUGS);

/**
 * Converts a server ISO instant (e.g. 2026-11-05T22:00:00.000Z) into the
 * local `datetime-local` input format (YYYY-MM-DDTHH:mm) for the editor.
 * Returns null for absent / unparseable values.
 */
export function toLocalDatetimeInput(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Converts a local `datetime-local` value (YYYY-MM-DDTHH:mm) into a UTC ISO
 * instant. Browsers parse the input format in the viewer's local timezone,
 * so the manager picks a wall-clock time and every device shows the run
 * window consistently. Returns null for absent values.
 */
export function fromLocalDatetimeInput(local?: string | null): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Checks if a procedure is currently an active promo dish.
 */
export function isPromoActive(
  procedure: Procedure,
  now: number = Date.now(),
): boolean {
  if (!procedure.isPromo) return false;
  // Not started yet — the run window hasn't opened.
  if (
    procedure.promoStartsAt &&
    new Date(procedure.promoStartsAt).getTime() > now
  ) {
    return false;
  }
  if (!procedure.promoExpiresAt) return true;
  return new Date(procedure.promoExpiresAt).getTime() > now;
}

/**
 * Filter an already-readable list of procedures down to the active promos,
 * capped at `MAX_PROMOS`.
 */
export function pickPromoProcedures(
  procedures: readonly Procedure[],
  now: number = Date.now(),
): Procedure[] {
  // 1. Pick live database promos where isPromo === true and not expired
  const livePromos = procedures.filter((p) => isPromoActive(p, now));
  if (livePromos.length > 0) {
    return livePromos.slice(0, MAX_PROMOS);
  }

  // 2. Fallback to matching legacy slugs if no live database promos are set
  const fallback: Procedure[] = [];
  for (const slug of PROMO_SLUGS) {
    const match = procedures.find((p) => p.slug === slug);
    if (match) fallback.push(match);
    if (fallback.length === MAX_PROMOS) break;
  }
  return fallback;
}

/** Convenience predicate for callers that only need a yes/no (e.g. row rendering). */
export function isPromoSlug(slug: string): boolean {
  return PROMO_SLUG_SET.has(slug);
}
