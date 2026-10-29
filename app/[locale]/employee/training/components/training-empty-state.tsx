import * as React from "react";
import { LuGraduationCap } from "react-icons/lu";

interface TrainingEmptyStateProps {
  title: string;
  subtitle: string;
}

/**
 * Empty state container with dashed border matching Image 1.
 */
export function TrainingEmptyState({
  title,
  subtitle,
}: TrainingEmptyStateProps): React.ReactElement {
  return (
    <div className="rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)]/60 px-6 py-12 sm:py-16 text-center">
      <div
        aria-hidden="true"
        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-panel)] text-2xl text-[var(--color-ink-2)]"
      >
        <LuGraduationCap />
      </div>
      <h3 className="font-[family-name:var(--font-display)] text-lg sm:text-xl font-bold tracking-tight text-[var(--color-ink)]">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-ink-2)] leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
}
