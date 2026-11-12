"use client";

import * as React from "react";
import Link from "next/link";
import { LuLock } from "react-icons/lu";
import { useTranslations } from "next-intl";
import type { EmployeeTrainingItem } from "../lib/training-view-types";
import { DueDateBadge } from "./due-date-badge";
import { CircularProgress } from "./circular-progress";
import { TrainingStatusBadge } from "./training-status-badge";

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
 * - Responsive padding and gap: p-4 on mobile (< sm) for max horizontal room, p-6 on desktop.
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

  /* Locked: the card stays so the employee can see what they're blocked from,
     but it is a dead block — content blurred, crisp plain lock knob at the
     side, exactly ProcedureRow's treatment (`blur(3px)` wrapper, LockRowShell's
     dashed frame). Tapping does nothing: the detail endpoint would refuse the
     visit with COURSE_LOCKED_BY_REQUIRED_TRAINING anyway. */
  if (item.locked) {
    return (
      <li className="list-none" aria-disabled="true">
        <div className="block rounded-[24px] border border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)] p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            {/* Blurred course content */}
            <div
              className="min-w-0 flex-1"
              style={{
                filter: "blur(3px)",
                opacity: 0.5,
                userSelect: "none",
                pointerEvents: "none",
              }}
              aria-hidden="true"
            >
              {item.stationTag ? (
                <div className="mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink-3)]">
                    {item.stationTag}
                  </span>
                </div>
              ) : null}
              <h2 className="font-[family-name:var(--font-ui)] text-base sm:text-lg font-bold leading-snug text-[var(--color-ink)]">
                {item.title}
              </h2>
              <div className="mt-1 mb-1 flex flex-wrap items-center gap-2">
                <p className="text-sm font-normal text-[var(--color-ink-2)]">
                  {metaLine}
                </p>
                {item.dueAt ? (
                  <DueDateBadge dueAt={item.dueAt} locale={locale} />
                ) : null}
              </div>
            </div>

            {/* Crisp unblurred lock icon at the side — bare icon like the
                procedure rows, no chip, no ring. */}
            <span
              aria-hidden="true"
              className="shrink-0 pr-1 text-[var(--color-ink-2)]"
            >
              <LuLock className="text-xl" />
            </span>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="list-none">
      <Link
        href={`/${locale}/employee/training/${item.courseId}`}
        className="group block rounded-[24px] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4 sm:p-6 transition-all duration-[var(--dur)] ease-[var(--ease)] hover:border-[var(--color-brand-tint)] hover:shadow-sm focus-visible:outline-3 focus-visible:outline-[var(--color-brand-600)] focus-visible:outline-offset-2"
      >
        {/* Station tag if any */}
        {item.stationTag ? (
          <div className="mb-2">
            <span className="text-xs font-bold tracking-wider uppercase text-[var(--color-brand-700)]">
              {item.stationTag}
            </span>
          </div>
        ) : null}

        {/* Content row: Title + Meta on left, Circular percentage on right */}
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            {/* Title line: Required pill rides just after the title text */}
            <div className="flex items-center gap-2">
              <h2 className="font-[family-name:var(--font-ui)] text-base sm:text-lg font-bold leading-snug text-[var(--color-ink)] group-hover:text-[var(--color-brand-700)] transition-colors duration-[var(--dur)]">
                {item.title}
              </h2>
              {item.isRequired ? (
                <span className="shrink-0 rounded-full bg-[var(--color-brand-600)]/10 px-2 py-1 text-xs font-semibold text-[var(--color-brand-700)]">
                  {t("requiredCourseBadge")}
                </span>
              ) : null}
            </div>

            {/* Meta Line: chapters count & duration */}
            <p className="mt-1 text-sm text-[var(--color-ink-2)] font-normal mb-1">
              {metaLine}
            </p>

            {/* Status badge & Due Date Badge below the meta */}
            <div
              className="mt-4 flex flex-wrap items-center"
              style={{ gap: "8px" }}
            >
              <TrainingStatusBadge status={item.status} locale={locale} />
              {item.dueAt &&
              item.status !== "complete" &&
              item.status !== "overdue" ? (
                <DueDateBadge dueAt={item.dueAt} locale={locale} />
              ) : null}
            </div>
          </div>

          {/* Circular Percentage Progress Ring (right edge) */}
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
