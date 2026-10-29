import * as React from "react";
import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { ChapterIndicator } from "./ChapterIndicator";
import type { OnboardingSummary } from "@/lib/mock-training";

/**
 * The onboarding-required card shown above the locked procedure rows on Home
 * when orientation is not done. Three chapter tiles + progress + a single
 * primary CTA that pushes the cook to the next chapter's first course.
 */
export function OnboardingState({
  summary,
  lockedHref,
  labels,
}: {
  summary: OnboardingSummary;
  locale: string;
  /** Where the CTA routes when there are no chapters left to start (defensive). */
  lockedHref: string;
  labels: {
    eyebrow: string;
    heading: string;
    subtitle: string;
    progressLine: string;
    startAction: string;
    resumeAction: string;
  };
}): React.ReactElement {
  const { chapters, done, total, next } = summary;
  const ctaHref = next ? `/employee/training/${next.courseId}` : lockedHref;
  const ctaLabel = next
    ? done === 0
      ? labels.startAction
      : labels.resumeAction
    : labels.resumeAction;

  return (
    <section aria-labelledby="onboarding-h" style={{ marginTop: "20px" }}>
      <p
        className="text-xs font-semibold uppercase tracking-wide text-[var(--color-brand-700)]"
        style={{ marginBottom: "6px" }}
      >
        {labels.eyebrow}
      </p>
      <h2
        id="onboarding-h"
        className="font-[family-name:var(--font-display)] text-xl font-bold leading-tight tracking-tight text-[var(--color-ink)]"
      >
        {labels.heading}
      </h2>
      <p
        className="text-sm text-[var(--color-ink-2)]"
        style={{ marginTop: "6px" }}
      >
        {labels.subtitle}
      </p>

      <div
        className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]"
        style={{ padding: "16px", marginTop: "14px" }}
      >
        <ChapterIndicator chapters={chapters} />

        <p
          className="text-xs font-semibold text-[var(--color-ink-2)]"
          style={{ marginTop: "14px" }}
        >
          {labels.progressLine
            .replace("{done}", String(done))
            .replace("{total}", String(total))}
        </p>

        {/* One big primary CTA — pill, brand-600 fill, 48px tall. */}
        <div style={{ marginTop: "12px" }}>
          <Link
            href={ctaHref}
            className={buttonClassName({
              variant: "primary",
              size: "lg",
              className: "w-full",
            })}
            style={{ height: "48px" }}
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
      {void chapters.length}
    </section>
  );
}
