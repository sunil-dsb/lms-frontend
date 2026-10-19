"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import type { CourseProgressRow } from "@/lib/types";
import {
  PROGRESS_STATUS_LABEL_KEY,
  ProgressStatusPill,
  courseTitle,
} from "./progress-row";
import { ProgressTableShell } from "./progress-table-shell";

interface CourseProgressTableProps {
  locale: string;
  rows: CourseProgressRow[];
}

/** "By course": one row per course — how many people have finished it and
 *  which chapter the rest are sitting on. */
export function CourseProgressTable({
  locale,
  rows,
}: CourseProgressTableProps): React.ReactElement {
  const t = useTranslations("admin.training.progress");
  const tTraining = useTranslations("admin.training");

  return (
    <ProgressTableShell
      label={t("tableLabel")}
      columns={[t("thCourse"), t("thPeopleDone"), t("thWhere"), t("thStatus")]}
    >
      {rows.map((row) => {
        const title = courseTitle(row.course, locale);
        return (
          <tr key={row.course.id}>
            <td>
              <div className="font-medium text-[var(--color-ink)]">{title}</div>
              <div className="text-sm text-[var(--color-ink-3)]">
                {tTraining("totalAssigned", { count: row.peopleTotal })}
              </div>
            </td>
            <td className="tabular-nums text-[var(--color-ink-2)]">
              {t("doneOfTotal", {
                done: row.peopleDone,
                total: row.peopleTotal,
              })}
            </td>
            <td className="text-[var(--color-ink-2)]">
              {row.currentChapter !== null
                ? t("whereChapter", { chapter: row.currentChapter })
                : t("allFinished")}
            </td>
            <td>
              <ProgressStatusPill
                status={row.status}
                label={t(PROGRESS_STATUS_LABEL_KEY[row.status])}
              />
            </td>
          </tr>
        );
      })}
    </ProgressTableShell>
  );
}
