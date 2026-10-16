"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import type { TrainingTabFilter } from "../lib/training-view-types";

interface TrainingFilterTabsProps {
  activeTab?: TrainingTabFilter;
  onChangeTab?: (tab: TrainingTabFilter) => void;
  pendingCount?: number;
  completedCount?: number;
  isLoading?: boolean;
}

/**
 * Skeleton placeholder for TrainingFilterTabs during streaming/loading states.
 */
export function TrainingFilterTabsSkeleton(): React.ReactElement {
  return (
    <div className="pt-1" aria-hidden="true">
      <div
        className="inline-flex items-center rounded-full bg-[var(--color-panel)] border border-[var(--color-line-2)] self-start"
        style={{ padding: "4px", gap: "4px" }}
      >
        {/* Pending tab skeleton pill */}
        <div
          className="animate-pulse rounded-full bg-[var(--color-panel-2)]"
          style={{ width: "108px", height: "32px" }}
        />
        {/* Completed tab skeleton pill */}
        <div
          className="animate-pulse rounded-full bg-[var(--color-panel-2)] opacity-60"
          style={{ width: "116px", height: "32px" }}
        />
      </div>
    </div>
  );
}

/**
 * Filter tabs component for employee training modules.
 * Renders an outer capsule container tray enclosing the active terracotta pill
 * and inactive pill with robust inline padding to guarantee pixel-perfect styling
 * across all Tailwind v4 configurations.
 */
export function TrainingFilterTabs({
  activeTab = "pending",
  onChangeTab,
  pendingCount = 0,
  completedCount = 0,
  isLoading = false,
}: TrainingFilterTabsProps): React.ReactElement {
  const t = useTranslations("employee.training");

  if (isLoading) {
    return <TrainingFilterTabsSkeleton />;
  }

  return (
    <div className="pt-1">
      <div
        role="tablist"
        aria-label={t("heading")}
        className="inline-flex items-center rounded-full bg-[var(--color-panel)] border border-[var(--color-line-2)] self-start select-none"
        style={{ padding: "4px", gap: "4px" }}
      >
        {/* Pending Tab */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "pending"}
          onClick={() => onChangeTab("pending")}
          className={`inline-flex items-center justify-center rounded-full font-semibold text-xs sm:text-sm transition-all duration-[var(--dur)] ease-[var(--ease)] cursor-pointer ${
            activeTab === "pending"
              ? "bg-[var(--color-brand-600)] text-white shadow-xs"
              : "bg-transparent text-[var(--color-ink)] hover:text-[var(--color-brand-600)]"
          }`}
          style={{
            paddingLeft: "16px",
            paddingRight: "16px",
            paddingTop: "6px",
            paddingBottom: "6px",
            minHeight: "32px",
            gap: "6px",
          }}
        >
          <span>{t("tabPending")}</span>
          <span aria-hidden="true" className="opacity-80">
            ·
          </span>
          <span className={activeTab === "pending" ? "text-white" : ""}>
            {pendingCount}
          </span>
        </button>

        {/* Completed Tab */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "completed"}
          onClick={() => onChangeTab("completed")}
          className={`inline-flex items-center justify-center rounded-full font-semibold text-xs sm:text-sm transition-all duration-[var(--dur)] ease-[var(--ease)] cursor-pointer ${
            activeTab === "completed"
              ? "bg-[var(--color-brand-600)] text-white shadow-xs"
              : "bg-transparent text-[var(--color-ink)] hover:text-[var(--color-brand-600)]"
          }`}
          style={{
            paddingLeft: "16px",
            paddingRight: "16px",
            paddingTop: "6px",
            paddingBottom: "6px",
            minHeight: "32px",
            gap: "6px",
          }}
        >
          <span>{t("tabCompleted")}</span>
          <span aria-hidden="true" className="opacity-80">
            ·
          </span>
          <span className={activeTab === "completed" ? "text-white" : ""}>
            {completedCount}
          </span>
        </button>
      </div>
    </div>
  );
}
