"use client";

import * as React from "react";

interface DueDateBadgeProps {
  dueAt?: string | null;
  locale?: string;
  className?: string;
}

/**
 * Due date badge component matching the reference design:
 * Warm amber/cream rounded pill indicating upcoming or past due dates.
 */
export function DueDateBadge({
  dueAt,
  locale = "en",
  className = "",
}: DueDateBadgeProps): React.ReactElement | null {
  if (!dueAt) return null;

  const isEs = locale === "es";
  const dueDate = new Date(dueAt);
  if (isNaN(dueDate.getTime())) return null;

  const now = new Date();
  const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d2 = new Date(
    dueDate.getFullYear(),
    dueDate.getMonth(),
    dueDate.getDate(),
  );
  const diffDays = Math.round(
    (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24),
  );

  let label: string;
  let isOverdue = false;

  if (diffDays < 0) {
    label = isEs ? "Vencido" : "Overdue";
    isOverdue = true;
  } else if (diffDays === 0) {
    label = isEs ? "Vence hoy" : "Due today";
  } else if (diffDays === 1) {
    label = isEs ? "Vence mañana" : "Due tomorrow";
  } else if (diffDays <= 4) {
    label = isEs ? `Vence en ${diffDays} días` : `Due in ${diffDays} days`;
  } else {
    const formatted = dueDate.toLocaleDateString(isEs ? "es-MX" : "en-US", {
      month: "short",
      day: "numeric",
    });
    label = isEs ? `Vence ${formatted}` : `Due ${formatted}`;
  }

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold select-none ${className}`}
      style={{
        backgroundColor: isOverdue
          ? "var(--bad-tint, #FEE2E2)"
          : "var(--warn-tint, #FEF3C7)",
        color: isOverdue ? "var(--bad, #B91C1C)" : "var(--warn-ink, #92400E)",
        padding: "4px 12px",
        fontSize: "12px",
        lineHeight: "1.2",
      }}
    >
      {label}
    </span>
  );
}
