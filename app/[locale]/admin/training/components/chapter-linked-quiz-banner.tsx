"use client";

import * as React from "react";
import type {
  Procedure,
  ProcedureQuiz,
  ProcedureQuizQuestion,
} from "@/lib/types";
import { LuBookOpen, LuCheck } from "react-icons/lu";

interface ChapterLinkedQuizBannerProps {
  availableLinkedQuestions: Array<{
    procedure: Procedure;
    questions: ProcedureQuizQuestion[];
  }>;
  quiz: ProcedureQuiz | null;
  isEs: boolean;
}

export function ChapterLinkedQuizBanner({
  availableLinkedQuestions,
  quiz,
  isEs,
}: ChapterLinkedQuizBannerProps): React.ReactElement | null {
  if (availableLinkedQuestions.length === 0) return null;

  return (
    <div className="rounded-xl border border-[var(--color-warn)]/40 bg-[var(--color-warn-tint)] mb-6 shadow-xs p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex w-9 h-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-warn)] text-white shadow-xs">
            <LuBookOpen className="w-5 h-5 p-1" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[var(--color-warn-ink)]">
              {isEs
                ? "Preguntas de procedimientos vinculados incluidas"
                : "Linked procedure questions included"}
            </h4>
            <p className="text-xs text-[var(--color-ink-2)] mt-0.5">
              {isEs
                ? "Las preguntas de los procedimientos vinculados están precargadas abajo como parte del cuestionario de este capítulo."
                : "Questions from linked procedures are automatically prefilled below as part of this chapter's quiz."}
            </p>
          </div>
        </div>

        {/* Procedure chips */}
        <div className="flex flex-wrap items-center gap-2">
          {availableLinkedQuestions.map(({ procedure, questions }) => {
            const title = isEs
              ? procedure.titleEs || procedure.titleEn
              : procedure.titleEn || procedure.titleEs;
            const countInQuiz = (quiz?.questions ?? []).filter(
              (q) => q.sourceProcedureId === procedure.id,
            ).length;

            return (
              <span
                key={procedure.id}
                className="inline-flex items-center rounded-[var(--radius-sm)] text-xs font-medium bg-[var(--color-surface)] border border-[var(--color-warn)]/50 text-[var(--color-ink)] shadow-xs px-3 py-1 gap-2"
              >
                <LuBookOpen className="w-4 h-4 text-[var(--color-warn-ink)] shrink-0" />
                <span className="font-semibold">{title}</span>
                <span className="text-xs text-[var(--color-ink-2)]">
                  ({questions.length}{" "}
                  {questions.length === 1 ? "question" : "questions"})
                </span>
                {countInQuiz > 0 && (
                  <span className="inline-flex items-center font-bold text-[var(--color-ok-700)] bg-[var(--color-ok-tint)] border border-[var(--color-ok)]/30 rounded-[var(--radius-sm)] text-xs ml-1 px-2 py-0.5 gap-1">
                    <LuCheck className="w-4 h-4 stroke-[2.5]" />
                    <span>{countInQuiz} in quiz</span>
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
