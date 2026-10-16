import * as React from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  LuArrowLeft,
  LuBookOpen,
  LuGraduationCap,
  LuSignature,
} from "react-icons/lu";
import { ApiException, fetchMe, getQuizById, listProcedures } from "@/lib/api";
import {
  courseStepCount,
  effectiveStatus,
  getCourseById,
  listTrainingAssignmentsForEmployee,
  mockTrainingEmployees,
} from "@/lib/mock-training";
import { StatusPill } from "@/components/ui/status-pill";
import { buttonClassName } from "@/components/ui/button";
import { ProcedureRow } from "@/components/employee/procedure-row";
import { FinishCourse } from "./finish-course";
import { StepChecklist } from "./step-checklist";
import { TabBar } from "@/components/employee/tab-bar";
import { BlockRenderer } from "@/components/doc/block-renderer";
import { QuizReader } from "@/components/doc/quiz-reader";
import { Icon } from "@/components/ui/icon";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export const dynamic = "force-dynamic";

function daysFromNow(iso: string, now: number): number {
  return Math.ceil((new Date(iso).getTime() - now) / (24 * 60 * 60 * 1000));
}

function pillTone(
  s: "due" | "in_progress" | "complete" | "overdue",
): "warn" | "ok" | "bad" | "progress" {
  if (s === "overdue") return "bad";
  if (s === "complete") return "ok";
  if (s === "in_progress") return "progress";
  return "warn";
}

function statusLabel(
  s: "due" | "in_progress" | "complete" | "overdue",
  due: string,
  now: number,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  if (s === "complete") return t("statusComplete");
  if (s === "overdue") return t("statusOverdue");
  if (s === "in_progress") return t("statusInProgress");
  const days = daysFromNow(due, now);
  if (days <= 0) return t("statusDueToday");
  if (days === 1) return t("statusDueTomorrow");
  return t("statusDueInDays", { days });
}

export default async function EmployeeTrainingCoursePage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("employee.training");

  const course = getCourseById(id);
  if (!course) notFound();

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  let employee;
  try {
    const me = await fetchMe(cookieHeader);
    employee = me.employee;
  } catch (err) {
    if (err instanceof ApiException) redirect(`/${locale}/login`);
    throw err;
  }

  const matched =
    mockTrainingEmployees.find((e) => e.id === employee.id) ??
    mockTrainingEmployees.find(
      (e) => e.name.toLowerCase() === employee.name.toLowerCase(),
    );
  const mockEmployeeId = matched?.id ?? employee.id;

  const now = Date.now();
  const assignment = listTrainingAssignmentsForEmployee(mockEmployeeId).find(
    (a) => a.courseId === id,
  );

  const isEs = locale === "es";
  const localeForBlocks: "en" | "es" = isEs ? "es" : "en";
  const title =
    (isEs
      ? course.titleEs || course.titleEn
      : course.titleEn || course.titleEs) || course.slug;
  const purpose =
    (isEs
      ? course.purposeEs || course.purposeEn
      : course.purposeEn || course.purposeEs) || "";
  // The body usually opens with the course's own name as a heading, straight
  // under the page title that already says it: said once.
  const allBlocks = isEs ? course.bodyEs.blocks : course.bodyEn.blocks;
  const first = allBlocks[0];
  const blocks =
    first &&
    first.kind === "heading" &&
    (first.text.en === course.titleEn || first.text.es === course.titleEs)
      ? allBlocks.slice(1)
      : allBlocks;
  // Linked procedures come from the library, as this person may read them.
  const readable = await listProcedures({}, cookieHeader)
    .then((r) => r.procedures)
    .catch(() => []);
  const linkedSops = (course.linkedSops ?? [])
    .map((id) => readable.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const steps = courseStepCount(course);
  const stepsDone = Math.min(assignment?.completedStepIds.length ?? 0, steps);

  const status = assignment ? effectiveStatus(assignment) : "due";
  const tone = pillTone(status);

  const dueLabel = assignment
    ? statusLabel(status, assignment.dueAt, now, t)
    : "";

  return (
    <>
      <main className="mx-auto w-full max-w-doc space-y-8 px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
        <Link
          href={`/${locale}/employee/training`}
          className="inline-flex min-h-tap items-center gap-2 text-base font-semibold text-[var(--color-ink-2)]"
        >
          <LuArrowLeft aria-hidden="true" />
          {t("backToList")}
        </Link>

        <header className="space-y-3">
          <h1 className="font-[family-name:var(--font-display)] text-xl font-bold leading-display tracking-tight text-[var(--color-ink)] sm:text-2xl">
            {title}
          </h1>
          {purpose ? (
            <p className="text-base text-[var(--color-ink-2)]">{purpose}</p>
          ) : null}
          {assignment ? (
            <div className="space-y-3 pt-1">
              <StatusPill tone={tone} withDot>
                {dueLabel}
              </StatusPill>
              {/* Where you are in it: the progress a course never showed. */}
              {steps && status !== "complete" ? (
                <div>
                  <p className="text-base font-semibold text-[var(--color-ink)]">
                    {t("stepsDone", { done: stepsDone, total: steps })}
                  </p>
                  <div
                    role="progressbar"
                    aria-label={t("stepsDone", {
                      done: stepsDone,
                      total: steps,
                    })}
                    aria-valuemin={0}
                    aria-valuemax={steps}
                    aria-valuenow={stepsDone}
                    className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-panel)]"
                  >
                    <div
                      className="h-full rounded-full bg-[var(--color-ok-fill)]"
                      style={{
                        width: `${Math.round((stepsDone / steps) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </header>

        {/* Body — same block vocabulary as the procedure reader (DESIGN.md §4
            says training chapters share the same block vocabulary as SOPs). */}
        <div className="space-y-8">
          {/* The reader for everything but the steps; the steps as a list the
              cook ticks off. Runs of other blocks stay together so headings
              and their text still read as one section. */}
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
                    title={t("stepsHeading")}
                    steps={b.steps.map((s, i) => ({
                      id: s.id ?? `${b.id}-${i}`,
                      text: s.body[localeForBlocks] || s.body.en,
                      critical: Boolean(s.critical || s.criticalLimit),
                    }))}
                    criticalLabel={t("criticalStep")}
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

          {(() => {
            const quiz = course.quizId ? getQuizById(course.quizId) : null;
            return quiz && quiz.attached && quiz.questions.length > 0 ? (
              <section className="space-y-4">
                <header className="flex items-center gap-2">
                  <Icon
                    icon={LuGraduationCap}
                    className="text-xl text-[var(--color-ink-2)]"
                    aria-hidden="true"
                  />
                  <h2 className="font-[family-name:var(--font-ui)] text-lg font-semibold text-[var(--color-ink)]">
                    {t("quizHeading")}
                  </h2>
                </header>
                <QuizReader quiz={quiz} locale={localeForBlocks} />
              </section>
            ) : null;
          })()}

          {linkedSops.length > 0 ? (
            <section className="space-y-3">
              <header className="flex items-center gap-2">
                <Icon
                  icon={LuBookOpen}
                  className="text-xl text-[var(--color-ink-2)]"
                  aria-hidden="true"
                />
                <h2 className="font-[family-name:var(--font-ui)] text-lg font-semibold text-[var(--color-ink)]">
                  {t("linkedSopsHeading")}
                </h2>
              </header>
              <p className="text-base text-[var(--color-ink-2)]">
                {t("linkedSopsHint")}
              </p>
              <ul className="space-y-3">
                {linkedSops.map((s) => (
                  <li key={s.id}>
                    <ProcedureRow
                      href={`/${locale}/procedures/${s.slug}`}
                      category={s.category}
                      title={
                        (isEs
                          ? s.titleEs || s.titleEn
                          : s.titleEn || s.titleEs) || s.slug
                      }
                      meta={
                        s.category
                          ? isEs
                            ? s.category.nameEs || s.category.nameEn
                            : s.category.nameEn
                          : ""
                      }
                    />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {assignment && status !== "complete" ? (
            <section className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
              {course.acknowledgement ? (
                <>
                  <header className="flex items-center gap-2">
                    <Icon
                      icon={LuSignature}
                      className="text-xl text-[var(--color-ink-2)]"
                      aria-hidden="true"
                    />
                    {/* No version number: "v2026.09" means nothing to the
                        reader. It is still recorded with the sign-off. */}
                    <h2 className="font-[family-name:var(--font-ui)] text-lg font-semibold text-[var(--color-ink)]">
                      {t("ackHeading")}
                    </h2>
                  </header>
                  <p className="text-base text-[var(--color-ink)]">
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
                ackLabel={t("ackCheckboxText")}
                labels={{
                  finish: t("finish"),
                  hint: t("finishHintAck"),
                  finished: t("finished"),
                  back: t("backToTraining"),
                }}
              />
            </section>
          ) : assignment && status === "complete" ? (
            // Finished: said plainly, with when, and the way back to the list.
            // The page refreshes on Finish, so this is also what the reader
            // sees the moment they finish.
            <section
              role="status"
              className="space-y-4 rounded-[var(--radius-lg)] bg-[var(--color-ok-tint)] p-5"
            >
              <p className="flex items-center gap-2 text-md font-semibold text-[var(--color-ok)]">
                <Icon icon={LuSignature} aria-hidden="true" />
                {t("finished")}
              </p>
              {assignment.acknowledgedAt ? (
                <p className="text-base text-[var(--color-ink)]">
                  {t("finishedOn", {
                    date: new Date(
                      assignment.acknowledgedAt,
                    ).toLocaleDateString(isEs ? "es" : "en", {
                      day: "numeric",
                      month: "long",
                    }),
                  })}
                </p>
              ) : null}
              <Link
                href={`/${locale}/employee/training`}
                className={buttonClassName({
                  variant: "neutral",
                  className: "min-h-tap",
                })}
              >
                {t("backToTraining")}
              </Link>
            </section>
          ) : null}
        </div>
      </main>

      <TabBar
        locale={locale}
        active="training"
        labels={{
          home: t("tabHome"),
          procedures: t("tabProcedures"),
          training: t("tabTraining"),
          soon: t("tabSoon"),
          nav: t("tabsNav"),
        }}
      />
    </>
  );
}
