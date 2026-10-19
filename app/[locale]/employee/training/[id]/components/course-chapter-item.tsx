"use client";

import * as React from "react";
import Link from "next/link";
import { LuCheck, LuChevronRight, LuLock } from "react-icons/lu";
import type { CourseChapter } from "@/lib/course-chapters-data";
import { ChapterStatusIndicator } from "./chapter-status-indicator";

interface CourseChapterItemProps {
  chapter: CourseChapter;
  locale: string;
  courseId: string;
}

/**
 * Chapter Card Component:
 * - Left node: Green checkmark (Complete), Terracotta number (Active), Gray lock (Locked)
 * - Details column:
 *    - "CHAPTER N" uppercase tag + "Up next" pill on active
 *    - Bold chapter title
 *    - ChapterStatusIndicator (icon + status text, green on complete)
 * - Trailing chevron right for interactive cards
 * - Active card has terracotta border
 */
export function CourseChapterItem({
  chapter,
  locale,
  courseId,
}: CourseChapterItemProps): React.ReactElement {
  const isEs = locale === "es";
  const isComplete = chapter.status === "complete";
  const isActive = chapter.status === "active";
  const isLocked = chapter.status === "locked";

  const content = (
    <div className="flex items-center justify-between" style={{ gap: "14px" }}>
      {/* Left indicator icon / badge */}
      <div className="shrink-0 flex items-center justify-center">
        {isComplete ? (
          <div
            aria-label="Completed"
            style={{
              width: "36px",
              height: "36px",
              minWidth: "36px",
              minHeight: "36px",
            }}
            className="flex items-center justify-center rounded-full bg-[#16A34A] text-white shadow-xs"
          >
            <LuCheck
              className="text-lg text-white"
              strokeWidth={3}
              aria-hidden="true"
            />
          </div>
        ) : isActive ? (
          <div
            aria-label={`Chapter ${chapter.number}`}
            style={{
              width: "36px",
              height: "36px",
              minWidth: "36px",
              minHeight: "36px",
            }}
            className="flex items-center justify-center rounded-full bg-[var(--color-brand-600)] text-white font-bold text-sm shadow-xs"
          >
            <span className="text-white text-sm font-bold">
              {chapter.number}
            </span>
          </div>
        ) : (
          <div
            aria-label="Locked"
            style={{
              width: "36px",
              height: "36px",
              minWidth: "36px",
              minHeight: "36px",
            }}
            className="flex items-center justify-center rounded-full bg-[var(--color-panel-2)] text-[var(--color-ink-3)] border border-[var(--color-line-2)]"
          >
            <LuLock
              className="text-base text-[var(--color-ink-3)]"
              aria-hidden="true"
            />
          </div>
        )}
      </div>

      {/* Chapter Details: CHAPTER N, Title & Subtitle with Icon */}
      <div className="min-w-0 flex-1">
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
                padding: "2px 8px",
                fontSize: "11px",
                lineHeight: "1.2",
              }}
            >
              {isEs ? "Siguiente" : "Up next"}
            </span>
          )}
        </div>

        {/* Chapter Title */}
        <h2
          className={`mt-0.5 font-[family-name:var(--font-ui)] text-base leading-snug font-bold ${
            isLocked ? "text-[var(--color-ink-2)]" : "text-[var(--color-ink)]"
          }`}
        >
          {chapter.title}
        </h2>

        {/* Subtext with Icon & Green Color via Reusable Component */}
        <ChapterStatusIndicator
          status={chapter.status}
          contentType={chapter.contentType}
          subtitle={chapter.subtitle}
          className="mt-1"
        />
      </div>

      {/* Trailing chevron or status glyph */}
      <div className="shrink-0 flex items-center justify-center">
        {isComplete ? (
          <LuChevronRight
            className="text-xl text-[var(--color-ink-3)]"
            aria-hidden="true"
          />
        ) : isActive ? (
          <LuChevronRight
            className="text-xl text-[var(--color-brand-600)]"
            aria-hidden="true"
          />
        ) : (
          <span className="w-5" />
        )}
      </div>
    </div>
  );

  // If locked, render non-navigable container
  if (isLocked) {
    return (
      <li className="list-none">
        <div
          aria-disabled="true"
          className="block rounded-2xl border border-[var(--color-line-2)] bg-[var(--color-surface)] p-3.5 sm:p-4 opacity-75 select-none"
        >
          {content}
        </div>
      </li>
    );
  }

  // Active or Complete: clickable link to open chapter content
  return (
    <li className="list-none">
      <Link
        href={`/${locale}/employee/training/${courseId}?chapter=${chapter.number}`}
        className={`group block rounded-2xl p-3.5 sm:p-4 transition-all duration-[var(--dur)] ease-[var(--ease)] focus-visible:outline-3 focus-visible:outline-[var(--color-brand-600)] focus-visible:outline-offset-2 ${
          isActive
            ? "border-2 border-[var(--color-brand-600)] bg-[var(--color-surface)] shadow-xs hover:shadow-sm"
            : "border border-[var(--color-line-2)] bg-[var(--color-surface)] hover:border-[var(--color-line)] hover:shadow-xs"
        }`}
      >
        {content}
      </Link>
    </li>
  );
}
