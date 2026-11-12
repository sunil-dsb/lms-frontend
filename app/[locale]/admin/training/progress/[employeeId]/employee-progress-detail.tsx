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
  LuLoader,
  LuClock,
  LuShieldOff,
  LuShieldCheck,
} from "react-icons/lu";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { RowActions, type RowActionItem } from "@/components/ui/row-actions";
import type {
  EmployeeProgressRow,
  ProgressStatus,
  TrainingProgressSummary,
} from "@/lib/types";
import type { EmployeeTrainingRow } from "@/services/employees/types";
import {
  unassignCourseApi,
  revokeTrainingOverrideApi,
  updateAssignmentDueDatesApi,
} from "@/services/courses/api";
import { GrantOverrideModal } from "@/components/admin/grant-override-modal";
import { ChangeDueDateModal } from "@/components/admin/change-due-date-modal";
import {
  PROGRESS_STATUS_LABEL_KEY,
  ProgressStatusPill,
  courseTitle,
} from "../components/progress-row";
import { ProgressTableShell } from "../components/progress-table-shell";
import { ProgressStatStrip } from "../components/progress-stat-strip";
import { cn } from "@/lib/utils";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useMe } from "@/services/auth/hooks";

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
  const tOverride = useTranslations("admin.training.override");
  const isEs = locale === "es";
  const { employee: me } = useMe();
  // Due-date editing is super_admin-only on the API — hide it otherwise.
  const canEditDueDate = me?.role === "super_admin";

  const [assignmentList, setAssignmentList] =
    React.useState<EmployeeTrainingRow[]>(assignments);
  const [unassigningCourseId, setUnassigningCourseId] = React.useState<
    string | null
  >(null);

  const [overrideModalOpen, setOverrideModalOpen] = React.useState(false);
  const [selectedCourseForOverride, setSelectedCourseForOverride] =
    React.useState<{
      id: string;
      title: string;
    } | null>(null);
  const [confirmRevokeModalOpen, setConfirmRevokeModalOpen] =
    React.useState(false);
  const [revoking, setRevoking] = React.useState(false);
  const [dueDateTarget, setDueDateTarget] = React.useState<{
    courseId: string;
    courseTitle: string;
    currentDueDate: string;
  } | null>(null);

  React.useEffect(() => {
    setAssignmentList(assignments);
  }, [assignments]);

  const effectiveEmployeeId = meta?.employeeId || employeeId;

  async function handleRevoke(): Promise<void> {
    if (!effectiveEmployeeId) return;
    setRevoking(true);
    try {
      await revokeTrainingOverrideApi(effectiveEmployeeId);
      setAssignmentList((prev) =>
        prev.map((r) => ({
          ...r,
          isOverridden: false,
          overrideUntil: null,
          overrideReason: null,
        })),
      );
      setConfirmRevokeModalOpen(false);
    } catch (err) {
      console.error("Failed to revoke training override:", err);
    } finally {
      setRevoking(false);
    }
  }

  const activeOverride = assignmentList.find((r) => r.isOverridden);

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

          <div className="shrink-0 flex items-center gap-2">
            {!activeOverride && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedCourseForOverride(null);
                  setOverrideModalOpen(true);
                }}
              >
                <LuClock className="size-4" />
                <span>{tOverride("grantButton")}</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {activeOverride && activeOverride.overrideUntil ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--color-warn)]/40 bg-[var(--color-warn-tint)] p-4 text-sm text-[var(--color-warn-ink)] shadow-xs">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-warn)] text-white shadow-xs">
              <LuShieldCheck className="size-5" />
            </div>
            <div className="pt-0.5">
              <p className="font-semibold text-sm text-[var(--color-warn-ink)]">
                {tOverride("activeBadge", {
                  until: formatDate(activeOverride.overrideUntil, locale),
                })}
              </p>
              {activeOverride.overrideReason ? (
                <p className="text-xs text-[var(--color-warn-ink)]/85 mt-0.5">
                  {activeOverride.overrideReason}
                </p>
              ) : null}
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setConfirmRevokeModalOpen(true)}
          >
            <LuShieldOff className="size-4" />
            <span>{tOverride("revokeButton")}</span>
          </Button>
        </div>
      ) : null}

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

                const mobileActionItems: RowActionItem[] = [
                  ...(canEditDueDate && effectiveEmployeeId
                    ? [
                        {
                          label: t("changeDueDate"),
                          icon: LuCalendarDays,
                          onSelect: () =>
                            setDueDateTarget({
                              courseId: row.courseId,
                              courseTitle: title,
                              currentDueDate: row.dueDate,
                            }),
                        },
                      ]
                    : []),
                  ...(effectiveEmployeeId
                    ? [
                        {
                          label: t("unassign"),
                          icon: LuUserMinus,
                          destructive: true,
                          confirmTitle: t("unassignConfirmTitle"),
                          confirmDescription: t("unassignConfirmCourseBody", {
                            course: title,
                          }),
                          confirmLabel: t("unassign"),
                          onSelect: () => void handleUnassign(row.courseId),
                        },
                      ]
                    : []),
                ];

                return (
                  <div key={row.assignmentId} className="p-4">
                    {/* Top: Course title + Status + RowActions */}
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/${locale}/admin/training/${row.courseId}`}
                        className="font-semibold text-base text-[var(--color-ink)] hover:text-[var(--color-brand-700)] leading-snug flex-1 truncate"
                      >
                        {title}
                      </Link>
                      <div className="shrink-0 flex items-center gap-2">
                        {row.isOverridden ? (
                          <StatusPill tone="warn" withDot>
                            {tOverride("statusOverridden")}
                          </StatusPill>
                        ) : (
                          <ProgressStatusPill
                            status={status}
                            label={t(PROGRESS_STATUS_LABEL_KEY[status])}
                          />
                        )}
                        {mobileActionItems.length > 0 ? (
                          <RowActions
                            items={mobileActionItems}
                            triggerLabel={title}
                          />
                        ) : null}
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
                <span key="actions" className="sr-only">
                  {t("thActions")}
                </span>,
              ]}
            >
              {assignmentList.map((row) => {
                const status = statusOf(row);
                const done =
                  row.status === "complete"
                    ? row.chapterCount
                    : row.completedChapterCount;
                const courseName =
                  locale === "es"
                    ? row.titleEs || row.titleEn
                    : row.titleEn || row.titleEs;

                const tableActionItems: RowActionItem[] = [
                  ...(canEditDueDate && effectiveEmployeeId
                    ? [
                        {
                          label: t("changeDueDate"),
                          icon: LuCalendarDays,
                          onSelect: () =>
                            setDueDateTarget({
                              courseId: row.courseId,
                              courseTitle: courseName,
                              currentDueDate: row.dueDate,
                            }),
                        },
                      ]
                    : []),
                  ...(effectiveEmployeeId
                    ? [
                        {
                          label: t("unassign"),
                          icon: LuUserMinus,
                          destructive: true,
                          confirmTitle: t("unassignConfirmTitle"),
                          confirmDescription: t("unassignConfirmCourseBody", {
                            course: courseName,
                          }),
                          confirmLabel: t("unassign"),
                          onSelect: () => void handleUnassign(row.courseId),
                        },
                      ]
                    : []),
                ];

                return (
                  <tr key={row.assignmentId}>
                    <td>
                      <Link
                        href={`/${locale}/admin/training/${row.courseId}`}
                        className="font-medium text-[var(--color-ink)] underline-offset-2 hover:text-[var(--color-brand-700)] hover:underline"
                      >
                        {courseName}
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
                          ? "tabular-nums font-semibold text-[var(--color-bad)]"
                          : "tabular-nums text-[var(--color-ink-2)]"
                      }
                    >
                      {canEditDueDate &&
                      effectiveEmployeeId &&
                      row.status !== "complete" ? (
                        <button
                          type="button"
                          onClick={() =>
                            setDueDateTarget({
                              courseId: row.courseId,
                              courseTitle: courseName,
                              currentDueDate: row.dueDate,
                            })
                          }
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
                      {row.isOverridden ? (
                        <StatusPill tone="warn" withDot>
                          {tOverride("statusOverridden")}
                        </StatusPill>
                      ) : (
                        <ProgressStatusPill
                          status={status}
                          label={t(PROGRESS_STATUS_LABEL_KEY[status])}
                        />
                      )}
                    </td>
                    <td className="text-right">
                      {tableActionItems.length > 0 ? (
                        <div className="flex justify-end">
                          <RowActions
                            items={tableActionItems}
                            triggerLabel={courseName}
                          />
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </ProgressTableShell>
          </div>
        </>
      )}

      <GrantOverrideModal
        open={overrideModalOpen}
        onClose={() => {
          setOverrideModalOpen(false);
          setSelectedCourseForOverride(null);
        }}
        employeeId={effectiveEmployeeId ?? ""}
        employeeName={meta?.name ?? "Employee"}
        courseId={selectedCourseForOverride?.id}
        courseTitle={selectedCourseForOverride?.title}
        onSuccess={() => {
          window.location.reload();
        }}
      />

      {effectiveEmployeeId && dueDateTarget ? (
        <ChangeDueDateModal
          open
          onClose={() => setDueDateTarget(null)}
          courseId={dueDateTarget.courseId}
          courseTitle={dueDateTarget.courseTitle}
          employeeIds={[effectiveEmployeeId]}
          employeeName={meta?.name ?? ""}
          currentDueDate={dueDateTarget.currentDueDate}
          onSuccess={() => window.location.reload()}
        />
      ) : null}

      <ConfirmModal
        open={confirmRevokeModalOpen}
        title={tOverride("revokeTitle")}
        description={tOverride("revokeBody", {
          name: meta?.name ?? "Employee",
        })}
        confirmLabel={tOverride("revokeConfirm")}
        cancelLabel={tOverride("cancel")}
        variant="destructive"
        isLoading={revoking}
        onConfirm={handleRevoke}
        onClose={() => setConfirmRevokeModalOpen(false)}
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
