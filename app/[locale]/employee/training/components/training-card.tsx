"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { EmployeeTrainingItem } from "../lib/training-view-types";
import { DueDateBadge } from "./due-date-badge";
import { CircularProgress } from "./circular-progress";

interface TrainingCardProps {
  item: EmployeeTrainingItem;
  locale: string;
}

/**
 * Clean Training Card matching updated user design:
 * - Station tag (if any, e.g. "Front of house") on top.
 * - Title and metadata line ("X chapters · about Y min") on left.
 * - Circular percentage progress ring on top-right where due date was.
 * - Warm amber Due Date badge placed below metadata where badges were.
 * - Completely removes content type badges and bottom line progress bar.
 */
export function TrainingCard({
  item,
  locale,
}: TrainingCardProps): React.ReactElement {
  const t = useTranslations("employee.training");
  const isEs = locale === "es";

  const estimatedMin = item.estimatedMinutes ?? item.chapterCount * 5;

  const metaLine = isEs
    ? `${item.chapterCount} ${
        item.chapterCount === 1 ? "capítulo" : "capítulos"
      } · aprox. ${estimatedMin} min`
    : `${item.chapterCount} ${
        item.chapterCount === 1 ? "chapter" : "chapters"
      } · about ${estimatedMin} min`;

  return (
    <li className="list-none">
      <Link
        href={`/${locale}/employee/training/${item.courseId}`}
        className="group block rounded-[24px] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-5 sm:p-6 transition-all duration-[var(--dur)] ease-[var(--ease)] hover:border-[var(--color-brand-tint)] hover:shadow-sm focus-visible:outline-3 focus-visible:outline-[var(--color-brand-600)] focus-visible:outline-offset-2"
      >
        {/* Station tag if any */}
        {item.stationTag ? (
          <div className="mb-1.5">
            <span className="text-[11px] font-bold tracking-wider uppercase text-[var(--color-brand-700)]">
              {item.stationTag}
            </span>
          </div>
        ) : null}

        {/* Content row: Title + Meta on left, Circular percentage on right */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="font-[family-name:var(--font-ui)] text-base sm:text-lg font-bold leading-snug text-[var(--color-ink)] group-hover:text-[var(--color-brand-700)] transition-colors duration-[var(--dur)]">
              {item.title}
            </h2>

            {/* Meta Line: Chapters count & duration */}
            <p className="mt-1 text-sm text-[var(--color-ink-2)] font-normal mb-1">
              {metaLine}
            </p>

            {/* Due Date Badge placed where other badges were */}
            {item.dueAt ? (
              <div className="mt-3.5">
                <DueDateBadge dueAt={item.dueAt} locale={locale} />
              </div>
            ) : null}
          </div>

          {/* Circular Percentage Progress Ring (matches reference Image 2) */}
          <CircularProgress
            percent={item.progressPercent}
            size={48}
            className="mt-0.5 shrink-0"
          />
        </div>
      </Link>
    </li>
  );
}
