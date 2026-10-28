"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  LuArchive,
  LuCheck,
  LuFilePen,
  LuGraduationCap,
  LuPlus,
  LuRotateCcw,
  LuSearch,
  LuTrash2,
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
import { TrainingCoursesListSkeleton } from "@/components/admin/training-courses-skeleton";
import { cn } from "@/lib/utils";

import { CourseAssignmentModal } from "./components/course-assignment-modal";
import {
  useCourses,
  useArchiveCourse,
  useUnarchiveCourse,
  useDeleteCourse,
} from "@/services/courses/hooks";

interface TrainingCourseExplorerProps {
  locale: string;
}

type AssignmentFilter = "all" | "assigned" | "unassigned" | "archived";

export function TrainingCourseExplorer({
  locale,
}: TrainingCourseExplorerProps): React.ReactElement {
  const t = useTranslations("admin.training");
  const tCommon = useTranslations("admin");
  const router = useRouter();
  const isEs = locale === "es";

  const { data: coursesData, isLoading, refetch } = useCourses({ limit: 100 });
  const archiveMutation = useArchiveCourse();
  const unarchiveMutation = useUnarchiveCourse();
  const deleteMutation = useDeleteCourse();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [filter, setFilter] = React.useState<AssignmentFilter>("all");
  const [assigningCourse, setAssigningCourse] =
    React.useState<Procedure | null>(null);
  const [successToast, setSuccessToast] = React.useState<string | null>(null);

  const courseRows = React.useMemo<TrainingCourseRow[]>(() => {
    if (!coursesData?.items) return [];
    return coursesData.items.map((bc) => {
      const assignCount = Array.isArray(bc.assignUsers)
        ? bc.assignUsers.length
        : (bc.assignedCount ?? 0);
      return {
        course: {
          id: bc.id,
          slug: bc.id,
          titleEn: bc.titleEn,
          titleEs: bc.titleEs,
          purposeEn: bc.purposeEn,
          purposeEs: bc.purposeEs,
          status: "published",
          isArchived: bc.status === "archived",
          createdAt: bc.createdAt,
          updatedAt: bc.updatedAt,
          attachedToTraining: true,
          chapterCount: bc.chapterCount ?? 0,
          quizId:
            bc.hasQuiz || (bc.quizCount && bc.quizCount > 0)
              ? "attached-quiz"
              : null,
        } as unknown as Procedure,
        chapterCount: bc.chapterCount ?? 0,
        assignmentCount: assignCount,
        completeCount: 0,
        inProgressCount: 0,
        overdueCount: 0,
      };
    });
  }, [coursesData?.items]);

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

  const filterCounts = React.useMemo(() => {
    const active = courseRows.filter((r) => !r.course.isArchived);
    const archived = courseRows.filter((r) => Boolean(r.course.isArchived));
    return {
      all: active.length,
      assigned: active.filter((r) => r.assignmentCount > 0).length,
      unassigned: active.filter((r) => r.assignmentCount === 0).length,
      archived: archived.length,
    };
  }, [courseRows]);

  const filteredRows = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return courseRows.filter((row) => {
      const isArchived = Boolean(row.course.isArchived);
      if (filter === "archived") {
        if (!isArchived) return false;
      } else {
        if (isArchived) return false;
        if (filter === "assigned" && row.assignmentCount === 0) return false;
        if (filter === "unassigned" && row.assignmentCount > 0) return false;
      }

      if (!q) return true;
      return titleOf(row).toLowerCase().includes(q);
    });
  }, [courseRows, searchQuery, filter, titleOf]);

  async function handleArchive(courseId: string): Promise<void> {
    try {
      await archiveMutation.mutateAsync(courseId);
      setSuccessToast(
        isEs
          ? "El curso ha sido archivado correctamente."
          : "Course has been archived successfully.",
      );
    } catch (err) {
      console.error("Failed to archive course:", err);
    }
  }

  async function handleUnarchive(courseId: string): Promise<void> {
    try {
      await unarchiveMutation.mutateAsync(courseId);
      setSuccessToast(
        isEs
          ? "El curso ha sido restaurado correctamente."
          : "Course has been restored successfully.",
      );
    } catch (err) {
      console.error("Failed to unarchive course:", err);
    }
  }

  async function handleDelete(courseId: string): Promise<void> {
    try {
      await deleteMutation.mutateAsync(courseId);
      setSuccessToast(
        isEs
          ? "El curso ha sido eliminado permanentemente."
          : "Course has been permanently deleted.",
      );
    } catch (err) {
      console.error("Failed to delete course:", err);
    }
  }

  function handleAssigned(count: number): void {
    void refetch();

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
        <h1 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold leading-snug sm:leading-display tracking-tight text-[var(--color-ink)]">
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

      {/* Filter Chips: All / Assigned / Unassigned / Archived */}
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
            label: isEs ? "Asignados" : "Assigned",
            count: filterCounts.assigned,
          },
          {
            value: "unassigned",
            label: isEs ? "No asignados" : "Unassigned",
            count: filterCounts.unassigned,
          },
          {
            value: "archived",
            label: isEs ? "Archivados" : "Archived",
            count: filterCounts.archived,
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
      {isLoading ? (
        <TrainingCoursesListSkeleton count={5} />
      ) : courseRows.length === 0 ? (
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
        filter === "archived" ? (
          <EmptyState
            icon={LuArchive}
            title={isEs ? "No hay cursos archivados" : "No archived courses"}
            body={
              isEs
                ? "Los cursos que archives aparecerán aquí para restaurarlos o eliminarlos."
                : "Courses you archive will appear here where you can restore or delete them."
            }
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
        )
      ) : (
        <ul className="divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)]">
          {filteredRows.map((row) => {
            const title = titleOf(row);
            const purpose = isEs
              ? row.course.purposeEs || row.course.purposeEn
              : row.course.purposeEn || row.course.purposeEs;
            const hasQuiz = Boolean(row.course.quizId);
            const isAssigned = row.assignmentCount > 0;
            const isArchived = Boolean(row.course.isArchived);

            const updated = new Date(row.course.updatedAt).toLocaleDateString(
              isEs ? "es" : "en",
              {
                day: "numeric",
                month: "short",
                year: "numeric",
              },
            );
            const courseDetailHref = `/${locale}/admin/training/${row.course.id}`;

            return (
              <li
                key={row.course.id}
                onClick={() => router.push(courseDetailHref)}
                className={cn(
                  "group flex flex-col justify-between gap-4 px-4 py-5 transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-wash)] md:flex-row md:items-center cursor-pointer",
                  isArchived &&
                    "bg-[var(--color-wash)]/40 opacity-80 hover:opacity-100",
                )}
              >
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <Link
                    href={courseDetailHref}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 transition-transform group-hover:scale-105 active:scale-95 text-left"
                    title={title}
                  >
                    <IconTile size="lg" icon={LuGraduationCap} />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Link
                        href={courseDetailHref}
                        onClick={(e) => e.stopPropagation()}
                        className="min-w-0 truncate text-base font-semibold leading-heading text-[var(--color-ink)] transition-colors hover:text-[var(--color-brand-600)]"
                      >
                        {title}
                      </Link>

                      {/* Status pill: Archived / Assigned / Unassigned */}
                      {isArchived ? (
                        <StatusPill tone="neutral" withDot>
                          {isEs ? "Archivado" : "Archived"}
                        </StatusPill>
                      ) : isAssigned ? (
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
                      <span>
                        {isEs
                          ? `${row.course.chapterCount ?? 0} ${(row.course.chapterCount ?? 0) === 1 ? "capítulo" : "capítulos"}`
                          : `${row.course.chapterCount ?? 0} ${(row.course.chapterCount ?? 0) === 1 ? "chapter" : "chapters"}`}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span suppressHydrationWarning>
                        {t("updatedAgo", { when: updated })}
                      </span>
                    </p>
                  </div>
                </div>

                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex shrink-0 items-center gap-2 self-start md:self-center"
                >
                  {/* Assign Button — only for active courses */}
                  {!isArchived ? (
                    <Button
                      type="button"
                      variant="neutral"
                      size="sm"
                      icon={LuUserPlus}
                      onClick={() => setAssigningCourse(row.course)}
                    >
                      {t("assignAction")}
                    </Button>
                  ) : null}

                  <RowActions
                    triggerLabel={t("rowActionsLabel", { title })}
                    items={
                      isArchived
                        ? [
                            {
                              label: isEs
                                ? "Restaurar curso"
                                : "Restore course",
                              icon: LuRotateCcw,
                              onSelect: () => handleUnarchive(row.course.id),
                            },
                            {
                              label: isEs
                                ? "Eliminar permanentemente"
                                : "Delete permanently",
                              icon: LuTrash2,
                              destructive: true,
                              confirmTitle: isEs
                                ? "Eliminar curso"
                                : "Delete course",
                              confirmDescription: isEs
                                ? `"${title}" y su contenido se eliminarán permanentemente. Esto no se puede deshacer.`
                                : `"${title}" and its contents will be permanently removed. This can't be undone.`,
                              confirmLabel: isEs ? "Eliminar" : "Delete",
                              onSelect: () => handleDelete(row.course.id),
                            },
                          ]
                        : [
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
                              icon: LuArchive,
                              destructive: true,
                              confirmTitle: isEs
                                ? "Archivar curso"
                                : "Archive course",
                              confirmDescription: isEs
                                ? `"${title}" se archivará. Las personas asignadas ya no lo verán.`
                                : `"${title}" will be archived. Anyone assigned will see it as gone.`,
                              confirmLabel: isEs ? "Archivar" : "Archive",
                              onSelect: () => handleArchive(row.course.id),
                            },
                          ]
                    }
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
