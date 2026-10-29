"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { LuArrowLeft, LuGraduationCap, LuCircleCheck } from "react-icons/lu";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import type { CourseProgressRow } from "@/lib/types";
import type { CourseAssignmentRow } from "@/services/courses/types";
import {
  PROGRESS_STATUS_LABEL_KEY,
  ProgressStatusPill,
  courseTitle,
} from "../../components/progress-row";
import { ProgressTableShell } from "../../components/progress-table-shell";

interface CourseProgressDetailProps {
  locale: string;
  /** The row this course shows as on the "By course" table — the meta card
   *  up top is built from it so both surfaces stay consistent. */
  meta: CourseProgressRow | null;
  /** One row per assigned employee, from GET /api/v1/courses/:id/assignments. */
  assignments: CourseAssignmentRow[];
}

/** The "By course" Progress rows drill-down: the course's meta up top, then
 *  every person it is assigned to with their progress — how many chapters
 *  are done, which chapter they sit on, when it is due.
 *
 *  Responsive: on mobile screens (< md), renders as a clean card list with
 *  comfortable touch targets and readable badges. On desktop (>= md),
 *  renders the standard table. */
export function CourseProgressDetail({
  locale,
  meta,
  assignments,
}: CourseProgressDetailProps): React.ReactElement {
  const t = useTranslations("admin.training.progress");
  const tTraining = useTranslations("admin.training");

  const title = meta ? courseTitle(meta.course, locale) : "—";

  return (
    <div className="space-y-6">
      <Link
        href={`/${locale}/admin/training/progress`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)]"
      >
        <LuArrowLeft className="size-4" aria-hidden="true" />
        <span>{t("backToProgress")}</span>
      </Link>

      {/* Course meta — responsive padding and typography */}
      <Card>
        <CardContent className="flex flex-wrap items-start gap-4 p-4 sm:p-6 sm:flex-nowrap">
          <div className="min-w-0 flex-1">
            <h1 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold leading-tight sm:leading-display tracking-tight text-[var(--color-ink)]">
              {title}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-[var(--color-ink-2)]">
              {[
                meta
                  ? tTraining("totalAssigned", { count: meta.peopleTotal })
                  : null,
                meta
                  ? t("doneOfTotal", {
                      done: meta.peopleDone,
                      total: meta.peopleTotal,
                    })
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="mt-1 text-xs sm:text-sm text-[var(--color-ink-3)]">
              {meta
                ? meta.currentChapter !== null
                  ? t("whereChapter", { chapter: meta.currentChapter })
                  : t("allFinished")
                : "—"}
            </p>
          </div>
          {meta && (
            <div className="shrink-0">
              <ProgressStatusPill
                status={meta.status}
                label={t(PROGRESS_STATUS_LABEL_KEY[meta.status])}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {assignments.length === 0 ? (
        <EmptyState
          icon={LuGraduationCap}
          title={t("emptyCourseHeading")}
          body={t("emptyCourseBody")}
          action={
            <Button type="button" variant="secondary">
              <Link href={`/${locale}/admin/training/progress`}>
                {t("backToProgress")}
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* Mobile Card List (< md) */}
          <Card className="block md:hidden">
            <CardContent className="p-0 divide-y divide-[var(--color-line-2)]">
              {assignments.map((row) => {
                const isInProgress =
                  row.status === "in_progress" || row.status === "overdue";
                const done = isInProgress
                  ? row.completedChapterCount
                  : row.status === "complete"
                    ? row.chapterCount
                    : 0;

                return (
                  <div key={row.id} className="p-4 space-y-2.5">
                    {/* Top: Employee name + Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/${locale}/admin/training/progress/${row.employeeId}`}
                          className="font-semibold text-base text-[var(--color-ink)] hover:text-[var(--color-brand-700)] leading-snug truncate block"
                        >
                          {row.employee.name}
                        </Link>
                        <div className="text-xs text-[var(--color-ink-3)] mt-0.5 truncate">
                          {row.employee.email}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <ProgressStatusPill
                          status={row.status}
                          label={t(PROGRESS_STATUS_LABEL_KEY[row.status])}
                        />
                      </div>
                    </div>

                    {/* Details row: Chapters done & Current position */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-ink-2)] border-t border-[var(--color-line-2)] pt-2.5">
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
                            className="size-3.5 shrink-0"
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
                              row.status === "overdue"
                                ? "font-semibold text-[var(--color-bad)]"
                                : "text-[var(--color-ink-3)]"
                            }
                          >
                            {formatDate(row.dueDate, locale)}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block">
            <ProgressTableShell
              label={t("detailCourseTableLabel")}
              columns={[
                t("thEmployee"),
                t("thChapters"),
                t("thCurrentChapter"),
                t("thDue"),
                t("thStatus"),
              ]}
            >
              {assignments.map((row) => {
                const isInProgress =
                  row.status === "in_progress" || row.status === "overdue";
                const done = isInProgress
                  ? row.completedChapterCount
                  : row.status === "complete"
                    ? row.chapterCount
                    : 0;
                return (
                  <tr key={row.id}>
                    <td>
                      <Link
                        href={`/${locale}/admin/training/progress/${row.employeeId}`}
                        className="font-medium text-[var(--color-ink)] underline-offset-2 hover:text-[var(--color-brand-700)] hover:underline"
                      >
                        {row.employee.name}
                      </Link>
                      <div className="text-sm text-[var(--color-ink-3)]">
                        {row.employee.email}
                      </div>
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
                        <span className="inline-flex items-center gap-1.5 text-[var(--color-ok)]">
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
                            <span className="mt-0.5 block text-sm text-[var(--color-ink-3)]">
                              {currentChapterTitle(row, locale)}
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
                        row.status === "overdue"
                          ? "tabular-nums text-[var(--color-bad)]"
                          : "tabular-nums text-[var(--color-ink-2)]"
                      }
                    >
                      {formatDate(row.dueDate, locale)}
                    </td>
                    <td>
                      <ProgressStatusPill
                        status={row.status}
                        label={t(PROGRESS_STATUS_LABEL_KEY[row.status])}
                      />
                    </td>
                  </tr>
                );
              })}
            </ProgressTableShell>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small helpers local to the detail page.
// ---------------------------------------------------------------------------

function currentChapterTitle(row: CourseAssignmentRow, locale: string): string {
  return (
    (locale === "es"
      ? row.currentChapterTitleEs || row.currentChapterTitleEn
      : row.currentChapterTitleEn || row.currentChapterTitleEs) ?? ""
  );
}

function formatDate(iso: string, locale: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
