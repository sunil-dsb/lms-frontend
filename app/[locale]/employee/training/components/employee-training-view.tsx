"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import type {
  EmployeeTrainingItem,
  TrainingTabFilter,
} from "../lib/training-view-types";
import { TrainingFilterTabs } from "./training-filter-tabs";
import { TrainingCard } from "./training-card";
import { TrainingEmptyState } from "./training-empty-state";

interface EmployeeTrainingViewProps {
  pendingItems: EmployeeTrainingItem[];
  completedItems: EmployeeTrainingItem[];
  locale: string;
}

/**
 * Main employee training view component.
 * Features a single unified header with a segmented pill toggle tray
 * matching the reference mockup and mobile-first card list.
 */
export function EmployeeTrainingView({
  pendingItems,
  completedItems,
  locale,
}: EmployeeTrainingViewProps): React.ReactElement {
  const t = useTranslations("employee.training");

  // If there are no pending items but there are completed items, default to completed
  const defaultTab: TrainingTabFilter =
    pendingItems.length === 0 && completedItems.length > 0
      ? "completed"
      : "pending";

  const [activeTab, setActiveTab] =
    React.useState<TrainingTabFilter>(defaultTab);

  const currentItems = activeTab === "pending" ? pendingItems : completedItems;

  return (
    <main
      className="mx-auto w-full max-w-doc px-4 pt-6 sm:px-6 sm:pt-8 flex flex-col gap-5"
      style={{ paddingBottom: "140px" }}
    >
      {/* Single unified header block: title, subtitle, and segmented pill toggle */}
      <header className="flex flex-col gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold tracking-tight text-[var(--color-ink)]">
            {t("heading")}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[var(--color-ink-2)]">
            {t("subtitle")}
          </p>
        </div>

        {/* Outer container tray with toggle pill chips */}
        <TrainingFilterTabs
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          pendingCount={pendingItems.length}
          completedCount={completedItems.length}
        />
      </header>

      {/* Content list or empty state */}
      <section aria-label={`${t("heading")} - ${activeTab}`}>
        {currentItems.length > 0 ? (
          <ul className="flex flex-col gap-3 sm:gap-4">
            {currentItems.map((item) => (
              <TrainingCard key={item.id} item={item} locale={locale} />
            ))}
          </ul>
        ) : (
          <TrainingEmptyState
            title={t("emptyHeading")}
            subtitle={t("emptyBody")}
          />
        )}
      </section>
    </main>
  );
}
