"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LuChevronLeft, LuBookOpen } from "react-icons/lu";

interface ChapterMetric {
  label: string;
  value: string;
}

interface ChapterIngredient {
  name: string;
  qty: string;
  isAllergen?: boolean;
}

interface ChapterLearnViewProps {
  courseId: string;
  courseTitle: string;
  chapterNumber: number;
  totalChapters: number;
  chapterTitle: string;
  chapterSubtitle: string;
  locale: string;
  procedureData?: {
    title: string;
    metrics?: ChapterMetric[];
    ingredients?: ChapterIngredient[];
    steps?: string[];
    slug?: string;
  };
}

/**
 * Chapter Learn View matching reference Image 2:
 * - Top back link: "< Course Title · Chapter X of Y"
 * - 2-step segmented progress bar (Learn active, Quiz pending)
 * - Eyebrow: "LEARN"
 * - Chapter title & description
 * - Embedded Procedure card with metrics grid, ingredients, and method steps
 * - Link: "Need the full page? Open full procedure"
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
  procedureData,
}: ChapterLearnViewProps): React.ReactElement {
  const t = useTranslations("employee.training");
  const [showAllSteps, setShowAllSteps] = React.useState(false);

  // Fallback procedure data if course does not provide explicit metrics
  const proc = procedureData ?? {
    title: chapterTitle,
    metrics: [
      { label: "Station", value: "Line Prep" },
      { label: "Target temp", value: "≥ 100°F (38°C)" },
      { label: "Verification", value: "Daily check" },
      { label: "Standard", value: "HACCP safe" },
    ],
    ingredients: [
      { name: "Antibacterial soap, foam", qty: "2 pumps" },
      { name: "Single-use paper towels", qty: "2 sheets" },
      { name: "Disposable nitrile gloves", qty: "1 pair", isAllergen: false },
    ],
    steps: [
      "Wet hands with warm water (≥ 100°F / 38°C).",
      "Apply soap and scrub vigorously for at least 20 seconds.",
      "Rinse thoroughly under running water.",
      "Dry with a clean single-use paper towel and discard.",
    ],
    slug: "handwashing-glove-protocol",
  };

  const visibleSteps = showAllSteps ? proc.steps : proc.steps?.slice(0, 2);

  return (
    <div className="relative min-h-screen bg-[var(--color-bg)]">
      <main
        className="mx-auto w-full max-w-doc space-y-5 px-4 pt-5 sm:px-6 sm:pt-6"
        style={{ paddingBottom: "120px" }}
      >
        {/* Top Back Header */}
        <div>
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

        {/* Embedded Procedure Card */}
        <div className="rounded-2xl border border-[var(--color-line-2)] bg-[var(--color-panel)]/30 p-4 space-y-4">
          {/* Procedure Card Header */}
          <div className="flex items-center gap-2 text-[var(--color-ink-2)]">
            <LuBookOpen className="text-base" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {t("procedureTag")}
            </span>
          </div>

          <h2 className="font-[family-name:var(--font-ui)] text-base font-medium text-[var(--color-ink)]">
            {proc.title}
          </h2>

          {/* Metrics 2x2 Grid */}
          {proc.metrics && proc.metrics.length > 0 ? (
            <div className="grid grid-cols-2 rounded-xl border border-[var(--color-line-2)] bg-[var(--color-surface)] overflow-hidden divide-x divide-y divide-[var(--color-line-2)]">
              {proc.metrics.map((m, idx) => (
                <div key={idx} className="p-3">
                  <p className="text-xs text-[var(--color-ink-3)] font-medium">
                    {m.label}
                  </p>
                  <p className="text-sm font-bold text-[var(--color-ink)] mt-0.5">
                    {m.value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {/* Ingredients / Materials Table */}
          {proc.ingredients && proc.ingredients.length > 0 ? (
            <div className="rounded-xl border border-[var(--color-line-2)] bg-[var(--color-surface)] overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-[var(--color-panel)]/40 border-b border-[var(--color-line-2)] text-xs font-semibold text-[var(--color-ink-2)]">
                <span>Ingredient</span>
                <span>{proc.ingredients.length}+</span>
              </div>
              <div className="divide-y divide-[var(--color-line-2)]">
                {proc.ingredients.map((ing, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-3 py-2.5 text-xs sm:text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--color-ink)]">
                        {ing.name}
                      </span>
                      {ing.isAllergen ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                          Allergen
                        </span>
                      ) : null}
                    </div>
                    <span className="font-semibold text-[var(--color-ink)] shrink-0 ml-2">
                      {ing.qty}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Method Steps Section */}
          {proc.steps && proc.steps.length > 0 ? (
            <div className="space-y-2 pt-1">
              <p className="text-sm font-bold text-[var(--color-ink)]">
                {t("methodStepsHeading", { count: proc.steps.length })}
              </p>
              <ol className="space-y-1.5 text-xs sm:text-sm text-[var(--color-ink-2)] leading-relaxed">
                {visibleSteps?.map((stepText, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-semibold text-[var(--color-ink)]">
                      {idx + 1}.
                    </span>
                    <span>{stepText}</span>
                  </li>
                ))}
              </ol>

              {proc.steps.length > 2 ? (
                <button
                  type="button"
                  onClick={() => setShowAllSteps(!showAllSteps)}
                  className="mt-1 text-xs font-bold text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] underline cursor-pointer"
                >
                  {showAllSteps ? t("showLessSteps") : t("showAllSteps")}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Link below card */}
        {proc.slug ? (
          <p className="text-xs text-[var(--color-ink-2)] pt-1">
            {t("needFullPage")}{" "}
            <Link
              href={`/${locale}/procedures/${proc.slug}`}
              className="font-semibold text-[var(--color-brand-700)] hover:underline"
            >
              {t("openFullProcedure")}
            </Link>
          </p>
        ) : null}
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
