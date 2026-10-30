"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LuChevronLeft,
  LuPlay,
  LuArrowRight,
  LuCheck,
  LuLoader,
} from "react-icons/lu";
import { BlockRenderer } from "@/components/doc/block-renderer";
import { ProcedureArticleBody } from "@/components/doc/procedure-article-body";
import { CookModeLauncher } from "@/components/doc/cook-mode-launcher";
import { completeMyTrainingChapter } from "@/services/courses/api";
import { cn } from "@/lib/utils";
import type { Employee, Procedure, ProcedureBlock } from "@/lib/types";

interface ChapterLearnViewProps {
  courseId: string;
  chapterId?: string;
  courseTitle: string;
  chapterNumber: number;
  totalChapters: number;
  chapterTitle: string;
  chapterSubtitle: string;
  locale: string;
  blocks?: ProcedureBlock[];
  procedure?: Procedure | null;
  employee?: Employee;
  basePath?: string;
  backHref?: string;
  /** Sidebar width in px to offset the fixed sticky button (admin layout). Default 0. */
  sidebarOffsetPx?: number;
  hasQuiz?: boolean;
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
  chapterId,
  courseTitle,
  chapterNumber,
  totalChapters,
  chapterTitle,
  chapterSubtitle,
  locale,
  blocks,
  procedure,
  employee,
  basePath,
  backHref,
  sidebarOffsetPx = 0,
  hasQuiz = true,
}: ChapterLearnViewProps): React.ReactElement {
  const router = useRouter();
  const t = useTranslations("employee.training");
  const [isAdvancing, setIsAdvancing] = React.useState(false);
  const effectiveBasePath =
    basePath ?? `/${locale}/employee/training/${courseId}`;

  const handleAdvance = React.useCallback(async () => {
    if (isAdvancing) return;
    setIsAdvancing(true);
    try {
      if (chapterId && !basePath?.includes("/admin/")) {
        await completeMyTrainingChapter(courseId, chapterId).catch((err) => {
          console.warn("Could not record chapter completion:", err);
        });
      }
      if (chapterNumber < totalChapters) {
        router.push(`${effectiveBasePath}?chapter=${chapterNumber + 1}`);
      } else {
        router.push(backHref ?? effectiveBasePath);
      }
    } finally {
      setIsAdvancing(false);
    }
  }, [
    isAdvancing,
    chapterId,
    basePath,
    courseId,
    chapterNumber,
    totalChapters,
    effectiveBasePath,
    backHref,
    router,
  ]);

  const hasLinkedProceduresBlock = React.useMemo(
    () =>
      (blocks ?? []).some(
        (b: any) =>
          b.kind === "linked_procedures" &&
          Array.isArray(b.procedureIds) &&
          b.procedureIds.length > 0,
      ),
    [blocks],
  );

  const hasBlocks = Boolean(blocks && blocks.length > 0);
  const standaloneProcedure = hasLinkedProceduresBlock ? null : procedure;

  // Determine whether this chapter has cooking method steps / recipe
  const targetBlocks = hasBlocks
    ? (blocks ?? [])
    : standaloneProcedure
      ? ((locale === "es" && standaloneProcedure.bodyEs?.blocks?.length
          ? standaloneProcedure.bodyEs.blocks
          : standaloneProcedure.bodyEn?.blocks) ?? [])
      : [];

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

  // The chapter's synthetic steps block id has to match what the launcher
  // computes (block.id ?? `recipe-${factors.length}`) so a scoped open event
  // hits only this chapter's modal.
  const cookModeBlockId = React.useMemo(() => {
    if (recipeBlocks.length > 0) {
      const b = recipeBlocks[0];
      return b.id ?? `recipe-${b.factors?.length ?? 0}`;
    }
    if (methodBlocks.length > 0) return `steps-${courseId}-${chapterNumber}`;
    return null;
  }, [recipeBlocks, methodBlocks, courseId, chapterNumber]);

  // Scoped open: the doc-bar / top CTA carries procedureId + recipeBlockId so
  // launchers that don't belong to this surface (e.g. one per linked-procedure
  // card further down the page) ignore the event instead of all opening at
  // once.
  const handleOpenCookMode = React.useCallback(() => {
    if (standaloneProcedure && !hasBlocks) {
      const firstRecipe = recipeBlocks[0];
      const recipeBlockId = firstRecipe
        ? (firstRecipe.id ?? `recipe-${firstRecipe.factors?.length ?? 0}`)
        : `steps-${standaloneProcedure.id}`;
      window.dispatchEvent(
        new CustomEvent("cook-mode:open", {
          detail: { procedureId: standaloneProcedure.id, recipeBlockId, at: 1 },
        }),
      );
    } else if (cookModeBlockId) {
      window.dispatchEvent(
        new CustomEvent("cook-mode:open", {
          detail: {
            procedureId: courseId,
            recipeBlockId: cookModeBlockId,
            at: 1,
          },
        }),
      );
    }
  }, [standaloneProcedure, hasBlocks, recipeBlocks, courseId, cookModeBlockId]);

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
        {/* Top Back Header */}
        <div>
          <Link
            href={backHref ?? effectiveBasePath}
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
        </div>

        {/* Progress Bar (2-Segment if quiz exists, 1-segment if no quiz) */}
        <div
          role="progressbar"
          aria-label={hasQuiz ? "Chapter progress: Learn" : "Chapter progress"}
          aria-valuenow={1}
          aria-valuemin={1}
          aria-valuemax={hasQuiz ? 2 : 1}
          className="flex items-center gap-2 pt-1"
        >
          <div className="h-1.5 flex-1 rounded-full bg-[var(--color-brand-600)]" />
          {hasQuiz && (
            <div className="h-1.5 flex-1 rounded-full bg-[var(--color-panel-2)]" />
          )}
        </div>

        {/* Chapter Eyebrow, Title & Subtitle */}
        <div className="space-y-1.5 pt-1 pb-2">
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

        {/* Render chapter blocks if available */}
        {hasBlocks ? (
          <div className="doc pt-2 pb-1 space-y-5">
            {hasCookMode && (
              <div className="doc-sec-cta flex justify-end pb-1">
                <button
                  type="button"
                  onClick={handleOpenCookMode}
                  className="btn btn-primary cook-start inline-flex items-center gap-2 rounded-xl bg-[var(--color-brand-600)] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--color-brand-700)] active:scale-95 transition-all cursor-pointer"
                >
                  <LuPlay
                    aria-hidden="true"
                    className="i fill-current text-xs"
                  />
                  <span>
                    {locale === "es" ? "Empezar a cocinar" : "Start cooking"}
                  </span>
                </button>
              </div>
            )}
            <BlockRenderer
              blocks={blocks!}
              locale={locale === "es" ? "es" : "en"}
            />
            {standaloneProcedure ? (
              <div className="pt-4">
                <ProcedureArticleBody
                  proc={standaloneProcedure}
                  employee={employee}
                  effectiveRole="employee"
                  locale={locale}
                  hideQuiz={true}
                />
              </div>
            ) : null}
          </div>
        ) : standaloneProcedure ? (
          /* When there are no custom chapter blocks, render the procedure in full */
          <div className="pt-2">
            <ProcedureArticleBody
              proc={standaloneProcedure}
              employee={employee}
              effectiveRole="employee"
              locale={locale}
              hideQuiz={true}
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
        ) : null}

        {/* Cook Mode Modal Launcher (when standaloneProcedure wasn't already rendering via ProcedureArticleBody without blocks) */}
        {(!standaloneProcedure || hasBlocks) && cookModeBlock && (
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

      {/* Sticky Bottom CTA Button: Continue to quiz or Advance to next chapter */}
      <div
        className={cn(
          "fixed bottom-0 right-0 z-30 flex justify-center left-0",
          sidebarOffsetPx > 0 && "lg:left-[280px]",
        )}
      >
        <div
          className="w-full max-w-doc px-4 sm:px-6 pt-4"
          style={{
            paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))",
            background:
              "linear-gradient(to top, var(--color-bg) 60%, color-mix(in srgb, var(--color-bg) 95%, transparent) 80%, transparent 100%)",
          }}
        >
          {hasQuiz ? (
            <Link
              href={`${effectiveBasePath}?chapter=${chapterNumber}&mode=quiz`}
              className="flex w-full min-h-[52px] items-center justify-center rounded-2xl bg-[var(--color-brand-600)] px-6 py-3 text-center font-[family-name:var(--font-ui)] text-base font-semibold text-white shadow-lg transition-all duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-brand-700)] active:scale-[0.99] focus-visible:outline-3 focus-visible:outline-[var(--color-brand-600)] focus-visible:outline-offset-2"
            >
              {t("continueToQuiz")}
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleAdvance}
              disabled={isAdvancing}
              className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[var(--color-brand-600)] px-6 py-3 text-center font-[family-name:var(--font-ui)] text-base font-semibold text-white shadow-lg transition-all duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-brand-700)] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-3 focus-visible:outline-[var(--color-brand-600)] focus-visible:outline-offset-2"
            >
              {isAdvancing ? (
                <LuLoader className="animate-spin text-xl" />
              ) : (
                <>
                  <span>
                    {chapterNumber < totalChapters
                      ? locale === "es"
                        ? `Continuar al Capítulo ${chapterNumber + 1}`
                        : `Continue to Chapter ${chapterNumber + 1}`
                      : locale === "es"
                        ? "Completar curso"
                        : "Complete course"}
                  </span>
                  {chapterNumber < totalChapters ? (
                    <LuArrowRight className="text-lg" />
                  ) : (
                    <LuCheck className="text-lg" />
                  )}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
