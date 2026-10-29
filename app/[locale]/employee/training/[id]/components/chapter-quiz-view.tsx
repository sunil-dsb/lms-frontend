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
  LuSparkles,
  LuBookOpen,
  LuCircleAlert,
  LuRotateCcw,
  LuArrowRight,
  LuTarget,
} from "react-icons/lu";
import type { ProcedureQuizQuestion } from "@/lib/types";
import { completeMyTrainingChapter } from "@/services/courses/api";
import { MY_TRAINING_QUERY_KEY } from "@/services/courses/hooks";
import { cn } from "@/lib/utils";

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
}

/**
 * Quiz View:
 * - Questions shown without revealing answers while answering
 * - Shows linked procedure attribution pill if question is from a linked procedure
 * - Evaluates against admin-configured passing answers threshold (e.g. 4 of 6)
 * - On pass: records completion, unlocks next chapter, and offers direct navigation
 * - On fail: requires retrying or reviewing without giving away the correct answers
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
    // Calculate final score
    let calculatedScore = 0;
    questions.forEach((q, idx) => {
      const selected = answers[idx];
      if (selected && selected === q.correctChoiceId) {
        calculatedScore += 1;
      }
    });

    const passed = calculatedScore >= passingRequirement;
    if (passed) {
      if (chapterId) {
        try {
          await completeMyTrainingChapter(courseId, chapterId);
          await queryClient.invalidateQueries({
            queryKey: MY_TRAINING_QUERY_KEY,
          });
          router.refresh();
        } catch {
          setSubmissionError(true);
          return;
        }
      } else {
        setSubmissionError(true);
        return;
      }
    }

    setScore(calculatedScore);
    setHasPassed(passed);
    setIsSubmitted(true);
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
    const nextChapterNumber =
      chapterNumber < totalChapters ? chapterNumber + 1 : null;

    if (hasPassed) {
      return (
        <div className="relative min-h-screen bg-[var(--color-bg)] flex flex-col justify-between">
          <main className="mx-auto w-full max-w-doc space-y-6 px-4 pt-12 text-center sm:px-6">
            {/* Celebration icon */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-600 text-white shadow-lg animate-in zoom-in-90 duration-300">
              <LuSparkles className="text-4xl" aria-hidden="true" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200">
                <LuCheck className="w-3.5 h-3.5 stroke-[3]" />
                {isEs ? "Cuestionario aprobado" : "Quiz passed"}
              </span>
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">
                {isEs ? "¡Excelente trabajo!" : "Great job!"}
              </h1>
              <p className="text-base text-[var(--color-ink-2)] max-w-md mx-auto">
                {isEs
                  ? `Obtuviste ${score} de ${totalQuestions} respuestas correctas (requisito mínimo: ${passingRequirement}).`
                  : `You answered ${score} of ${totalQuestions} questions correctly (minimum required: ${passingRequirement}).`}
              </p>
            </div>

            {/* Score & unlock badge */}
            <div className="rounded-2xl border border-[var(--color-line-2)] bg-[var(--color-surface)] p-5 text-left space-y-3.5 shadow-xs max-w-lg mx-auto">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-line-2)]">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    <LuTarget className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-[var(--color-ink)]">
                    {isEs ? "Resultado de la prueba" : "Score result"}
                  </span>
                </div>
                <span className="text-sm font-bold text-emerald-600">
                  {Math.round((score / totalQuestions) * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-2.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                <LuCheck className="text-lg shrink-0 stroke-[3]" />
                <span>
                  {isEs
                    ? `Requisitos del Capítulo ${chapterNumber} completados`
                    : `Chapter ${chapterNumber} requirements cleared`}
                </span>
              </div>

              <p className="text-xs text-[var(--color-ink-2)] leading-relaxed">
                {nextChapterNumber
                  ? isEs
                    ? `Tu progreso ha sido registrado. El Capítulo ${nextChapterNumber} ya está desbloqueado para continuar.`
                    : `Your progress has been recorded. Chapter ${nextChapterNumber} is now unlocked and ready.`
                  : isEs
                    ? "¡Has completado todos los capítulos de este curso!"
                    : "You have successfully completed all chapters for this course!"}
              </p>
            </div>
          </main>

          {/* Bottom CTAs */}
          <div
            className="fixed bottom-0 right-0 z-30 flex justify-center"
            style={{ left: sidebarOffsetPx ? `${sidebarOffsetPx}px` : 0 }}
          >
            <div
              className="w-full max-w-doc px-4 sm:px-6 pt-4 space-y-2.5"
              style={{
                paddingBottom:
                  "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))",
                background:
                  "linear-gradient(to top, var(--color-bg) 60%, color-mix(in srgb, var(--color-bg) 95%, transparent) 80%, transparent 100%)",
              }}
            >
              {nextChapterNumber ? (
                <button
                  type="button"
                  onClick={() => {
                    router.push(
                      `${effectiveBasePath}?chapter=${nextChapterNumber}`,
                    );
                    router.refresh();
                  }}
                  className="flex w-full min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-[var(--color-brand-600)] px-6 py-3.5 text-center font-[family-name:var(--font-ui)] text-base font-semibold text-white shadow-md transition-all duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-brand-700)] active:scale-[0.99] cursor-pointer"
                >
                  <span>
                    {isEs
                      ? `Continuar al Capítulo ${nextChapterNumber}`
                      : `Continue to Chapter ${nextChapterNumber}`}
                  </span>
                  <LuArrowRight className="w-5 h-5" />
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  router.push(backHref ?? effectiveBasePath);
                  router.refresh();
                }}
                className={`flex w-full min-h-[46px] items-center justify-center rounded-2xl px-6 py-2.5 text-center font-[family-name:var(--font-ui)] text-sm font-semibold transition-all cursor-pointer ${
                  nextChapterNumber
                    ? "bg-[var(--color-panel)] text-[var(--color-ink)] hover:bg-[var(--color-panel-2)]"
                    : "bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)] shadow-md"
                }`}
              >
                {t("backToChapters")}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // FAILED SCREEN (Answers remain concealed!)
    return (
      <div className="relative min-h-screen bg-[var(--color-bg)] flex flex-col justify-between">
        <main className="mx-auto w-full max-w-doc space-y-6 px-4 pt-12 text-center sm:px-6">
          {/* Warning Icon */}
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500 text-white shadow-lg animate-in zoom-in-90 duration-300">
            <LuCircleAlert className="text-4xl" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200">
              <LuCircleAlert className="w-3.5 h-3.5" />
              {isEs ? "Cuestionario no aprobado" : "Quiz not passed"}
            </span>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">
              {isEs ? "Puntuación insuficiente" : "Passing score not met"}
            </h1>
            <p className="text-base text-[var(--color-ink-2)] max-w-md mx-auto">
              {isEs
                ? `Obtuviste ${score} de ${totalQuestions} respuestas correctas. Se requieren al menos ${passingRequirement} correctas para completar este capítulo.`
                : `You scored ${score} of ${totalQuestions} correct. You need at least ${passingRequirement} correct answers to complete this chapter.`}
            </p>
          </div>

          {/* Details & Integrity Note */}
          <div className="rounded-2xl border border-[var(--color-line-2)] bg-[var(--color-surface)] p-5 text-left space-y-3 shadow-xs max-w-lg mx-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-line-2)]">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink-3)]">
                {isEs ? "Requisito de aprobación" : "Passing requirement"}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                {passingRequirement} / {totalQuestions} (
                {Math.round((passingRequirement / totalQuestions) * 100)}%)
              </span>
            </div>
            <p className="text-xs text-[var(--color-ink-2)] leading-relaxed">
              {isEs
                ? "Para garantizar la seguridad y los estándares de cocina, las respuestas correctas no se revelan. Revisa el contenido del capítulo y vuelve a intentarlo cuando estés listo."
                : "To maintain kitchen excellence and safety, answers are not revealed. Review the chapter content and try the quiz again."}
            </p>
          </div>
        </main>

        {/* Bottom Actions */}
        <div
          className="fixed bottom-0 right-0 z-30 flex justify-center"
          style={{ left: sidebarOffsetPx ? `${sidebarOffsetPx}px` : 0 }}
        >
          <div
            className="w-full max-w-doc px-4 sm:px-6 pt-4 space-y-2.5"
            style={{
              paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))",
              background:
                "linear-gradient(to top, var(--color-bg) 60%, color-mix(in srgb, var(--color-bg) 95%, transparent) 80%, transparent 100%)",
            }}
          >
            <button
              type="button"
              onClick={handleRetryQuiz}
              className="flex w-full min-h-[50px] items-center justify-center gap-2 rounded-2xl bg-[var(--color-brand-600)] px-6 py-3.5 text-center font-[family-name:var(--font-ui)] text-base font-semibold text-white shadow-md transition-all duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-brand-700)] active:scale-[0.99] cursor-pointer"
            >
              <LuRotateCcw className="w-5 h-5" />
              <span>{isEs ? "Reintentar cuestionario" : "Retry quiz"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                router.push(`${effectiveBasePath}?chapter=${chapterNumber}`);
                router.refresh();
              }}
              className="flex w-full min-h-[46px] items-center justify-center rounded-2xl bg-[var(--color-panel)] px-6 py-2.5 text-center font-[family-name:var(--font-ui)] text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-panel-2)] transition-all cursor-pointer"
            >
              {isEs
                ? "Repasar contenido del capítulo"
                : "Review chapter content"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // ACTIVE QUIZ RUNNER (DOES NOT REVEAL ANSWERS WHILE ANSWERING)
  // ---------------------------------------------------------------------------
  const isLastQuestion = currentIndex === totalQuestions - 1;
  const isCurrentAnswered = Boolean(selectedChoiceId);
  const totalAnsweredCount = Object.keys(answers).length;

  return (
    <div className="relative min-h-screen bg-[var(--color-bg)]">
      <main
        className="mx-auto w-full max-w-doc space-y-5 px-4 pt-5 sm:px-6 sm:pt-6"
        style={{ paddingBottom: "120px" }}
      >
        {submissionError ? (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
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
            className="inline-flex min-h-tap items-center gap-1.5 text-sm font-semibold text-[var(--color-ink-2)] hover:text-[var(--color-ink)] transition-colors active:translate-x-[-2px]"
          >
            <LuChevronLeft className="text-lg" aria-hidden="true" />
            <span>
              {isEs
                ? `Capítulo ${chapterNumber} · Pregunta ${currentIndex + 1} de ${totalQuestions}`
                : `Chapter ${chapterNumber} · Question ${currentIndex + 1} of ${totalQuestions}`}
            </span>
          </Link>

          {/* Passing requirement pill */}
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full bg-[var(--color-surface)] border border-[var(--color-line-2)] text-[var(--color-ink-2)] px-3 py-1.5 shadow-2xs">
            <LuTarget className="w-4 h-4 text-[var(--color-brand-600)] shrink-0" />
            <span className="leading-none">
              {isEs
                ? `${passingRequirement} de ${totalQuestions} para aprobar`
                : `${passingRequirement} of ${totalQuestions} to pass`}
            </span>
          </span>
        </div>

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
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 cursor-pointer border-0 p-0 ${
                    isCurrent
                      ? "bg-[var(--color-brand-600)]"
                      : answered
                        ? "bg-[var(--color-brand-600)]/75"
                        : "bg-[var(--color-line-2)] dark:bg-neutral-700 hover:bg-[var(--color-line-hover)]"
                  }`}
                />
              );
            })}
          </div>
        ) : null}

        {/* Question Eyebrow & Prompt */}
        <div
          className={`space-y-2.5 ${totalQuestions > 1 ? "pt-2" : "pt-4 sm:pt-6"}`}
        >
          {currentQuestion?.sourceProcedureTitle ? (
            <div
              className="inline-flex items-center rounded-full text-xs font-semibold bg-[var(--color-brand-tint-2)]/50 text-[var(--color-brand-700)] dark:text-[var(--color-brand-300)] border border-[var(--color-brand-600)]/20"
              style={{ padding: "6px 14px", gap: "8px" }}
            >
              <LuBookOpen className="w-4 h-4 text-[var(--color-brand-600)] shrink-0" />
              <span>
                {isEs
                  ? "Relacionado al procedimiento:"
                  : "Related to procedure:"}{" "}
                <strong>
                  {typeof currentQuestion.sourceProcedureTitle === "string"
                    ? currentQuestion.sourceProcedureTitle
                    : isEs
                      ? (currentQuestion.sourceProcedureTitle as any)?.es ||
                        (currentQuestion.sourceProcedureTitle as any)?.en
                      : (currentQuestion.sourceProcedureTitle as any)?.en ||
                        (currentQuestion.sourceProcedureTitle as any)?.es}
                </strong>
              </span>
            </div>
          ) : (
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-brand-700)]">
              {t("eyebrowCheckUnderstanding")}
            </p>
          )}

          <h1 className="font-[family-name:var(--font-ui)] text-xl font-medium leading-snug tracking-tight text-[var(--color-ink)] sm:text-2xl">
            {questionPrompt}
          </h1>
        </div>

        {/* Radio Option Choices (Without revealing answers) */}
        <fieldset className="space-y-3 pt-2" aria-label={questionPrompt}>
          <legend className="sr-only">{questionPrompt}</legend>
          {choices.map((choice, cIdx) => {
            const isSelected = selectedChoiceId === choice.id;
            const letter = String.fromCharCode(65 + cIdx); // A, B, C, D
            const rawLabel =
              (choice as any)?.label ??
              (choice as any)?.text ??
              (choice as any)?.title;
            const choiceLabel =
              typeof rawLabel === "string"
                ? rawLabel
                : isEs
                  ? rawLabel?.es || rawLabel?.en || ""
                  : rawLabel?.en || rawLabel?.es || "";

            return (
              <label
                key={choice.id || cIdx}
                onClick={() => handleSelectOption(choice.id)}
                style={{ gap: "14px", padding: "14px 18px" }}
                className={`group flex items-center rounded-2xl transition-all duration-[var(--dur)] ease-[var(--ease)] cursor-pointer select-none ${
                  isSelected
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
                    isSelected
                      ? "bg-[var(--color-brand-600)] text-white shadow-xs"
                      : "bg-[var(--color-panel-2)] text-[var(--color-ink-2)] group-hover:bg-[var(--color-panel)]"
                  }`}
                >
                  {letter}
                </span>

                {/* Label text */}
                <span
                  className={`text-sm leading-snug flex-1 ${
                    isSelected
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
      <div
        className={cn(
          "fixed bottom-0 right-0 z-30 flex justify-center left-0",
          sidebarOffsetPx > 0 && "lg:left-[280px]",
        )}
      >
        <div
          className="w-full max-w-doc px-4 sm:px-6 pt-4 flex items-center gap-3"
          style={{
            paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))",
            background:
              "linear-gradient(to top, var(--color-bg) 60%, color-mix(in srgb, var(--color-bg) 95%, transparent) 80%, transparent 100%)",
          }}
        >
          {/* Previous Question Button */}
          {currentIndex > 0 && (
            <button
              type="button"
              onClick={handlePrev}
              className="flex min-h-[50px] items-center justify-center gap-1 rounded-2xl border border-[var(--color-line-2)] bg-[var(--color-surface)] px-4 py-3.5 text-center font-[family-name:var(--font-ui)] text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-panel)] active:scale-[0.99] transition-all cursor-pointer"
            >
              <LuChevronLeft className="w-4 h-4" />
              <span>{isEs ? "Anterior" : "Previous"}</span>
            </button>
          )}

          {/* Next Question OR Submit Quiz Button */}
          {!isLastQuestion ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!isCurrentAnswered}
              className={`flex-1 flex min-h-[50px] items-center justify-center gap-1.5 rounded-2xl px-6 py-3.5 text-center font-[family-name:var(--font-ui)] text-base font-semibold transition-all duration-[var(--dur)] ease-[var(--ease)] ${
                isCurrentAnswered
                  ? "bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)] active:scale-[0.99] shadow-md cursor-pointer"
                  : "bg-[var(--color-panel)] text-[var(--color-ink-3)] cursor-not-allowed"
              }`}
            >
              <span>{isEs ? "Siguiente pregunta" : "Next question"}</span>
              <LuChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isCurrentAnswered}
              className={`flex-1 flex min-h-[50px] items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-center font-[family-name:var(--font-ui)] text-base font-semibold transition-all duration-[var(--dur)] ease-[var(--ease)] ${
                isCurrentAnswered
                  ? "bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)] active:scale-[0.99] shadow-lg cursor-pointer"
                  : "bg-[var(--color-panel)] text-[var(--color-ink-3)] cursor-not-allowed"
              }`}
            >
              <LuCheck className="w-5 h-5 stroke-[2.5]" />
              <span>
                {isEs ? "Finalizar y calificar" : "Submit & check score"}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
