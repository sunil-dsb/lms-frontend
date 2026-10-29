"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { LuCircleCheck, LuGraduationCap } from "react-icons/lu";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { CapsuleTabs } from "@/components/ui/capsule-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { TrainingProgressData } from "@/lib/types";
import { CourseProgressTable } from "./course-progress-table";
import { EmployeeProgressTable } from "./employee-progress-table";

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
