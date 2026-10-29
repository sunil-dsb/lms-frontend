import * as React from "react";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import type { OnboardingSummary } from "@/lib/mock-training";

/**
 * The single orientation training card shown on the Training tab when
 * onboarding is pending, strictly matching the design:
 * - "Required" pill badge
 * - "Orientation training" title
 * - "Complete this to unlock procedures and promos." subtitle
 * - Clean progress bar
 * - "Chapter 1 of 3 · Onboarding" indicator
 * - "Resume" / "Start" action button
 * - Centered subtext: "More courses unlock after orientation"
 *
 * No nested chapter breakdown list.
 */
export function OrientationChapters({
  summary,
  locale,
  labels,
  topRightNode,
}: {
  summary: OnboardingSummary;
  locale: string;
  labels: {
    required: string;
    heading: string;
    subtitle: string;
    chapterOf: (current: number, total: number, title: string) => string;
    resume: string;
    start: string;
    moreCoursesUnlock: string;
  };
  topRightNode?: React.ReactNode;
}): React.ReactElement {
  const isEs = locale === "es";
  const { chapters, done, total } = summary;

  // Find the current active or first incomplete chapter
  const activeChapterIndex = chapters.findIndex((c) => c.status !== "complete");
  const currentChapterIndex = activeChapterIndex >= 0 ? activeChapterIndex : 0;
  const currentChapter = chapters[currentChapterIndex] || chapters[0];
  const currentChapterTitle = currentChapter
    ? isEs
      ? currentChapter.titleEs
      : currentChapter.titleEn
    : "Onboarding";
  const totalChapters = total || chapters.length || 3;

  // Progress percentage
  const progressPct =
    totalChapters > 0
      ? Math.max(
          12,
          Math.round(
            ((done + (currentChapter?.status === "in_progress" ? 0.5 : 0.15)) /
              totalChapters) *
              100,
          ),
        )
      : 33;

  const firstCourseId =
    currentChapter?.courseIds?.[0] ?? chapters[0]?.courseIds?.[0] ?? "1";
  const hasStarted = done > 0 || currentChapter?.status === "in_progress";
  const ctaLabel = hasStarted ? labels.resume : labels.start;

  return (
    <section aria-labelledby="orientation-h" className="w-full">
      {/* Main Orientation Card */}
      <div
        className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-xs overflow-hidden"
        style={{ padding: "16px 16px 20px" }}
      >
        {/* Cover Banner */}
        <div
          className="relative w-full overflow-hidden rounded-xl bg-[var(--color-panel)]"
          style={{ height: "140px", marginBottom: "14px" }}
        >
          <img
            src="/img/orientation-cover.jpg"
            alt="Orientation"
            className="h-full w-full object-cover"
          />
          <span
            className="absolute top-3 left-3 inline-flex items-center rounded-full bg-[var(--color-surface)]/95 text-[var(--color-brand-700)] dark:bg-[var(--color-surface)]/90 dark:text-[var(--color-brand-300)] border border-[var(--color-line)] text-xs font-semibold shadow-xs backdrop-blur-xs"
            style={{ padding: "3px 10px" }}
          >
            {labels.required}
          </span>
          {topRightNode ? (
            <div className="absolute top-3 right-3">{topRightNode}</div>
          ) : null}
        </div>

        <h2
          id="orientation-h"
          className="text-lg font-bold tracking-tight text-[var(--color-ink)]"
          style={{ lineHeight: "1.3" }}
        >
          {labels.heading}
        </h2>

        <p
          className="text-sm text-[var(--color-ink-2)]"
          style={{ marginTop: "4px", lineHeight: "1.4" }}
        >
          {labels.subtitle}
        </p>

        {/* Progress Bar */}
        <div
          role="progressbar"
          aria-label={labels.chapterOf(
            currentChapterIndex + 1,
            totalChapters,
            currentChapterTitle,
          )}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPct}
          className="w-full overflow-hidden rounded-full bg-[var(--color-panel-2)]"
          style={{ height: "6px", marginTop: "16px" }}
        >
          <div
            className="h-full rounded-full bg-[var(--color-brand)] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Chapter counter & title */}
        <p
          className="text-xs font-medium text-[var(--color-ink-2)]"
          style={{ marginTop: "10px" }}
        >
          {labels.chapterOf(
            currentChapterIndex + 1,
            totalChapters,
            currentChapterTitle,
          )}
        </p>

        {/* Outlined, refined CTA button */}
        <div style={{ marginTop: "16px" }}>
          <Link
            href={`/${locale}/employee/training/${firstCourseId}`}
            className="inline-flex w-full items-center justify-center rounded-full border border-[var(--color-brand)] bg-transparent text-[var(--color-brand)] hover:bg-[var(--color-brand-tint)] transition-all duration-200 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] active:scale-[0.99]"
            style={{ height: "38px" }}
          >
            {ctaLabel}
          </Link>
        </div>
      </div>

      {/* Centered subtext below card */}
      <p
        className="text-center text-xs font-medium text-[var(--color-ink-3)]"
        style={{ marginTop: "20px" }}
      >
        {labels.moreCoursesUnlock}
      </p>
    </section>
  );
}
