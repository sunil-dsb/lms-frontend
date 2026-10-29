"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { TrainingProgressSummary } from "@/lib/types";

interface StatCard {
  key: keyof TrainingProgressSummary;
  value: number;
  label: string;
  /** Number colour. Empty = the card's own ink. */
  tone: string;
}

/**
 * The three counts above the table: finished, going, past due. Each number
 * takes the tone of the state it counts — green reads done, red reads act —
 * so the strip answers "how are we doing" before the table is read.
 */
export function ProgressStatStrip({
  summary,
}: {
  summary: TrainingProgressSummary;
}): React.ReactElement {
  const t = useTranslations("admin.training.progress");

  const stats: StatCard[] = [
    {
      key: "completed",
      value: summary.completed,
      label: t("statCompleted"),
      tone: "text-[var(--color-ok)]",
    },
    {
      key: "inProgress",
      value: summary.inProgress,
      label: t("statInProgress"),
      tone: "",
    },
    {
      key: "overdue",
      value: summary.overdue,
      label: t("statOverdue"),
      tone: "text-[var(--color-bad)]",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.key}
          className="rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-5 py-4"
        >
          <p
            className={cn(
              "font-[family-name:var(--font-display)] text-3xl font-bold leading-display tabular-nums text-[var(--color-ink)]",
              stat.tone,
            )}
          >
            {stat.value}
          </p>
          <p className="mt-1 text-sm leading-body text-[var(--color-ink-2)]">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}
