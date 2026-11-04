"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LuChevronLeft,
  LuChevronRight,
  LuCheck,
  LuBookOpen,
  LuTarget,
  LuEye,
  LuArrowRight,
} from "react-icons/lu";
import type { ProcedureQuizQuestion } from "@/lib/types";
import { completeMyTrainingChapter } from "@/services/courses/api";
import { MY_TRAINING_QUERY_KEY } from "@/services/courses/hooks";
import { ApiException } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  ChapterQuizPassedScreen,
  ChapterQuizFailedScreen,
} from "./chapter-quiz-results";
import { ChapterQuizFooterNav } from "./chapter-quiz-footer-nav";

interface ChapterQuizViewProps {
  courseId: string;
  chapterId?: string;
  courseTitle?: string;
  chapterNumber: number;
  totalChapters?: number;
  locale: string;
  questions: ProcedureQuizQuestion[];
  minCorrectAnswers?: number;
  basePath?: string;
  backHref?: string;
  sidebarOffsetPx?: number;
  isCompleted?: boolean;
  isAdmin?: boolean;
}

/**
 * Quiz View:
 * - Questions shown without revealing answers while answering
 * - Shows linked procedure attribution pill if question is from a linked procedure
 * - Evaluates against admin-configured passing answers threshold (e.g. 4 of 6)
 * - On pass: records completion, unlocks next chapter, and offers direct navigation
 * - On fail: requires retrying or reviewing without giving away the correct answers
 * - If already passed (isCompleted): informs the employee that the quiz was completed,
 *   allows reviewing questions without re-attempting or re-submitting to the backend.
 */
export function ChapterQuizView({
  courseId,
  chapterId,
  courseTitle,
  chapterNumber,
  totalChapters = 3,
  locale,
  questions,
  minCorrectAnswers,
  basePath,
  backHref,
  sidebarOffsetPx = 0,
  isCompleted = false,
  isAdmin = false,
}: ChapterQuizViewProps): React.ReactElement {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("employee.training");
  const isEs = locale === "es";
  const effectiveBasePath =
    basePath ?? `/${locale}/employee/training/${courseId}`;

  const totalQuestions = questions.length || 1;
  const passingRequirement =
    minCorrectAnswers &&
    minCorrectAnswers > 0 &&
    minCorrectAnswers <= totalQuestions
      ? minCorrectAnswers
      : Math.max(1, Math.ceil(totalQuestions * 0.7));

  // Current question index & recorded answers: { [questionIndex]: selectedChoiceId }
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [score, setScore] = React.useState(0);
  const [hasPassed, setHasPassed] = React.useState(false);
  const [submissionError, setSubmissionError] = React.useState(false);

  const currentQuestion = questions[currentIndex] || questions[0];

  const rawPrompt =
    (currentQuestion as any)?.prompt ??
    (currentQuestion as any)?.question ??
    (currentQuestion as any)?.title;

  const questionPrompt =
    typeof rawPrompt === "string"
      ? rawPrompt
      : isEs
        ? rawPrompt?.es || rawPrompt?.en || ""
        : rawPrompt?.en || rawPrompt?.es || "";

  const choices = currentQuestion?.choices ?? [];
  const selectedChoiceId = answers[currentIndex] ?? null;

  const handleSelectOption = (choiceId: string): void => {
    setAnswers((prev) => ({
      ...prev,
      [currentIndex]: choiceId,
    }));
  };

  const handleNext = (): void => {
    if (currentIndex + 1 < totalQuestions) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handlePrev = (): void => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmissionError(false);

    try {
      // Calculate final score
      let calculatedScore = 0;
      questions.forEach((q, idx) => {
        const selected = answers[idx];
        if (selected && selected === q.correctChoiceId) {
          calculatedScore += 1;
        }
      });

      const passed = calculatedScore >= passingRequirement;

      // Only record completion on backend if chapter is not already completed!
      if (passed && !isCompleted) {
        if (chapterId) {
          try {
            await completeMyTrainingChapter(courseId, chapterId);
            await queryClient.invalidateQueries({
              queryKey: MY_TRAINING_QUERY_KEY,
            });
            router.refresh();
          } catch (err: unknown) {
            const apiMsg =
              err instanceof ApiException
                ? err.message
                : (err as any)?.response?.data?.message ||
                  (err as any)?.message;
            const fallbackMsg = isEs
              ? "No se pudo guardar tu progreso. Inténtalo de nuevo."
              : "Could not save your progress. Please try again.";
            const finalMsg = apiMsg || fallbackMsg;
            toast.error(finalMsg);
            setSubmissionError(true);
            return;
          }
        } else {
          const msg = isEs
            ? "ID del capítulo no encontrado"
            : "Chapter ID not found";
          toast.error(msg);
          setSubmissionError(true);
          return;
        }
      }

      setScore(calculatedScore);
      setHasPassed(passed);
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryQuiz = (): void => {
    setAnswers({});
    setCurrentIndex(0);
    setIsSubmitted(false);
    setScore(0);
    setHasPassed(false);
    setSubmissionError(false);
  };

  // ---------------------------------------------------------------------------
  // RESULT SCREEN (PASSED OR FAILED)
  // ---------------------------------------------------------------------------
  if (isSubmitted) {
    if (hasPassed) {
      return (
        <ChapterQuizPassedScreen
          score={score}
          totalQuestions={totalQuestions}
          passingRequirement={passingRequirement}
          chapterNumber={chapterNumber}
          totalChapters={totalChapters}
          isEs={isEs}
          effectiveBasePath={effectiveBasePath}
          backHref={backHref}
          sidebarOffsetPx={sidebarOffsetPx}
        />
      );
    }

    return (
      <ChapterQuizFailedScreen
        score={score}
        totalQuestions={totalQuestions}
        passingRequirement={passingRequirement}
        chapterNumber={chapterNumber}
        isEs={isEs}
        effectiveBasePath={effectiveBasePath}
        sidebarOffsetPx={sidebarOffsetPx}
        onRetry={handleRetryQuiz}
      />
    );
  }

  // ---------------------------------------------------------------------------
  // ACTIVE QUIZ RUNNER (DOES NOT REVEAL ANSWERS WHILE ANSWERING)
  // ---------------------------------------------------------------------------
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const isCurrentAnswered = Boolean(selectedChoiceId);

  return (
    <div className="relative min-h-screen bg-[var(--color-bg)]">
      <main
        className="mx-auto w-full max-w-doc space-y-5 px-4 pt-5 sm:px-6 sm:pt-6"
        style={{ paddingBottom: "120px" }}
      >
        {submissionError ? (
          <p
            role="alert"
            className="rounded-[var(--radius-md)] border border-[var(--color-bad)]/20 bg-[var(--color-bad-tint)] p-3 text-sm text-[var(--color-bad)]"
          >
            {isEs
              ? "No se pudo guardar tu progreso. Inténtalo de nuevo."
              : "Could not save your progress. Please try again."}
          </p>
        ) : null}

        {/* Top Back Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href={`${effectiveBasePath}?chapter=${chapterNumber}`}
            className="inline-flex min-h-tap items-center gap-2 text-sm font-semibold text-[var(--color-ink-2)] hover:text-[var(--color-ink)] transition-colors active:translate-x-[-2px]"
          >
            <LuChevronLeft className="text-lg" aria-hidden="true" />
            <span>
              {isEs
                ? `Capítulo ${chapterNumber} · Pregunta ${currentIndex + 1} de ${totalQuestions}`
                : `Chapter ${chapterNumber} · Question ${currentIndex + 1} of ${totalQuestions}`}
            </span>
          </Link>

          {/* Status pill: Admin preview vs Passed vs Passing requirement */}
          {isAdmin ? (
            <span className="inline-flex items-center gap-2 text-xs font-semibold rounded-[var(--radius-sm)] bg-[var(--color-wash)] border border-[var(--color-line-2)] text-[var(--color-ink-2)] px-3 py-1 shadow-2xs">
              <LuEye className="w-4 h-4 text-[var(--color-ink-2)]" />
              <span>
                {isEs ? "Vista previa de preguntas" : "Questions preview"}
              </span>
            </span>
          ) : isCompleted ? (
            <span className="inline-flex items-center gap-2 text-xs font-bold rounded-[var(--radius-sm)] bg-[var(--color-ok-tint)] text-[var(--color-ok)] border border-[var(--color-ok-tint-2)] px-3 py-1 shadow-2xs">
              <LuCheck className="w-4 h-4 stroke-[3]" />
              <span>{isEs ? "Aprobado" : "Passed"}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-xs font-semibold rounded-[var(--radius-sm)] bg-[var(--color-surface)] border border-[var(--color-line-2)] text-[var(--color-ink-2)] px-3 py-1 shadow-2xs">
              <LuTarget className="w-4 h-4 text-[var(--color-brand-600)] shrink-0" />
              <span className="leading-none">
                {isEs
                  ? `${passingRequirement} de ${totalQuestions} para aprobar`
                  : `${passingRequirement} of ${totalQuestions} to pass`}
              </span>
            </span>
          )}
        </div>

        {/* Already Passed Banner */}
        {isCompleted && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-ok-tint-2)] bg-[var(--color-ok-tint)] p-4 text-[var(--color-ok)] shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-ok)] text-white shadow-xs">
                <LuCheck className="h-5 w-5 stroke-[3]" />
              </div>
              <div>
                <div className="text-sm font-bold">
                  {isEs ? "Cuestionario completado" : "Quiz completed"}
                </div>
                <p className="text-xs text-[var(--color-ok)]/85">
                  {isEs
                    ? "Ya has aprobado este cuestionario. Puedes repasar las preguntas; no es necesario volver a enviarlo."
                    : "You've already passed this quiz. You can review questions; no need to reattempt."}
                </p>
              </div>
            </div>
            {chapterNumber < totalChapters ? (
              <button
                type="button"
                onClick={() => {
                  router.push(
                    `${effectiveBasePath}?chapter=${chapterNumber + 1}`,
                  );
                  router.refresh();
                }}
                className="hidden sm:inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--color-ok)] hover:bg-[var(--color-ok-700)] text-white px-4 py-2 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <span>
                  {isEs
                    ? `Capítulo ${chapterNumber + 1}`
                    : `Chapter ${chapterNumber + 1}`}
                </span>
                <LuArrowRight className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        )}

        {/* Multi-question Segmented Progress Bar (only shown when there are 2 or more questions) */}
        {totalQuestions > 1 ? (
          <div
            role="progressbar"
            aria-label={`Question ${currentIndex + 1} of ${totalQuestions}`}
            aria-valuenow={currentIndex + 1}
            aria-valuemin={1}
            aria-valuemax={totalQuestions}
            className="flex items-center gap-2 pt-1 pb-1"
          >
            {Array.from({ length: totalQuestions }).map((_, i) => {
              const answered = Boolean(answers[i]);
              const isCurrent = i === currentIndex;

              return (
                <button
                  type="button"
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  aria-label={`Go to question ${i + 1}`}
                  className={`h-2 flex-1 rounded-full transition-all duration-300 cursor-pointer border-0 p-0 ${
                    isCurrent
                      ? "bg-[var(--color-brand-600)]"
                      : answered
                        ? "bg-[var(--color-brand-600)]/75"
                        : "bg-[var(--color-line-2)] dark:bg-[var(--color-panel-2)] hover:bg-[var(--color-line-hover)]"
                  }`}
                />
              );
            })}
          </div>
        ) : null}

        {/* Question Eyebrow & Prompt */}
        <div
          className={`space-y-3 ${totalQuestions > 1 ? "pt-2" : "pt-4 sm:pt-6"}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-[family-name:var(--font-display)] text-xs font-bold uppercase tracking-wider text-[var(--color-brand-600)]">
              {t("eyebrowCheckUnderstanding")}
            </span>

            {/* If question originates from a linked procedure */}
            {((currentQuestion as { procedureTitle?: string }).procedureTitle ||
              currentQuestion.sourceProcedureTitle) && (
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-ink-2)] bg-[var(--color-panel-2)] px-3 py-1 rounded-full">
                <LuBookOpen className="text-xs shrink-0" />
                <span className="truncate max-w-[200px]">
                  {(currentQuestion as { procedureTitle?: string })
                    .procedureTitle || currentQuestion.sourceProcedureTitle}
                </span>
              </span>
            )}
          </div>

          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-[var(--color-ink)] sm:text-2xl leading-snug">
            {questionPrompt}
          </h2>
        </div>

        {/* Answer Choices List */}
        <fieldset
          className="space-y-3 pt-2"
          aria-label={t("questionOfN", {
            current: currentIndex + 1,
            total: totalQuestions,
          })}
        >
          <legend className="sr-only">{questionPrompt}</legend>

          {choices.map((choice, cIdx) => {
            const isSelected = selectedChoiceId === choice.id;
            const isCorrect =
              isAdmin && choice.id === currentQuestion.correctChoiceId;
            const letter = String.fromCharCode(65 + cIdx); // A, B, C, D...

            const rawText =
              (choice as any)?.text ??
              (choice as any)?.label ??
              (choice as any)?.title;
            const choiceLabel =
              typeof rawText === "string"
                ? rawText
                : isEs
                  ? rawText?.es || rawText?.en || ""
                  : rawText?.en || rawText?.es || "";

            return (
              <label
                key={choice.id || cIdx}
                onClick={() => handleSelectOption(choice.id)}
                style={{ gap: "12px", padding: "12px 16px" }}
                className={`group flex items-center rounded-2xl transition-all duration-[var(--dur)] ease-[var(--ease)] cursor-pointer select-none ${
                  isCorrect
                    ? "border-2 border-[var(--color-ok)] bg-[var(--color-ok-tint)] text-[var(--color-ink)] shadow-xs"
                    : isSelected
                      ? "border-2 border-[var(--color-brand-600)] bg-[var(--color-brand-tint-2)]/30 shadow-xs"
                      : "border border-[var(--color-line-2)] bg-[var(--color-surface)] hover:border-[var(--color-line)] hover:shadow-xs"
                }`}
              >
                <input
                  type="radio"
                  name={`quiz-choice-${currentIndex}`}
                  checked={isSelected}
                  onChange={() => handleSelectOption(choice.id)}
                  className="sr-only"
                />

                {/* Option letter chip */}
                <span
                  aria-hidden="true"
                  style={{ marginRight: "12px" }}
                  className={`flex w-8 h-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                    isCorrect
                      ? "bg-[var(--color-ok)] text-white shadow-xs"
                      : isSelected
                        ? "bg-[var(--color-brand-600)] text-white shadow-xs"
                        : "bg-[var(--color-panel-2)] text-[var(--color-ink-2)] group-hover:bg-[var(--color-panel)]"
                  }`}
                >
                  {letter}
                </span>

                {/* Label text */}
                <span
                  className={`text-sm leading-snug flex-1 ${
                    isCorrect
                      ? "font-semibold text-[var(--color-ink)]"
                      : isSelected
                        ? "font-bold text-[var(--color-ink)]"
                        : "font-medium text-[var(--color-ink)]"
                  }`}
                >
                  {choiceLabel}
                </span>
              </label>
            );
          })}
        </fieldset>
      </main>

      {/* Sticky Bottom Navigation Footer */}
      <ChapterQuizFooterNav
        isEs={isEs}
        isAdmin={isAdmin}
        isCompleted={isCompleted}
        currentIndex={currentIndex}
        totalQuestions={totalQuestions}
        chapterNumber={chapterNumber}
        totalChapters={totalChapters}
        isCurrentAnswered={isCurrentAnswered}
        isSubmitting={isSubmitting}
        sidebarOffsetPx={sidebarOffsetPx}
        effectiveBasePath={effectiveBasePath}
        backHref={backHref}
        onPrev={handlePrev}
        onNext={handleNext}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
