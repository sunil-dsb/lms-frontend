"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { LuCircleCheck, LuGraduationCap, LuSearch, LuX } from "react-icons/lu";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { CapsuleTabs } from "@/components/ui/capsule-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TrainingProgressData } from "@/lib/types";
import { CourseProgressTable } from "./course-progress-table";
import { EmployeeProgressTable } from "./employee-progress-table";
import { courseTitle } from "./progress-row";

type GroupBy = "employee" | "course";

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
  const [overdueOnly, setOverdueOnly] = React.useState(false);
  const [employeeSearch, setEmployeeSearch] = React.useState("");
  const [courseSearch, setCourseSearch] = React.useState("");

  const employeeRows = overdueOnly
    ? data.employees.filter((row) => row.status === "overdue")
    : data.employees;
  const courseRows = overdueOnly
    ? data.courses.filter((row) => row.status === "overdue")
    : data.courses;
  const search = groupBy === "employee" ? employeeSearch : courseSearch;
  const visibleEmployeeRows = employeeRows.filter((row) =>
    row.name
      .toLocaleLowerCase()
      .includes(employeeSearch.trim().toLocaleLowerCase()),
  );
  const visibleCourseRows = courseRows.filter((row) =>
    courseTitle(row.course, locale)
      .toLocaleLowerCase()
      .includes(courseSearch.trim().toLocaleLowerCase()),
  );
  const visibleCount =
    groupBy === "employee"
      ? visibleEmployeeRows.length
      : visibleCourseRows.length;

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
          onChange={(value) => setGroupBy(value as GroupBy)}
          tabs={[
            {
              value: "employee",
              label: t("byEmployee"),
              count: employeeRows.length,
            },
            { value: "course", label: t("byCourse"), count: courseRows.length },
          ]}
        />

        <Button
          type="button"
          variant="surface"
          size="sm"
          aria-pressed={overdueOnly}
          onClick={() => setOverdueOnly((value) => !value)}
          className={cn(
            "self-start sm:self-auto cursor-pointer",
            overdueOnly
              ? "bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] border-[var(--color-brand-600)]/30 font-semibold"
              : undefined,
          )}
        >
          {t("overdueOnly")}
        </Button>
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

      {visibleCount === 0 ? (
        search.trim() ? (
          <EmptyState
            icon={LuSearch}
            title={t("noSearchResultsHeading")}
            body={
              groupBy === "employee"
                ? t("noEmployeeSearchResultsBody", { query: search.trim() })
                : t("noCourseSearchResultsBody", { query: search.trim() })
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
        ) : overdueOnly ? (
          <EmptyState
            icon={LuCircleCheck}
            title={t("noOverdueHeading")}
            body={t("noOverdueBody")}
            action={
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOverdueOnly(false)}
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
        <EmployeeProgressTable locale={locale} rows={visibleEmployeeRows} />
      ) : (
        <CourseProgressTable locale={locale} rows={visibleCourseRows} />
      )}
    </div>
  );
}
