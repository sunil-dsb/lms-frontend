import type {
  Procedure,
  ProcedureQuiz,
  ProcedureQuizQuestion,
} from "@/lib/types";
import {
  getQuizById,
  getQuizzesStore,
  isQuizQuestionAuthored,
} from "@/lib/api";
import { SEED_QUIZZES } from "@/lib/quizzes";

export interface LinkedProcedure extends Procedure {
  quiz?: ProcedureQuiz | null;
}

export function getProcedureQuizQuestions(
  proc: Procedure,
): ProcedureQuizQuestion[] {
  const inlineQuiz = (proc as unknown as { quiz?: ProcedureQuiz })?.quiz;
  if (inlineQuiz?.questions && inlineQuiz.questions.length > 0) {
    const authored = inlineQuiz.questions.filter(isQuizQuestionAuthored);
    if (authored.length > 0) return authored;
  }

  const qId = proc.quizId;
  if (qId) {
    try {
      const found = getQuizById(qId);
      if (found?.questions && found.questions.length > 0) {
        const authored = found.questions.filter(isQuizQuestionAuthored);
        if (authored.length > 0) return authored;
      }
    } catch {
      // ignore
    }
  }

  try {
    const store = getQuizzesStore();
    const foundInStore = store.find((q: unknown) => {
      const item = q as { id?: string; procedureId?: string };
      return (
        (qId && item.id === qId) ||
        (item.procedureId &&
          (item.procedureId === proc.id || item.procedureId === proc.slug))
      );
    });
    if (foundInStore?.questions && foundInStore.questions.length > 0) {
      const authored = foundInStore.questions.filter(isQuizQuestionAuthored);
      if (authored.length > 0) return authored;
    }
  } catch {
    // ignore
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("quizzes");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const matched = parsed.find((q: unknown) => {
            const item = q as {
              id?: string;
              procedureId?: string;
              nameEn?: string;
              nameEs?: string;
            };
            return (
              (qId && item.id === qId) ||
              (item.procedureId &&
                (item.procedureId === proc.id ||
                  item.procedureId === proc.slug)) ||
              (proc.titleEn &&
                item.nameEn &&
                item.nameEn
                  .toLowerCase()
                  .includes(proc.titleEn.toLowerCase())) ||
              (proc.titleEs &&
                item.nameEs &&
                item.nameEs
                  .toLowerCase()
                  .includes(proc.titleEs.toLowerCase())) ||
              (proc.slug &&
                item.nameEn &&
                item.nameEn
                  .toLowerCase()
                  .includes(proc.slug.replace(/-/g, " ")))
            );
          });
          if (matched?.questions && matched.questions.length > 0) {
            const authored = matched.questions.filter(isQuizQuestionAuthored);
            if (authored.length > 0) return authored;
          }
        }
      }
    } catch {
      // ignore
    }
  }

  const slug = (proc.slug || proc.id || "").toLowerCase();
  if (slug.includes("handwash")) {
    const q = SEED_QUIZZES.find((sq) => sq.id === "quiz-handwashing");
    if (q) return q.questions;
  }
  if (slug.includes("knife")) {
    const q = SEED_QUIZZES.find((sq) => sq.id === "quiz-knife-safety");
    if (q) return q.questions;
  }
  if (slug.includes("allergen")) {
    const q = SEED_QUIZZES.find((sq) => sq.id === "quiz-allergen-awareness");
    if (q) return q.questions;
  }
  if (slug.includes("clean")) {
    const q = SEED_QUIZZES.find((sq) => sq.id === "quiz-cleaning");
    if (q) return q.questions;
  }
  return [];
}

export function getQuestionComparableKey(
  q: ProcedureQuizQuestion | undefined | null,
): string {
  if (!q) return "";
  const en =
    (typeof q.prompt === "string" ? q.prompt : q.prompt?.en) ||
    (typeof q.question === "string" ? q.question : q.question?.en) ||
    "";
  const es =
    (typeof q.prompt === "object" ? q.prompt?.es : undefined) ||
    (typeof q.question === "object" ? q.question?.es : undefined) ||
    "";
  const text = (en || es || "").trim().toLowerCase();
  return text.replace(/[^\w\s]/gi, "").replace(/\s+/g, " ");
}

export function getQuestionNormalizedPrompt(
  q: ProcedureQuizQuestion | undefined | null,
): { en: string; es: string } {
  if (!q) return { en: "", es: "" };
  let en =
    (typeof q.prompt === "string" ? q.prompt : q.prompt?.en) ||
    (typeof q.question === "string" ? q.question : q.question?.en) ||
    "";
  let es =
    (typeof q.prompt === "object" ? q.prompt?.es : undefined) ||
    (typeof q.question === "object" ? q.question?.es : undefined) ||
    "";

  if (!en.trim() && !es.trim() && q.type === "sequence") {
    en = "Arrange the following steps in the correct order:";
    es = "Organiza los siguientes pasos en el orden correcto:";
  }

  return { en: en || es, es: es || en };
}

export function validateChapterQuiz(
  quiz: ProcedureQuiz | null,
  isEs: boolean,
): string | null {
  if (!quiz || !quiz.questions || quiz.questions.length === 0) return null;
  for (let i = 0; i < quiz.questions.length; i++) {
    const q = quiz.questions[i];
    const isAuthored = isQuizQuestionAuthored(q);

    if (isAuthored || quiz.questions.length > 1) {
      const { en: promptEn, es: promptEs } = getQuestionNormalizedPrompt(q);
      const hasPrompt = Boolean(promptEn.trim() || promptEs.trim());
      if (!hasPrompt) {
        return isEs
          ? `La pregunta ${i + 1} no tiene texto.`
          : `Question ${i + 1} is missing its question text.`;
      }

      if (q.type === "sequence") {
        const items = q.sequenceItems || [];
        if (items.length < 2) {
          return isEs
            ? `La pregunta ${i + 1} debe tener al menos 2 pasos.`
            : `Question ${i + 1} must have at least 2 steps.`;
        }
        const hasEmptyStep = items.some((item) => {
          const l = item.label as unknown as string | { en?: string; es?: string } | undefined;
          if (!l) return true;
          if (typeof l === "string") return !l.trim();
          return !(l.en?.trim() || l.es?.trim());
        });
        if (hasEmptyStep) {
          return isEs
            ? `La pregunta ${i + 1} tiene pasos vacíos.`
            : `Question ${i + 1} has empty steps.`;
        }

        const seenLabels = new Set<string>();
        for (let sIdx = 0; sIdx < items.length; sIdx++) {
          const l = items[sIdx].label as unknown as string | { en?: string; es?: string } | undefined;
          const en = typeof l === "string" ? l.trim().toLowerCase() : (l?.en || "").trim().toLowerCase();
          const es = typeof l === "string" ? l.trim().toLowerCase() : (l?.es || "").trim().toLowerCase();
          const key = `${en}|||${es}`;
          if (key !== "|||" && seenLabels.has(key)) {
            return isEs
              ? `La pregunta ${i + 1} tiene pasos con texto duplicado (paso ${sIdx + 1}).`
              : `Question ${i + 1} has duplicate steps (step ${sIdx + 1}). Each step must be distinct.`;
          }
          seenLabels.add(key);
        }
        continue;
      }

      const rawChoices = (q.choices ||
        (q as unknown as { options?: unknown[] }).options ||
        []) as Array<{
        id?: string;
        label?: string | { en?: string; es?: string };
        text?: string;
      }>;
      if (rawChoices.length < 2) {
        return isEs
          ? `La pregunta ${i + 1} debe tener al menos 2 opciones.`
          : `Question ${i + 1} must have at least 2 choices.`;
      }

      const emptyChoice = rawChoices.some((c) => {
        if (typeof c.label === "string") return !c.label.trim();
        if (typeof c.text === "string") return !c.text.trim();
        const cEn = c.label?.en || "";
        const cEs = c.label?.es || "";
        return !cEn.trim() && !cEs.trim();
      });

      if (emptyChoice) {
        return isEs
          ? `La pregunta ${i + 1} tiene opciones de respuesta vacías.`
          : `Question ${i + 1} has empty answer choices.`;
      }

      if (!q.correctChoiceId) {
        return isEs
          ? `La pregunta ${i + 1} debe tener una respuesta correcta marcada.`
          : `Question ${i + 1} must have a correct answer selected.`;
      }
    }
  }
  return null;
}
