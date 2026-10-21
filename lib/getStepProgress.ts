import type { BilingualValue } from "@/components/ui/bilingual-input";
import type { ProcedureQuiz, ProcedureAudience, ProcedureBlock } from "./types";

/**
 * Pure progress functions for the procedure wizard.
 *
 * Each function returns a number in [0, 1] — (completed required items) /
 * (total required items). The wizard's stepper turns that into a connector
 * fill width and a circle state (empty / started / complete), so the page
 * reads as live progress instead of "step 2 of 4".
 *
 * Kept in one file so the rules are easy to read, easy to test, and easy to
 * change. Every text field is whitespace-trimmed before "is filled" — an
 * input with one space in it should not count as progress.
 */

const filled = (s?: string | null): boolean =>
  Boolean(s && s.trim().length > 0);

export function hasBlockContent(b: ProcedureBlock): boolean {
  switch (b.kind) {
    case "text":
      return filled(b.body?.en) || filled(b.body?.es);
    case "heading":
      return filled(b.text?.en) || filled(b.text?.es);
    case "method":
      return b.steps.some((s) => filled(s.body?.en) || filled(s.body?.es));
    case "recipe":
      return (
        b.steps.some((s) => filled(s.body?.en) || filled(s.body?.es)) ||
        Boolean(b.ingredients?.some((i) => filled(i.name)))
      );
    case "image":
      return filled(b.src) || filled(b.alt?.en) || filled(b.alt?.es);
    case "video":
      return filled(b.src);
    case "warning":
      return filled(b.body?.en) || filled(b.body?.es);
    case "attachment":
      return filled(b.href) || filled(b.title?.en) || filled(b.title?.es);
    case "table":
      return (
        b.headers.some((h) => filled(h?.en) || filled(h?.es)) ||
        b.rows.some((r) => r.some((c) => filled(c?.en) || filled(c?.es)))
      );
    case "checklist":
      return b.items.some((i) => filled(i.text?.en) || filled(i.text?.es));
    case "linked_procedures":
      return b.procedureIds.length > 0;
    default:
      return false;
  }
}

/** Details (step 1) — split into two parts:
 *  1. About this procedure (Title & Purpose): 50% max
 *  2. Content (blocks): 50% max
 *  Total progress reaches 100% when both sections have content. */
export const getDetailsProgress = (state: {
  title: BilingualValue;
  purpose: BilingualValue;
  blocks?: ProcedureBlock[];
}): number => {
  const items = [
    state.title.en,
    state.title.es,
    state.purpose.en,
    state.purpose.es,
  ];
  const aboutDone = items.filter(filled).length;
  const aboutRatio = items.length > 0 ? aboutDone / items.length : 0;

  const validBlocks = (state.blocks ?? []).filter(hasBlockContent);
  const contentRatio = validBlocks.length > 0 ? 1 : 0;

  return aboutRatio * 0.5 + contentRatio * 0.5;
};

/** Quiz (step 2) — one item. Skipping the quiz counts as complete (the
 *  procedure is still publishable without one), otherwise the quiz needs at
 *  least 3 questions with a non-empty prompt on either side. */
export const QUIZ_REQUIRED_QUESTIONS = 3;

export const getQuizProgress = (state: {
  quiz: ProcedureQuiz | null;
}): number => {
  if (!state.quiz || state.quiz.questions.length === 0) return 0;
  const validQuestions = state.quiz.questions.filter(
    (q) => filled(q.prompt.en) || filled(q.prompt.es),
  );
  return Math.min(validQuestions.length / QUIZ_REQUIRED_QUESTIONS, 1);
};

/** Access (step 3) — three items:
 *
 *  1. A subcategory is picked (the procedure has somewhere to file).
 *  2. For station-tied categories, at least one station is picked.
 *     General categories skip this item (it counts as already done).
 *  3. The audience is set — either "everyone" (the default and a deliberate
 *     choice) or specific with at least one person, station, or role.
 */
export const getAccessProgress = (state: {
  subcategoryId: string;
  categoryKind: "general" | "station-tied";
  audience: ProcedureAudience;
}): number => {
  if (!filled(state.subcategoryId)) return 0;

  const total = 3;
  let done = 1; // subcategory is selected

  if (state.audience.stationIds.length > 0) done += 1;

  if (state.audience.mode === "everyone") {
    done += 1;
  } else if (
    state.audience.employeeIds.length > 0 ||
    state.audience.stationIds.length > 0 ||
    state.audience.roleIds.length > 0
  ) {
    done += 1;
  }

  return Math.min(done / total, 1);
};

/** Review (step 4) — derived from the other three. The review screen has no
 *  fields of its own; its progress is the share of preceding steps that are
 *  complete, so the bar catches up the moment the manager finishes the
 *  access step (and they don't have to scroll back up to see it). */
export const getReviewProgress = (others: {
  details: number;
  quiz: number;
  access: number;
}): number => {
  return (others.details + others.quiz + others.access) / 3;
};

/** Convenience — compute every step's progress in one call so the wizard's
 *  `useMemo` doesn't need to know the rules. */
export const getAllStepProgress = (state: {
  title: BilingualValue;
  purpose: BilingualValue;
  blocks?: ProcedureBlock[];
  quiz: ProcedureQuiz | null;
  subcategoryId: string;
  categoryKind: "general" | "station-tied";
  audience: ProcedureAudience;
}): { details: number; quiz: number; access: number; review: number } => {
  const details = getDetailsProgress({
    title: state.title,
    purpose: state.purpose,
    blocks: state.blocks,
  });
  const quiz = getQuizProgress({ quiz: state.quiz });
  const access = getAccessProgress({
    subcategoryId: state.subcategoryId,
    categoryKind: state.categoryKind,
    audience: state.audience,
  });
  const review = getReviewProgress({ details, quiz, access });
  return { details, quiz, access, review };
};
