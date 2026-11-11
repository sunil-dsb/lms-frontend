"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  LuArrowLeft,
  LuGraduationCap,
  LuCircleCheck,
  LuUserMinus,
  LuLoader,
} from "react-icons/lu";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import type {
  EmployeeProgressRow,
  ProgressStatus,
  TrainingProgressSummary,
} from "@/lib/types";
import type { EmployeeTrainingRow } from "@/services/employees/types";
import { unassignCourseApi } from "@/services/courses/api";
import {
  PROGRESS_STATUS_LABEL_KEY,
  ProgressStatusPill,
  courseTitle,
} from "../components/progress-row";
import { ProgressTableShell } from "../components/progress-table-shell";
import { ProgressStatStrip } from "../components/progress-stat-strip";
import { cn } from "@/lib/utils";
import { ConfirmModal } from "@/components/ui/confirm-modal";

interface EmployeeProgressDetailProps {
  locale: string;
  /** The row this person shows as on the "By employee" table — the meta
   *  card up top is built from it so both surfaces stay consistent. */
  meta: EmployeeProgressRow | null;
  /** One row per assigned course, from GET /api/v1/employees/:id/training. */
  assignments: EmployeeTrainingRow[];
  employeeId?: string;
}

/** The "By employee" Progress rows drill-down: the person's meta up top,
 *  then every course they are on with its current state — how many chapters
 *  are done, which chapter they sit on, when it is due.
 *
 *  Responsive: on mobile screens (< md), renders as a clean card list with
 *  comfortable touch targets and readable badges. On desktop (>= md),
 *  renders the standard table. */
export function EmployeeProgressDetail({
  locale,
  meta,
  assignments,
  employeeId,
}: EmployeeProgressDetailProps): React.ReactElement {
  const t = useTranslations("admin.training.progress");
  const isEs = locale === "es";

  const [assignmentList, setAssignmentList] =
    React.useState<EmployeeTrainingRow[]>(assignments);
  const [unassigningCourseId, setUnassigningCourseId] = React.useState<
    string | null
  >(null);
  const [confirmUnassignCourse, setConfirmUnassignCourse] = React.useState<{
    courseId: string;
    title: string;
  } | null>(null);

  React.useEffect(() => {
    setAssignmentList(assignments);
  }, [assignments]);

  const effectiveEmployeeId = meta?.employeeId || employeeId;

  async function handleUnassign(courseId: string): Promise<void> {
    if (!effectiveEmployeeId || unassigningCourseId) return;

    setUnassigningCourseId(courseId);
    try {
      await unassignCourseApi(courseId, [effectiveEmployeeId]);
      setAssignmentList((prev) =>
        prev.filter((row) => row.courseId !== courseId),
      );
    } catch (err) {
      console.error("Failed to unassign employee from course:", err);
    } finally {
      setUnassigningCourseId(null);
    }
  }

  // The three buckets the Progress tab speaks — `due` and `in_progress`
  // collapse into `in_progress`, exactly as the "By employee" row reads it.
  const summary: TrainingProgressSummary = {
    completed: assignmentList.filter((row) => row.status === "complete").length,
    inProgress: assignmentList.filter(
      (row) => row.status === "in_progress" || row.status === "due",
    ).length,
    overdue: assignmentList.filter((row) => row.status === "overdue").length,
  };

  const statusOf = (row: EmployeeTrainingRow): ProgressStatus => {
    if (row.status === "complete") return "complete";
    if (row.status === "overdue") return "overdue";
    if (row.status === "due_soon") return "due_soon";
    if (row.status === "not_started" || row.status === "due")
      return "not_started";
    return "in_progress";
  };

  return (
    <div className="space-y-6">
      <Link
        href={`/${locale}/admin/training/progress`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)]"
      >
        <LuArrowLeft className="size-4" aria-hidden="true" />
        <span>{t("backToProgress")}</span>
      </Link>

      {/* Person meta — responsive padding and typography */}
      <Card>
        <CardContent className="flex flex-wrap items-start gap-4 p-4 sm:p-6 sm:flex-nowrap">
          <Avatar
            initials={initials(meta?.name)}
            size="md"
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold leading-tight sm:leading-display tracking-tight text-[var(--color-ink)]">
                {meta?.name ?? "—"}
              </h1>
            </div>
            <p className="mt-2 text-xs sm:text-sm text-[var(--color-ink-2)]">
              {[
                meta?.station,
                meta
                  ? t("doneOfTotal", {
                      done: meta.coursesDone,
                      total: meta.coursesTotal,
                    })
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="mt-1 text-xs sm:text-sm text-[var(--color-ink-3)]">
              {meta?.currentCourse && meta.currentChapter !== null
                ? t("whereAt", {
                    course: courseTitle(meta.currentCourse, locale),
                    chapter: meta.currentChapter,
                  })
                : meta
                  ? t("allFinished")
                  : null}
            </p>
          </div>
        </CardContent>
      </Card>

      {assignmentList.length === 0 ? (
        <EmptyState
          icon={LuGraduationCap}
          title={t("emptyDetailHeading")}
          body={t("emptyDetailBody")}
          action={
            <Button
              type="button"
              variant="secondary"
              onClick={() => window.history.back()}
            >
              {t("backToProgress")}
            </Button>
          }
        />
      ) : (
        <>
          <ProgressStatStrip summary={summary} />

          {/* Mobile Card List (< md) */}
          <Card className="block md:hidden">
            <CardContent className="p-0 divide-y divide-[var(--color-line-2)]">
              {assignmentList.map((row) => {
                const status = statusOf(row);
                const done =
                  row.status === "complete"
                    ? row.chapterCount
                    : row.completedChapterCount;
                const title =
                  locale === "es"
                    ? row.titleEs || row.titleEn
                    : row.titleEn || row.titleEs;

                const isUnassigning = unassigningCourseId === row.courseId;

                return (
                  <div key={row.assignmentId} className="p-4">
                    {/* Top: Course title + Status */}
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/${locale}/admin/training/${row.courseId}`}
                        className="font-semibold text-base text-[var(--color-ink)] hover:text-[var(--color-brand-700)] leading-snug flex-1 truncate"
                      >
                        {title}
                      </Link>
                      <div className="shrink-0">
                        <ProgressStatusPill
                          status={status}
                          label={t(PROGRESS_STATUS_LABEL_KEY[status])}
                        />
                      </div>
                    </div>

                    {/* Details row: Chapters done & Current position */}
                    <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-ink-2)] border-t border-[var(--color-line-2)]/80 pt-4">
                      <span className="font-semibold text-[var(--color-ink)] tabular-nums">
                        {row.chapterCount > 0
                          ? t("doneOfTotal", { done, total: row.chapterCount })
                          : "—"}
                      </span>
                      <span
                        aria-hidden="true"
                        className="text-[var(--color-line-2)]"
                      >
                        ·
                      </span>
                      {row.status === "complete" ? (
                        <span className="inline-flex items-center gap-1 text-[var(--color-ok)]">
                          <LuCircleCheck
                            className="size-4 shrink-0"
                            aria-hidden="true"
                          />
                          {row.courseCompletedAt
                            ? t("completedOn", {
                                when: formatDate(row.courseCompletedAt, locale),
                              })
                            : "—"}
                        </span>
                      ) : row.currentChapterNumber && row.chapterCount > 0 ? (
                        <span>
                          {t("chapterAt", {
                            chapter: row.currentChapterNumber,
                            total: row.chapterCount,
                          })}
                        </span>
                      ) : (
                        <span>{t("chapterNone")}</span>
                      )}
                      {row.dueDate && row.status !== "complete" ? (
                        <>
                          <span
                            aria-hidden="true"
                            className="text-[var(--color-line-2)]"
                          >
                            ·
                          </span>
                          <span
                            className={
                              status === "overdue"
                                ? "font-semibold text-[var(--color-bad)]"
                                : "text-[var(--color-ink-3)]"
                            }
                          >
                            {formatDate(row.dueDate, locale)}
                          </span>
                        </>
                      ) : null}
                    </div>

                    {effectiveEmployeeId ? (
                      <div className="mt-3 flex justify-end border-t border-[var(--color-line-2)]/80 pt-3">
                        <button
                          type="button"
                          disabled={isUnassigning}
                          onClick={() =>
                            setConfirmUnassignCourse({
                              courseId: row.courseId,
                              title,
                            })
                          }
                          className={cn(
                            "inline-flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded-[var(--radius-sm)] transition-colors cursor-pointer",
                            "text-[var(--color-bad-700)] hover:text-[var(--color-bad-800)] hover:bg-[var(--color-bad-tint)] border border-[var(--color-bad)]/20",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
                            isUnassigning && "opacity-60 cursor-not-allowed",
                          )}
                          title={isEs ? "Desasignar curso" : "Unassign course"}
                        >
                          {isUnassigning ? (
                            <LuLoader className="size-3.5 animate-spin" />
                          ) : (
                            <LuUserMinus className="size-3.5" />
                          )}
                          <span>{t("unassign")}</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block">
            <ProgressTableShell
              label={t("detailTableLabel")}
              columns={[
                t("thCourse"),
                t("thChapters"),
                t("thCurrentChapter"),
                t("thDue"),
                t("thStatus"),
                t("thActions"),
              ]}
            >
              {assignmentList.map((row) => {
                const status = statusOf(row);
                const done =
                  row.status === "complete"
                    ? row.chapterCount
                    : row.completedChapterCount;
                const isUnassigning = unassigningCourseId === row.courseId;
                const courseName =
                  locale === "es"
                    ? row.titleEs || row.titleEn
                    : row.titleEn || row.titleEs;
                return (
                  <tr key={row.assignmentId}>
                    <td>
                      <Link
                        href={`/${locale}/admin/training/${row.courseId}`}
                        className="font-medium text-[var(--color-ink)] underline-offset-2 hover:text-[var(--color-brand-700)] hover:underline"
                      >
                        {locale === "es"
                          ? row.titleEs || row.titleEn
                          : row.titleEn || row.titleEs}
                      </Link>
                    </td>
                    <td className="tabular-nums text-[var(--color-ink-2)]">
                      {row.chapterCount > 0
                        ? t("doneOfTotal", {
                            done,
                            total: row.chapterCount,
                          })
                        : "—"}
                    </td>
                    <td className="text-[var(--color-ink-2)]">
                      {row.status === "complete" ? (
                        <span className="inline-flex items-center gap-2 text-[var(--color-ok)]">
                          <LuCircleCheck
                            className="size-4 shrink-0"
                            aria-hidden="true"
                          />
                          {row.courseCompletedAt
                            ? t("completedOn", {
                                when: formatDate(row.courseCompletedAt, locale),
                              })
                            : "—"}
                        </span>
                      ) : row.currentChapterNumber && row.chapterCount > 0 ? (
                        <span>
                          {t("chapterAt", {
                            chapter: row.currentChapterNumber,
                            total: row.chapterCount,
                          })}
                          {currentChapterTitle(row, locale) ? (
                            <span className="ml-1 text-[var(--color-ink-3)]">
                              ({currentChapterTitle(row, locale)})
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-[var(--color-ink-3)]">
                          {t("chapterNone")}
                        </span>
                      )}
                    </td>
                    <td
                      className={
                        status === "overdue"
                          ? "tabular-nums text-[var(--color-bad)]"
                          : "tabular-nums text-[var(--color-ink-2)]"
                      }
                    >
                      {formatDate(row.dueDate, locale)}
                    </td>
                    <td>
                      <ProgressStatusPill
                        status={status}
                        label={t(PROGRESS_STATUS_LABEL_KEY[status])}
                      />
                    </td>
                    <td>
                      {effectiveEmployeeId ? (
                        <button
                          type="button"
                          disabled={isUnassigning}
                          onClick={() =>
                            setConfirmUnassignCourse({
                              courseId: row.courseId,
                              title: courseName,
                            })
                          }
                          className={cn(
                            "inline-flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded-[var(--radius-sm)] transition-colors cursor-pointer",
                            "text-[var(--color-bad-700)] hover:text-[var(--color-bad-800)] hover:bg-[var(--color-bad-tint)] border border-[var(--color-bad)]/20",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
                            isUnassigning && "opacity-60 cursor-not-allowed",
                          )}
                          title={isEs ? "Desasignar curso" : "Unassign course"}
                        >
                          {isUnassigning ? (
                            <LuLoader className="size-3.5 animate-spin" />
                          ) : (
                            <LuUserMinus className="size-3.5" />
                          )}
                          <span>{t("unassign")}</span>
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </ProgressTableShell>
          </div>
        </>
      )}

      <ConfirmModal
        open={confirmUnassignCourse !== null}
        title={t("unassignConfirmTitle")}
        description={
          confirmUnassignCourse
            ? t("unassignConfirmCourseBody", {
                course: confirmUnassignCourse.title,
              })
            : ""
        }
        confirmLabel={t("unassign")}
        cancelLabel={t("cancel")}
        isLoading={unassigningCourseId !== null}
        onConfirm={async () => {
          if (!confirmUnassignCourse) return;
          await handleUnassign(confirmUnassignCourse.courseId);
          setConfirmUnassignCourse(null);
        }}
        onClose={() => {
          if (!unassigningCourseId) {
            setConfirmUnassignCourse(null);
          }
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small helpers local to the detail page.
// ---------------------------------------------------------------------------

function currentChapterTitle(row: EmployeeTrainingRow, locale: string): string {
  const title =
    locale === "es"
      ? row.currentChapterTitleEs || row.currentChapterTitleEn
      : row.currentChapterTitleEn || row.currentChapterTitleEs;
  return title ?? "";
}

function formatDate(iso: string, locale: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function initials(name?: string | null): string {
  if (!name) return "—";
  const words = name.trim().split(/\s+/).slice(0, 2);
  return words.map((word) => word.charAt(0).toUpperCase()).join("") || "—";
}
