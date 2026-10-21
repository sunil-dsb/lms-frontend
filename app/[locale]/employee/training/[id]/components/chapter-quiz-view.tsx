"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LuChevronLeft, LuCheck, LuSparkles } from "react-icons/lu";
import type { ProcedureQuizQuestion } from "@/lib/types";
import { tickStep } from "../actions";

interface ChapterQuizViewProps {
  courseId: string;
  courseTitle?: string;
  chapterNumber: number;
  totalChapters?: number;
  assignmentId?: string;
  locale: string;
  questions: ProcedureQuizQuestion[];
  basePath?: string;
  backHref?: string;
  sidebarOffsetPx?: number;
}

/**
 * Quiz View matching reference Image 1:
 * - Top back link: "< Quiz · Question X of Y"
 * - Segmented progress bars for all questions
 * - Eyebrow: "CHECK YOUR UNDERSTANDING"
 * - Question title
 * - Pill radio options with terracotta highlight on selection
 * - Bottom CTA: "Check answer" -> "Next question" -> completion celebration
 */
export function ChapterQuizView({
  courseId,
  chapterNumber,
  assignmentId,
  locale,
  questions,
  basePath,
  backHref,
  sidebarOffsetPx = 0,
}: ChapterQuizViewProps): React.ReactElement {
  const router = useRouter();
  const t = useTranslations("employee.training");
  const isEs = locale === "es";
  const effectiveBasePath =
    basePath ?? `/${locale}/employee/training/${courseId}`;

  // Active question index
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = React.useState<string | null>(
    null,
  );
  const [isAnswerChecked, setIsAnswerChecked] = React.useState(false);
  const [isCompleted, setIsCompleted] = React.useState(false);
  const [score, setScore] = React.useState(0);

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex] || questions[0];

  const questionPrompt = isEs
    ? currentQuestion?.prompt.es || currentQuestion?.prompt.en
    : currentQuestion?.prompt.en || currentQuestion?.prompt.es;

  const choices = currentQuestion?.choices ?? [];
  const correctChoiceId = currentQuestion?.correctChoiceId;
  const isCorrect = selectedChoiceId === correctChoiceId;

  const handleSelectOption = (choiceId: string): void => {
    if (isAnswerChecked) return;
    setSelectedChoiceId(choiceId);
  };

  const handleCheckAnswer = (): void => {
    if (!selectedChoiceId) return;
    setIsAnswerChecked(true);
    if (isCorrect) {
      setScore((s) => s + 1);
    }
  };

  const handleNextQuestion = async (): Promise<void> => {
    if (currentIndex + 1 < totalQuestions) {
      setCurrentIndex((i) => i + 1);
      setSelectedChoiceId(null);
      setIsAnswerChecked(false);
    } else {
      // Finished all questions!
      setIsCompleted(true);
      if (assignmentId) {
        // Record chapter completion
        try {
          await tickStep(
            assignmentId,
            `ch-${chapterNumber}-step`,
            true,
            locale,
          );
        } catch {
          // ignore error in demo
        }
      }
    }
  };

  const handleRetryQuestion = (): void => {
    setSelectedChoiceId(null);
    setIsAnswerChecked(false);
  };

  // Completion screen
  if (isCompleted) {
    const finalScore = score + (isCorrect ? 0 : 0);
    return (
      <div className="relative min-h-screen bg-[var(--color-bg)] flex flex-col justify-between">
        <main className="mx-auto w-full max-w-doc space-y-6 px-4 pt-12 text-center sm:px-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md">
            <LuSparkles className="text-3xl" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">
              {t("quizPassedHeading")}
            </h1>
            <p className="text-base text-[var(--color-ink-2)]">
              {t("quizPassedSubtext", {
                score: finalScore || totalQuestions,
                total: totalQuestions,
              })}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--color-line-2)] bg-[var(--color-surface)] p-5 text-left space-y-3">
            <div className="flex items-center gap-2.5 text-sm font-semibold text-emerald-600">
              <LuCheck className="text-lg" />
              <span>Chapter {chapterNumber} requirements cleared</span>
            </div>
            <p className="text-xs text-[var(--color-ink-2)]">
              Your progress has been recorded. You can now advance to the next
              chapter.
            </p>
          </div>
        </main>

        <div
          className="fixed bottom-0 right-0 z-30 flex justify-center"
          style={{ left: sidebarOffsetPx ? `${sidebarOffsetPx}px` : 0 }}
        >
          <div
            className="w-full max-w-doc px-4 sm:px-6 pt-4"
            style={{
              paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))",
              background:
                "linear-gradient(to top, var(--color-bg) 60%, color-mix(in srgb, var(--color-bg) 95%, transparent) 80%, transparent 100%)",
            }}
          >
            <button
              type="button"
              onClick={() => {
                router.push(backHref ?? effectiveBasePath);
                router.refresh();
              }}
              className="flex w-full min-h-[50px] items-center justify-center rounded-2xl bg-[var(--color-brand-600)] px-6 py-3.5 text-center font-[family-name:var(--font-ui)] text-base font-semibold text-white shadow-md transition-all duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-brand-700)] active:scale-[0.99] cursor-pointer"
            >
              {t("backToChapters")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[var(--color-bg)]">
      <main
        className="mx-auto w-full max-w-doc space-y-5 px-4 pt-5 sm:px-6 sm:pt-6"
        style={{ paddingBottom: "120px" }}
      >
        {/* Top Back Header */}
        <div>
          <Link
            href={`${effectiveBasePath}?chapter=${chapterNumber}`}
            className="inline-flex min-h-tap items-center gap-1.5 text-sm font-semibold text-[var(--color-ink-2)] hover:text-[var(--color-ink)] transition-colors active:translate-x-[-2px]"
          >
            <LuChevronLeft className="text-lg" aria-hidden="true" />
            <span>
              {t("questionOfN", {
                current: currentIndex + 1,
                total: totalQuestions,
              })}
            </span>
          </Link>
        </div>

        {/* Segmented Progress Bar (highlighted loading for questions) */}
        <div
          role="progressbar"
          aria-label={`Question ${currentIndex + 1} of ${totalQuestions}`}
          aria-valuenow={currentIndex + 1}
          aria-valuemin={1}
          aria-valuemax={totalQuestions}
          className="flex items-center gap-2 pt-1 pb-1"
        >
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-colors duration-300 ease-out ${
                i <= currentIndex
                  ? "bg-[var(--color-brand-600)]"
                  : "bg-[var(--color-panel-2)]"
              }`}
            />
          ))}
        </div>

        {/* Question Eyebrow & Title */}
        <div className="space-y-1.5 pt-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-brand-700)]">
            {t("eyebrowCheckUnderstanding")}
          </p>
          <h1 className="font-[family-name:var(--font-ui)] text-xl font-medium leading-snug tracking-tight text-[var(--color-ink)] sm:text-2xl">
            {questionPrompt}
          </h1>
        </div>

        {/* Radio Option Choices */}
        <fieldset className="space-y-3 pt-2" aria-label={questionPrompt}>
          <legend className="sr-only">{questionPrompt}</legend>
          {choices.map((choice) => {
            const isSelected = selectedChoiceId === choice.id;
            const choiceLabel = isEs
              ? choice.label.es || choice.label.en
              : choice.label.en || choice.label.es;

            return (
              <label
                key={choice.id}
                onClick={() => handleSelectOption(choice.id)}
                style={{ gap: "14px" }}
                className={`group flex items-center rounded-2xl p-4 transition-all duration-[var(--dur)] ease-[var(--ease)] cursor-pointer select-none ${
                  isSelected
                    ? "border-2 border-[var(--color-brand-600)] bg-[var(--color-brand-tint-2)]/30 shadow-xs"
                    : "border border-[var(--color-line-2)] bg-[var(--color-surface)] hover:border-[var(--color-line)] hover:shadow-xs"
                }`}
              >
                <input
                  type="radio"
                  name="quiz-choice"
                  checked={isSelected}
                  onChange={() => handleSelectOption(choice.id)}
                  disabled={isAnswerChecked}
                  className="sr-only"
                />

                {/* Custom radio circular indicator */}
                <span
                  aria-hidden="true"
                  style={{
                    width: "22px",
                    height: "22px",
                    minWidth: "22px",
                    minHeight: "22px",
                  }}
                  className={`flex shrink-0 items-center justify-center rounded-full transition-colors ${
                    isSelected
                      ? "border-2 border-[var(--color-brand-600)] text-[var(--color-brand-600)]"
                      : "border border-[var(--color-line-3)] bg-[var(--color-surface)] group-hover:border-[var(--color-line)]"
                  }`}
                >
                  {isSelected ? (
                    <span
                      style={{ width: "10px", height: "10px" }}
                      className="rounded-full bg-[var(--color-brand-600)]"
                    />
                  ) : null}
                </span>

                {/* Label text */}
                <span
                  className={`text-sm leading-snug ${
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

        {/* Checked Answer Feedback Alert */}
        {isAnswerChecked ? (
          <div
            role="alert"
            className={`rounded-2xl p-4 text-sm font-medium animate-fadeIn ${
              isCorrect
                ? "border border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "border border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
            }`}
          >
            <p className="font-semibold">
              {isCorrect ? t("correctFeedback") : t("incorrectFeedback")}
            </p>
            {!isCorrect ? (
              <button
                type="button"
                onClick={handleRetryQuestion}
                className="mt-2 text-xs font-bold underline cursor-pointer text-amber-800 dark:text-amber-300"
              >
                {t("tryAgain")}
              </button>
            ) : null}
          </div>
        ) : null}
      </main>

      {/* Sticky Bottom Action Button */}
      <div
        className="fixed bottom-0 right-0 z-30 flex justify-center"
        style={{ left: sidebarOffsetPx ? `${sidebarOffsetPx}px` : 0 }}
      >
        <div
          className="w-full max-w-doc px-4 sm:px-6 pt-4"
          style={{
            paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))",
            background:
              "linear-gradient(to top, var(--color-bg) 60%, color-mix(in srgb, var(--color-bg) 95%, transparent) 80%, transparent 100%)",
          }}
        >
          {!isAnswerChecked ? (
            <button
              type="button"
              onClick={handleCheckAnswer}
              disabled={!selectedChoiceId}
              className={`flex w-full min-h-[50px] items-center justify-center rounded-2xl px-6 py-3.5 text-center font-[family-name:var(--font-ui)] text-base font-semibold shadow-md transition-all duration-[var(--dur)] ease-[var(--ease)] ${
                selectedChoiceId
                  ? "bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)] active:scale-[0.99] cursor-pointer"
                  : "bg-[var(--color-panel)] text-[var(--color-ink-3)] cursor-not-allowed"
              }`}
            >
              {t("checkAnswer")}
            </button>
          ) : isCorrect ? (
            <button
              type="button"
              onClick={handleNextQuestion}
              className="flex w-full min-h-[50px] items-center justify-center rounded-2xl bg-[var(--color-brand-600)] px-6 py-3.5 text-center font-[family-name:var(--font-ui)] text-base font-semibold text-white shadow-md transition-all duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-brand-700)] active:scale-[0.99] cursor-pointer"
            >
              {currentIndex + 1 < totalQuestions
                ? t("nextQuestion")
                : t("finishQuiz")}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRetryQuestion}
              className="flex w-full min-h-[50px] items-center justify-center rounded-2xl bg-[var(--color-panel)] px-6 py-3.5 text-center font-[family-name:var(--font-ui)] text-base font-semibold text-[var(--color-ink)] shadow-xs transition-all hover:bg-[var(--color-panel-2)] cursor-pointer"
            >
              {t("tryAgain")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
