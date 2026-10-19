"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import type { EmployeeProgressRow } from "@/lib/types";
import {
  PROGRESS_STATUS_LABEL_KEY,
  ProgressStatusPill,
  courseTitle,
} from "./progress-row";
import { ProgressTableShell } from "./progress-table-shell";

interface EmployeeProgressTableProps {
  locale: string;
  rows: EmployeeProgressRow[];
}

/** "By employee": one row per person — how much they have finished, where
 *  they are right now, and the state of the row. */
export function EmployeeProgressTable({
  locale,
  rows,
}: EmployeeProgressTableProps): React.ReactElement {
  const t = useTranslations("admin.training.progress");

  return (
    <ProgressTableShell
      label={t("tableLabel")}
      columns={[
        t("thEmployee"),
        t("thCoursesDone"),
        t("thWhere"),
        t("thStatus"),
      ]}
    >
      {rows.map((row) => (
        <tr key={row.employeeId}>
          <td>
            <div className="font-medium text-[var(--color-ink)]">
              {row.name}
            </div>
            <div className="text-sm text-[var(--color-ink-3)]">
              {row.station}
            </div>
          </td>
          <td className="tabular-nums text-[var(--color-ink-2)]">
            {t("doneOfTotal", {
              done: row.coursesDone,
              total: row.coursesTotal,
            })}
          </td>
          <td className="text-[var(--color-ink-2)]">
            {row.currentCourse && row.currentChapter !== null
              ? t("whereAt", {
                  course: courseTitle(row.currentCourse, locale),
                  chapter: row.currentChapter,
                })
              : t("allFinished")}
          </td>
          <td>
            <ProgressStatusPill
              status={row.status}
              label={t(PROGRESS_STATUS_LABEL_KEY[row.status])}
            />
          </td>
        </tr>
      ))}
    </ProgressTableShell>
  );
}
