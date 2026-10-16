import * as React from "react";
import Link from "next/link";
import { LuChevronRight } from "react-icons/lu";
import { SectionHead } from "./SectionHead";
import type { TrainingSummary } from "./EmployeeHome";

/**
 * The single, clickable Training progress card.
 * ALL spacing uses inline styles — Tailwind v4 resets --spacing-* so gap-x,
 * mt-x, p-x classes that use non-registered steps produce zero CSS.
 */
export function TrainingCard({
  summary,
  locale = "en",
}: {
  summary: TrainingSummary;
  locale?: string;
}): React.ReactElement {
  const { heading, overdueLine, doneLine, done, total, caughtUp, all } =
    summary;
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  const isEs = locale === "es";

  // Orientation card (no `doneLine`) — heading + chevron only. The full card
  // with ring + progress bar belongs to the regular training-progress view.
  const minimal = !doneLine;

  const cardTitle = isEs ? "Progreso de capacitación" : "Training progress";
  const chaptersText = !minimal
    ? total > 0
      ? isEs
        ? `${done} de ${total} completados`
        : `${done} of ${total} done`
      : caughtUp
    : "";

  // SVG ring — r=19 inside a 46×46 canvas
  const R = 19;
  const CIRC = 2 * Math.PI * R;
  const arcLen = (pct / 100) * CIRC;

  // Minimal (orientation) — no SectionHead, no subline, no progress bar, no
  // ring. Heading becomes the link's primary text, chevron on the right.
  if (minimal) {
    return (
      <Link
        href={all.href}
        aria-labelledby="training-h"
        className="group mt-2 flex items-center rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-xs transition-all duration-200 hover:border-[var(--color-line-2)] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-600)] active:scale-[0.99]"
        style={{ padding: "14px 16px", gap: "12px" }}
      >
        <h3
          id="training-h"
          className="min-w-0 flex-1 text-base font-bold leading-snug text-[var(--color-ink)] tracking-tight"
        >
          {heading}
        </h3>
        <LuChevronRight
          aria-hidden="true"
          className="shrink-0 text-xl text-[var(--color-ink-3)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--color-ink)]"
        />
      </Link>
    );
  }

  return (
    <section aria-labelledby="training-h" style={{ marginTop: "20px" }}>
      <SectionHead id="training-h" title={heading} all={all} />
      <Link
        href={all.href}
        className="group flex items-center rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-xs transition-all duration-200 hover:border-[var(--color-line-2)] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-600)] active:scale-[0.99]"
        style={{
          marginTop: "10px",
          padding: "14px 16px",
          gap: "12px",
        }}
      >
        {/* Left: text + progress bar */}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-[var(--color-ink)] tracking-tight">
            {cardTitle}
          </h3>
          <p
            className="text-xs text-[var(--color-ink-2)]"
            style={{
              marginTop: "2px",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "baseline",
              gap: "4px",
            }}
          >
            <span>{chaptersText}</span>
            {overdueLine ? (
              <span className="font-semibold text-[var(--color-bad)]">
                · {overdueLine}
              </span>
            ) : null}
          </p>

          {/* Horizontal progress bar — height set inline to bypass spacing reset */}
          <div
            className="w-full rounded-full bg-[var(--color-line-2)] overflow-hidden"
            style={{ height: "6px", marginTop: "10px" }}
          >
            <div
              className="h-full rounded-full bg-[var(--color-brand)] transition-all duration-500 ease-out"
              style={{ width: `${pct}%`, minWidth: pct > 0 ? "6px" : "0" }}
            />
          </div>
        </div>

        {/* Right: circular ring + chevron */}
        <div className="flex shrink-0 items-center" style={{ gap: "6px" }}>
          {/* Circular progress ring */}
          <div
            className="relative flex shrink-0 items-center justify-center"
            style={{ width: "46px", height: "46px" }}
          >
            <svg
              width="46"
              height="46"
              viewBox="0 0 46 46"
              className="-rotate-90"
              style={{
                width: "46px",
                height: "46px",
                position: "absolute",
                top: 0,
                left: 0,
              }}
            >
              {/* Track */}
              <circle
                cx="23"
                cy="23"
                r={R}
                fill="none"
                stroke="var(--color-line-2)"
                strokeWidth="3.5"
              />
              {/* Fill arc */}
              <circle
                cx="23"
                cy="23"
                r={R}
                fill="none"
                stroke="var(--color-brand)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray={`${arcLen} ${CIRC}`}
              />
            </svg>
            <span
              className="absolute inset-0 flex items-center justify-center font-bold tracking-tight text-[var(--color-ink)] tabular-nums"
              style={{ fontSize: "11px" }}
            >
              {pct}%
            </span>
          </div>

          <LuChevronRight
            aria-hidden="true"
            className="shrink-0 text-lg text-[var(--color-ink-3)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--color-ink)]"
          />
        </div>
      </Link>
    </section>
  );
}
