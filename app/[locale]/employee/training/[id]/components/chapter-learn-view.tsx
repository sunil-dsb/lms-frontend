"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LuChevronLeft, LuPlay } from "react-icons/lu";
import { BlockRenderer } from "@/components/doc/block-renderer";
import { ProcedureArticleBody } from "@/components/doc/procedure-article-body";
import { CookModeLauncher } from "@/components/doc/cook-mode-launcher";
import type { Employee, Procedure, ProcedureBlock } from "@/lib/types";

interface ChapterLearnViewProps {
  courseId: string;
  courseTitle: string;
  chapterNumber: number;
  totalChapters: number;
  chapterTitle: string;
  chapterSubtitle: string;
  locale: string;
  blocks?: ProcedureBlock[];
  procedure?: Procedure | null;
  employee?: Employee;
}

/**
 * Chapter Learn View:
 * - Top back link: "< Course Title · Chapter X of Y" + "Start cooking" button if procedure/method steps exist
 * - 2-step segmented progress bar (Learn active, Quiz pending)
 * - Eyebrow: "LEARN"
 * - Chapter title & description
 * - Guided Cook Mode interactive card
 * - If a real procedure is linked: renders full detailed procedure via ProcedureArticleBody
 *   including "Start cooking" CTA, method steps, and interactive CookMode modal!
 * - Chapter content blocks rendered via existing BlockRenderer (Notion-like procedure blocks)
 * - Interactive full-screen Cook Mode modal
 * - Bottom CTA: "Continue to quiz"
 */
export function ChapterLearnView({
  courseId,
  courseTitle,
  chapterNumber,
  totalChapters,
  chapterTitle,
  chapterSubtitle,
  locale,
  blocks,
  procedure,
  employee,
}: ChapterLearnViewProps): React.ReactElement {
  const t = useTranslations("employee.training");

  // Determine whether this chapter has cooking method steps / recipe
  const targetBlocks = procedure
    ? ((locale === "es" && procedure.bodyEs?.blocks?.length
        ? procedure.bodyEs.blocks
        : procedure.bodyEn?.blocks) ?? [])
    : (blocks ?? []);

  const recipeBlocks = targetBlocks.filter(
    (b): b is Extract<ProcedureBlock, { kind: "recipe" }> =>
      b.kind === "recipe",
  );
  const methodBlocks = targetBlocks.filter(
    (b): b is Extract<ProcedureBlock, { kind: "method" }> =>
      b.kind === "method",
  );
  const ingBlock = targetBlocks.find(
    (b): b is Extract<ProcedureBlock, { kind: "ingredients" }> =>
      b.kind === "ingredients",
  );

  const hasCookMode = recipeBlocks.length > 0 || methodBlocks.length > 0;

  const handleOpenCookMode = React.useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("cook-mode:open", {
          detail: { at: 1 },
        }),
      );
    }
  }, []);

  const cookModeBlock = React.useMemo(() => {
    if (recipeBlocks.length > 0) {
      return recipeBlocks[0];
    }
    if (methodBlocks.length > 0) {
      return {
        id: `steps-${courseId}-${chapterNumber}`,
        factors: ingBlock?.factors ?? [1],
        yieldItems: ingBlock?.yieldItems ?? [],
        ingredients: ingBlock?.ingredients ?? [],
        steps: methodBlocks.flatMap((b) => b.steps),
        allergen: ingBlock?.allergen,
      };
    }
    return null;
  }, [recipeBlocks, methodBlocks, ingBlock, courseId, chapterNumber]);

  return (
    <div className="relative min-h-screen bg-[var(--color-bg)]">
      <main
        className="mx-auto w-full max-w-doc space-y-5 px-4 pt-5 sm:px-6 sm:pt-6"
        style={{ paddingBottom: "120px" }}
      >
        {/* Top Back Header & Cook Mode Action */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/${locale}/employee/training/${courseId}`}
            className="inline-flex min-h-tap items-center gap-1.5 text-sm font-semibold text-[var(--color-ink-2)] hover:text-[var(--color-ink)] transition-colors active:translate-x-[-2px]"
          >
            <LuChevronLeft className="text-lg" aria-hidden="true" />
            <span>
              {t("backToCourseChapter", {
                title: courseTitle,
                current: chapterNumber,
                total: totalChapters,
              })}
            </span>
          </Link>

          {hasCookMode && (
            <button
              type="button"
              onClick={handleOpenCookMode}
              className="inline-flex min-h-[38px] items-center gap-2 rounded-xl bg-[var(--color-brand-600)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--color-brand-700)] active:scale-95 transition-all"
            >
              <LuPlay className="fill-current text-xs" />
              <span>{locale === "es" ? "Modo cocina" : "Start cooking"}</span>
            </button>
          )}
        </div>

        {/* 2-Segment Progress Bar (Step 1: Learn, Step 2: Quiz) */}
        <div
          role="progressbar"
          aria-label="Chapter progress: Learn"
          aria-valuenow={1}
          aria-valuemin={1}
          aria-valuemax={2}
          className="flex items-center gap-2 pt-1"
        >
          <div className="h-1.5 flex-1 rounded-full bg-[var(--color-brand-600)]" />
          <div className="h-1.5 flex-1 rounded-full bg-[var(--color-panel-2)]" />
        </div>

        {/* Chapter Eyebrow, Title & Subtitle */}
        <div className="space-y-1.5 pt-1">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-brand-700)]">
            {t("eyebrowLearn")}
          </p>
          <h1 className="font-[family-name:var(--font-ui)] text-xl sm:text-2xl font-medium tracking-tight text-[var(--color-ink)]">
            {chapterTitle}
          </h1>
          {chapterSubtitle ? (
            <p className="text-sm font-normal text-[var(--color-ink-2)] leading-relaxed">
              {chapterSubtitle}
            </p>
          ) : null}
        </div>

        {/* If a real procedure is linked, render it in full detailed view with CookMode */}
        {procedure && employee ? (
          <div className="pt-2">
            <ProcedureArticleBody
              proc={procedure}
              employee={employee}
              effectiveRole="employee"
              locale={locale}
              docBar={
                hasCookMode ? (
                  <div className="flex items-center justify-end pb-3">
                    <button
                      type="button"
                      onClick={handleOpenCookMode}
                      className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-[var(--color-brand-600)] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--color-brand-700)] active:scale-95 transition-all"
                    >
                      <LuPlay className="fill-current text-xs" />
                      <span>
                        {locale === "es"
                          ? "Empezar a cocinar"
                          : "Start cooking"}
                      </span>
                    </button>
                  </div>
                ) : null
              }
            />
          </div>
        ) : blocks && blocks.length > 0 ? (
          <div className="doc py-1 space-y-4">
            <BlockRenderer
              blocks={blocks}
              locale={locale === "es" ? "es" : "en"}
            />
          </div>
        ) : null}

        {/* Cook Mode Modal Launcher (when procedure wasn't already rendering via ProcedureArticleBody) */}
        {!procedure && cookModeBlock && (
          <CookModeLauncher
            key={`cook-mode-${courseId}-${chapterNumber}`}
            block={cookModeBlock}
            procedureId={courseId}
            procedureTitle={chapterTitle}
            locale={locale === "es" ? "es" : "en"}
            modalOnly
          />
        )}
      </main>

      {/* Sticky Bottom CTA Button: Continue to quiz */}
      <div className="fixed bottom-0 left-0 right-0 z-30 mx-auto w-full max-w-doc bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/95 to-transparent px-4 pb-6 pt-4 backdrop-blur-xs sm:px-6">
        <Link
          href={`/${locale}/employee/training/${courseId}?chapter=${chapterNumber}&mode=quiz`}
          className="flex w-full min-h-[50px] items-center justify-center rounded-2xl bg-[var(--color-brand-600)] px-6 py-3.5 text-center font-[family-name:var(--font-ui)] text-base font-semibold text-white shadow-md transition-all duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-brand-700)] active:scale-[0.99] focus-visible:outline-3 focus-visible:outline-[var(--color-brand-600)] focus-visible:outline-offset-2"
        >
          {t("continueToQuiz")}
        </Link>
      </div>
    </div>
  );
}
