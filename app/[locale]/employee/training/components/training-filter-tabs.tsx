"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { CapsuleTabs } from "@/components/ui/capsule-tabs";
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
 * Filter tabs for the employee training list: the shared capsule tray
 * (`CapsuleTabs`) carrying this surface's two views and their counts.
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
      <CapsuleTabs
        ariaLabel={t("heading")}
        value={activeTab}
        onChange={(value) => onChangeTab?.(value as TrainingTabFilter)}
        tabs={[
          { value: "pending", label: t("tabPending"), count: pendingCount },
          {
            value: "completed",
            label: t("tabCompleted"),
            count: completedCount,
          },
        ]}
      />
    </div>
  );
}
