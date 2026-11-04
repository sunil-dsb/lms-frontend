"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LuCheck,
  LuSparkles,
  LuTarget,
  LuArrowRight,
  LuCircleAlert,
  LuBookOpen,
  LuRotateCcw,
} from "react-icons/lu";

interface ChapterQuizPassedScreenProps {
  score: number;
  totalQuestions: number;
  passingRequirement: number;
  chapterNumber: number;
  totalChapters: number;
  isEs: boolean;
  effectiveBasePath: string;
  backHref?: string;
  sidebarOffsetPx?: number;
}

export function ChapterQuizPassedScreen({
  score,
  totalQuestions,
  passingRequirement,
  chapterNumber,
  totalChapters,
  isEs,
  effectiveBasePath,
  backHref,
  sidebarOffsetPx = 0,
}: ChapterQuizPassedScreenProps) {
  const router = useRouter();
  const t = useTranslations("employee.training");
  const nextChapterNumber =
    chapterNumber < totalChapters ? chapterNumber + 1 : null;

  return (
    <div className="relative min-h-screen bg-[var(--color-bg)] flex flex-col justify-between">
      <main className="mx-auto w-full max-w-doc space-y-6 px-4 pt-12 text-center sm:px-6">
        {/* Celebration icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--color-ok)] text-white shadow-lg animate-in zoom-in-90 duration-300">
          <LuSparkles className="text-4xl" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-[var(--radius-sm)] text-xs font-bold uppercase tracking-wider bg-[var(--color-ok-tint)] text-[var(--color-ok)] border border-[var(--color-ok-tint-2)]">
            <LuCheck className="w-4 h-4 stroke-[3]" />
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
        <div className="rounded-2xl border border-[var(--color-line-2)] bg-[var(--color-surface)] p-5 text-left shadow-xs max-w-lg mx-auto">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--color-line-2)]">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--color-ok-tint)] text-[var(--color-ok)]">
                <LuTarget className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-[var(--color-ink)]">
                {isEs ? "Resultado de la prueba" : "Score result"}
              </span>
            </div>
            <span className="text-sm font-bold text-[var(--color-ok)]">
              {Math.round((score / totalQuestions) * 100)}%
            </span>
          </div>

          <div className="pt-4 space-y-2">
            <div className="flex items-center gap-3 text-sm font-semibold text-[var(--color-ok)]">
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
                  ? `Tu progreso ha sido registrado. El Capítulo ${nextChapterNumber} ya está disponible para continuar.`
                  : `Your progress has been recorded. Chapter ${nextChapterNumber} is available.`
                : isEs
                  ? "¡Has completado todos los capítulos de este curso!"
                  : "You have successfully completed all chapters for this course!"}
            </p>
          </div>
        </div>
      </main>

      {/* Bottom CTAs */}
      <div
        className="fixed bottom-0 right-0 z-30 flex justify-center"
        style={{ left: sidebarOffsetPx ? `${sidebarOffsetPx}px` : 0 }}
      >
        <div
          className="w-full max-w-doc px-4 sm:px-6 pt-4 space-y-3"
          style={{
            paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))",
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
              className="flex w-full min-h-[50px] items-center justify-center gap-2 rounded-full bg-[var(--color-brand-600)] px-6 py-3 text-center font-[family-name:var(--font-ui)] text-base font-semibold text-white shadow-md transition-all duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-brand-700)] active:scale-[0.99] cursor-pointer"
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
            className={`flex w-full min-h-[46px] items-center justify-center rounded-full px-6 py-3 text-center font-[family-name:var(--font-ui)] text-sm font-semibold transition-all cursor-pointer ${
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

interface ChapterQuizFailedScreenProps {
  score: number;
  totalQuestions: number;
  passingRequirement: number;
  chapterNumber: number;
  isEs: boolean;
  effectiveBasePath: string;
  sidebarOffsetPx?: number;
  onRetry: () => void;
}

export function ChapterQuizFailedScreen({
  score,
  totalQuestions,
  passingRequirement,
  chapterNumber,
  isEs,
  effectiveBasePath,
  sidebarOffsetPx = 0,
  onRetry,
}: ChapterQuizFailedScreenProps) {
  const router = useRouter();

  return (
    <div className="relative min-h-screen bg-[var(--color-bg)] flex flex-col justify-between">
      <main className="mx-auto w-full max-w-doc space-y-6 px-4 pt-12 text-center sm:px-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--color-warn)] text-white shadow-lg animate-in zoom-in-90 duration-300">
          <LuCircleAlert className="text-4xl" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-[var(--radius-sm)] text-xs font-bold uppercase tracking-wider bg-[var(--color-warn-tint)] text-[var(--color-warn-ink)] border border-[var(--color-warn-tint-2)]">
            {isEs ? "Reintentar necesario" : "Retry needed"}
          </span>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[var(--color-ink)] sm:text-3xl">
            {isEs ? "Casi lo logras" : "Almost there"}
          </h1>
          <p className="text-base text-[var(--color-ink-2)] max-w-md mx-auto">
            {isEs
              ? `Obtuviste ${score} de ${totalQuestions} respuestas correctas. Necesitas al menos ${passingRequirement} correctas para aprobar.`
              : `You got ${score} of ${totalQuestions} questions correct. You need at least ${passingRequirement} correct to pass.`}
          </p>
        </div>

        {/* Tips card */}
        <div className="rounded-2xl border border-[var(--color-line-2)] bg-[var(--color-surface)] p-5 text-left space-y-3 shadow-xs max-w-lg mx-auto">
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-ink)]">
            <LuBookOpen className="text-lg text-[var(--color-brand-600)]" />
            <span>{isEs ? "Sugerencia de estudio" : "Study tip"}</span>
          </div>
          <p className="text-xs text-[var(--color-ink-2)] leading-relaxed">
            {isEs
              ? "Repasa las secciones clave del capítulo antes de volver a intentarlo para reforzar tu comprensión de los procedimientos."
              : "Review the key sections in this chapter before retrying to strengthen your understanding of standard procedures."}
          </p>
        </div>
      </main>

      {/* Bottom Actions */}
      <div
        className="fixed bottom-0 right-0 z-30 flex justify-center"
        style={{ left: sidebarOffsetPx ? `${sidebarOffsetPx}px` : 0 }}
      >
        <div
          className="w-full max-w-doc px-4 sm:px-6 pt-4 space-y-3"
          style={{
            paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))",
            background:
              "linear-gradient(to top, var(--color-bg) 60%, color-mix(in srgb, var(--color-bg) 95%, transparent) 80%, transparent 100%)",
          }}
        >
          <button
            type="button"
            onClick={onRetry}
            className="flex w-full min-h-[50px] items-center justify-center gap-2 rounded-full bg-[var(--color-brand-600)] px-6 py-3 text-center font-[family-name:var(--font-ui)] text-base font-semibold text-white shadow-md transition-all duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-brand-700)] active:scale-[0.99] cursor-pointer"
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
            className="flex w-full min-h-[46px] items-center justify-center rounded-full bg-[var(--color-panel)] px-6 py-3 text-center font-[family-name:var(--font-ui)] text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-panel-2)] transition-all cursor-pointer"
          >
            {isEs ? "Repasar contenido del capítulo" : "Review chapter content"}
          </button>
        </div>
      </div>
    </div>
  );
}
