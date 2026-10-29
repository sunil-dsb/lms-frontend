"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { LuArrowLeft, LuGraduationCap, LuCircleCheck } from "react-icons/lu";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import type { EmployeeProgressRow } from "@/lib/types";
import type { EmployeeTrainingRow } from "@/services/employees/types";
import {
  PROGRESS_STATUS_LABEL_KEY,
  ProgressStatusPill,
  courseTitle,
} from "../components/progress-row";
import { ProgressTableShell } from "../components/progress-table-shell";
import { ProgressStatStrip } from "../components/progress-stat-strip";
import type { TrainingProgressSummary } from "@/lib/types";

interface EmployeeProgressDetailProps {
  locale: string;
  /** The row this person shows as on the "By employee" table — the meta
   *  card up top is built from it so both surfaces stay consistent. */
  meta: EmployeeProgressRow | null;
  /** One row per assigned course, from GET /api/v1/employees/:id/training. */
  assignments: EmployeeTrainingRow[];
}

/** The "By employee" Progress rows drill-down: the person's meta up top,
 *  then every course they are on with its current state — how many chapters
 *  are done, which chapter they sit on, when it is due. */
export function EmployeeProgressDetail({
  locale,
  meta,
  assignments,
}: EmployeeProgressDetailProps): React.ReactElement {
  const t = useTranslations("admin.training.progress");
  const tAdmin = useTranslations("admin");

  // The three buckets the Progress tab speaks — `due` and `in_progress`
  // collapse into `in_progress`, exactly as the "By employee" row reads it.
  const summary: TrainingProgressSummary = {
    completed: assignments.filter((row) => row.status === "complete").length,
    inProgress: assignments.filter(
      (row) => row.status === "in_progress" || row.status === "due",
    ).length,
    overdue: assignments.filter((row) => row.status === "overdue").length,
  };

  const statusOf = (
    row: EmployeeTrainingRow,
  ): "complete" | "in_progress" | "overdue" =>
    row.status === "overdue"
      ? "overdue"
      : row.status === "complete"
        ? "complete"
        : "in_progress";

  return (
    <div className="space-y-6">
      <Link
        href={`/${locale}/admin/training/progress`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)]"
      >
        <LuArrowLeft className="size-4" aria-hidden="true" />
        <span>{t("backToProgress")}</span>
      </Link>

      {/* Person meta — the same facts the list row showed, minus the filter. */}
      <Card>
        <CardContent className="flex flex-wrap items-start gap-4 p-6 sm:flex-nowrap">
          <Avatar initials={initials(meta?.name)} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold leading-display tracking-tight text-[var(--color-ink)]">
                {meta?.name ?? "—"}
              </h1>
            </div>
            <p className="mt-2 text-sm text-[var(--color-ink-2)]">
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
            <p className="mt-1 text-sm text-[var(--color-ink-3)]">
              {meta?.currentCourse && meta.currentChapter !== null
                ? t("whereAt", {
                    course: courseTitle(meta.currentCourse, locale),
                    chapter: meta.currentChapter,
                  })
                : meta
                  ? t("allFinished")
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
          title={t("emptyDetailHeading")}
          body={t("emptyDetailBody")}
          action={
            <Button
              type="button"
              variant="secondary"
              // The rest of the Progress tab still applies.
              onClick={() => window.history.back()}
            >
              {t("backToProgress")}
            </Button>
          }
        />
      ) : (
        <>
          <ProgressStatStrip summary={summary} />

          {/* Course-by-course detail — every course this person is on,
              with its chapter counts, current chapter and due date. */}
          <ProgressTableShell
            label={t("detailTableLabel")}
            columns={[
              t("thCourse"),
              t("thChapters"),
              t("thCurrentChapter"),
              t("thDue"),
              t("thStatus"),
            ]}
          >
            {assignments.map((row) => {
              const status = statusOf(row);
              const done =
                row.status === "complete"
                  ? row.chapterCount
                  : row.completedChapterCount;
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
                </tr>
              );
            })}
          </ProgressTableShell>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small helpers local to the detail page.
// ---------------------------------------------------------------------------

/** A course's title in the reader's language, other language as fallback —
 *  the same picking the training lists are built on. */
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
