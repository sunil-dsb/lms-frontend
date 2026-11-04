"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  LuArrowLeft,
  LuArrowRight,
  LuCircleCheck,
  LuGraduationCap,
  LuLoader,
  LuSearch,
  LuX,
} from "react-icons/lu";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { CapsuleTabs } from "@/components/ui/capsule-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { TrainingProgressData } from "@/lib/types";
import { CourseProgressTable } from "./course-progress-table";
import { EmployeeProgressTable } from "./employee-progress-table";
import { fetchTrainingProgressApi } from "@/services/courses/api";

type GroupBy = "employee" | "course";
type StatusFilter = "all" | "in_progress" | "complete" | "overdue";
const PAGE_SIZE = 25;

interface ProgressOverviewProps {
  locale: string;
  data: TrainingProgressData;
}

/**
 * The admin Progress tab: who has finished their training and who is behind.
 *
 * `data` arrives from `fetchTrainingProgress()` on the server.
 * Fully responsive: adapts segmented tabs and table/card presentation
 * seamlessly across mobile, tablet, and desktop viewports.
 */
export function ProgressOverview({
  locale,
  data,
}: ProgressOverviewProps): React.ReactElement {
  const t = useTranslations("admin.training.progress");
  const tTraining = useTranslations("admin.training");
  const tAdmin = useTranslations("admin");

  const [groupBy, setGroupBy] = React.useState<GroupBy>("employee");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [page, setPage] = React.useState(1);
  const [employeeSearch, setEmployeeSearch] = React.useState("");
  const [courseSearch, setCourseSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  const search = groupBy === "employee" ? employeeSearch : courseSearch;
  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const queryOptions = {
    status: statusFilter === "all" ? undefined : statusFilter,
    groupBy,
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    includeAssignments: false,
  } as const;
  const progressQuery = useQuery({
    queryKey: ["admin-training-progress", queryOptions],
    queryFn: () => fetchTrainingProgressApi(undefined, queryOptions),
    initialData:
      groupBy === "employee" &&
      statusFilter === "all" &&
      page === 1 &&
      debouncedSearch === ""
        ? data
        : undefined,
    placeholderData: (previous, previousQuery) => {
      const previousOptions = previousQuery?.queryKey[1] as
        { groupBy?: GroupBy } | undefined;
      return previousOptions?.groupBy === groupBy ? previous : undefined;
    },
    staleTime: 30_000,
  });
  const progressData = progressQuery.data ?? {
    summary: { completed: 0, inProgress: 0, overdue: 0 },
    counts: { employees: 0, courses: 0 },
    employees: [],
    courses: [],
    pagination: { page, limit: PAGE_SIZE, total: 0, totalPages: 0 },
  };

  const visibleEmployeeRows = progressData.employees;
  const visibleCourseRows = progressData.courses;
  const pagination = progressData.pagination;
  const visibleCount = pagination?.total ?? 0;
  const totalPages = pagination?.totalPages ?? 1;
  const displayedPage = pagination?.page ?? page;
  const rangeStart =
    visibleCount === 0 ? 0 : (displayedPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(displayedPage * PAGE_SIZE, visibleCount);

  const setGroup = (value: string): void => {
    const nextGroup = value as GroupBy;
    setGroupBy(nextGroup);
    setPage(1);
    setDebouncedSearch(
      (nextGroup === "employee" ? employeeSearch : courseSearch).trim(),
    );
  };
  const setStatus = (value: string): void => {
    setStatusFilter(value as StatusFilter);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={tTraining("pageEyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <CapsuleTabs
          ariaLabel={t("groupBy")}
          value={groupBy}
          onChange={setGroup}
          tabs={[
            {
              value: "employee",
              label: t("byEmployee"),
              count: progressData.counts?.employees,
            },
            {
              value: "course",
              label: t("byCourse"),
              count: progressData.counts?.courses,
            },
          ]}
        />

        <CapsuleTabs
          ariaLabel={t("statusFilter")}
          value={statusFilter}
          onChange={setStatus}
          className="w-full max-w-full overflow-x-auto sm:w-auto"
          compact
          tabs={[
            { value: "all", label: t("filterAll") },
            { value: "in_progress", label: t("statusInProgress") },
            { value: "complete", label: t("statusDone") },
            { value: "overdue", label: t("statusOverdue") },
          ]}
        />
      </div>

      <div className="relative w-full">
        <LuSearch
          aria-hidden="true"
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-3)]"
        />

        <Input
          type="text"
          value={search}
          onChange={(event) => {
            if (groupBy === "employee") {
              setEmployeeSearch(event.target.value);
            } else {
              setCourseSearch(event.target.value);
            }
          }}
          aria-label={
            groupBy === "employee"
              ? t("searchEmployeesLabel")
              : t("searchCoursesLabel")
          }
          placeholder={
            groupBy === "employee"
              ? t("searchEmployeesPlaceholder")
              : t("searchCoursesPlaceholder")
          }
          className="h-9 w-full !pl-10 !pr-10"
        />

        {search && (
          <button
            type="button"
            aria-label={t("clearSearch")}
            onClick={() => {
              if (groupBy === "employee") {
                setEmployeeSearch("");
              } else {
                setCourseSearch("");
              }
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--color-ink-3)] hover:bg-[var(--color-panel)] hover:text-[var(--color-ink)]"
          >
            <LuX aria-hidden="true" size={16} />
          </button>
        )}
      </div>

      {progressQuery.isFetching ? (
        <p
          role="status"
          className="flex items-center gap-2 text-sm text-[var(--color-ink-2)]"
        >
          <LuLoader
            aria-hidden="true"
            className="size-4 animate-spin text-[var(--color-brand-600)]"
          />
          {t("loadingProgress")}
        </p>
      ) : null}

      {progressQuery.isPending && !progressQuery.data ? (
        <ProgressRowsSkeleton />
      ) : progressQuery.isError && !progressQuery.data ? (
        <EmptyState
          icon={LuGraduationCap}
          title={t("loadErrorHeading")}
          body={t("loadErrorBody")}
          action={
            <Button
              type="button"
              variant="secondary"
              onClick={() => void progressQuery.refetch()}
            >
              {t("retry")}
            </Button>
          }
        />
      ) : visibleCount === 0 ? (
        debouncedSearch ? (
          <EmptyState
            icon={LuSearch}
            title={t("noSearchResultsHeading")}
            body={
              groupBy === "employee"
                ? t("noEmployeeSearchResultsBody", { query: debouncedSearch })
                : t("noCourseSearchResultsBody", { query: debouncedSearch })
            }
            action={
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (groupBy === "employee") setEmployeeSearch("");
                  else setCourseSearch("");
                }}
              >
                {t("clearSearch")}
              </Button>
            }
          />
        ) : statusFilter !== "all" ? (
          <EmptyState
            icon={statusFilter === "complete" ? LuCircleCheck : LuGraduationCap}
            title={
              statusFilter === "overdue"
                ? t("noOverdueHeading")
                : t("noStatusResultsHeading")
            }
            body={
              statusFilter === "overdue"
                ? t("noOverdueBody")
                : t("noStatusResultsBody")
            }
            action={
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStatus("all")}
              >
                {tAdmin("clearFilter")}
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={LuGraduationCap}
            title={t("emptyHeading")}
            body={t("emptyBody")}
          />
        )
      ) : groupBy === "employee" ? (
        <div
          aria-busy={progressQuery.isFetching}
          className={progressQuery.isFetching ? "opacity-60" : undefined}
        >
          <EmployeeProgressTable locale={locale} rows={visibleEmployeeRows} />
        </div>
      ) : (
        <div
          aria-busy={progressQuery.isFetching}
          className={progressQuery.isFetching ? "opacity-60" : undefined}
        >
          <CourseProgressTable locale={locale} rows={visibleCourseRows} />
        </div>
      )}

      {visibleCount > 0 && totalPages > 1 ? (
        <nav
          aria-label={t("paginationLabel")}
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <p className="text-sm text-[var(--color-ink-2)]" aria-live="polite">
            {t("paginationRange", {
              from: rangeStart,
              to: rangeEnd,
              total: visibleCount,
            })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="neutral"
              size="sm"
              disabled={displayedPage <= 1 || progressQuery.isFetching}
              onClick={() => setPage(Math.max(1, displayedPage - 1))}
              icon={LuArrowLeft}
            >
              {t("previousPage")}
            </Button>
            <span className="px-1 text-sm text-[var(--color-ink-2)]">
              {t("pageOf", { page: displayedPage, pages: totalPages })}
            </span>
            <Button
              type="button"
              variant="neutral"
              size="sm"
              disabled={displayedPage >= totalPages || progressQuery.isFetching}
              onClick={() => setPage(Math.min(totalPages, displayedPage + 1))}
              icon={LuArrowRight}
            >
              {t("nextPage")}
            </Button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}

function ProgressRowsSkeleton(): React.ReactElement {
  return (
    <div aria-hidden="true" className="space-y-3">
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className="rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-panel)] p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="mt-4 h-3 w-full" />
        </div>
      ))}
    </div>
  );
}
