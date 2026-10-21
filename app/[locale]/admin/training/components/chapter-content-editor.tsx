"use client";

import * as React from "react";
import {
  LuArrowLeft,
  LuBookOpen,
  LuCheck,
  LuChevronRight,
  LuEye,
  LuFileText,
  LuLayoutGrid,
  LuPlus,
  LuSparkles,
  LuTarget,
  LuTriangleAlert,
} from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  BilingualInput,
  type BilingualValue,
} from "@/components/ui/bilingual-input";
import { WizardStepper } from "@/components/ui/wizard-stepper";
import { FormSection } from "@/components/admin/form-section";
import { NotionBlockList } from "@/app/[locale]/admin/library/new/notion-block-list";
import { QuizEditor } from "@/components/admin/quiz-editor";
import { Drawer } from "@/components/ui/drawer";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { DocHead, DocPurpose } from "@/components/doc/chrome";
import { BlockRenderer } from "@/components/doc/block-renderer";
import { cn } from "@/lib/utils";
import type {
  Procedure,
  ProcedureBlock,
  ProcedureQuiz,
  ProcedureQuizQuestion,
} from "@/lib/types";
import {
  getQuizById,
  getQuizzesStore,
  isQuizQuestionAuthored,
} from "@/lib/api";
import { SEED_QUIZZES } from "@/lib/quizzes";
import type { EditorChapter } from "./course-editor";

interface ChapterContentEditorProps {
  locale: string;
  courseName: string;
  chapterNumber: number;
  initialChapter?: EditorChapter | null;
  onSave: (chapter: EditorChapter) => void;
  onCancel: () => void;
}

type WizardStep = "content" | "quiz";
type LinkedProcedure = Procedure & { quiz?: ProcedureQuiz };

export function ChapterContentEditor({
  locale,
  courseName,
  chapterNumber,
  initialChapter,
  onSave,
  onCancel,
}: ChapterContentEditorProps): React.ReactElement {
  const isEs = locale === "es";

  const [step, setStep] = React.useState<WizardStep>("content");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [step]);

  const [title, setTitle] = React.useState<BilingualValue>(() => {
    if (initialChapter?.title) {
      return { en: initialChapter.title, es: initialChapter.title };
    }
    const defaultTitle = isEs
      ? `Capítulo ${chapterNumber}`
      : `Chapter ${chapterNumber}`;
    return { en: defaultTitle, es: defaultTitle };
  });

  const [purpose, setPurpose] = React.useState<BilingualValue>(() => {
    if (initialChapter?.subtitle) {
      return { en: initialChapter.subtitle, es: initialChapter.subtitle };
    }
    return { en: "", es: "" };
  });

  const [titleError, setTitleError] = React.useState<string | null>(null);
  const [purposeError, setPurposeError] = React.useState<string | null>(null);
  const [quizError, setQuizError] = React.useState<string | null>(null);

  const [blocks, setBlocks] = React.useState<ProcedureBlock[]>(
    () => initialChapter?.blocks ?? [],
  );

  const [quiz, setQuiz] = React.useState<ProcedureQuiz | null>(
    () => initialChapter?.quiz ?? null,
  );

  // Preview state
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewLang, setPreviewLang] = React.useState<"en" | "es">(
    isEs ? "es" : "en",
  );
  const [linkedProceduresMap, setLinkedProceduresMap] = React.useState<
    Record<string, LinkedProcedure>
  >({});

  // Collect all procedureIds linked in chapter blocks
  const linkedProcedureIds = React.useMemo(() => {
    const ids: string[] = [];
    for (const b of blocks) {
      if (b.kind === "linked_procedures" && Array.isArray(b.procedureIds)) {
        for (const id of b.procedureIds) {
          if (id && !ids.includes(id)) ids.push(id);
        }
      }
    }
    return ids;
  }, [blocks]);

  // Fetch full details for any linked procedures not yet in linkedProceduresMap
  React.useEffect(() => {
    const missing = linkedProcedureIds.filter((id) => !linkedProceduresMap[id]);
    if (missing.length === 0) return;

    let isMounted = true;
    for (const id of missing) {
      import("@/services/library/api")
        .then(({ fetchProcedureById }) => fetchProcedureById(id, true))
        .then(async (proc) => {
          if (!isMounted || !proc) return;

          let fullProc: LinkedProcedure = proc;
          // If the procedure has a quizId but no inline quiz, fetch the quiz too
          if (proc.quizId && !fullProc.quiz) {
            try {
              const { fetchQuizById } = await import("@/lib/api/library");
              const loadedQuiz = await fetchQuizById(proc.quizId);
              if (loadedQuiz) {
                fullProc = {
                  ...proc,
                  quiz: {
                    attached: loadedQuiz.attached ?? true,
                    questions: loadedQuiz.questions,
                  },
                };
              }
            } catch {
              // ignore
            }
          }

          setLinkedProceduresMap((prev) => ({
            ...prev,
            [id]: fullProc,
            ...(fullProc.slug ? { [fullProc.slug]: fullProc } : {}),
          }));
        })
        .catch(async () => {
          try {
            const { listAvailableSops } = await import("@/lib/mock-training");
            const match = listAvailableSops().find(
              (p) => p.id === id || p.slug === id,
            );
            if (isMounted && match) {
              setLinkedProceduresMap((prev) => ({
                ...prev,
                [id]: match,
                ...(match.slug ? { [match.slug]: match } : {}),
              }));
            }
          } catch {
            // ignore
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [linkedProcedureIds, linkedProceduresMap]);

  // Helper to extract quiz questions from a procedure
  const getProcedureQuizQuestions = React.useCallback(
    (proc: Procedure): ProcedureQuizQuestion[] => {
      // 1. Check inline quiz
      const inlineQuiz = (proc as unknown as { quiz?: ProcedureQuiz })?.quiz;
      if (inlineQuiz?.questions && inlineQuiz.questions.length > 0) {
        const authored = inlineQuiz.questions.filter(isQuizQuestionAuthored);
        if (authored.length > 0) return authored;
      }

      // 2. Check quiz by quizId via getQuizById from cached store
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

      // 3. Search getQuizzesStore() by procedure ID or quiz ID
      try {
        const store = getQuizzesStore();
        const foundInStore = store.find(
          (q: any) =>
            (qId && q.id === qId) ||
            (q.procedureId &&
              (q.procedureId === proc.id || q.procedureId === proc.slug)),
        );
        if (foundInStore?.questions && foundInStore.questions.length > 0) {
          const authored = foundInStore.questions.filter(
            isQuizQuestionAuthored,
          );
          if (authored.length > 0) return authored;
        }
      } catch {
        // ignore
      }

      // 4. Also check localStorage directly for quizzes
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("quizzes");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const matched = parsed.find(
                (q: any) =>
                  (qId && q.id === qId) ||
                  (q.procedureId &&
                    (q.procedureId === proc.id ||
                      q.procedureId === proc.slug)) ||
                  (proc.titleEn &&
                    q.nameEn &&
                    q.nameEn
                      .toLowerCase()
                      .includes(proc.titleEn.toLowerCase())) ||
                  (proc.titleEs &&
                    q.nameEs &&
                    q.nameEs
                      .toLowerCase()
                      .includes(proc.titleEs.toLowerCase())) ||
                  (proc.slug &&
                    q.nameEn &&
                    q.nameEn
                      .toLowerCase()
                      .includes(proc.slug.replace(/-/g, " "))),
              );
              if (matched?.questions && matched.questions.length > 0) {
                const authored = matched.questions.filter(
                  isQuizQuestionAuthored,
                );
                if (authored.length > 0) return authored;
              }
            }
          }
        } catch {
          // ignore
        }
      }

      // 5. Fallback seed quizzes by slug or ID
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
        const q = SEED_QUIZZES.find(
          (sq) => sq.id === "quiz-allergen-awareness",
        );
        if (q) return q.questions;
      }
      if (slug.includes("clean")) {
        const q = SEED_QUIZZES.find((sq) => sq.id === "quiz-cleaning");
        if (q) return q.questions;
      }
      return [];
    },
    [],
  );

  // Discover all linked procedures that contain a quiz
  const availableLinkedQuestions = React.useMemo(() => {
    const result: {
      procedure: Procedure;
      questions: ProcedureQuizQuestion[];
    }[] = [];
    const visited = new Set<string>();

    for (const id of linkedProcedureIds) {
      const proc = linkedProceduresMap[id];
      if (proc && !visited.has(proc.id)) {
        visited.add(proc.id);
        const qs = getProcedureQuizQuestions(proc);
        if (qs.length > 0) {
          result.push({ procedure: proc, questions: qs });
        }
      }
    }
    return result;
  }, [linkedProcedureIds, linkedProceduresMap, getProcedureQuizQuestions]);

  // Helper to test if a quiz has at least one authored question
  const hasAuthoredQuestions = React.useCallback(
    (q: ProcedureQuiz | null | undefined): boolean => {
      if (!q || !q.questions || q.questions.length === 0) return false;
      return q.questions.some(isQuizQuestionAuthored);
    },
    [],
  );

  // Auto-prefill linked procedure questions into the chapter quiz if not authored yet
  React.useEffect(() => {
    if (availableLinkedQuestions.length > 0) {
      setQuiz((prev) => {
        // If the chapter quiz already has authored questions, preserve them
        if (hasAuthoredQuestions(prev)) return prev;

        const importedQuestions: ProcedureQuizQuestion[] = [];
        availableLinkedQuestions.forEach(({ procedure, questions }) => {
          const procTitle = isEs
            ? procedure.titleEs || procedure.titleEn
            : procedure.titleEn || procedure.titleEs;
          questions.forEach((q) => {
            importedQuestions.push({
              ...q,
              id:
                q.id ||
                `q-imp-${procedure.id}-${Math.random().toString(36).slice(2, 8)}`,
              sourceProcedureId: procedure.id,
              sourceProcedureTitle: procTitle,
            });
          });
        });

        if (importedQuestions.length === 0) return prev;

        return {
          attached: true,
          questions: importedQuestions,
          minCorrectAnswers: Math.max(
            1,
            Math.ceil(importedQuestions.length * 0.7),
          ),
        };
      });
    }
  }, [availableLinkedQuestions, isEs, hasAuthoredQuestions]);

  // Manual 1-click import / sync handler
  const handleImportLinkedQuestions = () => {
    const existingPrompts = new Set(
      (quiz?.questions ?? [])
        .filter(isQuizQuestionAuthored)
        .map((q) =>
          (typeof q.prompt === "string"
            ? q.prompt
            : q.prompt?.en || q.prompt?.es || ""
          )
            .trim()
            .toLowerCase(),
        ),
    );

    const toAdd: ProcedureQuizQuestion[] = [];
    availableLinkedQuestions.forEach(({ procedure, questions }) => {
      const procTitle = isEs
        ? procedure.titleEs || procedure.titleEn
        : procedure.titleEn || procedure.titleEs;
      questions.forEach((q) => {
        const promptKey = (
          typeof q.prompt === "string"
            ? q.prompt
            : q.prompt?.en || q.prompt?.es || ""
        )
          .trim()
          .toLowerCase();
        if (!existingPrompts.has(promptKey)) {
          toAdd.push({
            ...q,
            id:
              q.id ||
              `q-imp-${procedure.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            sourceProcedureId: procedure.id,
            sourceProcedureTitle: procTitle,
          });
          existingPrompts.add(promptKey);
        }
      });
    });

    if (toAdd.length > 0) {
      setQuiz((prev) => {
        const currentQuestions = (prev?.questions ?? []).filter(
          isQuizQuestionAuthored,
        );
        const nextQuestions = [...currentQuestions, ...toAdd];
        return {
          attached: true,
          questions: nextQuestions,
          minCorrectAnswers:
            prev?.minCorrectAnswers ??
            Math.max(1, Math.ceil(nextQuestions.length * 0.7)),
        };
      });
    }
  };

  const hasTitle = Boolean((title.en || title.es)?.trim());
  const hasPurpose = Boolean((purpose.en || purpose.es)?.trim());

  const handleNext = () => {
    let valid = true;
    if (!hasTitle) {
      setTitleError(isEs ? "El título es obligatorio." : "Title is required.");
      valid = false;
    }
    if (!hasPurpose) {
      setPurposeError(
        isEs ? "El propósito es obligatorio." : "What it is for is required.",
      );
      valid = false;
    }
    if (!valid) return;

    // If quiz is not authored yet and we have linked procedure questions, prefill immediately
    if (!hasAuthoredQuestions(quiz) && availableLinkedQuestions.length > 0) {
      const importedQuestions: ProcedureQuizQuestion[] = [];
      availableLinkedQuestions.forEach(({ procedure, questions }) => {
        const procTitle = isEs
          ? procedure.titleEs || procedure.titleEn
          : procedure.titleEn || procedure.titleEs;
        questions.forEach((q) => {
          importedQuestions.push({
            ...q,
            id:
              q.id ||
              `q-imp-${procedure.id}-${Math.random().toString(36).slice(2, 8)}`,
            sourceProcedureId: procedure.id,
            sourceProcedureTitle: procTitle,
          });
        });
      });

      if (importedQuestions.length > 0) {
        setQuiz({
          attached: true,
          questions: importedQuestions,
          minCorrectAnswers: Math.max(
            1,
            Math.ceil(importedQuestions.length * 0.7),
          ),
        });
      }
    }

    setStep("quiz");
  };

  const handleSave = () => {
    let valid = true;
    if (!hasTitle) {
      setTitleError(isEs ? "El título es obligatorio." : "Title is required.");
      valid = false;
    }
    if (!hasPurpose) {
      setPurposeError(
        isEs ? "El propósito es obligatorio." : "What it is for is required.",
      );
      valid = false;
    }
    if (!valid) {
      setStep("content");
      return;
    }

    // Frontend quiz validation
    if (quiz && quiz.questions && quiz.questions.length > 0) {
      for (let i = 0; i < quiz.questions.length; i++) {
        const q = quiz.questions[i];
        const isAuthored = isQuizQuestionAuthored(q);

        // If authored or if there are multiple questions configured
        if (isAuthored || quiz.questions.length > 1) {
          const promptEn = (
            typeof q.prompt === "string" ? q.prompt : q.prompt?.en || ""
          ).trim();
          const promptEs = (
            typeof q.prompt === "string" ? q.prompt : q.prompt?.es || ""
          ).trim();

          if (!promptEn && !promptEs) {
            const msg = isEs
              ? `Pregunta ${i + 1}: Escribe el enunciado de la pregunta.`
              : `Question ${i + 1}: Please enter the question prompt.`;
            setQuizError(msg);
            toast.error(msg);
            setStep("quiz");
            if (typeof document !== "undefined") {
              const el = document.getElementById(`quiz-question-${q.id}`);
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            return;
          }

          const filledChoices = (q.choices || []).filter((c) => {
            const lEn = (
              typeof c.label === "string" ? c.label : c.label?.en || ""
            ).trim();
            const lEs = (
              typeof c.label === "string" ? c.label : c.label?.es || ""
            ).trim();
            return Boolean(lEn || lEs);
          });

          if (filledChoices.length < 2) {
            const msg = isEs
              ? `Pregunta ${i + 1}: Agrega al menos 2 opciones de respuesta.`
              : `Question ${i + 1}: Please add at least 2 answer choices.`;
            setQuizError(msg);
            toast.error(msg);
            setStep("quiz");
            if (typeof document !== "undefined") {
              const el = document.getElementById(`quiz-question-${q.id}`);
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            return;
          }

          if (
            !q.correctChoiceId ||
            !q.choices?.some((c) => c.id === q.correctChoiceId)
          ) {
            const msg = isEs
              ? `Pregunta ${i + 1}: Selecciona cuál es la respuesta correcta.`
              : `Question ${i + 1}: Please select which option is the correct answer.`;
            setQuizError(msg);
            toast.error(msg);
            setStep("quiz");
            if (typeof document !== "undefined") {
              const el = document.getElementById(`quiz-question-${q.id}`);
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
            return;
          }
        }
      }
    }

    setQuizError(null);

    const resolvedTitle =
      (isEs ? title.es || title.en : title.en || title.es).trim() ||
      (isEs ? `Capítulo ${chapterNumber}` : `Chapter ${chapterNumber}`);

    const resolvedSubtitle = (
      isEs ? purpose.es || purpose.en : purpose.en || purpose.es
    ).trim();

    const hasQuestions = Boolean(
      quiz?.questions &&
      quiz.questions.length > 0 &&
      quiz.questions.some(isQuizQuestionAuthored),
    );

    const saved: EditorChapter = {
      id: initialChapter?.id || `chapter-${Date.now()}`,
      title: resolvedTitle,
      subtitle: resolvedSubtitle || undefined,
      blocks,
      quiz:
        hasQuestions && quiz
          ? {
              ...quiz,
              attached: true,
              minCorrectAnswers:
                quiz.minCorrectAnswers ??
                Math.max(1, Math.ceil(quiz.questions.length * 0.7)),
            }
          : null,
    };

    onSave(saved);
  };

  const handleOpenPreview = () => {
    setPreviewOpen(true);
  };

  const stepsList = [
    {
      id: "content",
      label: isEs ? "Contenido" : "Content",
      progress: blocks.length > 0 && hasTitle && hasPurpose ? 1 : 0.5,
    },
    {
      id: "quiz",
      label: isEs ? "Cuestionario" : "Quiz",
      progress: quiz && quiz.questions && quiz.questions.length > 0 ? 1 : 0,
    },
  ];

  // Render the entire chapter in one unified preview
  const renderPreviewContent = () => {
    const chapterTitle =
      (previewLang === "es" ? title.es || title.en : title.en || title.es) ||
      (isEs ? `Capítulo ${chapterNumber}` : `Chapter ${chapterNumber}`);

    const chapterPurpose =
      previewLang === "es"
        ? purpose.es || purpose.en
        : purpose.en || purpose.es;

    return (
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-xs p-4 sm:p-6 space-y-6">
        {/* Chapter Header */}
        <DocHead category={courseName} title={chapterTitle} withCover={false} />
        {chapterPurpose ? <DocPurpose>{chapterPurpose}</DocPurpose> : null}

        {/* Chapter Content Blocks */}
        {blocks.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--color-ink-3)]">
            {isEs
              ? "No hay bloques de contenido aún."
              : "No content blocks yet."}
          </p>
        ) : (
          <div className="space-y-6">
            {blocks.map((block, idx) => {
              if (block.kind === "linked_procedures") {
                if (!block.procedureIds || block.procedureIds.length === 0)
                  return null;

                return (
                  <div key={block.id || idx} className="space-y-6 my-4">
                    {block.procedureIds.map((procId) => {
                      const proc = linkedProceduresMap[procId];
                      if (!proc) {
                        return (
                          <div
                            key={procId}
                            className="p-4 rounded-xl border border-[var(--color-line-2)] bg-[var(--color-wash)]/40 text-xs text-[var(--color-ink-3)]"
                          >
                            {isEs
                              ? "Cargando procedimiento..."
                              : "Loading procedure..."}
                          </div>
                        );
                      }

                      const categoryLabel = proc.category
                        ? previewLang === "es"
                          ? proc.category.nameEs || proc.category.nameEn
                          : proc.category.nameEn || proc.category.nameEs
                        : "Recipes";

                      const procTitle =
                        (previewLang === "es"
                          ? proc.titleEs || proc.titleEn
                          : proc.titleEn || proc.titleEs) ||
                        (isEs ? "Procedimiento" : "Procedure");

                      const procPurpose =
                        previewLang === "es"
                          ? proc.purposeEs || proc.purposeEn
                          : proc.purposeEn || proc.purposeEs;

                      const rawBlocks =
                        (previewLang === "es"
                          ? proc.bodyEs?.blocks
                          : proc.bodyEn?.blocks) ||
                        proc.bodyEn?.blocks ||
                        [];

                      const procBlocks = rawBlocks.filter((b, bIdx) => {
                        if (bIdx === 0 && b.kind === "heading" && b.level === 1)
                          return false;
                        return true;
                      });

                      return (
                        <div
                          key={procId}
                          id={`preview-proc-${procId}`}
                          className="rounded-2xl border border-[var(--color-line-2)] bg-[var(--color-surface)] p-5 sm:p-6 shadow-xs space-y-4"
                        >
                          <DocHead
                            category={categoryLabel}
                            title={procTitle}
                            withCover={false}
                          />
                          {procPurpose ? (
                            <DocPurpose>{procPurpose}</DocPurpose>
                          ) : null}
                          {procBlocks.length > 0 ? (
                            <BlockRenderer
                              blocks={procBlocks}
                              locale={previewLang}
                            />
                          ) : (
                            <p className="py-2 text-xs text-[var(--color-ink-3)]">
                              {isEs
                                ? "Sin contenido de procedimiento."
                                : "No procedure content."}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              }

              // Normal chapter blocks: text, images, videos, checklists, etc.
              return (
                <div key={block.id || idx}>
                  <BlockRenderer blocks={[block]} locale={previewLang} />
                </div>
              );
            })}
          </div>
        )}

        {/* Knowledge check / Quiz preview at the bottom of the chapter */}
        {quiz && quiz.questions && quiz.questions.length > 0 ? (
          <div className="mt-10 pt-8 border-t border-[var(--color-line-2)] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--color-line-2)]">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-950)] text-[var(--color-brand-600)]">
                  <LuSparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--color-ink)]">
                    {previewLang === "es"
                      ? "Evaluación de conocimientos"
                      : "Knowledge check"}
                  </h3>
                  <p className="text-xs text-[var(--color-ink-2)]">
                    {quiz.questions.length}{" "}
                    {quiz.questions.length === 1
                      ? previewLang === "es"
                        ? "pregunta"
                        : "question"
                      : previewLang === "es"
                        ? "preguntas"
                        : "questions"}
                  </p>
                </div>
              </div>

              {/* Passing requirement badge */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 shrink-0 shadow-2xs">
                <LuTarget className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  {quiz.minCorrectAnswers ??
                    Math.max(1, Math.ceil(quiz.questions.length * 0.7))}{" "}
                  of {quiz.questions.length} correct required to pass
                </span>
              </span>
            </div>

            <div className="space-y-5">
              {quiz.questions.map((q, qIdx) => {
                const prompt =
                  typeof q.prompt === "string"
                    ? q.prompt
                    : (previewLang === "es"
                        ? q.prompt?.es || q.prompt?.en
                        : q.prompt?.en || q.prompt?.es) || "";

                return (
                  <div
                    key={q.id || qIdx}
                    className="rounded-2xl border border-[var(--color-line-2)] bg-[var(--color-surface)] p-5 sm:p-6 shadow-xs space-y-4"
                  >
                    {/* Linked procedure badge */}
                    {q.sourceProcedureTitle ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200 border border-amber-300/80 dark:border-amber-700/60 shadow-2xs">
                        <LuBookOpen className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>
                          {previewLang === "es"
                            ? "Del procedimiento:"
                            : "From procedure:"}{" "}
                          <strong>{q.sourceProcedureTitle}</strong>
                        </span>
                      </div>
                    ) : null}

                    {/* Question Eyebrow & Prompt */}
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-brand-600)]">
                        {previewLang === "es"
                          ? `Pregunta ${qIdx + 1}`
                          : `Question ${qIdx + 1}`}
                      </span>
                      <h4 className="mt-1 text-base font-semibold text-[var(--color-ink)] leading-snug">
                        {prompt ||
                          (previewLang === "es"
                            ? "Pregunta sin título"
                            : "Untitled question")}
                      </h4>
                    </div>

                    {/* Choices vertical list */}
                    <div className="flex flex-col gap-3.5 pt-2">
                      {q.choices.map((c, cIdx) => {
                        const label =
                          typeof c.label === "string"
                            ? c.label
                            : (previewLang === "es"
                                ? c.label?.es || c.label?.en
                                : c.label?.en || c.label?.es) || "";
                        const isCorrect = c.id === q.correctChoiceId;
                        const letter = String.fromCharCode(65 + cIdx); // A, B, C, D

                        return (
                          <div
                            key={c.id || cIdx}
                            className={cn(
                              "flex items-center justify-between gap-3.5 rounded-xl border p-4 transition-all",
                              isCorrect
                                ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-[var(--color-ink)] shadow-2xs"
                                : "border-[var(--color-line-2)] bg-[var(--color-wash)]/40 text-[var(--color-ink)]",
                            )}
                          >
                            <div className="flex items-center gap-3.5 min-w-0 flex-1">
                              <span
                                className={cn(
                                  "flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                                  isCorrect
                                    ? "bg-emerald-600 text-white shadow-2xs"
                                    : "bg-[var(--color-panel-2)] text-[var(--color-ink-2)] border border-[var(--color-line-2)]",
                                )}
                              >
                                {letter}
                              </span>
                              <span className="text-sm font-medium text-[var(--color-ink)] leading-snug break-words">
                                {label ||
                                  (previewLang === "es"
                                    ? `Opción ${letter}`
                                    : `Option ${letter}`)}
                              </span>
                            </div>

                            {isCorrect && (
                              <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-100/80 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 px-3 py-1 rounded-full shadow-2xs">
                                <LuCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                                {previewLang === "es"
                                  ? "Respuesta correcta"
                                  : "Correct answer"}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-28 animate-in fade-in duration-200">
      {/* Top Header */}
      <div>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[var(--color-ink-2)] hover:text-[var(--color-ink)] transition-colors cursor-pointer"
        >
          <LuArrowLeft className="w-4 h-4" />
          <span>
            {isEs ? "Volver al curso" : "Back to course"} ({courseName})
          </span>
        </button>

        <div className="mt-2 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-ui)] text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-ink)]">
              {initialChapter
                ? isEs
                  ? "Editar capítulo"
                  : "Edit chapter"
                : isEs
                  ? `Nuevo capítulo #${chapterNumber}`
                  : `New chapter #${chapterNumber}`}
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-[var(--color-ink-2)]">
              {courseName}
            </p>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="sticky top-[56px] z-10 -mx-4 bg-[var(--color-bg-admin)]/95 px-4 py-2 backdrop-blur-md transition-all sm:-mx-6 sm:px-6 lg:top-[75px] lg:-mx-10 lg:px-10 border-b border-[var(--color-line-2)]/60">
        <div className="mx-auto max-w-4xl">
          <WizardStepper
            className="my-0"
            ariaLabel={isEs ? "Pasos del capítulo" : "Chapter steps"}
            current={step}
            steps={stepsList}
            onSelect={(id) => {
              if (id === "quiz") {
                handleNext();
              } else {
                setStep(id as WizardStep);
              }
            }}
          />
        </div>
      </div>

      {/* STEP 1: CONTENT */}
      {step === "content" && (
        <div className="space-y-6">
          {/* Section 1: About this chapter */}
          <FormSection
            id="chapter-details"
            icon={LuFileText}
            title={isEs ? "Sobre este capítulo" : "About this chapter"}
          >
            <div className="space-y-5">
              <div id="chapter-field-title">
                <BilingualInput
                  label={isEs ? "Título" : "Title"}
                  required
                  maxLength={100}
                  value={title}
                  onChange={(next) => {
                    setTitle(next);
                    if ((next.en || next.es)?.trim()) {
                      setTitleError(null);
                    }
                  }}
                  placeholder={{
                    en: "Enter chapter title...",
                    es: "Ingresa el título del capítulo...",
                  }}
                />
                {titleError ? (
                  <p
                    role="alert"
                    className="mt-1.5 flex items-center gap-1.5 text-xs font-normal text-[var(--color-warn-ink)] animate-in fade-in"
                  >
                    <LuTriangleAlert className="size-[13px] shrink-0 text-[var(--color-warn)]" />
                    <span>{titleError}</span>
                  </p>
                ) : null}
              </div>

              <div id="chapter-field-purpose">
                <BilingualInput
                  label={isEs ? "Para qué sirve" : "What it is for"}
                  required
                  multiline
                  maxLength={500}
                  value={purpose}
                  onChange={(next) => {
                    setPurpose(next);
                    if ((next.en || next.es)?.trim()) {
                      setPurposeError(null);
                    }
                  }}
                  placeholder={{
                    en: "Enter the purpose of this chapter...",
                    es: "Ingresa el propósito de este capítulo...",
                  }}
                />
                {purposeError ? (
                  <p
                    role="alert"
                    className="mt-1.5 flex items-center gap-1.5 text-xs font-normal text-[var(--color-warn-ink)] animate-in fade-in"
                  >
                    <LuTriangleAlert className="size-[13px] shrink-0 text-[var(--color-warn)]" />
                    <span>{purposeError}</span>
                  </p>
                ) : null}
              </div>
            </div>
          </FormSection>

          {/* Section 2: Content Blocks */}
          <FormSection
            id="chapter-content"
            icon={LuLayoutGrid}
            title={isEs ? "Contenido" : "Content"}
            subtitle={
              isEs
                ? "Los pasos, fotos y notas que sigue el empleado."
                : "What the employee reads, watches and does."
            }
            headerAction={
              <span className="inline-flex items-center rounded-full border border-[var(--color-line-2)] bg-[var(--color-wash)] px-3 py-1 text-xs font-semibold text-[var(--color-ink-2)]">
                {blocks.length} {blocks.length === 1 ? "block" : "blocks"}
              </span>
            }
          >
            <NotionBlockList
              blocks={blocks}
              onChange={setBlocks}
              allowLinkProcedure={true}
            />
          </FormSection>
        </div>
      )}

      {/* STEP 2: QUIZ */}
      {step === "quiz" && (
        <FormSection
          id="chapter-quiz"
          icon={LuSparkles}
          title={isEs ? "Evaluación de conocimientos" : "Knowledge check"}
          subtitle={
            isEs
              ? "Agrega preguntas de opción múltiple para validar la comprensión de este capítulo."
              : "Add multiple choice questions to validate comprehension for this chapter."
          }
        >
          {/* Linked procedures with existing quiz banner */}
          {availableLinkedQuestions.length > 0 && (
            <div className="rounded-xl border border-amber-300/70 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-800/40 p-4 mb-6 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-2xs">
                    <LuBookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--color-ink)]">
                      {isEs
                        ? "Preguntas de procedimientos vinculados incluidas"
                        : "Linked procedure questions included"}
                    </h4>
                    <p className="text-xs text-[var(--color-ink-2)] mt-0.5">
                      {isEs
                        ? "Las preguntas de los procedimientos vinculados están precargadas abajo como parte del cuestionario de este capítulo."
                        : "Questions from linked procedures are automatically prefilled below as part of this chapter's quiz."}
                    </p>
                  </div>
                </div>

                {/* Procedure chips */}
                <div className="flex flex-wrap items-center gap-2">
                  {availableLinkedQuestions.map(({ procedure, questions }) => {
                    const title = isEs
                      ? procedure.titleEs || procedure.titleEn
                      : procedure.titleEn || procedure.titleEs;
                    const countInQuiz = (quiz?.questions ?? []).filter(
                      (q) => q.sourceProcedureId === procedure.id,
                    ).length;

                    return (
                      <span
                        key={procedure.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white dark:bg-[var(--color-surface)] border border-amber-300/80 text-[var(--color-ink)] shadow-2xs"
                      >
                        <LuBookOpen className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="font-semibold">{title}</span>
                        <span className="text-[11px] text-[var(--color-ink-2)]">
                          ({questions.length}{" "}
                          {questions.length === 1 ? "question" : "questions"})
                        </span>
                        {countInQuiz > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-full ml-1">
                            <LuCheck className="w-3 h-3 stroke-[2.5]" />
                            {countInQuiz} in quiz
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {quizError && (
            <div
              role="alert"
              className="rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-4 mb-6 flex items-start gap-3 text-sm font-medium text-red-800 dark:text-red-200 animate-in fade-in"
            >
              <LuTriangleAlert className="size-5 shrink-0 text-red-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">
                  {isEs
                    ? "Error de validación en el cuestionario"
                    : "Quiz validation error"}
                </p>
                <p className="text-xs text-red-700 dark:text-red-300">
                  {quizError}
                </p>
              </div>
            </div>
          )}

          <QuizEditor
            value={quiz}
            hideHeader
            hideAttachToggle
            showPassingScore={true}
            onChange={(next) => {
              setQuiz(next);
              if (quizError) setQuizError(null);
            }}
          />
        </FormSection>
      )}

      {/* Floating Preview button — single button hovering above footer, exactly like in procedure editor */}
      <div className="pointer-events-none fixed bottom-[76px] right-5 z-30 lg:right-8">
        <Button
          type="button"
          variant="surface"
          icon={LuEye}
          onClick={handleOpenPreview}
          className="pointer-events-auto shadow-e2 text-xs font-semibold bg-white hover:bg-neutral-50 dark:bg-[var(--color-surface)] border border-[var(--color-line-2)]"
        >
          {isEs ? "Vista previa" : "Preview"}
        </Button>
      </div>

      {/* Sticky wizard footer bar like in procedure editor */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-[var(--color-line-2)] bg-[var(--color-surface)] px-4 py-3 shadow-e2 sm:px-8">
        <Button type="button" variant="ghost" onClick={onCancel}>
          {isEs ? "Cancelar" : "Cancel"}
        </Button>

        <div className="flex items-center gap-3">
          {step === "content" ? (
            <div className="flex items-center gap-2.5">
              {initialChapter && (
                <Button
                  type="button"
                  variant="surface"
                  icon={LuCheck}
                  disabled={!hasTitle || !hasPurpose}
                  onClick={handleSave}
                >
                  {isEs ? "Guardar cambios" : "Save changes"}
                </Button>
              )}
              <Button
                type="button"
                variant="primary"
                icon={LuChevronRight}
                disabled={!hasTitle || !hasPurpose}
                onClick={handleNext}
              >
                {isEs ? "Siguiente" : "Next"}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="surface"
                icon={LuArrowLeft}
                onClick={() => setStep("content")}
              >
                {isEs ? "Anterior" : "Back"}
              </Button>
              <Button
                type="button"
                variant="primary"
                icon={LuCheck}
                onClick={handleSave}
              >
                {isEs ? "Guardar cambios" : "Save changes"}
              </Button>
            </div>
          )}
        </div>
      </footer>

      {/* PREVIEW DRAWER (Whole Chapter in One Preview) */}
      <Drawer
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={isEs ? "Vista previa del capítulo" : "Chapter preview"}
        closeLabel={isEs ? "Cerrar" : "Close"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--color-line-2)]">
            <span className="text-xs font-semibold text-[var(--color-ink-2)]">
              {isEs ? "Idioma de vista previa" : "Preview language"}
            </span>
            <SegmentedControl
              label={isEs ? "Idioma" : "Language"}
              value={previewLang}
              onChange={(v) => setPreviewLang(v as "en" | "es")}
              segments={[
                { value: "en", label: "EN" },
                { value: "es", label: "ES" },
              ]}
            />
          </div>

          {renderPreviewContent()}
        </div>
      </Drawer>
    </div>
  );
}
