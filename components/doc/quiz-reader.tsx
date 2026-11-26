"use client";

/**
 * QuizReader — the read-side quiz block on a procedure detail page.
 *
 * The reader mirrors the QuizEditor surface one-to-one: collapsed-by-default
 * accordion rows, click to expand, correct answer highlighted in ok-green
 * with a "Correct" badge. This keeps what the employee sees in lockstep with
 * what the admin authored — they read the same shape the admin built.
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type {
  Localised,
  ProcedureQuiz,
  ProcedureQuizQuestion,
} from "@/lib/types";
import {
  LuCheck,
  LuChevronRight,
  LuCircle,
  LuCircleCheck,
  LuLoader,
  LuRotateCcw,
  LuX,
} from "react-icons/lu";
import { checkQuizAnswerApi } from "@/lib/api";
import {
  SequenceSortableList,
  shuffleSequence,
} from "@/components/quiz/sequence-sortable-list";

interface QuizReaderProps {
  quiz: ProcedureQuiz;
  locale: "en" | "es";
}

function pickText(v: Localised | undefined, locale: "en" | "es"): string {
  if (!v) return "";
  return v[locale] || v.en || v.es || "";
}

function RadioDot({
  selected,
  isCorrect,
  isWrong,
}: {
  selected: boolean;
  isCorrect?: boolean;
  isWrong?: boolean;
}) {
  if (isCorrect) {
    return (
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--ok)] text-white shadow-xs">
        <LuCheck className="size-3 stroke-[3]" />
      </span>
    );
  }
  if (isWrong) {
    return (
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--bad)] text-white shadow-xs">
        <LuX className="size-3 stroke-[3]" />
      </span>
    );
  }
  if (selected) {
    return (
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--surface)]">
        <span className="size-2 rounded-full bg-[var(--ink)]" />
      </span>
    );
  }
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-[var(--line-3)] bg-[var(--surface)] transition-colors" />
  );
}

export function QuizReader({
  quiz,
  locale,
}: QuizReaderProps): React.ReactElement {
  const t = useTranslations("employee.doc.quiz");
  const questions = quiz.questions;
  const [openId, setOpenId] = React.useState<string | null>(
    questions[0]?.id ?? null,
  );
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [sequenceOrders, setSequenceOrders] = React.useState<
    Record<string, string[]>
  >(() => {
    const initial: Record<string, string[]> = {};
    for (const q of questions) {
      if (
        q.type === "sequence" &&
        q.sequenceItems &&
        q.sequenceItems.length > 0
      ) {
        initial[q.id] = shuffleSequence(q.sequenceItems);
      }
    }
    return initial;
  });
  const [sequenceChecked, setSequenceChecked] = React.useState<
    Record<string, boolean>
  >({});
  const [checkingSequence, setCheckingSequence] = React.useState<
    Record<string, boolean>
  >({});
  const [sequenceResults, setSequenceResults] = React.useState<
    Record<string, boolean>
  >({});

  const handleSelectChoice = (questionId: string, choiceId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: choiceId,
    }));
  };

  const handleSequenceChange = (questionId: string, newIds: string[]) => {
    setSequenceOrders((prev) => ({
      ...prev,
      [questionId]: newIds,
    }));
    setSequenceChecked((prev) => ({
      ...prev,
      [questionId]: false,
    }));
    setSequenceResults((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  const handleCheckSequence = async (question: ProcedureQuizQuestion) => {
    const questionId = question.id;
    const current =
      sequenceOrders[questionId] ||
      (question.sequenceItems || []).map((s) => s.id);
    const correct = (question.sequenceItems || []).map((s) => s.id);

    setCheckingSequence((prev) => ({ ...prev, [questionId]: true }));

    let isCorrectResult = false;
    const targetQuizId = quiz.id;

    if (targetQuizId) {
      try {
        const res = await checkQuizAnswerApi(targetQuizId, {
          questionId,
          sequenceOrder: current,
        });
        isCorrectResult = Boolean(res.isCorrect);
      } catch {
        // Fallback to client check if backend route is unreachable or offline
        isCorrectResult =
          current.length === correct.length &&
          current.length > 0 &&
          current.every((id, idx) => id === correct[idx]);
      }
    } else {
      isCorrectResult =
        current.length === correct.length &&
        current.length > 0 &&
        current.every((id, idx) => id === correct[idx]);
    }

    setSequenceResults((prev) => ({ ...prev, [questionId]: isCorrectResult }));
    setSequenceChecked((prev) => ({ ...prev, [questionId]: true }));
    setCheckingSequence((prev) => ({ ...prev, [questionId]: false }));
  };

  const handleShuffleSequence = (
    questionId: string,
    items: Array<{ id: string }>,
  ) => {
    setSequenceOrders((prev) => ({
      ...prev,
      [questionId]: shuffleSequence(items),
    }));
    setSequenceChecked((prev) => ({
      ...prev,
      [questionId]: false,
    }));
    setSequenceResults((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  const isSequenceCorrect = (question: ProcedureQuizQuestion) => {
    if (sequenceResults[question.id] !== undefined) {
      return sequenceResults[question.id];
    }
    const current = sequenceOrders[question.id] || [];
    const correct = (question.sequenceItems || []).map((s) => s.id);
    if (current.length === 0 || current.length !== correct.length) return false;
    return current.every((id, idx) => id === correct[idx]);
  };

  const correctLabel = locale === "es" ? "Correcta" : "Correct";
  const incorrectLabel = locale === "es" ? "Incorrecta" : "Incorrect";

  return (
    <section className="doc-sec">
      <h2>
        {t("heading")}
        <span className="count">
          {" · "}
          {t("count", { count: questions.length })}
        </span>
      </h2>
      <p className="doc-purpose">{t("intro")}</p>

      <ol className="mt-6 space-y-4">
        {questions.map((q, i) => {
          const isOpen = openId === q.id;
          const selectedChoiceId = answers[q.id];
          const hasAnswered = Boolean(selectedChoiceId);
          const hasCorrectId = Boolean(
            q.correctChoiceId && q.correctChoiceId.trim(),
          );

          return (
            <li
              key={q.id}
              className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line-2)] bg-[var(--surface)] shadow-xs"
            >
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : q.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-[var(--wash)]"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--line-2)] bg-[var(--panel)] text-sm font-bold text-[var(--ink)]">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm sm:text-base font-semibold text-[var(--ink)]">
                  {pickText(q.prompt || q.question, locale)}
                </span>
                <span
                  className={cn(
                    "text-[var(--ink-3)] transition-transform duration-200",
                    isOpen && "rotate-90",
                  )}
                  aria-hidden="true"
                >
                  <LuChevronRight className="size-4" />
                </span>
              </button>
              {isOpen && (
                <div className="border-t border-[var(--line)] bg-[var(--wash)] p-4 sm:p-5">
                  {q.type === "sequence" ? (
                    <div className="space-y-4">
                      <p className="text-xs sm:text-sm font-medium text-[var(--ink-2)]">
                        {locale === "es"
                          ? "Organiza los siguientes pasos en el orden correcto arrastrándolos o usando las flechas:"
                          : "Arrange the following steps in the correct order by dragging or using the arrows:"}
                      </p>
                      <SequenceSortableList
                        items={(q.sequenceItems || []).map((s) => ({
                          id: s.id,
                          label: s.label,
                        }))}
                        orderedIds={
                          sequenceOrders[q.id] ||
                          (q.sequenceItems || []).map((s) => s.id)
                        }
                        onChange={(newIds) =>
                          handleSequenceChange(q.id, newIds)
                        }
                        locale={locale}
                        isReview={Boolean(sequenceChecked[q.id])}
                        correctIds={(q.sequenceItems || []).map((s) => s.id)}
                      />
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => handleCheckSequence(q)}
                          disabled={checkingSequence[q.id]}
                          className="flex items-center gap-2 rounded-full bg-[var(--brand-600)] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-[var(--brand-700)] disabled:opacity-60 transition-colors cursor-pointer"
                        >
                          {checkingSequence[q.id] && (
                            <LuLoader className="size-3.5 animate-spin" />
                          )}
                          {t("checkOrder")}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleShuffleSequence(q.id, q.sequenceItems || [])
                          }
                          disabled={checkingSequence[q.id]}
                          className="flex items-center gap-1.5 rounded-full border border-[var(--line-2)] bg-[var(--surface)] px-4 py-2 text-xs sm:text-sm font-semibold text-[var(--ink)] hover:bg-[var(--panel)] disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          <LuRotateCcw className="size-3.5" />
                          {t("shuffleAgain")}
                        </button>
                      </div>
                      {sequenceChecked[q.id] && (
                        <div
                          className={cn(
                            "rounded-xl px-4 py-3 text-xs sm:text-sm font-medium transition-all flex items-center gap-3 shadow-xs",
                            isSequenceCorrect(q)
                              ? "border border-[var(--ok)]/40 bg-[var(--ok-tint)] text-[var(--ok)]"
                              : "border border-[var(--bad)]/40 bg-[var(--bad-tint)] text-[var(--bad)]",
                          )}
                        >
                          {isSequenceCorrect(q) ? (
                            <>
                              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--ok)] text-white shadow-xs">
                                <LuCheck className="size-3.5 stroke-[3]" />
                              </span>
                              <span className="leading-snug">
                                {t("orderCorrect")}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--bad)] text-white shadow-xs">
                                <LuX className="size-3.5 stroke-[3]" />
                              </span>
                              <span className="leading-snug">
                                {t("orderIncorrect")}
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(q.choices || []).map((c) => {
                        const isSelected = selectedChoiceId === c.id;
                        const isCorrect =
                          hasCorrectId && c.id === q.correctChoiceId;
                        const isWrongSelection =
                          hasAnswered &&
                          isSelected &&
                          hasCorrectId &&
                          !isCorrect;

                        let stateStyle =
                          "border border-[var(--line-2)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--line-3)] hover:bg-[var(--panel)]";
                        let badge = null;

                        if (hasCorrectId) {
                          if (hasAnswered && isCorrect) {
                            stateStyle =
                              "border-2 border-[var(--ok)] bg-[var(--ok-tint)] text-[var(--ink)]";
                            badge = (
                              <span className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--ok)]/15 px-3 py-2 text-xs font-semibold text-[var(--ok)]">
                                <LuCheck
                                  className="size-4 stroke-[3]"
                                  aria-hidden="true"
                                />
                                {correctLabel}
                              </span>
                            );
                          } else if (isWrongSelection) {
                            stateStyle =
                              "border-2 border-[var(--bad)] bg-[var(--bad-tint)] text-[var(--ink)]";
                            badge = (
                              <span className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--bad)]/15 px-3 py-2 text-xs font-semibold text-[var(--bad)]">
                                <LuX
                                  className="size-4 stroke-[3]"
                                  aria-hidden="true"
                                />
                                {incorrectLabel}
                              </span>
                            );
                          } else if (isSelected) {
                            stateStyle =
                              "border-2 border-[var(--brand-600)] bg-[var(--brand-tint)]/25 text-[var(--ink)]";
                          }
                        } else {
                          if (isSelected) {
                            stateStyle =
                              "border-2 border-[var(--brand-600)] bg-[var(--brand-tint)]/25 text-[var(--ink)]";
                          }
                        }

                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectChoice(q.id, c.id)}
                            className={cn(
                              "flex w-full cursor-pointer items-center gap-4 rounded-[var(--radius-md)] px-4 py-3 sm:py-4 text-left text-sm sm:text-base font-medium transition-all select-none focus:outline-none",
                              stateStyle,
                            )}
                          >
                            <RadioDot
                              selected={isSelected}
                              isCorrect={
                                hasCorrectId && hasAnswered && isCorrect
                              }
                              isWrong={isWrongSelection}
                            />
                            <span className="flex-1 leading-snug text-[var(--ink)]">
                              {pickText(c.label, locale)}
                            </span>
                            {badge}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
