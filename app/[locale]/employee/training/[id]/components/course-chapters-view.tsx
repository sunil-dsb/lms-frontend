"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import type { CourseChaptersViewData } from "@/lib/course-chapters-data";
import { CourseChaptersHeader } from "./course-chapters-header";
import { CourseChapterItem } from "./course-chapter-item";
import { StickyContinueButton } from "./sticky-continue-button";

interface CourseChaptersViewProps {
  data: CourseChaptersViewData;
  locale: string;
  basePath?: string;
  backHref?: string;
  backLabel?: string;
  extraHeaderActions?: React.ReactNode;
  /** Sidebar width in px to offset the fixed sticky button (admin layout). Default 0. */
  sidebarOffsetPx?: number;
  showProgress?: boolean;
}

/**
 * Course chapters overview screen matching the user's reference mockup (Image 2):
 * - Back link ("< Training")
 * - Course Title & Subtitle (No "Required" or "Everyone" tags)
 * - Metadata badges: [Due in 2 days] [⏱ About 8 min left]
 * - Brand terracotta Progress bar ("3 of 5 · 60%")
 * - Connected timeline of chapters with complete checkmark, active terracotta number, and locked states
 * - Fixed bottom CTA ("Continue chapter 4")
 */
export function CourseChaptersView({
  data,
  locale,
  basePath,
  backHref,
  backLabel,
  extraHeaderActions,
  sidebarOffsetPx = 0,
  showProgress = true,
}: CourseChaptersViewProps): React.ReactElement {
  const t = useTranslations("employee.training");
  const {
    courseId,
    title,
    purpose,
    progressPercent,
    chapters,
    nextChapterNumber,
    allComplete,
    dueAt,
    completedChaptersCount,
    totalChaptersCount,
    estimatedMinutesLeft,
  } = data;

  const effectiveBasePath =
    basePath ?? `/${locale}/employee/training/${courseId}`;

  const effectiveChapters = chapters;

  const effectiveCompletedCount = effectiveChapters.filter(
    (c) => c.status === "complete",
  ).length;
  const effectiveAllComplete =
    effectiveChapters.length > 0 &&
    effectiveCompletedCount === effectiveChapters.length;
  const effectiveProgressPercent =
    effectiveChapters.length > 0
      ? Math.round((effectiveCompletedCount / effectiveChapters.length) * 100)
      : progressPercent;

  const nextActive = effectiveChapters.find((c) => c.status === "active");
  const effectiveNextNumber = effectiveAllComplete
    ? null
    : (nextActive?.number ?? nextChapterNumber);

  // Determine sticky button label and target href
  let ctaLabel: string;
  let ctaHref: string;

  if (effectiveAllComplete) {
    ctaLabel = t("reviewCourse");
    ctaHref = `${effectiveBasePath}?chapter=1`;
  } else if (effectiveNextNumber) {
    if (effectiveProgressPercent > 0) {
      ctaLabel = t("continueChapterN", { n: effectiveNextNumber });
    } else {
      ctaLabel = t("startChapterN", { n: effectiveNextNumber });
    }
    ctaHref = `${effectiveBasePath}?chapter=${effectiveNextNumber}`;
  } else {
    ctaLabel = t("startChapterN", { n: 1 });
    ctaHref = `${effectiveBasePath}?chapter=1`;
  }

  return (
    <div className="relative min-h-screen bg-[var(--color-bg)]">
      <main
        className="mx-auto w-full max-w-doc space-y-6 px-4 pt-5 sm:px-6 sm:pt-6"
        style={{ paddingBottom: "140px" }}
      >
        {/* Header with Title, Purpose, Badges (Due date, time left) & Progress */}
        <CourseChaptersHeader
          locale={locale}
          title={title}
          purpose={purpose}
          progressPercent={effectiveProgressPercent}
          completedChaptersCount={effectiveCompletedCount}
          totalChaptersCount={totalChaptersCount}
          dueAt={dueAt}
          estimatedMinutesLeft={estimatedMinutesLeft}
          backLabel={backLabel ?? t("navTraining")}
          backHref={backHref}
          extraActions={extraHeaderActions}
          showProgress={showProgress}
        />

        {/* Course Chapters Cards List */}
        <section aria-label="Course chapters" className="pt-2">
          <ul className="flex flex-col gap-4">
            {effectiveChapters.map((ch) => (
              <CourseChapterItem
                key={ch.id}
                chapter={ch}
                locale={locale}
                courseId={courseId}
                basePath={effectiveBasePath}
              />
            ))}
          </ul>
        </section>
      </main>

      {/* Sticky Bottom Action Button matching Image 2 */}
      <StickyContinueButton
        label={ctaLabel}
        href={ctaHref}
        sidebarOffsetPx={sidebarOffsetPx}
      />
    </div>
  );
}
