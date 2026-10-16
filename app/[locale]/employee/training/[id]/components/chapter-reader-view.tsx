"use client";

import * as React from "react";
import Link from "next/link";
import { LuArrowLeft, LuGraduationCap, LuSignature } from "react-icons/lu";
import type { Procedure, TrainingAssignment } from "@/lib/types";
import { BlockRenderer } from "@/components/doc/block-renderer";
import { QuizReader } from "@/components/doc/quiz-reader";
import { StepChecklist } from "../step-checklist";
import { FinishCourse } from "../finish-course";
import { Icon } from "@/components/ui/icon";
import { buttonClassName } from "@/components/ui/button";

interface ChapterReaderViewProps {
  course: Procedure;
  assignment?: TrainingAssignment;
  chapterNumber: number;
  locale: string;
  localeForBlocks: "en" | "es";
  blocks: any[];
  quiz: any;
  status: string;
  labels: {
    backToChapters: string;
    chapterOf: string;
    stepsHeading: string;
    criticalStep: string;
    quizHeading: string;
    ackHeading: string;
    ackCheckboxText: string;
    finish: string;
    finishHintAck: string;
    finished: string;
    backToTraining: string;
    finishedOn: string;
  };
}

/**
 * Chapter reader view rendered when employee opens a specific chapter.
 * Includes back-to-chapters link, reading content, checklist, quiz, and sign-off.
 */
export function ChapterReaderView({
  course,
  assignment,
  chapterNumber,
  locale,
  localeForBlocks,
  blocks,
  quiz,
  status,
  labels,
}: ChapterReaderViewProps): React.ReactElement {
  const isEs = locale === "es";
  const title =
    (isEs
      ? course.titleEs || course.titleEn
      : course.titleEn || course.titleEs) || course.slug;

  return (
    <main
      className="mx-auto w-full max-w-doc space-y-6 px-4 pt-6 sm:px-6 sm:pt-8"
      style={{ paddingBottom: "120px" }}
    >
      {/* Back to Chapters navigation */}
      <Link
        href={`/${locale}/employee/training/${course.id}`}
        className="inline-flex min-h-tap items-center gap-2 text-sm font-semibold text-[var(--color-ink-2)] hover:text-[var(--color-ink)] transition-colors"
      >
        <LuArrowLeft aria-hidden="true" />
        {labels.backToChapters}
      </Link>

      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-700)]">
          {labels.chapterOf}
        </p>
        <h1 className="font-[family-name:var(--font-ui)] text-xl font-semibold leading-display tracking-tight text-[var(--color-ink)] sm:text-2xl">
          {title}
        </h1>
      </header>

      {/* Chapter Body Content */}
      <div className="space-y-8">
        {(() => {
          const out: React.ReactNode[] = [];
          let run: typeof blocks = [];
          const flush = (): void => {
            if (run.length)
              out.push(
                <BlockRenderer
                  key={`r-${out.length}`}
                  blocks={run}
                  locale={localeForBlocks}
                />,
              );
            run = [];
          };
          for (const b of blocks) {
            if (b.kind === "method" && assignment) {
              flush();
              out.push(
                <StepChecklist
                  key={b.id}
                  assignmentId={assignment.id}
                  locale={locale}
                  title={labels.stepsHeading}
                  steps={b.steps.map((s: any, i: number) => ({
                    id: s.id ?? `${b.id}-${i}`,
                    text: s.body[localeForBlocks] || s.body.en,
                    critical: Boolean(s.critical || s.criticalLimit),
                  }))}
                  criticalLabel={labels.criticalStep}
                  initialDone={assignment.completedStepIds}
                  readOnly={status === "complete"}
                />,
              );
            } else {
              run.push(b);
            }
          }
          flush();
          return out;
        })()}

        {/* Attached Quiz */}
        {quiz && quiz.attached && quiz.questions.length > 0 ? (
          <section className="space-y-4">
            <header className="flex items-center gap-2">
              <Icon
                icon={LuGraduationCap}
                className="text-xl text-[var(--color-ink-2)]"
                aria-hidden="true"
              />
              <h2 className="font-[family-name:var(--font-ui)] text-lg font-semibold text-[var(--color-ink)]">
                {labels.quizHeading}
              </h2>
            </header>
            <QuizReader quiz={quiz} locale={localeForBlocks} />
          </section>
        ) : null}

        {/* Finish & Acknowledgement */}
        {assignment && status !== "complete" ? (
          <section className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
            {course.acknowledgement ? (
              <>
                <header className="flex items-center gap-2">
                  <Icon
                    icon={LuSignature}
                    className="text-xl text-[var(--color-ink-2)]"
                    aria-hidden="true"
                  />
                  <h2 className="font-[family-name:var(--font-ui)] text-lg font-semibold text-[var(--color-ink)]">
                    {labels.ackHeading}
                  </h2>
                </header>
                <p className="text-base text-[var(--color-ink)] leading-relaxed">
                  {(isEs
                    ? course.acknowledgement.statement.es ||
                      course.acknowledgement.statement.en
                    : course.acknowledgement.statement.en ||
                      course.acknowledgement.statement.es) || ""}
                </p>
              </>
            ) : null}
            <FinishCourse
              assignmentId={assignment.id}
              locale={locale}
              needsAck={Boolean(course.acknowledgement)}
              ackLabel={labels.ackCheckboxText}
              labels={{
                finish: labels.finish,
                hint: labels.finishHintAck,
                finished: labels.finished,
                back: labels.backToChapters,
              }}
            />
          </section>
        ) : assignment && status === "complete" ? (
          <section
            role="status"
            className="space-y-4 rounded-2xl bg-[var(--color-ok-tint)] p-5"
          >
            <p className="flex items-center gap-2 text-md font-semibold text-[var(--color-ok)]">
              <Icon icon={LuSignature} aria-hidden="true" />
              {labels.finished}
            </p>
            {assignment.acknowledgedAt ? (
              <p className="text-base text-[var(--color-ink)]">
                {labels.finishedOn}
              </p>
            ) : null}
            <Link
              href={`/${locale}/employee/training/${course.id}`}
              className={buttonClassName({
                variant: "neutral",
                className: "min-h-tap",
              })}
            >
              {labels.backToChapters}
            </Link>
          </section>
        ) : null}
      </div>
    </main>
  );
}
