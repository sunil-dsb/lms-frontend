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

  // Determine sticky button label and target href
  let ctaLabel: string;
  let ctaHref: string;

  if (allComplete) {
    ctaLabel = t("reviewCourse");
    ctaHref = `/${locale}/employee/training/${courseId}?chapter=1`;
  } else if (nextChapterNumber) {
    if (progressPercent > 0) {
      ctaLabel = t("continueChapterN", { n: nextChapterNumber });
    } else {
      ctaLabel = t("startChapterN", { n: nextChapterNumber });
    }
    ctaHref = `/${locale}/employee/training/${courseId}?chapter=${nextChapterNumber}`;
  } else {
    ctaLabel = t("startChapterN", { n: 1 });
    ctaHref = `/${locale}/employee/training/${courseId}?chapter=1`;
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
          progressPercent={progressPercent}
          completedChaptersCount={completedChaptersCount}
          totalChaptersCount={totalChaptersCount}
          dueAt={dueAt}
          estimatedMinutesLeft={estimatedMinutesLeft}
          backLabel={t("navTraining")}
        />

        {/* Course Chapters Cards List */}
        <section aria-label="Course chapters" className="pt-2">
          <ul className="flex flex-col gap-3">
            {chapters.map((ch) => (
              <CourseChapterItem
                key={ch.id}
                chapter={ch}
                locale={locale}
                courseId={courseId}
              />
            ))}
          </ul>
        </section>
      </main>

      {/* Sticky Bottom Action Button matching Image 2 */}
      <StickyContinueButton label={ctaLabel} href={ctaHref} />
    </div>
  );
}
