"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  LuArrowLeft,
  LuGraduationCap,
  LuCircleCheck,
  LuCalendarDays,
  LuPencil,
  LuUserMinus,
  LuUserPlus,
  LuLoader,
} from "react-icons/lu";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import type { CourseProgressRow, Procedure } from "@/lib/types";
import type { CourseAssignmentRow } from "@/services/courses/types";
import {
  unassignCourseApi,
  fetchCourseAssignmentsApi,
  updateAssignmentDueDatesApi,
} from "@/services/courses/api";
import { CourseAssignmentModal } from "../../../components/course-assignment-modal";
import { ChangeDueDateModal } from "@/components/admin/change-due-date-modal";
import { RowActions, type RowActionItem } from "@/components/ui/row-actions";
import {
  PROGRESS_STATUS_LABEL_KEY,
  ProgressStatusPill,
  courseTitle,
} from "../../components/progress-row";
import { ProgressTableShell } from "../../components/progress-table-shell";
import { useMe } from "@/services/auth/hooks";
import { cn } from "@/lib/utils";

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
  const isEs = locale === "es";
  const { employee: me } = useMe();
  // Due-date editing is super_admin-only on the API — hide it otherwise.
  const canEditDueDate = me?.role === "super_admin";

  const [assignmentList, setAssignmentList] =
    React.useState<CourseAssignmentRow[]>(assignments);
  const [unassigningId, setUnassigningId] = React.useState<string | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<ReadonlySet<string>>(
    new Set(),
  );
  const [dueDateTarget, setDueDateTarget] = React.useState<{
    employeeIds: string[];
    name?: string;
    currentDueDate?: string;
  } | null>(null);

  React.useEffect(() => {
    setAssignmentList(assignments);
  }, [assignments]);

  const courseId = meta?.course.id;

  async function handleUnassign(employeeId: string): Promise<void> {
    if (!courseId || unassigningId) return;

    setUnassigningId(employeeId);
    try {
      await unassignCourseApi(courseId, [employeeId]);
      setAssignmentList((prev) =>
        prev.filter((row) => row.employeeId !== employeeId),
      );
    } catch (err) {
      console.error("Failed to unassign employee from course:", err);
    } finally {
      setUnassigningId(null);
    }
  }

  async function handleRefreshAssignments(): Promise<void> {
    if (!courseId) return;
    try {
      const refreshed = await fetchCourseAssignmentsApi(courseId);
      setAssignmentList(refreshed);
    } catch (err) {
      console.error("Failed to refresh course assignments:", err);
    }
  }

  const allSelected =
    assignmentList.length > 0 && selectedIds.size === assignmentList.length;

  function toggleSelected(employeeId: string): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  }

  function toggleSelectAll(): void {
    setSelectedIds(
      allSelected
        ? new Set()
        : new Set(assignmentList.map((row) => row.employeeId)),
    );
  }

  function openSingleDueDate(row: CourseAssignmentRow): void {
    setDueDateTarget({
      employeeIds: [row.employeeId],
      name: row.employee.name,
      currentDueDate: row.dueDate,
    });
  }

  function openBulkDueDate(): void {
    const rows = assignmentList.filter((row) =>
      selectedIds.has(row.employeeId),
    );
    if (rows.length === 0) return;
    const dates = new Set(rows.map((row) => row.dueDate));
    setDueDateTarget({
      employeeIds: rows.map((row) => row.employeeId),
      // Prefill only when every selected row already shares one date.
      currentDueDate: dates.size === 1 ? [...dates][0] : "",
    });
  }

  const title = meta ? courseTitle(meta.course, locale) : "—";
  const peopleTotal = assignmentList.length;
  const peopleDone = assignmentList.filter(
    (row) => row.status === "complete",
  ).length;

  const pseudoCourse: Procedure | null = meta
    ? ({
        id: meta.course.id,
        slug: meta.course.id,
        titleEn: meta.course.titleEn,
        titleEs: meta.course.titleEs,
        purposeEn: "",
        purposeEs: "",
        status: "published",
        blocksEn: [],
        blocksEs: [],
      } as unknown as Procedure)
    : null;

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
                tTraining("totalAssigned", { count: peopleTotal }),
                t("doneOfTotal", {
                  done: peopleDone,
                  total: peopleTotal,
                }),
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

          <div className="flex items-center gap-3 shrink-0">
            {pseudoCourse ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsAssignModalOpen(true)}
                className="cursor-pointer"
              >
                <LuUserPlus className="size-4 mr-2" />
                <span>{t("manageAssignments")}</span>
              </Button>
            ) : null}

            {meta && (
              <ProgressStatusPill
                status={meta.status}
                label={t(PROGRESS_STATUS_LABEL_KEY[meta.status])}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {assignmentList.length === 0 ? (
        <EmptyState
          icon={LuGraduationCap}
          title={t("emptyCourseHeading")}
          body={t("emptyCourseBody")}
          action={
            pseudoCourse ? (
              <Button
                type="button"
                variant="primary"
                onClick={() => setIsAssignModalOpen(true)}
                className="cursor-pointer"
              >
                <LuUserPlus className="size-4 mr-2" />
                <span>{t("manageAssignments")}</span>
              </Button>
            ) : (
              <Button type="button" variant="secondary">
                <Link href={`/${locale}/admin/training/progress`}>
                  {t("backToProgress")}
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          {/* Mobile Card List (< md) */}
          <Card className="block md:hidden">
            <CardContent className="p-0 divide-y divide-[var(--color-line-2)]">
              {assignmentList.map((row) => {
                const isInProgress =
                  row.status === "in_progress" || row.status === "overdue";
                const done = isInProgress
                  ? row.completedChapterCount
                  : row.status === "complete"
                    ? row.chapterCount
                    : 0;

                const mobileActionItems: RowActionItem[] = [
                  ...(canEditDueDate
                    ? [
                        {
                          label: t("changeDueDate"),
                          icon: LuCalendarDays,
                          onSelect: () => openSingleDueDate(row),
                        },
                      ]
                    : []),
                  {
                    label: t("unassign"),
                    icon: LuUserMinus,
                    destructive: true,
                    confirmTitle: t("unassignConfirmTitle"),
                    confirmDescription: t("unassignConfirmEmployeeBody", {
                      name: row.employee.name,
                      course: title,
                    }),
                    confirmLabel: t("unassign"),
                    onSelect: () => void handleUnassign(row.employeeId),
                  },
                ];

                return (
                  <div key={row.id} className="p-4 space-y-3">
                    {/* Top: Employee name + Status + RowActions */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/${locale}/admin/training/progress/${row.employeeId}`}
                          className="font-semibold text-base text-[var(--color-ink)] hover:text-[var(--color-brand-700)] leading-snug truncate block"
                        >
                          {row.employee.name}
                        </Link>
                        <div className="text-xs text-[var(--color-ink-3)] mt-1 truncate">
                          {row.employee.email}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <ProgressStatusPill
                          status={row.status}
                          label={t(PROGRESS_STATUS_LABEL_KEY[row.status])}
                        />
                        <RowActions
                          items={mobileActionItems}
                          triggerLabel={row.employee.name}
                        />
                      </div>
                    </div>

                    {/* Details row: Chapters done & Current position */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-ink-2)] border-t border-[var(--color-line-2)]/80 pt-3">
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

          {/* Bulk retiming bar — the multi-select lives only in the desktop
              table, so this stays hidden below md. */}
          {canEditDueDate && selectedIds.size > 0 ? (
            <div className="hidden md:flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-brand-600)]/30 bg-[var(--color-brand-50)] px-4 py-3 dark:bg-[var(--color-brand-950)]/40">
              <span className="text-sm font-semibold text-[var(--color-brand-700)] dark:text-[var(--color-brand-300)]">
                {t("dueDateSelected", { count: selectedIds.size })}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="neutral"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  {t("dueDateClear")}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="cursor-pointer"
                  onClick={openBulkDueDate}
                >
                  <LuCalendarDays className="size-4" />
                  <span>{t("changeDueDate")}</span>
                </Button>
              </div>
            </div>
          ) : null}

          {/* Desktop Table (>= md) */}
          <div className="hidden md:block">
            <ProgressTableShell
              label={t("detailCourseTableLabel")}
              columns={[
                ...(canEditDueDate
                  ? [
                      <label
                        key="select"
                        className="flex shrink-0 cursor-pointer items-center justify-center"
                      >
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          aria-label={t("dueDateSelectAll")}
                          className="size-4 cursor-pointer accent-[var(--color-brand-600)]"
                        />
                      </label>,
                    ]
                  : []),
                t("thEmployee"),
                t("thChapters"),
                t("thCurrentChapter"),
                t("thDue"),
                t("thStatus"),
                <span key="actions" className="sr-only">
                  {t("thActions")}
                </span>,
              ]}
            >
              {assignmentList.map((row) => {
                const isInProgress =
                  row.status === "in_progress" || row.status === "overdue";
                const done = isInProgress
                  ? row.completedChapterCount
                  : row.status === "complete"
                    ? row.chapterCount
                    : 0;

                const tableActionItems: RowActionItem[] = [
                  ...(canEditDueDate
                    ? [
                        {
                          label: t("changeDueDate"),
                          icon: LuCalendarDays,
                          onSelect: () => openSingleDueDate(row),
                        },
                      ]
                    : []),
                  {
                    label: t("unassign"),
                    icon: LuUserMinus,
                    destructive: true,
                    confirmTitle: t("unassignConfirmTitle"),
                    confirmDescription: t("unassignConfirmEmployeeBody", {
                      name: row.employee.name,
                      course: title,
                    }),
                    confirmLabel: t("unassign"),
                    onSelect: () => void handleUnassign(row.employeeId),
                  },
                ];

                return (
                  <tr key={row.id}>
                    {canEditDueDate ? (
                      <td>
                        <label className="flex shrink-0 cursor-pointer items-center justify-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(row.employeeId)}
                            onChange={() => toggleSelected(row.employeeId)}
                            aria-label={row.employee.name}
                            className="size-4 cursor-pointer accent-[var(--color-brand-600)]"
                          />
                        </label>
                      </td>
                    ) : null}
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
                          ? "tabular-nums font-semibold text-[var(--color-bad)]"
                          : "tabular-nums text-[var(--color-ink-2)]"
                      }
                    >
                      {canEditDueDate && row.status !== "complete" ? (
                        <button
                          type="button"
                          onClick={() => openSingleDueDate(row)}
                          className="group inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-sm)] py-0.5 px-1.5 -mx-1.5 text-left transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-600)]"
                          title={t("changeDueDate")}
                        >
                          <span>{formatDate(row.dueDate, locale)}</span>
                          <LuPencil
                            className="size-3 text-[var(--color-ink-3)] opacity-0 transition-opacity group-hover:opacity-100"
                            aria-hidden="true"
                          />
                        </button>
                      ) : (
                        formatDate(row.dueDate, locale)
                      )}
                    </td>
                    <td>
                      <ProgressStatusPill
                        status={row.status}
                        label={t(PROGRESS_STATUS_LABEL_KEY[row.status])}
                      />
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end">
                        <RowActions
                          items={tableActionItems}
                          triggerLabel={row.employee.name}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </ProgressTableShell>
          </div>
        </>
      )}

      {pseudoCourse ? (
        <CourseAssignmentModal
          open={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          locale={locale}
          course={pseudoCourse}
          onAssigned={() => {
            handleRefreshAssignments();
          }}
        />
      ) : null}

      {courseId && dueDateTarget ? (
        <ChangeDueDateModal
          open
          onClose={() => setDueDateTarget(null)}
          courseId={courseId}
          courseTitle={title}
          employeeIds={dueDateTarget.employeeIds}
          employeeName={dueDateTarget.name}
          currentDueDate={dueDateTarget.currentDueDate}
          onSuccess={() => window.location.reload()}
        />
      ) : null}
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
