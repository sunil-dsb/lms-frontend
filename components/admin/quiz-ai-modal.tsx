"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { ProcedureQuizQuestion, ProcedureBlock } from "@/lib/types";
import {
  generateQuizFromProcedure,
  generateQuizFromChapter,
  type GenerateQuizApiInput,
  type GenerateChapterQuizApiInput,
} from "@/services/library/api";
import {
  LuSparkles,
  LuPlus,
  LuMinus,
  LuListOrdered,
  LuSquareCheck,
  LuCircleAlert,
  LuLoader,
  LuLayers,
  LuCheck,
} from "react-icons/lu";

export interface QuizAiModalProcedureContext {
  titleEn?: string;
  titleEs?: string;
  purposeEn?: string;
  purposeEs?: string;
  blocks?: ProcedureBlock[] | Array<Record<string, unknown>>;
  ingredients?: Array<Record<string, unknown>>;
}

export interface QuizAiModalChapterContext {
  courseId?: string;
  courseName?: string;
  chapterNumber?: number;
  titleEn?: string;
  titleEs?: string;
  purposeEn?: string;
  purposeEs?: string;
  blocks?: ProcedureBlock[] | Array<Record<string, unknown>>;
}

interface QuizAiModalProps {
  open: boolean;
  onClose: () => void;
  sourceType?: "procedure" | "chapter";
  procedureId?: string | null;
  procedureContext?: QuizAiModalProcedureContext | null;
  chapterId?: string | null;
  chapterContext?: QuizAiModalChapterContext | null;
  existingQuestionsCount?: number;
  onApplyQuestions: (
    questions: ProcedureQuizQuestion[],
    applyMode: "replace" | "append",
  ) => void;
}

const GENERATION_STEPS = [
  {
    en: "Scanning procedure content & recipe blocks...",
    es: "Escaneando contenido y recetas del procedimiento...",
  },
  {
    en: "Analyzing preparation steps, allergens & safety rules...",
    es: "Analizando pasos de cocción, alérgenos y seguridad...",
  },
  {
    en: "Drafting bilingual question prompts (English & Spanish)...",
    es: "Redactando preguntas bilingües (inglés y español)...",
  },
  {
    en: "Formulating realistic answer choices & sequence order...",
    es: "Formulando opciones de respuesta y orden de secuencia...",
  },
  {
    en: "Validating answer keys & assembling quiz...",
    es: "Validando respuestas correctas y armando el quiz...",
  },
];

function extractBilingualText(raw: unknown): { en: string; es: string } {
  if (!raw) return { en: "", es: "" };
  if (typeof raw === "string") {
    const s = raw.trim();
    return { en: s, es: s };
  }
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    // 1. Nested in label or text
    if (obj.label && typeof obj.label === "object") {
      const l = obj.label as Record<string, unknown>;
      const en = typeof l.en === "string" ? l.en.trim() : "";
      const es = typeof l.es === "string" ? l.es.trim() : "";
      if (en || es) return { en: en || es, es: es || en };
    }
    if (typeof obj.label === "string" && obj.label.trim()) {
      const s = obj.label.trim();
      return { en: s, es: s };
    }
    if (obj.text && typeof obj.text === "object") {
      const t = obj.text as Record<string, unknown>;
      const en = typeof t.en === "string" ? t.en.trim() : "";
      const es = typeof t.es === "string" ? t.es.trim() : "";
      if (en || es) return { en: en || es, es: es || en };
    }
    if (typeof obj.text === "string" && obj.text.trim()) {
      const s = obj.text.trim();
      return { en: s, es: s };
    }
    // 2. Direct en / es
    const en = typeof obj.en === "string" ? obj.en.trim() : "";
    const es = typeof obj.es === "string" ? obj.es.trim() : "";
    if (en || es) return { en: en || es, es: es || en };
  }
  return { en: "", es: "" };
}

export function QuizAiModal({
  open,
  onClose,
  sourceType = "procedure",
  procedureId,
  procedureContext,
  chapterId,
  chapterContext,
  existingQuestionsCount = 0,
  onApplyQuestions,
}: QuizAiModalProps): React.ReactElement | null {
  const locale = useLocale();
  const isEs = locale === "es";

  // Mode: "auto" (AI decides mix) vs "custom" (User specifies counts)
  const [mode, setMode] = React.useState<"auto" | "custom">("auto");
  const [autoCount, setAutoCount] = React.useState<number>(3);
  const [mcqCount, setMcqCount] = React.useState<number>(2);
  const [seqCount, setSeqCount] = React.useState<number>(1);
  const [applyMode, setApplyMode] = React.useState<"replace" | "append">(
    "replace",
  );

  const [isGenerating, setIsGenerating] = React.useState(false);
  const [loadingStep, setLoadingStep] = React.useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = React.useState<number>(0);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const abortCtrlRef = React.useRef<AbortController | null>(null);

  // Live timer and step progression during generation
  React.useEffect(() => {
    if (!isGenerating) {
      setLoadingStep(0);
      setElapsedSeconds(0);
      return;
    }

    const timerInterval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) =>
        prev < GENERATION_STEPS.length - 1 ? prev + 1 : prev,
      );
    }, 1800);

    return () => {
      clearInterval(timerInterval);
      clearInterval(stepInterval);
    };
  }, [isGenerating]);

  // Reset modal state when opening
  React.useEffect(() => {
    if (open) {
      setErrorMessage(null);
      setIsGenerating(false);
      setLoadingStep(0);
      setElapsedSeconds(0);
      setMode("auto");
      setAutoCount(3);
      setMcqCount(2);
      setSeqCount(1);
      setApplyMode("replace");
    } else {
      abortCtrlRef.current?.abort();
      abortCtrlRef.current = null;
    }
  }, [open, existingQuestionsCount]);

  const customTotal = mcqCount + seqCount;
  const isCustomValid = customTotal >= 2 && customTotal <= 10;
  const activeTotal = mode === "auto" ? autoCount : customTotal;

  // Active blocks based on source type
  const activeBlocks = React.useMemo(() => {
    if (sourceType === "chapter") {
      return chapterContext?.blocks || [];
    }
    return procedureContext?.blocks || [];
  }, [sourceType, chapterContext, procedureContext]);

  // Method steps count helper
  const methodStepsCount = React.useMemo(() => {
    let count = 0;
    for (const b of activeBlocks) {
      if (
        b &&
        typeof b === "object" &&
        (b as Record<string, unknown>).kind === "method"
      ) {
        const steps = (b as Record<string, unknown>).steps;
        if (Array.isArray(steps)) count += steps.length;
      }
    }
    return count;
  }, [activeBlocks]);

  // Attachment check (e.g. PDF)
  const pdfAttachmentName = React.useMemo(() => {
    for (const b of activeBlocks) {
      if (
        b &&
        typeof b === "object" &&
        (b as Record<string, unknown>).kind === "attachment"
      ) {
        const att = b as Record<string, unknown>;
        const href = typeof att.href === "string" ? att.href : "";
        const title = typeof att.title === "string" ? att.title : "";
        const meta = typeof att.meta === "string" ? att.meta : "";
        if (
          href.toLowerCase().endsWith(".pdf") ||
          meta.toLowerCase().includes("pdf")
        ) {
          return title || href.split("/").pop() || "sample.pdf";
        }
      }
    }
    return null;
  }, [activeBlocks]);

  const hasMethodSteps = methodStepsCount >= 2;

  const handleGenerate = async (): Promise<void> => {
    if (isGenerating) return;
    setErrorMessage(null);
    setIsGenerating(true);
    setLoadingStep(0);
    setElapsedSeconds(0);

    const ctrl = new AbortController();
    abortCtrlRef.current = ctrl;

    try {
      let response;
      if (sourceType === "chapter") {
        const payload: GenerateChapterQuizApiInput = {
          chapterId: chapterId || undefined,
          chapter:
            !chapterId && chapterContext
              ? {
                  courseName: chapterContext.courseName,
                  chapterNumber: chapterContext.chapterNumber,
                  titleEn: chapterContext.titleEn,
                  titleEs: chapterContext.titleEs,
                  purposeEn: chapterContext.purposeEn,
                  purposeEs: chapterContext.purposeEs,
                  blocks: chapterContext.blocks as Array<
                    Record<string, unknown>
                  >,
                }
              : undefined,
          config:
            mode === "auto"
              ? { totalQuestions: autoCount }
              : {
                  totalQuestions: customTotal,
                  mcqCount,
                  sequenceCount: seqCount,
                },
        };
        response = await generateQuizFromChapter(payload, {
          signal: ctrl.signal,
        });
      } else {
        const payload: GenerateQuizApiInput = {
          procedureId: procedureId || undefined,
          procedure:
            !procedureId && procedureContext
              ? {
                  titleEn: procedureContext.titleEn,
                  titleEs: procedureContext.titleEs,
                  purposeEn: procedureContext.purposeEn,
                  purposeEs: procedureContext.purposeEs,
                  blocks: procedureContext.blocks as Array<
                    Record<string, unknown>
                  >,
                  ingredients: procedureContext.ingredients,
                }
              : undefined,
          config:
            mode === "auto"
              ? { totalQuestions: autoCount }
              : {
                  totalQuestions: customTotal,
                  mcqCount,
                  sequenceCount: seqCount,
                },
        };
        response = await generateQuizFromProcedure(payload, {
          signal: ctrl.signal,
        });
      }

      if (!response.questions || response.questions.length === 0) {
        throw new Error(
          isEs
            ? "No se generaron preguntas válidas."
            : "No valid questions were generated.",
        );
      }

      // Convert questions: robustly extract choices and sequence labels
      const formattedQuestions: ProcedureQuizQuestion[] = [];

      for (const q of response.questions) {
        const prompt = {
          en: (q.prompt?.en || q.question?.en || "").trim(),
          es: (q.prompt?.es || q.question?.es || "").trim(),
        };
        if (!prompt.en && !prompt.es) continue;

        const isPromptSequence = Boolean(
          (prompt.en &&
            /arrange.*(step|order)|chronological|sequence/i.test(prompt.en)) ||
          (prompt.es &&
            /organiza.*(paso|orden)|cronol[oó]gico|secuencia/i.test(prompt.es)),
        );
        const hasSequenceItems =
          Array.isArray(q.sequenceItems) && q.sequenceItems.length >= 2;

        const isSeq =
          q.type === "sequence" || isPromptSequence || hasSequenceItems;

        if (isSeq) {
          const rawItems =
            Array.isArray(q.sequenceItems) && q.sequenceItems.length > 0
              ? q.sequenceItems
              : Array.isArray(q.choices)
                ? q.choices
                : [];
          const validItems: Array<{
            id: string;
            label: { en: string; es: string };
          }> = [];
          for (let i = 0; i < rawItems.length; i++) {
            const parsed = extractBilingualText(rawItems[i]);
            if (parsed.en || parsed.es) {
              validItems.push({
                id: (rawItems[i] as { id?: string })?.id || `s-${i + 1}`,
                label: {
                  en: parsed.en || parsed.es,
                  es: parsed.es || parsed.en,
                },
              });
            }
          }

          // STRICT CHECK: Sequence questions MUST have at least 2 steps
          if (validItems.length >= 2) {
            formattedQuestions.push({
              id:
                q.id || `q-seq-${Date.now()}-${formattedQuestions.length + 1}`,
              type: "sequence",
              prompt: {
                en: prompt.en || prompt.es,
                es: prompt.es || prompt.en,
              },
              sequenceItems: validItems,
              choices: [],
              correctChoiceId: "",
            });
          }
        } else {
          // Multiple Choice
          const rawChoices = Array.isArray(q.choices) ? q.choices : [];
          const validChoices: Array<{
            id: string;
            label: { en: string; es: string };
          }> = [];
          for (let i = 0; i < rawChoices.length; i++) {
            const parsed = extractBilingualText(rawChoices[i]);
            if (parsed.en || parsed.es) {
              validChoices.push({
                id: (rawChoices[i] as { id?: string })?.id || `c-${i + 1}`,
                label: {
                  en: parsed.en || parsed.es,
                  es: parsed.es || parsed.en,
                },
              });
            }
          }

          // STRICT CHECK: Without at least 2 non-empty options, there should be NO MCQ
          if (validChoices.length >= 2) {
            let correctChoiceId = q.correctChoiceId || "";
            if (!validChoices.some((c) => c.id === correctChoiceId)) {
              correctChoiceId = validChoices[0].id;
            }

            formattedQuestions.push({
              id:
                q.id || `q-mcq-${Date.now()}-${formattedQuestions.length + 1}`,
              type: "multiple_choice",
              prompt: {
                en: prompt.en || prompt.es,
                es: prompt.es || prompt.en,
              },
              choices: validChoices,
              correctChoiceId,
              sequenceItems: undefined,
            });
          }
        }
      }

      if (formattedQuestions.length === 0) {
        throw new Error(
          isEs
            ? "No se pudieron generar preguntas con opciones válidas. Por favor intenta de nuevo."
            : "Could not generate questions with valid options. Please try again.",
        );
      }

      // Directly apply to QuizEditor
      onApplyQuestions(formattedQuestions, applyMode);

      if (response.advisory) {
        toast.info(response.advisory);
      } else {
        toast.success(
          isEs
            ? `¡Quiz generado con éxito! (${formattedQuestions.length} preguntas)`
            : `Quiz generated successfully! (${formattedQuestions.length} questions)`,
        );
      }

      onClose();
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "CanceledError") return;
      if (ctrl.signal.aborted) return;

      const message =
        err instanceof Error
          ? err.message
          : isEs
            ? "Error al generar el quiz con IA."
            : "Failed to generate quiz with AI.";
      setErrorMessage(message);
    } finally {
      setIsGenerating(false);
      abortCtrlRef.current = null;
    }
  };

  const handleModalClose = (): void => {
    if (isGenerating) return; // Disallow closing while generating
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleModalClose}
      size="2xl"
      className="max-w-[700px] h-[620px] min-h-[620px] flex flex-col justify-between"
    >
      <ModalHeader
        title={isEs ? "Generar Quiz con IA" : "Generate Quiz with AI"}
        description={
          sourceType === "chapter"
            ? isEs
              ? "Crea preguntas bilingües automáticamente a partir del contenido de este capítulo."
              : "Automatically generate bilingual assessment questions from this chapter's content."
            : isEs
              ? "Crea preguntas bilingües automáticamente a partir del contenido de este procedimiento."
              : "Automatically generate bilingual assessment questions from this procedure's content."
        }
        onClose={handleModalClose}
        closeLabel={isEs ? "Cerrar" : "Close"}
      />

      <ModalBody className="flex-1 overflow-y-auto space-y-4 flex flex-col justify-start">
        {/* Source Header (Procedure or Chapter) */}
        <div className="rounded-xl border border-line bg-wash p-4 space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-3">
              {sourceType === "chapter"
                ? isEs
                  ? "Capítulo Seleccionado"
                  : "Source Chapter"
                : isEs
                  ? "Procedimiento Seleccionado"
                  : "Source Procedure"}
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              {pdfAttachmentName ? (
                <span className="text-xs px-2 py-1 rounded-full font-medium bg-surface border border-line text-[var(--color-brand-600)]">
                  PDF: {pdfAttachmentName}
                </span>
              ) : null}
              <span className="text-xs px-2 py-1 rounded-full font-medium bg-surface border border-line text-ink-2">
                {hasMethodSteps
                  ? isEs
                    ? `${methodStepsCount} pasos cronológicos`
                    : `${methodStepsCount} method steps`
                  : isEs
                    ? "Sin pasos secuenciales"
                    : "No sequential steps"}
              </span>
            </div>
          </div>
          <h4 className="text-sm font-bold text-ink truncate">
            {sourceType === "chapter"
              ? `${chapterContext?.chapterNumber ? `Chapter ${chapterContext.chapterNumber}: ` : ""}${chapterContext?.titleEn || chapterContext?.titleEs || (isEs ? "Capítulo en borrador" : "Draft Chapter")}`
              : procedureContext?.titleEn ||
                procedureContext?.titleEs ||
                (isEs ? "Procedimiento en borrador" : "Draft Procedure")}
          </h4>
          {sourceType === "chapter" && chapterContext?.courseName ? (
            <p className="text-xs font-medium text-[var(--color-brand-600)]">
              {isEs ? "Curso" : "Course"}: {chapterContext.courseName}
            </p>
          ) : null}
          {(
            sourceType === "chapter"
              ? chapterContext?.purposeEn || chapterContext?.purposeEs
              : procedureContext?.purposeEn || procedureContext?.purposeEs
          ) ? (
            <p className="text-xs text-ink-2 line-clamp-2">
              {sourceType === "chapter"
                ? chapterContext?.purposeEn || chapterContext?.purposeEs
                : procedureContext?.purposeEn || procedureContext?.purposeEs}
            </p>
          ) : null}
        </div>

        {/* Error Notification */}
        {errorMessage ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-600 dark:text-red-400 flex items-start gap-3 shrink-0">
            <LuCircleAlert className="size-4 shrink-0 mt-1" />
            <div className="space-y-1">
              <p className="font-semibold">
                {isEs ? "Error al generar" : "Generation Error"}
              </p>
              <p>{errorMessage}</p>
            </div>
          </div>
        ) : null}

        {/* Dynamic Live Generation Progress State */}
        {isGenerating ? (
          <div className="rounded-xl border border-[var(--color-brand-tint-2)] bg-[var(--color-brand-tint)] p-5 space-y-4 min-h-[200px] flex flex-col justify-between">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--color-brand-tint-2)]/60 pb-3">
              <div className="flex items-center gap-2">
                <LuLoader className="size-4 animate-spin text-[var(--color-brand-600)]" />
                <span className="text-xs font-bold text-[var(--color-brand-700)]">
                  {isEs
                    ? "Generando quiz con IA..."
                    : "Generating quiz with AI..."}
                </span>
              </div>
              <span className="text-[11px] font-mono px-2 py-1 rounded-md bg-surface text-[var(--color-brand-700)] border border-line font-bold">
                {Math.floor(elapsedSeconds / 60)}:
                {(elapsedSeconds % 60).toString().padStart(2, "0")}s
              </span>
            </div>

            {/* Stepped Checklist */}
            <ol className="space-y-2 text-xs">
              {GENERATION_STEPS.map((s, idx) => {
                const isDone = idx < loadingStep;
                const isCurrent = idx === loadingStep;
                const label = isEs ? s.es : s.en;

                return (
                  <li
                    key={idx}
                    className={cn(
                      "flex items-center gap-3 transition-opacity",
                      isDone
                        ? "text-[var(--color-ink)] font-medium"
                        : isCurrent
                          ? "text-[var(--color-brand-700)] font-bold"
                          : "text-ink-3 opacity-50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px]",
                        isDone
                          ? "bg-[var(--color-ok)] text-white shadow-xs"
                          : isCurrent
                            ? "bg-[var(--color-brand-600)] text-white ring-2 ring-[var(--color-brand-tint-2)]"
                            : "bg-surface border border-line text-ink-3",
                      )}
                    >
                      {isDone ? (
                        <LuCheck className="size-3 stroke-[3]" />
                      ) : isCurrent ? (
                        <LuLoader className="size-3 animate-spin" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </span>
                    <span className="truncate">{label}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : (
          <>
            {/* Mode Selector */}
            <div className="space-y-2 shrink-0">
              <label className="text-xs font-bold uppercase tracking-wider text-ink-2">
                {isEs ? "Modo de Generación" : "Generation Mode"}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setMode("auto")}
                  className={cn(
                    "flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                    mode === "auto"
                      ? "border-[var(--color-brand-600)] bg-surface text-[var(--color-brand-600)] shadow-xs ring-1 ring-[var(--color-brand-600)]"
                      : "border-line bg-surface text-ink-2 hover:bg-wash",
                  )}
                >
                  <LuSparkles className="size-4" />
                  <span>
                    {isEs ? "Auto (Mezcla Equilibrada)" : "Auto (Balanced Mix)"}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setMode("custom")}
                  className={cn(
                    "flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer",
                    mode === "custom"
                      ? "border-[var(--color-brand-600)] bg-surface text-[var(--color-brand-600)] shadow-xs ring-1 ring-[var(--color-brand-600)]"
                      : "border-line bg-surface text-ink-2 hover:bg-wash",
                  )}
                >
                  <LuLayers className="size-4" />
                  <span>
                    {isEs ? "Desglose Personalizado" : "Custom Breakdown"}
                  </span>
                </button>
              </div>
            </div>

            {/* Mode Controls with stable min-height */}
            {mode === "auto" ? (
              <div className="rounded-xl border border-line bg-surface p-5 space-y-3 shadow-sm min-h-[180px] flex flex-col justify-between">
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-[var(--color-brand-tint-2)] text-[var(--color-brand-600)] flex items-center justify-center shrink-0">
                    <LuSparkles className="size-4" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-ink">
                      {isEs
                        ? "La IA generará la mezcla óptima de preguntas"
                        : "AI will generate an optimal question mix"}
                    </h4>
                    <p className="text-xs text-ink-2">
                      {isEs
                        ? "Formula opciones verídicas y pasos cronológicos a partir del procedimiento."
                        : "Drafts both Multiple Choice and Sequence questions based on procedure steps."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-line">
                  <span className="text-xs font-semibold text-ink">
                    {isEs
                      ? "Preguntas Objetivo (2-10)"
                      : "Target Questions (2-10)"}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={autoCount <= 2 || isGenerating}
                      onClick={() =>
                        setAutoCount((prev) => Math.max(2, prev - 1))
                      }
                      className="size-8 rounded-lg border border-line bg-surface flex items-center justify-center text-ink hover:bg-wash disabled:opacity-40 transition-all cursor-pointer"
                    >
                      <LuMinus className="size-4" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold text-ink">
                      {autoCount}
                    </span>
                    <button
                      type="button"
                      disabled={autoCount >= 10 || isGenerating}
                      onClick={() =>
                        setAutoCount((prev) => Math.min(10, prev + 1))
                      }
                      className="size-8 rounded-lg border border-line bg-surface flex items-center justify-center text-ink hover:bg-wash disabled:opacity-40 transition-all cursor-pointer"
                    >
                      <LuPlus className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-line bg-surface p-5 space-y-4 shadow-xs min-h-[200px] flex flex-col justify-between">
                <div className="space-y-3">
                  {/* MCQ Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <LuSquareCheck className="size-4 text-ink-2" />
                      <span className="text-xs font-medium text-ink">
                        {isEs ? "Opción Múltiple" : "Multiple Choice"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={mcqCount <= 0 || isGenerating}
                        onClick={() =>
                          setMcqCount((prev) => Math.max(0, prev - 1))
                        }
                        className="size-8 rounded-lg border border-line bg-surface flex items-center justify-center text-ink hover:bg-wash disabled:opacity-40 transition-all cursor-pointer"
                      >
                        <LuMinus className="size-4" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-ink">
                        {mcqCount}
                      </span>
                      <button
                        type="button"
                        disabled={customTotal >= 10 || isGenerating}
                        onClick={() =>
                          setMcqCount((prev) => Math.min(10, prev + 1))
                        }
                        className="size-8 rounded-lg border border-line bg-surface flex items-center justify-center text-ink hover:bg-wash disabled:opacity-40 transition-all cursor-pointer"
                      >
                        <LuPlus className="size-4" />
                      </button>
                    </div>
                  </div>

                  {/* Sequence Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <LuListOrdered className="size-4 text-ink-2" />
                      <div>
                        <span className="text-xs font-medium text-ink">
                          {isEs
                            ? "Ordenar en Secuencia"
                            : "Arrange in Sequence"}
                        </span>
                        {!hasMethodSteps ? (
                          <span className="block text-[10px] text-amber-600 dark:text-amber-400">
                            {isEs
                              ? "(No recomendado: sin pasos)"
                              : "(No method steps detected)"}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={seqCount <= 0 || isGenerating}
                        onClick={() =>
                          setSeqCount((prev) => Math.max(0, prev - 1))
                        }
                        className="size-8 rounded-lg border border-line bg-surface flex items-center justify-center text-ink hover:bg-wash disabled:opacity-40 transition-all cursor-pointer"
                      >
                        <LuMinus className="size-4" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-ink">
                        {seqCount}
                      </span>
                      <button
                        type="button"
                        disabled={customTotal >= 10 || isGenerating}
                        onClick={() =>
                          setSeqCount((prev) => Math.min(10, prev + 1))
                        }
                        className="size-8 rounded-lg border border-line bg-surface flex items-center justify-center text-ink hover:bg-wash disabled:opacity-40 transition-all cursor-pointer"
                      >
                        <LuPlus className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-line flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">
                    {isEs ? "Total Combinado:" : "Total Questions:"}
                  </span>
                  <span
                    className={cn(
                      "font-bold px-2 py-1 rounded",
                      isCustomValid
                        ? "text-[var(--color-brand-600)] bg-[var(--color-brand-tint)]"
                        : "text-red-600 bg-red-500/10",
                    )}
                  >
                    {customTotal} (mín 2, máx 10)
                  </span>
                </div>
              </div>
            )}

            {/* Existing Questions Conflict / Append Toggle */}
            {existingQuestionsCount > 0 ? (
              <div className="rounded-xl border border-line bg-wash p-4 space-y-2 shrink-0">
                <span className="text-xs font-semibold text-ink">
                  {isEs
                    ? `Actualmente tienes ${existingQuestionsCount} pregunta(s) en este quiz`
                    : `You currently have ${existingQuestionsCount} question(s) in this quiz`}
                </span>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-ink">
                    <input
                      type="radio"
                      name="applyMode"
                      value="replace"
                      disabled={isGenerating}
                      checked={applyMode === "replace"}
                      onChange={() => setApplyMode("replace")}
                      className="accent-[var(--color-brand-600)]"
                    />
                    <span>
                      {isEs ? "Reemplazar existentes" : "Replace existing"}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-ink">
                    <input
                      type="radio"
                      name="applyMode"
                      value="append"
                      disabled={isGenerating}
                      checked={applyMode === "append"}
                      onChange={() => setApplyMode("append")}
                      className="accent-[var(--color-brand-600)]"
                    />
                    <span>
                      {isEs ? "Agregar a existentes" : "Append to existing"}
                    </span>
                  </label>
                </div>
              </div>
            ) : null}
          </>
        )}
      </ModalBody>

      <ModalFooter>
        <Button
          type="button"
          variant="neutral"
          disabled={isGenerating}
          onClick={handleModalClose}
        >
          {isEs ? "Cancelar" : "Cancel"}
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={isGenerating || (mode === "custom" && !isCustomValid)}
          onClick={handleGenerate}
        >
          {isGenerating ? (
            <>
              <LuLoader className="size-4 animate-spin" />
              <span>{isEs ? "Generando..." : "Generating..."}</span>
            </>
          ) : (
            <>
              <LuSparkles className="size-4" />
              <span>
                {isEs
                  ? `Generar Quiz (${activeTotal})`
                  : `Generate Quiz (${activeTotal})`}
              </span>
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
