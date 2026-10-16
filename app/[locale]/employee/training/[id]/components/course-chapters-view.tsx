"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import type { CourseChaptersViewData } from "@/lib/course-chapters-data";
import { CourseChaptersHeader } from "./course-chapters-header";
import { CourseChapterItem } from "./course-chapter-item";
import { LinkedProcedureCard } from "./linked-procedure-card";
import { StickyContinueButton } from "./sticky-continue-button";

interface CourseChaptersViewProps {
  data: CourseChaptersViewData;
  locale: string;
}

/**
 * Course chapters overview screen matching the user's reference mockup:
 * - Back link ("< Training")
 * - Course Title & Subtitle (No "Everyone" chip)
 * - Brand terracotta Progress bar ("33% done")
 * - Chapter list with Complete, Active, and Locked items
 * - Linked procedure card (e.g. Handwashing SOP)
 * - Fixed bottom CTA ("Continue chapter 2")
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
    linkedProcedure,
    allComplete,
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
        style={{ paddingBottom: "120px" }}
      >
        {/* Header */}
        <CourseChaptersHeader
          locale={locale}
          title={title}
          purpose={purpose}
          progressPercent={progressPercent}
          backLabel={t("navTraining")}
          doneLabel={t("doneSuffix")}
        />

        {/* Chapters list */}
        <section aria-label="Course chapters" className="space-y-3 pt-1">
          <ul className="space-y-3">
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

      {/* Sticky Bottom Action Button */}
      <StickyContinueButton label={ctaLabel} href={ctaHref} />
    </div>
  );
}
