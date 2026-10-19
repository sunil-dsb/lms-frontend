"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { LuCircleCheck, LuGraduationCap } from "react-icons/lu";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { CapsuleTabs } from "@/components/ui/capsule-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import type { TrainingProgressData } from "@/lib/types";
import { CourseProgressTable } from "./course-progress-table";
import { EmployeeProgressTable } from "./employee-progress-table";
import { ProgressStatStrip } from "./progress-stat-strip";

type GroupBy = "employee" | "course";

interface ProgressOverviewProps {
  locale: string;
  data: TrainingProgressData;
}

/**
 * The admin Progress tab: who has finished their training and who is behind.
 *
 * `data` arrives from `fetchTrainingProgress()` on the server — mock for now,
 * the backend response shape for good. Everything that reacts to a tap lives
 * client-side here: the by-employee / by-course grouping and the
 * overdue-only filter.
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

  const employeeRows = overdueOnly
    ? data.employees.filter((row) => row.status === "overdue")
    : data.employees;
  const courseRows = overdueOnly
    ? data.courses.filter((row) => row.status === "overdue")
    : data.courses;
  const visibleCount =
    groupBy === "employee" ? employeeRows.length : courseRows.length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={tTraining("pageEyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
      />

      <ProgressStatStrip summary={data.summary} />

      <div className="flex flex-wrap items-center justify-between gap-3">
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
          className={
            overdueOnly
              ? "bg-[var(--color-brand-tint)] text-[var(--color-brand-700)]"
              : undefined
          }
        >
          {t("overdueOnly")}
        </Button>
      </div>

      {visibleCount === 0 ? (
        overdueOnly ? (
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
        <EmployeeProgressTable locale={locale} rows={employeeRows} />
      ) : (
        <CourseProgressTable locale={locale} rows={courseRows} />
      )}
    </div>
  );
}
