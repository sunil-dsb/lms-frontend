import type { Procedure, ProcedureBlock } from "@/lib/types";
import { ALLERGEN_LABELS, type AllergenKey } from "@/lib/allergens";

/**
 * What a cook needs to know about a procedure *before* opening it, read out of
 * the blocks the manager already wrote: does it carry an allergen, does it have a
 * step where food safety is controlled, and is it readable in their language.
 *
 * Nothing here is a new field on the API — it is the body, summarised.
 */
export interface ProcedureFacts {
  allergens: string[];
  hasCriticalStep: boolean;
  /** True when this person reads Spanish and the Spanish side is empty. */
  notInYourLanguage: boolean;
}

function scan(blocks: ProcedureBlock[]): {
  allergens: string[];
  critical: boolean;
} {
  const allergens: string[] = [];
  let critical = false;
  for (const b of blocks) {
    if (b.kind === "recipe") {
      if (b.allergen?.selectedAllergens?.length)
        allergens.push(...b.allergen.selectedAllergens);
      if (b.steps.some((s) => s.critical || s.criticalLimit)) critical = true;
    }
    if (
      b.kind === "method" &&
      b.steps.some((s) => s.critical || s.criticalLimit)
    )
      critical = true;
  }
  return { allergens: [...new Set(allergens)], critical };
}

/**
 * The stored keys as words, in the reader's language. `selectedAllergens` holds
 * identifiers — `treeNuts`, `soy` — and a row that prints them raw tells a cook
 * "Contains treeNuts, soy" in both languages. An unknown key is passed through
 * rather than dropped: a warning that half-renders still warns.
 */
export function allergenWords(
  keys: readonly string[],
  locale: "en" | "es",
): string[] {
  return keys.map((k) => ALLERGEN_LABELS[k as AllergenKey]?.[locale] ?? k);
}

export function factsOf(p: Procedure, readsSpanish: boolean): ProcedureFacts {
  const body = (p.bodyEn?.blocks?.length ?? 0) ? p.bodyEn : p.bodyEs;
  const { allergens, critical } = scan(body?.blocks ?? []);
  return {
    allergens,
    hasCriticalStep: critical,
    notInYourLanguage:
      readsSpanish &&
      (!p.titleEs?.trim() || (p.bodyEs?.blocks?.length ?? 0) === 0),
  };
}
