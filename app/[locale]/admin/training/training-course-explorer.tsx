"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  LuCheck,
  LuFilePen,
  LuGraduationCap,
  LuPlus,
  LuSearch,
  LuUserPlus,
  LuX,
} from "react-icons/lu";
import type { Procedure, TrainingCourseRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChips } from "@/components/ui/filter-chips";
import { RowActions } from "@/components/ui/row-actions";
import { StatusPill } from "@/components/ui/status-pill";
import { getQuizById } from "@/lib/api";
import { IconTile } from "@/components/ui/icon-tile";
import { getTrainingCourseRowsForAdmin } from "@/lib/mock-training";
import { CourseAssignmentModal } from "./components/course-assignment-modal";

interface TrainingCourseExplorerProps {
  locale: string;
  rows: TrainingCourseRow[];
}

type AssignmentFilter = "all" | "assigned" | "unassigned";

export function TrainingCourseExplorer({
  locale,
  rows: initialRows,
}: TrainingCourseExplorerProps): React.ReactElement {
  const t = useTranslations("admin.training");
  const tCommon = useTranslations("admin");
  const router = useRouter();
  const isEs = locale === "es";

  const [courseRows, setCourseRows] =
    React.useState<TrainingCourseRow[]>(initialRows);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filter, setFilter] = React.useState<AssignmentFilter>("all");
  const [assigningCourse, setAssigningCourse] =
    React.useState<Procedure | null>(null);
  const [successToast, setSuccessToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    setCourseRows(initialRows);
  }, [initialRows]);

  React.useEffect(() => {
    if (!successToast) return;
    const timer = setTimeout(() => {
      setSuccessToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [successToast]);

  const titleOf = React.useCallback(
    (row: TrainingCourseRow) =>
      (isEs
        ? row.course.titleEs || row.course.titleEn
        : row.course.titleEn || row.course.titleEs) || row.course.slug,
    [isEs],
  );

  const filterCounts = React.useMemo(
    () => ({
      all: courseRows.length,
      assigned: courseRows.filter((r) => r.assignmentCount > 0).length,
      unassigned: courseRows.filter((r) => r.assignmentCount === 0).length,
    }),
    [courseRows],
  );

  const filteredRows = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return courseRows.filter((row) => {
      if (filter === "assigned" && row.assignmentCount === 0) return false;
      if (filter === "unassigned" && row.assignmentCount > 0) return false;
      if (!q) return true;
      return titleOf(row).toLowerCase().includes(q);
    });
  }, [courseRows, searchQuery, filter, titleOf]);

  function handleArchive(courseId: string): void {
    console.info("[training] archive course (mock)", courseId);
  }

  function handleAssigned(count: number): void {
    // Refresh rows from store to immediately reflect the new assignment
    const updated = getTrainingCourseRowsForAdmin();
    setCourseRows(updated);

    if (assigningCourse) {
      const courseTitle =
        (isEs
          ? assigningCourse.titleEs || assigningCourse.titleEn
          : assigningCourse.titleEn || assigningCourse.titleEs) ||
        assigningCourse.slug;

      const message = isEs
        ? `Se asignó correctamente a ${count} ${count === 1 ? "empleado" : "empleados"} a "${courseTitle}".`
        : `Successfully assigned ${count} ${count === 1 ? "employee" : "employees"} to "${courseTitle}".`;
      setSuccessToast(message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {successToast ? (
        <div className="animate-in fade-in slide-in-from-top-2 flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-emerald-600 text-white">
              <LuCheck className="text-xs stroke-[3]" />
            </span>
            <p className="font-medium">{successToast}</p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-950 dark:text-emerald-300 dark:hover:text-white"
          >
            <LuX className="text-base" />
          </button>
        </div>
      ) : null}

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-[family-name:var(--font-ui)] text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-ink)]">
          {isEs ? "Cursos" : "Courses"}
        </h1>
        <Button
          type="button"
          icon={LuPlus}
          onClick={() => router.push(`/${locale}/admin/training/new`)}
        >
          {t("newCourse")}
        </Button>
      </div>

      {/* Filter Chips: Replaced Published / Draft with Assigned / Unassigned */}
      <FilterChips
        label={t("filterAssignment")}
        value={filter}
        onChange={(v) => setFilter(v as AssignmentFilter)}
        chips={[
          {
            value: "all",
            label: tCommon("filterAll"),
            count: filterCounts.all,
          },
          {
            value: "assigned",
            label: t("filterAssigned"),
            count: filterCounts.assigned,
          },
          {
            value: "unassigned",
            label: t("filterUnassigned"),
            count: filterCounts.unassigned,
          },
        ]}
      />

      {/* Search Input Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="find" role="search">
          <LuSearch aria-hidden="true" className="i" />
          <label className="sr-only" htmlFor="training-search">
            {t("searchLabel")}
          </label>
          <input
            id="training-search"
            type="search"
            value={searchQuery}
            placeholder={t("searchPlaceholder")}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label={t("clearSearch")}
              className="shrink-0 text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
            >
              <LuX aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <p className="text-sm leading-meta text-[var(--color-ink-2)]">
          {t("countSummary", {
            total: courseRows.length,
            shown: filteredRows.length,
          })}
        </p>
      </div>

      {/* Course List / Empty States */}
      {courseRows.length === 0 ? (
        <EmptyState
          icon={LuGraduationCap}
          title={t("emptyHeading")}
          body={t("emptyBody")}
          action={
            <Button
              icon={LuPlus}
              onClick={() => router.push(`/${locale}/admin/training/new`)}
            >
              {t("newCourse")}
            </Button>
          }
        />
      ) : filteredRows.length === 0 ? (
        <EmptyState
          icon={LuSearch}
          title={t("noMatchHeading")}
          body={t("noMatchBody")}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setSearchQuery("");
                setFilter("all");
              }}
            >
              {tCommon("clearFilters")}
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)]">
          {filteredRows.map((row) => {
            const title = titleOf(row);
            const purpose = isEs
              ? row.course.purposeEs || row.course.purposeEn
              : row.course.purposeEn || row.course.purposeEs;
            const hasQuiz = Boolean(
              row.course.quizId &&
              getQuizById(row.course.quizId)?.questions?.length,
            );
            const isAssigned = row.assignmentCount > 0;
            const updated = new Date(row.course.updatedAt).toLocaleDateString(
              isEs ? "es" : "en",
              {
                day: "numeric",
                month: "short",
                year: "numeric",
              },
            );

            return (
              <li
                key={row.course.id}
                className="group flex flex-col justify-between gap-4 px-4 py-5 transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-wash)] md:flex-row md:items-center"
              >
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <IconTile size="lg" icon={LuGraduationCap} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h4 className="min-w-0 truncate text-base font-semibold leading-heading text-[var(--color-ink)] transition-colors">
                        {title}
                      </h4>

                      {/* Replaced Draft/Published badge with Assigned / Unassigned */}
                      {isAssigned ? (
                        <StatusPill tone="ok" withDot>
                          {t("statusAssigned")}
                        </StatusPill>
                      ) : (
                        <StatusPill tone="neutral" withDot>
                          {t("statusUnassigned")}
                        </StatusPill>
                      )}

                      {/* Quiz Pill */}
                      {hasQuiz ? null : (
                        <StatusPill tone="warn">{t("noQuiz")}</StatusPill>
                      )}

                      {/* Overdue Pill */}
                      {row.overdueCount > 0 ? (
                        <StatusPill tone="bad" withDot>
                          {t("countOverdue", { count: row.overdueCount })}
                        </StatusPill>
                      ) : null}
                    </div>

                    {purpose ? (
                      <p className="mt-1 line-clamp-2 text-sm leading-body text-[var(--color-ink-2)]">
                        {purpose}
                      </p>
                    ) : null}

                    {/* Metadata line */}
                    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-meta text-[var(--color-ink-3)]">
                      <span>
                        {t("totalAssigned", { count: row.assignmentCount })}
                      </span>
                      {row.assignmentCount > 0 ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>
                            {t("countInProgress", {
                              count: row.inProgressCount,
                            })}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {t("countComplete", { count: row.completeCount })}
                          </span>
                        </>
                      ) : null}
                      <span aria-hidden="true">·</span>
                      <span>{t("updatedAgo", { when: updated })}</span>
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 self-start md:self-center">
                  {/* Assign Button — now opens the pop-up modal directly */}
                  <Button
                    type="button"
                    variant="neutral"
                    size="sm"
                    icon={LuUserPlus}
                    onClick={() => setAssigningCourse(row.course)}
                  >
                    {t("assignAction")}
                  </Button>

                  <RowActions
                    triggerLabel={t("rowActionsLabel", { title })}
                    items={[
                      {
                        label: t("rowEdit"),
                        icon: LuFilePen,
                        onSelect: () =>
                          router.push(
                            `/${locale}/admin/training/${row.course.id}/edit`,
                          ),
                      },
                      {
                        label: t("rowArchive"),
                        destructive: true,
                        confirmLabel: t("rowArchiveConfirm"),
                        onSelect: () => handleArchive(row.course.id),
                      },
                    ]}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Pop-up Assignment Modal */}
      <CourseAssignmentModal
        open={Boolean(assigningCourse)}
        onClose={() => setAssigningCourse(null)}
        locale={locale}
        course={assigningCourse}
        onAssigned={handleAssigned}
      />
    </div>
  );
}
