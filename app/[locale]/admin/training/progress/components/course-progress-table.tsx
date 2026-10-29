"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LuChevronRight } from "react-icons/lu";
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
 *  which chapter the rest are sitting on. Every row opens the course's
 *  who-is-assigned-and-how-far detail page. */
export function CourseProgressTable({
  locale,
  rows,
}: CourseProgressTableProps): React.ReactElement {
  const t = useTranslations("admin.training.progress");
  const tTraining = useTranslations("admin.training");
  const router = useRouter();

  function openRow(courseId: string): void {
    router.push(`/${locale}/admin/training/progress/course/${courseId}`);
  }

  return (
    <ProgressTableShell
      label={t("tableLabel")}
      columns={[
        t("thCourse"),
        t("thPeopleDone"),
        t("thWhere"),
        t("thStatus"),
        "",
      ]}
    >
      {rows.map((row) => {
        const title = courseTitle(row.course, locale);
        return (
          <tr
            key={row.course.id}
            role="link"
            tabIndex={0}
            aria-label={title}
            onClick={() => openRow(row.course.id)}
            onKeyDown={(ev) => {
              const target = ev.target as HTMLElement | null;
              if (target?.closest("button, a, input, select, textarea")) return;
              if (ev.key === "Enter" || ev.key === " ") {
                ev.preventDefault();
                openRow(row.course.id);
              }
            }}
            className="cursor-pointer transition-colors hover:bg-[var(--color-panel)] focus-visible:bg-[var(--color-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-brand-600)]"
          >
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
            <td>
              <span aria-hidden="true">
                <LuChevronRight className="size-4 text-[var(--color-ink-3)]" />
              </span>
              <span className="sr-only">{t("openDetail")}</span>
            </td>
          </tr>
        );
      })}
    </ProgressTableShell>
  );
}
