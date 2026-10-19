"use client";

import * as React from "react";
import Link from "next/link";
import {
  LuBookOpen,
  LuCheck,
  LuCircleCheck,
  LuListChecks,
  LuLock,
  LuPaperclip,
  LuVideo,
} from "react-icons/lu";
import type { CourseChapter } from "@/lib/course-chapters-data";

interface ChapterTimelineItemProps {
  chapter: CourseChapter;
  isFirst: boolean;
  isLast: boolean;
  isPrevComplete: boolean;
  locale: string;
  courseId: string;
}

/**
 * Chapter Timeline Item matching Image 2 reference design:
 * - Vertical connected timeline line (green for completed, gray for upcoming)
 * - Circle indicator:
 *    - Green circle with checkmark for Complete
 *    - Terracotta circle with number for Active ("Up next")
 *    - Gray circle with lock icon for Locked
 * - Header: CHAPTER N + "Up next" badge for active
 * - Title: Bold chapter name
 * - Subtext with icon:
 *    - Completed: green text with check/checklist/procedure icon
 *    - Active: video/checklist icon with details
 *    - Locked: lock icon with locked description
 */
export function ChapterTimelineItem({
  chapter,
  isFirst,
  isLast,
  isPrevComplete,
  locale,
  courseId,
}: ChapterTimelineItemProps): React.ReactElement {
  const isEs = locale === "es";
  const isComplete = chapter.status === "complete";
  const isActive = chapter.status === "active";
  const isLocked = chapter.status === "locked";

  // Pick appropriate icon for status subtext based on contentType or text
  const getSubtextIcon = () => {
    if (isLocked) {
      return (
        <LuLock className="w-3.5 h-3.5 shrink-0 text-[var(--color-ink-3)]" />
      );
    }
    if (chapter.contentType === "checklist") {
      return (
        <LuListChecks
          className={`w-3.5 h-3.5 shrink-0 ${
            isComplete ? "text-[#16A34A]" : "text-[var(--color-ink-2)]"
          }`}
        />
      );
    }
    if (chapter.contentType === "procedure") {
      return (
        <LuBookOpen
          className={`w-3.5 h-3.5 shrink-0 ${
            isComplete ? "text-[#16A34A]" : "text-[var(--color-ink-2)]"
          }`}
        />
      );
    }
    if (chapter.contentType === "quiz") {
      return (
        <LuCircleCheck
          className={`w-3.5 h-3.5 shrink-0 ${
            isComplete ? "text-[#16A34A]" : "text-[var(--color-ink-2)]"
          }`}
        />
      );
    }
    if (chapter.contentType === "video") {
      return (
        <LuVideo
          className={`w-3.5 h-3.5 shrink-0 ${
            isComplete ? "text-[#16A34A]" : "text-[var(--color-ink-2)]"
          }`}
        />
      );
    }
    if (chapter.contentType === "file") {
      return (
        <LuPaperclip
          className={`w-3.5 h-3.5 shrink-0 ${
            isComplete ? "text-[#16A34A]" : "text-[var(--color-ink-2)]"
          }`}
        />
      );
    }
    // Fallback based on subtitle keywords
    if (chapter.subtitle.toLowerCase().includes("checklist")) {
      return (
        <LuListChecks
          className={`w-3.5 h-3.5 shrink-0 ${
            isComplete ? "text-[#16A34A]" : "text-[var(--color-ink-2)]"
          }`}
        />
      );
    }
    if (chapter.subtitle.toLowerCase().includes("quiz")) {
      return (
        <LuCircleCheck
          className={`w-3.5 h-3.5 shrink-0 ${
            isComplete ? "text-[#16A34A]" : "text-[var(--color-ink-2)]"
          }`}
        />
      );
    }
    if (chapter.subtitle.toLowerCase().includes("procedure")) {
      return (
        <LuBookOpen
          className={`w-3.5 h-3.5 shrink-0 ${
            isComplete ? "text-[#16A34A]" : "text-[var(--color-ink-2)]"
          }`}
        />
      );
    }
    if (isComplete) {
      return <LuCheck className="w-3.5 h-3.5 shrink-0 text-[#16A34A]" />;
    }
    return null;
  };

  const content = (
    <div className="flex items-start gap-4">
      {/* Left Stepper Column: Circle + Continuous Connecting Vertical Line */}
      <div className="relative flex flex-col items-center shrink-0 self-stretch w-9">
        {/* Top connecting line (from top-0 down to center of node) */}
        {!isFirst && (
          <div
            className="w-[2.5px] absolute top-0"
            style={{
              height: "22px",
              backgroundColor: isPrevComplete
                ? "#16A34A"
                : "var(--color-line-2)",
            }}
          />
        )}

        {/* Bottom connecting line (from center of node down to bottom-0) */}
        {!isLast && (
          <div
            className="w-[2.5px] absolute top-[20px] bottom-0"
            style={{
              backgroundColor: isComplete ? "#16A34A" : "var(--color-line-2)",
            }}
          />
        )}

        {/* Center Circle Node */}
        <div className="relative z-10 shrink-0 mt-1 mb-2">
          {isComplete ? (
            <div
              aria-label="Completed"
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-[#16A34A] text-white shadow-xs"
            >
              <LuCheck
                className="text-base text-white stroke-[3]"
                aria-hidden="true"
              />
            </div>
          ) : isActive ? (
            <div
              aria-label={`Chapter ${chapter.number}`}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-white font-bold text-sm shadow-xs"
            >
              <span>{chapter.number}</span>
            </div>
          ) : (
            <div
              aria-label="Locked"
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-[var(--color-panel-2)] text-[var(--color-ink-3)] border border-[var(--color-line-2)]"
            >
              <LuLock
                className="text-sm text-[var(--color-ink-3)]"
                aria-hidden="true"
              />
            </div>
          )}
        </div>
      </div>

      {/* Right Content Details */}
      <div className="min-w-0 flex-1 pt-1 pb-6">
        {/* Uppercase CHAPTER N line + Up next badge */}
        <div className="flex items-center gap-2">
          <span className="font-[family-name:var(--font-ui)] text-[11px] font-bold tracking-wider uppercase text-[var(--color-ink-3)]">
            {isEs ? `CAPÍTULO ${chapter.number}` : `CHAPTER ${chapter.number}`}
          </span>

          {isActive && (
            <span
              className="inline-flex items-center rounded-full font-semibold select-none"
              style={{
                backgroundColor: "var(--brand-tint, #FCE8D4)",
                color: "var(--brand-700, #A8371F)",
                padding: "3px 10px",
                fontSize: "11px",
                lineHeight: "1.2",
              }}
            >
              {isEs ? "Siguiente" : "Up next"}
            </span>
          )}
        </div>

        {/* Chapter Title */}
        <h3
          className={`mt-1 font-[family-name:var(--font-ui)] text-[15px] sm:text-base font-semibold leading-snug transition-colors ${
            isLocked
              ? "text-[var(--color-ink-2)]"
              : "text-[var(--color-ink)] group-hover:text-[var(--color-brand-700)]"
          }`}
        >
          {chapter.title}
        </h3>

        {/* Subtext with Icon */}
        <div
          className={`mt-1.5 flex items-center gap-1.5 text-xs font-medium ${
            isComplete
              ? "text-[#16A34A]"
              : isLocked
                ? "text-[var(--color-ink-3)]"
                : "text-[var(--color-ink-2)]"
          }`}
        >
          {getSubtextIcon()}
          <span>{chapter.subtitle}</span>
        </div>
      </div>
    </div>
  );

  // Locked item: non-clickable
  if (isLocked) {
    return <li className="list-none opacity-80 select-none">{content}</li>;
  }

  // Active or complete: clickable link
  return (
    <li className="list-none">
      <Link
        href={`/${locale}/employee/training/${courseId}?chapter=${chapter.number}`}
        className="group block transition-colors duration-[var(--dur)] focus-visible:outline-3 focus-visible:outline-[var(--color-brand-600)] focus-visible:outline-offset-2"
      >
        {content}
      </Link>
    </li>
  );
}
