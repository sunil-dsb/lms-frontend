"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LuChevronRight } from "react-icons/lu";
import type { EmployeeProgressRow } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
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
 *  course-by-course progress detail page.
 *
 *  Responsive: on mobile screens (< md), renders as a high-density card list
 *  with full touch targets and zero badge truncation. On desktop (>= md),
 *  renders the standard 5-column table. */
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
    <>
      {/* Mobile Card List (< md) */}
      <Card className="block md:hidden">
        <CardContent className="p-0 divide-y divide-[var(--color-line-2)]">
          {rows.map((row) => (
            <div
              key={row.employeeId}
              role="link"
              tabIndex={0}
              aria-label={row.name}
              onClick={() => openRow(row.employeeId)}
              onKeyDown={(ev) => {
                const target = ev.target as HTMLElement | null;
                if (target?.closest("button, a, input, select, textarea"))
                  return;
                if (ev.key === "Enter" || ev.key === " ") {
                  ev.preventDefault();
                  openRow(row.employeeId);
                }
              }}
              className="p-4 transition-colors hover:bg-[var(--color-panel)] focus-visible:bg-[var(--color-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-brand-600)] cursor-pointer"
            >
              {/* Top: Name + Station on left, Status Pill on right */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-base text-[var(--color-ink)] truncate leading-snug">
                    {row.name}
                  </div>
                  {row.station ? (
                    <div className="text-xs text-[var(--color-ink-3)] mt-1 truncate">
                      {row.station}
                    </div>
                  ) : null}
                </div>
                <div className="shrink-0">
                  <ProgressStatusPill
                    status={row.status}
                    label={t(PROGRESS_STATUS_LABEL_KEY[row.status])}
                  />
                </div>
              </div>

              {/* Bottom: Progress details + Chevron */}
              <div className="mt-4 flex items-center justify-between text-xs text-[var(--color-ink-2)] border-t border-[var(--color-line-2)]/80 pt-4">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="font-semibold text-[var(--color-ink)] shrink-0 tabular-nums">
                    {t("doneOfTotal", {
                      done: row.coursesDone,
                      total: row.coursesTotal,
                    })}
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-[var(--color-line-2)] shrink-0"
                  >
                    ·
                  </span>
                  <span className="truncate text-[var(--color-ink-2)]">
                    {row.currentCourse && row.currentChapter !== null
                      ? t("whereAt", {
                          course: courseTitle(row.currentCourse, locale),
                          chapter: row.currentChapter,
                        })
                      : t("allFinished")}
                  </span>
                </div>
                <LuChevronRight
                  className="size-4 text-[var(--color-ink-3)] shrink-0 ml-2"
                  aria-hidden="true"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Desktop Table (>= md) */}
      <div className="hidden md:block">
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
                if (target?.closest("button, a, input, select, textarea"))
                  return;
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
      </div>
    </>
  );
}
