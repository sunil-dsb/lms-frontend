"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LuChevronRight } from "react-icons/lu";
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
 *  they are right now, and the state of the row. Every row opens the person's
 *  course-by-course progress detail page. */
export function EmployeeProgressTable({
  locale,
  rows,
}: EmployeeProgressTableProps): React.ReactElement {
  const t = useTranslations("admin.training.progress");
  const router = useRouter();

  function openRow(employeeId: string): void {
    router.push(`/${locale}/admin/training/progress/${employeeId}`);
  }

  return (
    <ProgressTableShell
      label={t("tableLabel")}
      columns={[
        t("thEmployee"),
        t("thCoursesDone"),
        t("thWhere"),
        t("thStatus"),
        "",
      ]}
    >
      {rows.map((row) => (
        <tr
          key={row.employeeId}
          role="link"
          tabIndex={0}
          aria-label={row.name}
          onClick={() => openRow(row.employeeId)}
          onKeyDown={(ev) => {
            const target = ev.target as HTMLElement | null;
            if (target?.closest("button, a, input, select, textarea")) return;
            if (ev.key === "Enter" || ev.key === " ") {
              ev.preventDefault();
              openRow(row.employeeId);
            }
          }}
          className="cursor-pointer transition-colors hover:bg-[var(--color-panel)] focus-visible:bg-[var(--color-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-brand-600)]"
        >
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
          <td>
            <span aria-hidden="true">
              <LuChevronRight className="size-4 text-[var(--color-ink-3)]" />
            </span>
            <span className="sr-only">{t("openDetail")}</span>
          </td>
        </tr>
      ))}
    </ProgressTableShell>
  );
}
