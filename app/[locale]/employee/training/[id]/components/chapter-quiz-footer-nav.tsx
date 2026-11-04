"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LuChevronLeft,
  LuChevronRight,
  LuCheck,
  LuArrowRight,
  LuLoader,
} from "react-icons/lu";

interface ChapterQuizFooterNavProps {
  isEs: boolean;
  isAdmin: boolean;
  isCompleted: boolean;
  currentIndex: number;
  totalQuestions: number;
  chapterNumber: number;
  totalChapters: number;
  isCurrentAnswered: boolean;
  isSubmitting: boolean;
  sidebarOffsetPx?: number;
  effectiveBasePath: string;
  backHref?: string;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export function ChapterQuizFooterNav({
  isEs,
  isAdmin,
  isCompleted,
  currentIndex,
  totalQuestions,
  chapterNumber,
  totalChapters,
  isCurrentAnswered,
  isSubmitting,
  sidebarOffsetPx = 0,
  effectiveBasePath,
  backHref,
  onPrev,
  onNext,
  onSubmit,
}: ChapterQuizFooterNavProps) {
  const router = useRouter();
  const t = useTranslations("employee.training");
  const isLastQuestion = currentIndex === totalQuestions - 1;

  return (
    <div
      className="fixed bottom-0 right-0 z-30 flex justify-center"
      style={{ left: sidebarOffsetPx ? `${sidebarOffsetPx}px` : 0 }}
    >
      <div
        className="flex w-full max-w-doc items-center gap-3 px-4 sm:px-6 pt-4"
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
            onClick={onPrev}
            className="flex min-h-[50px] items-center justify-center gap-1 rounded-full border border-[var(--color-line-2)] bg-[var(--color-surface)] px-4 py-3 text-center font-[family-name:var(--font-ui)] text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-panel)] active:scale-[0.99] transition-all cursor-pointer"
          >
            <LuChevronLeft className="w-4 h-4" />
            <span>{isEs ? "Anterior" : "Previous"}</span>
          </button>
        )}

        {/* Next Question OR Action Button */}
        {isAdmin ? (
          !isLastQuestion ? (
            <button
              type="button"
              onClick={onNext}
              className="flex-1 flex min-h-[50px] items-center justify-center gap-2 rounded-full bg-[var(--color-brand-600)] px-6 py-3 text-center font-[family-name:var(--font-ui)] text-base font-semibold text-white shadow-md hover:bg-[var(--color-brand-700)] active:scale-[0.99] transition-all cursor-pointer"
            >
              <span>{isEs ? "Siguiente pregunta" : "Next question"}</span>
              <LuChevronRight className="w-4 h-4" />
            </button>
          ) : chapterNumber < totalChapters ? (
            <button
              type="button"
              onClick={() => {
                router.push(
                  `${effectiveBasePath}?chapter=${chapterNumber + 1}`,
                );
                router.refresh();
              }}
              className="flex-1 flex min-h-[50px] items-center justify-center gap-2 rounded-full bg-[var(--color-brand-600)] px-6 py-3 text-center font-[family-name:var(--font-ui)] text-base font-semibold text-white shadow-lg hover:bg-[var(--color-brand-700)] active:scale-[0.99] transition-all cursor-pointer"
            >
              <span>
                {isEs
                  ? `Continuar al Capítulo ${chapterNumber + 1}`
                  : `Continue to Chapter ${chapterNumber + 1}`}
              </span>
              <LuArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                router.push(backHref ?? effectiveBasePath);
                router.refresh();
              }}
              className="flex-1 flex min-h-[50px] items-center justify-center gap-2 rounded-full bg-[var(--color-brand-600)] px-6 py-3 text-center font-[family-name:var(--font-ui)] text-base font-semibold text-white shadow-lg hover:bg-[var(--color-brand-700)] active:scale-[0.99] transition-all cursor-pointer"
            >
              <span>{isEs ? "Volver al curso" : "Back to course"}</span>
            </button>
          )
        ) : !isLastQuestion ? (
          <button
            type="button"
            onClick={onNext}
            disabled={!isCurrentAnswered && !isCompleted}
            className={`flex-1 flex min-h-[50px] items-center justify-center gap-2 rounded-full px-6 py-3 text-center font-[family-name:var(--font-ui)] text-base font-semibold transition-all duration-[var(--dur)] ease-[var(--ease)] ${
              isCurrentAnswered || isCompleted
                ? "bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)] active:scale-[0.99] shadow-md cursor-pointer"
                : "bg-[var(--color-panel)] text-[var(--color-ink-3)] cursor-not-allowed"
            }`}
          >
            <span>{isEs ? "Siguiente pregunta" : "Next question"}</span>
            <LuChevronRight className="w-4 h-4" />
          </button>
        ) : isCompleted ? (
          <>
            {chapterNumber < totalChapters ? (
              <button
                type="button"
                onClick={() => {
                  router.push(
                    `${effectiveBasePath}?chapter=${chapterNumber + 1}`,
                  );
                  router.refresh();
                }}
                className="flex-1 flex min-h-[50px] items-center justify-center gap-2 rounded-full bg-[var(--color-brand-600)] px-6 py-3 text-center font-[family-name:var(--font-ui)] text-base font-semibold text-white shadow-lg transition-all duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-brand-700)] active:scale-[0.99] cursor-pointer"
              >
                <span>
                  {isEs
                    ? `Continuar al Capítulo ${chapterNumber + 1}`
                    : `Continue to Chapter ${chapterNumber + 1}`}
                </span>
                <LuArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  router.push(backHref ?? effectiveBasePath);
                  router.refresh();
                }}
                className="flex-1 flex min-h-[50px] items-center justify-center gap-2 rounded-full bg-[var(--color-brand-600)] px-6 py-3 text-center font-[family-name:var(--font-ui)] text-base font-semibold text-white shadow-lg transition-all duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-brand-700)] active:scale-[0.99] cursor-pointer"
              >
                <span>{t("backToChapters")}</span>
              </button>
            )}

            {isCurrentAnswered && (
              <button
                type="button"
                onClick={onSubmit}
                disabled={isSubmitting}
                title={isEs ? "Revisar respuestas" : "Review score"}
                className="flex min-h-[50px] items-center justify-center gap-2 rounded-full border border-[var(--color-line-2)] bg-[var(--color-surface)] px-4 py-3 text-center font-[family-name:var(--font-ui)] text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-panel)] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <LuLoader className="w-4 h-4 animate-spin" />
                ) : (
                  <LuCheck className="w-4 h-4 stroke-[2.5]" />
                )}
                <span>
                  {isSubmitting
                    ? isEs
                      ? "Calculando..."
                      : "Calculating..."
                    : isEs
                      ? "Verificar"
                      : "Score"}
                </span>
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={!isCurrentAnswered || isSubmitting}
            className={`flex-1 flex min-h-[50px] items-center justify-center gap-2 rounded-full px-6 py-3 text-center font-[family-name:var(--font-ui)] text-base font-semibold transition-all duration-[var(--dur)] ease-[var(--ease)] ${
              isCurrentAnswered && !isSubmitting
                ? "bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)] active:scale-[0.99] shadow-lg cursor-pointer"
                : isSubmitting
                  ? "bg-[var(--color-brand-600)] text-white opacity-80 cursor-wait shadow-lg"
                  : "bg-[var(--color-panel)] text-[var(--color-ink-3)] cursor-not-allowed"
            }`}
          >
            {isSubmitting ? (
              <>
                <LuLoader className="w-5 h-5 animate-spin" />
                <span>
                  {isEs ? "Calculando puntuación..." : "Calculating score..."}
                </span>
              </>
            ) : (
              <>
                <LuCheck className="w-5 h-5 stroke-[2.5]" />
                <span>
                  {isEs ? "Finalizar y calificar" : "Submit & check score"}
                </span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
