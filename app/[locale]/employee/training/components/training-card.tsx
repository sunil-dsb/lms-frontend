"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LuChevronRight } from "react-icons/lu";
import type { EmployeeTrainingItem } from "../lib/training-view-types";

interface TrainingCardProps {
  item: EmployeeTrainingItem;
  locale: string;
}

/**
 * Training Card matching the employee reference design (Image 2).
 * Uses pure CSS design tokens from DESIGN.md:
 * - Brand terracotta (--color-brand-600) for active progress bar fill.
 * - Rounded cards (--radius-lg).
 * - No top chips (Everyone/Recipe removed per user guidance).
 * - No time estimates (removed per user guidance).
 */
export function TrainingCard({
  item,
  locale,
}: TrainingCardProps): React.ReactElement {
  const t = useTranslations("employee.training");
  const isComplete = item.status === "complete" || item.progressPercent === 100;
  const isNotStarted =
    item.status === "not_started" || item.progressPercent === 0;

  let statusSubtext: string;
  if (isComplete) {
    statusSubtext = t("statusComplete");
  } else if (isNotStarted) {
    statusSubtext = t("statusNotStarted");
  } else if (item.nextChapterIndex) {
    statusSubtext = t("chapterNext", { n: item.nextChapterIndex });
  } else {
    statusSubtext = t("statusNotStarted");
  }

  return (
    <li className="list-none">
      <Link
        href={`/${locale}/employee/training/${item.courseId}`}
        className="group block rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-5 transition-all duration-[var(--dur)] ease-[var(--ease)] hover:border-[var(--color-brand-tint)] hover:shadow-xs focus-visible:outline-3 focus-visible:outline-[var(--color-brand-600)] focus-visible:outline-offset-2"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-[family-name:var(--font-ui)] text-base font-semibold leading-snug text-[var(--color-ink)] group-hover:text-[var(--color-brand-700)] transition-colors duration-[var(--dur)]">
              {item.title}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--color-ink-2)]">
              {t("chapterCount", { count: item.chapterCount })}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="mt-0.5 flex shrink-0 items-center justify-center text-[var(--color-ink-3)] group-hover:text-[var(--color-brand-600)] group-hover:translate-x-0.5 transition-all duration-[var(--dur)]"
          >
            <LuChevronRight className="text-lg" />
          </span>
        </div>

        {/* Progress bar row with primary brand terracotta fill */}
        <div className="mt-3 flex items-center gap-3">
          <div
            role="progressbar"
            aria-valuenow={item.progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${item.title} - ${item.progressPercent}%`}
            className="flex-1 h-2 rounded-full bg-[var(--color-panel)] overflow-hidden"
          >
            <div
              className="h-full rounded-full bg-[var(--color-brand-600)] transition-all duration-[var(--dur)] ease-[var(--ease)]"
              style={{ width: `${item.progressPercent}%` }}
            />
          </div>
          <span className="shrink-0 text-right font-[family-name:var(--font-ui)] text-xs sm:text-sm font-semibold text-[var(--color-ink)] min-w-[32px]">
            {item.progressPercent}%
          </span>
        </div>

        {/* Subtext underneath progress */}
        <div className="mt-2 flex items-center justify-between text-xs sm:text-sm">
          <span
            className={`font-medium ${
              isComplete
                ? "text-[var(--color-ok)] font-semibold"
                : isNotStarted
                  ? "text-[var(--color-ink-3)]"
                  : "text-[var(--color-ink-2)]"
            }`}
          >
            {statusSubtext}
          </span>
        </div>
      </Link>
    </li>
  );
}
