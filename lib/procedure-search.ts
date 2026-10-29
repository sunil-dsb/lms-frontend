import type { Procedure, ProcedureBlock } from "./types";
import { fold } from "./utils";

/**
 * The library search behind Ask, until the answer engine exists.
 *
 * A cook types a question, not a title: "how long can rice be held?". Matched
 * as one string, that finds nothing. So the question is broken into its words,
 * the small ones that say nothing are dropped ("how", "the", "de", "el"), and
 * each remaining word is looked for in the title, the purpose and everything
 * the procedure says -- its steps, checklist items, warnings, table cells -- in
 * both languages, since a question asked in Spanish may be answered by a
 * procedure written in English. A title hit counts most, then the purpose, then
 * the body; the procedures that match more of the question come first.
 */

const STOP = new Set(
  (
    "a an and are as at be by can do does for from how i in is it its me my of on or should the this to what when where which who why will with you your " +
    "al como cómo con cual cuál cuando cuándo de del donde dónde el en es la las lo los me mi para por que qué se su sus un una uno y o hay puedo debo tengo"
  )
    .split(" ")
    .map(fold),
);

/** Irregular forms a kitchen question uses, reduced to the stem a procedure
 *  would contain: "can rice be held" has to find "holding". */
const IRREGULAR: Record<string, string> = {
  held: "hold",
  kept: "keep",
  froze: "freez",
  frozen: "freez",
  thawed: "thaw",
  cooled: "cool",
};

/** A word's stem: the common English and Spanish endings taken off, so the
 *  question and the procedure meet whatever form each used ("washing",
 *  "washed", "wash"; "manos", "mano"). Never shorter than three letters. */
export function stem(word: string): string {
  if (IRREGULAR[word]) return IRREGULAR[word];
  for (const end of ["ing", "ed", "es", "s"]) {
    if (word.endsWith(end) && word.length - end.length >= 3)
      return word.slice(0, -end.length);
  }
  return word;
}

export function queryWords(query: string): string[] {
  return [
    ...new Set(
      fold(query)
        .split(/[^\p{L}\p{N}]+/u)
        .filter((w) => w.length >= 3 && !STOP.has(w))
        .map(stem),
    ),
  ];
}

function blockText(b: ProcedureBlock): string {
  const both = (l?: { en?: string; es?: string }): string =>
    `${l?.en ?? ""} ${l?.es ?? ""}`;
  switch (b.kind) {
    case "text":
    case "warning":
      return both(b.body);
    case "rich_text":
      return JSON.stringify(b.body).replace(/[{}\[\]":,]/g, " ");
    case "heading":
      return both(b.text);
    case "method":
    case "recipe":
      return (
        b.steps.map((s) => both(s.body)).join(" ") +
        (b.kind === "recipe"
          ? " " + (b.ingredients ?? []).map((i) => i.name).join(" ")
          : "")
      );
    case "ingredients":
      return (b.ingredients ?? []).map((i) => i.name).join(" ");
    case "checklist":
      return both(b.title) + " " + b.items.map((i) => both(i.text)).join(" ");
    case "table":
      return [...b.headers, ...b.rows.flat()].map(both).join(" ");
    case "image":
    case "video":
      return both(b.caption);
    case "attachment":
      return both(b.title);
    default:
      return "";
  }
}

/** How well a procedure answers the question; 0 means not at all. */
export function scoreProcedure(p: Procedure, words: string[]): number {
  if (words.length === 0) return 1;
  const title = fold(`${p.titleEn || ""} ${p.titleEs || ""}`);
  const purpose = fold(`${p.purposeEn || ""} ${p.purposeEs || ""}`);
  const body = fold(
    [...(p.bodyEn?.blocks ?? []), ...(p.bodyEs?.blocks ?? [])]
      .map(blockText)
      .join(" "),
  );
  let score = 0;
  for (const w of words) {
    if (title.includes(w)) score += 3;
    else if (purpose.includes(w)) score += 2;
    else if (body.includes(w)) score += 1;
  }
  return score;
}
