"use client";

import * as React from "react";
import {
  LuBookOpen,
  LuChevronDown,
  LuChevronUp,
  LuSparkles,
  LuTrash2,
} from "react-icons/lu";
import type { Procedure } from "@/lib/types";
import type { EditorChapter } from "./course-editor";

interface CourseChapterItemProps {
  chapter: EditorChapter;
  index: number;
  totalCount: number;
  isEs: boolean;
  proceduresMap: Map<string, Procedure>;
  fetchedProcedures: Record<string, Procedure>;
  isReordering: boolean;
  isDeleting: boolean;
  onSelect: (chapter: EditorChapter) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRequestDelete: (chapter: EditorChapter) => void;
}

export function CourseChapterItem({
  chapter,
  index,
  totalCount,
  isEs,
  proceduresMap,
  fetchedProcedures,
  isReordering,
  isDeleting,
  onSelect,
  onMoveUp,
  onMoveDown,
  onRequestDelete,
}: CourseChapterItemProps): React.ReactElement {
  // Extract linked procedures info
  const linkedProcedures: { id: string; title: string }[] = [];
  const seenIds = new Set<string>();

  const resolveProcedureTitle = (id: string, slug?: string) => {
    const sop =
      proceduresMap.get(id) ||
      (slug ? proceduresMap.get(slug) : undefined) ||
      fetchedProcedures[id];
    if (sop) {
      const title = isEs
        ? sop.titleEs || sop.titleEn
        : sop.titleEn || sop.titleEs;
      if (title) return title;
    }
    return isEs ? "Procedimiento vinculado" : "Linked procedure";
  };

  if (chapter.procedureId) {
    seenIds.add(chapter.procedureId);
    linkedProcedures.push({
      id: chapter.procedureId,
      title: resolveProcedureTitle(chapter.procedureId, chapter.procedureSlug),
    });
  }

  (chapter.blocks ?? []).forEach((b) => {
    if (b.kind === "linked_procedures" && b.procedureIds) {
      b.procedureIds.forEach((pid) => {
        if (!seenIds.has(pid)) {
          seenIds.add(pid);
          linkedProcedures.push({
            id: pid,
            title: resolveProcedureTitle(pid),
          });
        }
      });
    }
  });

  const quizQuestionsCount = chapter.quiz?.questions?.length || 0;
  const contentBlocksCount =
    chapter.blocks?.filter((b) => b.kind !== "linked_procedures").length ?? 0;

  return (
    <li
      onClick={() => onSelect(chapter)}
      className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-[var(--color-wash)] transition-colors cursor-pointer group"
    >
      <div className="flex items-start gap-4 min-w-0 flex-1">
        {/* Chapter index number without pill badge */}
        <span className="w-5 shrink-0 pt-0.5 text-sm font-semibold text-[var(--color-ink-3)] font-mono select-none">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-sm text-[var(--color-ink)] group-hover:text-[var(--color-brand-600)] transition-colors truncate">
              {chapter.title}
            </h4>
          </div>
          {chapter.subtitle && (
            <p className="mt-0.5 text-xs text-[var(--color-ink-2)] line-clamp-1">
              {chapter.subtitle}
            </p>
          )}

          {/* Chapter Metadata: linked procedures, quiz, blocks */}
          <div className="mt-1.5 flex items-center gap-3 text-xs text-[var(--color-ink-3)] flex-wrap">
            {linkedProcedures.length > 0 && (
              <span className="inline-flex items-center gap-1.5 font-medium text-[var(--color-brand-600)]">
                <LuBookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {linkedProcedures.length === 1
                    ? linkedProcedures[0].title
                    : `${linkedProcedures.length} ${
                        isEs ? "procedimientos vinculados" : "linked procedures"
                      }`}
                </span>
              </span>
            )}

            {quizQuestionsCount > 0 && (
              <>
                {linkedProcedures.length > 0 && (
                  <span className="inline-block h-1 w-1 rounded-full bg-[var(--color-line-2)]" />
                )}
                <span className="inline-flex items-center gap-1.5 font-medium text-amber-600 dark:text-amber-400">
                  <LuSparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {quizQuestionsCount}{" "}
                    {quizQuestionsCount === 1
                      ? isEs
                        ? "pregunta de quiz"
                        : "quiz question"
                      : isEs
                        ? "preguntas de quiz"
                        : "quiz questions"}
                  </span>
                </span>
              </>
            )}

            {contentBlocksCount > 0 && (
              <>
                <span className="inline-block h-1 w-1 rounded-full bg-[var(--color-line-2)]" />
                <span>
                  {contentBlocksCount}{" "}
                  {contentBlocksCount === 1
                    ? isEs
                      ? "bloque"
                      : "block"
                    : isEs
                      ? "bloques"
                      : "blocks"}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div
        className="flex items-center gap-1 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          disabled={index === 0 || isReordering}
          onClick={() => onMoveUp(index)}
          title={isEs ? "Subir capítulo" : "Move up"}
          className="p-1.5 rounded-lg text-[var(--color-ink-3)] hover:text-[var(--color-ink)] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-20 disabled:pointer-events-none transition-colors"
        >
          <LuChevronUp className="w-4 h-4" />
        </button>
        <button
          type="button"
          disabled={index === totalCount - 1 || isReordering}
          onClick={() => onMoveDown(index)}
          title={isEs ? "Bajar capítulo" : "Move down"}
          className="p-1.5 rounded-lg text-[var(--color-ink-3)] hover:text-[var(--color-ink)] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-20 disabled:pointer-events-none transition-colors"
        >
          <LuChevronDown className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onRequestDelete(chapter)}
          disabled={isDeleting}
          title={isEs ? "Eliminar capítulo" : "Remove chapter"}
          className="p-1.5 rounded-lg text-[var(--color-ink-3)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-20 transition-colors"
        >
          <LuTrash2 className="w-4 h-4" />
        </button>
      </div>
    </li>
  );
}
