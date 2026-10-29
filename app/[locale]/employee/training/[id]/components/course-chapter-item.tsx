"use client";

import * as React from "react";
import Link from "next/link";
import {
  LuBookOpen,
  LuCheck,
  LuChevronRight,
  LuListChecks,
  LuLock,
  LuSparkles,
  LuUtensils,
  LuVideo,
} from "react-icons/lu";
import type { CourseChapter } from "@/lib/course-chapters-data";
import { ChapterStatusIndicator } from "./chapter-status-indicator";

interface CourseChapterItemProps {
  chapter: CourseChapter;
  locale: string;
  courseId: string;
  basePath?: string;
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
  basePath,
}: CourseChapterItemProps): React.ReactElement {
  const isEs = locale === "es";
  const isComplete = chapter.status === "complete";
  const isActive = chapter.status === "active";
  const isLocked = chapter.status === "locked";
  const blocks = chapter.blocks ?? [];
  const hasVideo =
    chapter.contentType === "video" ||
    blocks.some((block) => block.kind === "video");
  const hasChecklist =
    chapter.contentType === "checklist" ||
    blocks.some(
      (block) => block.kind === "checklist" || block.kind === "method",
    );
  const hasRecipe = blocks.some(
    (block) => block.kind === "ingredients" || block.kind === "recipe",
  );

  // Single linked procedure title resolution
  const [singleProcTitle, setSingleProcTitle] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    const isSingle =
      chapter.linkedProceduresCount === 1 ||
      (!chapter.linkedProceduresCount && chapter.hasProcedure);

    if (isSingle) {
      const procId =
        chapter.procedureId ||
        chapter.procedureSlug ||
        (
          chapter.blocks?.find(
            (b: any) =>
              b.kind === "linked_procedures" &&
              Array.isArray(b.procedureIds) &&
              b.procedureIds.length > 0,
          ) as any
        )?.procedureIds?.[0];

      if (procId) {
        import("@/services/library/api")
          .then(({ getCachedProcedure, fetchProcedureById }) => {
            const cached = getCachedProcedure(procId);
            if (cached) {
              const title = isEs
                ? cached.titleEs || cached.titleEn
                : cached.titleEn || cached.titleEs;
              if (title) setSingleProcTitle(title);
            } else {
              fetchProcedureById(procId, true)
                .then((p) => {
                  if (p) {
                    const title = isEs
                      ? p.titleEs || p.titleEn
                      : p.titleEn || p.titleEs;
                    if (title) setSingleProcTitle(title);
                  }
                })
                .catch(() => {});
            }
          })
          .catch(() => {});
      }
    }
  }, [chapter, isEs]);

  const linkedProcedureLabel = React.useMemo(() => {
    if (chapter.linkedProceduresCount && chapter.linkedProceduresCount > 1) {
      return `${chapter.linkedProceduresCount} ${
        isEs ? "procedimientos vinculados" : "linked procedures"
      }`;
    }
    if (singleProcTitle) {
      return singleProcTitle;
    }
    return isEs ? "Procedimiento vinculado" : "Linked procedure";
  }, [chapter.linkedProceduresCount, singleProcTitle, isEs]);

  const content = (
    <div className="flex items-center justify-between gap-4">
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
          <span className="text-[11px] font-medium tracking-wider uppercase text-[var(--color-ink-3)]">
            {isEs ? `CAPÍTULO ${chapter.number}` : `CHAPTER ${chapter.number}`}
          </span>

          {isActive && (
            <span
              className="inline-flex items-center rounded-full font-medium select-none"
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
          className={`mt-1 text-[15px] font-medium leading-snug ${
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

        {/* Chapter Metadata: Procedure, Video, Checklist, Recipe & Quiz — one
            badge chrome for all (same padding, radius, border), differing only
            in icon accent, so the row reads as a set rather than a grab bag. */}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-ink-2)]">
          {chapter.hasProcedure && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] px-3 py-[5px] font-medium text-[var(--color-brand-600)] shadow-2xs dark:border-[var(--color-brand-800)] dark:bg-[var(--color-brand-950)]">
              <LuBookOpen className="h-3.5 w-3.5 shrink-0" />
              <span>{linkedProcedureLabel}</span>
            </span>
          )}
          {hasVideo && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-[5px] font-medium text-sky-600 shadow-2xs dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-400">
              <LuVideo className="h-3.5 w-3.5 shrink-0" />
              <span>Video</span>
            </span>
          )}
          {hasChecklist && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-wash)] px-3 py-[5px] font-medium text-[var(--color-ink-2)] shadow-2xs">
              <LuListChecks className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <span>{isEs ? "Lista de verificación" : "Checklist"}</span>
            </span>
          )}
          {hasRecipe && (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-[5px] font-medium text-amber-700 shadow-2xs dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
              <LuUtensils className="h-3.5 w-3.5 shrink-0" />
              <span>{isEs ? "Receta" : "Recipe"}</span>
            </span>
          )}
          {typeof chapter.quizQuestionsCount === "number" &&
          chapter.quizQuestionsCount > 0 ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-wash)] px-3 py-[5px] font-medium text-[var(--color-ink-2)] shadow-2xs">
              <LuSparkles className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span>
                {chapter.quizQuestionsCount}{" "}
                {chapter.quizQuestionsCount === 1
                  ? isEs
                    ? "pregunta de cuestionario"
                    : "quiz question"
                  : isEs
                    ? "preguntas de cuestionario"
                    : "quiz questions"}
              </span>
            </span>
          ) : (
            <span className="text-xs text-[var(--color-ink-3)]">
              {isEs ? "Sin cuestionario" : "No quiz"}
            </span>
          )}
        </div>
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
          className="block rounded-2xl border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4 sm:p-5 opacity-75 select-none"
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
        href={`${basePath ?? `/${locale}/employee/training/${courseId}`}?chapter=${chapter.number}`}
        className={`group block rounded-2xl p-4 sm:p-5 transition-all duration-[var(--dur)] ease-[var(--ease)] focus-visible:outline-3 focus-visible:outline-[var(--color-brand-600)] focus-visible:outline-offset-2 ${
          isActive
            ? "mt-2 border-2 border-[var(--color-brand-600)] bg-[var(--color-surface)] shadow-xs hover:shadow-sm "
            : "border border-[var(--color-line-2)] bg-[var(--color-surface)] hover:border-[var(--color-line)] hover:shadow-xs"
        }`}
      >
        {content}
      </Link>
    </li>
  );
}
