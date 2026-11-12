"use client";

import * as React from "react";
import type { EmployeeTrainingItem } from "../lib/training-view-types";

interface TrainingStatusBadgeProps {
  status: EmployeeTrainingItem["status"];
  locale?: string;
  className?: string;
}

const STATUS_CONFIG: Record<
  EmployeeTrainingItem["status"],
  {
    en: string;
    es: string;
    bg: string;
    text: string;
    dot: string;
  }
> = {
  not_started: {
    en: "Not started",
    es: "No iniciado",
    bg: "var(--color-wash, #F3F4F6)",
    text: "var(--color-ink-2, #4B5563)",
    dot: "var(--color-ink-3, #9CA3AF)",
  },
  in_progress: {
    en: "In progress",
    es: "En curso",
    bg: "var(--color-brand-tint, rgba(235, 94, 40, 0.1))",
    text: "var(--color-brand-700, #C84617)",
    dot: "var(--color-brand-600, #EB5E28)",
  },
  due_soon: {
    en: "Due soon",
    es: "Vence pronto",
    bg: "var(--warn-tint, #FEF3C7)",
    text: "var(--warn-ink, #92400E)",
    dot: "var(--warn, #D97706)",
  },
  overdue: {
    en: "Overdue",
    es: "Vencido",
    bg: "var(--bad-tint, #FEE2E2)",
    text: "var(--bad, #B91C1C)",
    dot: "var(--bad, #DC2626)",
  },
  complete: {
    en: "Completed",
    es: "Completado",
    bg: "var(--color-ok-tint, #DCFCE7)",
    text: "var(--color-ok, #15803D)",
    dot: "var(--color-ok, #16A34A)",
  },
};

export function TrainingStatusBadge({
  status,
  locale = "en",
  className = "",
}: TrainingStatusBadgeProps): React.ReactElement {
  const isEs = locale === "es";
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.not_started;
  const label = isEs ? config.es : config.en;

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold select-none ${className}`}
      style={{
        backgroundColor: config.bg,
        color: config.text,
        padding: "4px 12px",
        fontSize: "var(--t-xs)",
        lineHeight: "1.2",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
      }}
    >
      <span
        aria-hidden="true"
        className="inline-block rounded-full shrink-0"
        style={{
          width: "6px",
          height: "6px",
          backgroundColor: config.dot,
        }}
      />
      <span>{label}</span>
    </span>
  );
}
