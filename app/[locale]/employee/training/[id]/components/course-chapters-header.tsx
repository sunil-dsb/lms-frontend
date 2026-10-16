"use client";

import * as React from "react";
import Link from "next/link";
import { LuChevronLeft } from "react-icons/lu";

interface CourseChaptersHeaderProps {
  locale: string;
  title: string;
  purpose: string;
  progressPercent: number;
  backLabel: string;
  doneLabel: string;
}

/**
 * Top header for the course chapter overview screen.
 * - Back link to training list ("< Training")
 * - Course title & purpose
 * - Primary brand terracotta progress bar with percentage indicator
 * - NO "Everyone" chip (strictly omitted per user guidance)
 */
export function CourseChaptersHeader({
  locale,
  title,
  purpose,
  progressPercent,
  backLabel,
  doneLabel,
}: CourseChaptersHeaderProps): React.ReactElement {
  return (
    <header className="space-y-4">
      {/* Top navigation link */}
      <div>
        <Link
          href={`/${locale}/employee/training`}
          className="inline-flex min-h-tap items-center gap-1 text-sm font-semibold text-[var(--color-ink-2)] hover:text-[var(--color-ink)] transition-colors active:translate-x-[-2px]"
        >
          <LuChevronLeft className="text-lg" aria-hidden="true" />
          <span>{backLabel}</span>
        </Link>
      </div>

      {/* Course Title & Purpose */}
      <div className="space-y-1.5">
        <h1 className="font-[family-name:var(--font-ui)] text-xl font-medium tracking-tight text-[var(--color-ink)] sm:text-2xl">
          {title}
        </h1>
        {purpose ? (
          <p className="text-sm font-normal text-[var(--color-ink-2)] leading-relaxed">
            {purpose}
          </p>
        ) : null}
      </div>

      {/* Progress Bar Row */}
      <div className="pt-1 flex items-center gap-3">
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
        <span className="shrink-0 text-right font-[family-name:var(--font-ui)] text-xs sm:text-sm font-bold text-[var(--color-ink)] min-w-[56px]">
          {progressPercent}% {doneLabel}
        </span>
      </div>
    </header>
  );
}
