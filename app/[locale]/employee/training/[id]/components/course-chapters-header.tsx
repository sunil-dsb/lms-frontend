"use client";

import * as React from "react";
import Link from "next/link";
import { LuChevronLeft, LuClock } from "react-icons/lu";
import { DueDateBadge } from "../../components/due-date-badge";

interface CourseChaptersHeaderProps {
  locale: string;
  title: string;
  purpose: string;
  progressPercent: number;
  completedChaptersCount: number;
  totalChaptersCount: number;
  dueAt?: string;
  estimatedMinutesLeft?: number;
  backLabel: string;
  backHref?: string;
  extraActions?: React.ReactNode;
  showProgress?: boolean;
}

/**
 * Top header for the course chapter overview screen matching Image 2:
 * - Back link ("< Training")
 * - Course Title & Purpose
 * - Metadata badges row: [Due in 2 days] [⏱ About 8 min left]
 *   (Strictly NO Required / Everyone tags per user instruction)
 * - Progress bar row: terracotta fill + "3 of 5 · 60%" (hidden in admin view)
 */
export function CourseChaptersHeader({
  locale,
  title,
  purpose,
  progressPercent,
  completedChaptersCount,
  totalChaptersCount,
  dueAt,
  estimatedMinutesLeft,
  backLabel,
  backHref,
  extraActions,
  showProgress = true,
}: CourseChaptersHeaderProps): React.ReactElement {
  const isEs = locale === "es";

  const progressLabel = isEs
    ? `${completedChaptersCount} de ${totalChaptersCount} · ${progressPercent}%`
    : `${completedChaptersCount} of ${totalChaptersCount} · ${progressPercent}%`;

  const timeLeftText = showProgress
    ? isEs
      ? `Aprox. ${estimatedMinutesLeft ?? 0} min restantes`
      : `About ${estimatedMinutesLeft ?? 0} min left`
    : isEs
      ? `Aprox. ${estimatedMinutesLeft ?? 0} min`
      : `About ${estimatedMinutesLeft ?? 0} min`;

  return (
    <header className="space-y-4">
      {/* Top navigation link & optional actions */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href={backHref ?? `/${locale}/employee/training`}
          className="inline-flex min-h-tap items-center gap-1 text-sm font-semibold text-[var(--color-ink-2)] hover:text-[var(--color-ink)] transition-colors active:translate-x-[-2px]"
        >
          <LuChevronLeft className="text-lg" aria-hidden="true" />
          <span>{backLabel}</span>
        </Link>
        {extraActions}
      </div>

      {/* Course Title & Purpose */}
      <div className="space-y-1.5">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          {title}
        </h1>
        {purpose ? (
          <p className="text-sm sm:text-base font-normal leading-relaxed text-[var(--color-ink-2)]">
            {purpose}
          </p>
        ) : null}
      </div>

      {/* Metadata Badges Row: Due date badge + Estimated time left */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {dueAt && <DueDateBadge dueAt={dueAt} locale={locale} />}

        {estimatedMinutesLeft !== undefined && estimatedMinutesLeft > 0 && (
          <span
            className="inline-flex items-center rounded-full border border-[var(--color-line-2)] bg-[var(--color-wash)] text-[var(--color-ink)] select-none shadow-2xs"
            style={{
              paddingLeft: "12px",
              paddingRight: "12px",
              paddingTop: "5px",
              paddingBottom: "5px",
              fontSize: "12px",
              lineHeight: "1.2",
              fontWeight: "500",
              gap: "6px",
            }}
          >
            <LuClock
              className="w-3.5 h-3.5 text-[var(--color-ink-2)] shrink-0"
              aria-hidden="true"
            />
            <span>{timeLeftText}</span>
          </span>
        )}
      </div>

      {/* Progress Bar Row - Hidden in Admin View */}
      {showProgress && (
        <div className="pt-2 flex items-center gap-3">
          <div
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${title} progress`}
            className="h-2 flex-1 rounded-full bg-[var(--color-panel-2)] overflow-hidden"
          >
            <div
              className="h-full rounded-full bg-[var(--color-brand-600)] transition-all duration-[var(--dur)] ease-[var(--ease)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="shrink-0 text-right font-[family-name:var(--font-ui)] text-xs sm:text-sm font-bold text-[var(--color-ink)] min-w-[70px]">
            {progressLabel}
          </span>
        </div>
      )}
    </header>
  );
}
