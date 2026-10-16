"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  LuFilePen,
  LuGraduationCap,
  LuSearch,
  LuUserPlus,
  LuX,
} from "react-icons/lu";
import type { TrainingCourseRow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChips } from "@/components/ui/filter-chips";
import { Icon } from "@/components/ui/icon";
import { RowActions } from "@/components/ui/row-actions";
import { StatusPill } from "@/components/ui/status-pill";
import { getQuizById } from "@/lib/api";
import { IconTile } from "@/components/ui/icon-tile";

interface TrainingCourseExplorerProps {
  locale: string;
  rows: TrainingCourseRow[];
}

type StatusFilter = "all" | "published" | "draft";

/**
 * The courses that exist for this location, and what each one is costing the
 * team in unfinished work.
 *
 * Built on the library explorer's row, because it is the same object seen from a
 * different angle — a titled thing with a state, a sentence, a meta line and one
 * action — and two list pages that read differently are two products. The
 * filters sit on the page rather than in a card: they are chrome, and the list
 * is the content.
 */
export function TrainingCourseExplorer({
  locale,
  rows,
}: TrainingCourseExplorerProps): React.ReactElement {
  const t = useTranslations("admin.training");
  const tCommon = useTranslations("admin");
  const router = useRouter();
  const isEs = locale === "es";

  const [searchQuery, setSearchQuery] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");

  const titleOf = React.useCallback(
    (row: TrainingCourseRow) =>
      (isEs
        ? row.course.titleEs || row.course.titleEn
        : row.course.titleEn || row.course.titleEs) || row.course.slug,
    [isEs],
  );

  const statusCounts = React.useMemo(
    () => ({
      all: rows.length,
      published: rows.filter((r) => r.course.status !== "draft").length,
      draft: rows.filter((r) => r.course.status === "draft").length,
    }),
    [rows],
  );

  const filteredRows = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((row) => {
      if (status === "draft" && row.course.status !== "draft") return false;
      if (status === "published" && row.course.status === "draft") return false;
      if (!q) return true;
      return titleOf(row).toLowerCase().includes(q);
    });
  }, [rows, searchQuery, status, titleOf]);

  function handleArchive(courseId: string): void {
    // The real archive call is wired up once the route exists; RowActions already
    // asks for confirmation, so this can never be one tap away.
    console.info("[training] archive course (mock)", courseId);
  }

  return (
    <div className="space-y-6">
      <FilterChips
        label={isEs ? "Estado" : "Status"}
        value={status}
        onChange={(v) => setStatus(v as StatusFilter)}
        chips={[
          {
            value: "all",
            label: tCommon("filterAll"),
            count: statusCounts.all,
          },
          {
            value: "published",
            label: t("statusPublished"),
            count: statusCounts.published,
          },
          {
            value: "draft",
            label: t("statusDraft"),
            count: statusCounts.draft,
          },
        ]}
      />

      {/* Chrome, on the page ground. A card around the search put the filters on
          the same plane as the list they filter. */}
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
            total: rows.length,
            shown: filteredRows.length,
          })}
        </p>
      </div>

      {filteredRows.length === 0 ? (
        <EmptyState
          icon={LuSearch}
          title={t("noMatchHeading")}
          body={t("noMatchBody")}
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setSearchQuery("");
                setStatus("all");
              }}
            >
              {tCommon("clearFilters")}
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)]">
          {filteredRows.map((row) => {
            const title = titleOf(row);
            const purpose = isEs
              ? row.course.purposeEs || row.course.purposeEn
              : row.course.purposeEn || row.course.purposeEs;
            const hasQuiz = Boolean(
              row.course.quizId &&
              getQuizById(row.course.quizId)?.questions?.length,
            );
            const isDraft = row.course.status === "draft";
            const updated = new Date(row.course.updatedAt).toLocaleDateString(
              isEs ? "es" : "en",
              {
                day: "numeric",
                month: "short",
                year: "numeric",
              },
            );

            return (
              <li
                key={row.course.id}
                className="group flex flex-col justify-between gap-4 px-4 py-5 transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-wash)] md:flex-row md:items-center"
              >
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <IconTile size="lg" icon={LuGraduationCap} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h4 className="min-w-0 truncate text-base font-semibold leading-heading text-[var(--color-ink)] transition-colors">
                        {title}
                      </h4>
                      <StatusPill tone={isDraft ? "neutral" : "ok"} withDot>
                        {isDraft ? t("statusDraft") : t("statusPublished")}
                      </StatusPill>
                      {/* Only the states worth acting on are worn. A course that
                          has its quiz and nobody late says so by staying quiet. */}
                      {hasQuiz ? null : (
                        <StatusPill tone="warn">{t("noQuiz")}</StatusPill>
                      )}
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

                    {/* One meta line: how many have it, where they are with it,
                        and when it last moved. Three pills per row said the same
                        thing in three boxes. */}
                    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-meta text-[var(--color-ink-3)]">
                      <span>
                        {t("totalAssigned", { count: row.assignmentCount })}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {t("countInProgress", { count: row.inProgressCount })}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {t("countComplete", { count: row.completeCount })}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{t("updatedAgo", { when: updated })}</span>
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 self-start md:self-center">
                  {/* Grey, not brand-tinted. One per row times ten rows is
                      ten brand marks on a page whose only real signal is the
                      red "overdue" pill, and the pill loses. */}
                  <Button
                    type="button"
                    variant="neutral"
                    size="sm"
                    icon={LuUserPlus}
                    onClick={() =>
                      router.push(
                        `/${locale}/admin/training/${row.course.id}/assign`,
                      )
                    }
                  >
                    {t("assignAction")}
                  </Button>

                  <RowActions
                    triggerLabel={t("rowActionsLabel", { title })}
                    items={[
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
                        destructive: true,
                        confirmLabel: t("rowArchiveConfirm"),
                        onSelect: () => handleArchive(row.course.id),
                      },
                    ]}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
