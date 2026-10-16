import * as React from "react";
import Link from "next/link";
import { LuChevronRight } from "react-icons/lu";
import type { TrainingSummary } from "./EmployeeHome";

/**
 * Unified Home card — reference design:
 * ┌────────────────────────────────────────────────────────┐
 * │  [MG]   María González                                 │
 * │         Line Cook · Grill                              │
 * │                                                        │
 * │  Complete your orientation                             │
 * │  training                                            > │
 * │  0 of 3 chapters done                                  │
 * └────────────────────────────────────────────────────────┘
 */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Greeting({
  name,
  roleName,
  stationName,
  trailing,
  training,
  locale = "en",
  isOnboarding = false,
  line,
  greetLine = "Good morning",
}: {
  /** Optional backwards compatibility */
  line?: string;
  name: string;
  roleName?: string | null;
  stationName?: string | null;
  /** Optional right-aligned slot — used for the HomeViewToggle */
  trailing?: React.ReactNode;
  /** Optional training summary to display in the lower portion of the card */
  training?: TrainingSummary | null;
  locale?: string;
  isOnboarding?: boolean;
  greetLine?: string;
}): React.ReactElement {
  const badge = initials(name);
  const subtitle = [roleName, stationName].filter(Boolean).join(" · ");
  const isEs = locale === "es";
  // `line` is the translated time-aware greeting from the caller
  // ("Good morning" / "Good afternoon" / "Good evening"); `greetLine` is the
  // legacy default. Prefer `line` when provided.
  const greetText = line ?? greetLine;

  // SCENARIO A: Onboarding Not Completed
  if (isOnboarding) {
    return (
      <>
        {/* Card 1: Profile */}
        <div
          className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-xs"
          style={{ padding: "14px 16px" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              aria-hidden="true"
              className="shrink-0 rounded-full bg-[var(--color-ink)] text-[var(--color-surface)] font-bold"
              style={{
                width: "42px",
                height: "42px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "15px",
                letterSpacing: "0.02em",
              }}
            >
              {badge}
            </div>

            <div className="min-w-0 flex-1">
              <h2
                className="font-[family-name:var(--font-display)] font-bold text-[var(--color-ink)] leading-snug tracking-tight truncate"
                style={{ fontSize: "17px" }}
              >
                {greetText}
              </h2>
              {subtitle ? (
                <p
                  className="text-[13px] text-[var(--color-ink-2)] truncate"
                  style={{ marginTop: "2px", lineHeight: "1.35" }}
                >
                  {subtitle}
                </p>
              ) : null}
            </div>

            {trailing ? (
              <div className="shrink-0" style={{ marginLeft: "auto" }}>
                {trailing}
              </div>
            ) : null}
          </div>
        </div>

        {/* Training (Orientation) card with thumbnail matching procedure rows */}
        <Link
          href={`/${locale}/employee/training`}
          className="group block rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-xs transition-all duration-200 hover:border-[var(--color-line-2)] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-600)]"
          style={{
            marginTop: "12px",
            padding: "14px 16px",
            textDecoration: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            {/* Orientation thumbnail like in procedures */}
            <div
              className="relative shrink-0 overflow-hidden rounded-lg bg-[var(--color-panel)]"
              style={{ width: "64px", height: "64px", minWidth: "64px" }}
            >
              <img
                src="/img/orientation-cover.jpg"
                alt=""
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                style={{ width: "64px", height: "64px", minWidth: "64px" }}
              />
            </div>

            <div className="min-w-0 flex-1">
              <p
                className="text-xs font-bold uppercase tracking-wider text-[var(--color-brand)]"
                style={{ marginBottom: "4px" }}
              >
                {isEs ? "OBLIGATORIO" : "REQUIRED"}
              </p>
              <h2
                className="font-[family-name:var(--font-display)] font-bold text-[var(--color-ink)] tracking-tight"
                style={{ fontSize: "16px", lineHeight: "1.25" }}
              >
                {isEs ? (
                  <>Termina tu inducción</>
                ) : (
                  <>Complete your orientation training</>
                )}
              </h2>
              <p
                className="text-xs sm:text-sm text-[var(--color-ink-2)]"
                style={{ marginTop: "4px" }}
              >
                {isEs
                  ? `${training?.done ?? 0} de ${training?.total ?? 3} capítulos completados`
                  : `${training?.done ?? 0} of ${training?.total ?? 3} chapters done`}
              </p>
            </div>

            {/* Circular button matching app's brand terracotta color */}
            <div
              aria-hidden="true"
              className="flex shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)] text-white shadow-xs transition-all duration-200 group-hover:scale-105 group-hover:bg-[var(--color-brand-hover)]"
              style={{ width: "38px", height: "38px" }}
            >
              <LuChevronRight className="text-xl" />
            </div>
          </div>
        </Link>
      </>
    );
  }

  // SCENARIO B: Onboarding Completed
  const regularTitle = isEs ? "Progreso de capacitación" : "Training progress";
  const regularSubtitle = isEs
    ? "3 de 5 capítulos completados"
    : "3 of 5 chapters done";
  const pct = 60;

  return (
    <>
      {/* Card 1: Profile */}
      <div
        className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-xs"
        style={{ padding: "14px 16px" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            aria-hidden="true"
            className="shrink-0 rounded-full bg-[var(--color-ink)] text-[var(--color-surface)] font-bold"
            style={{
              width: "42px",
              height: "42px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "15px",
              letterSpacing: "0.02em",
            }}
          >
            {badge}
          </div>

          <div className="min-w-0 flex-1">
            <h2
              className="font-[family-name:var(--font-display)] font-bold text-[var(--color-ink)] leading-snug tracking-tight truncate"
              style={{ fontSize: "17px" }}
            >
              {greetText}
            </h2>
            {subtitle ? (
              <p
                className="text-[13px] text-[var(--color-ink-2)] truncate"
                style={{ marginTop: "2px", lineHeight: "1.35" }}
              >
                {subtitle}
              </p>
            ) : null}
          </div>

          {trailing ? (
            <div className="shrink-0" style={{ marginLeft: "auto" }}>
              {trailing}
            </div>
          ) : null}
        </div>
      </div>

      {/* Card 2: Training Progress Box */}
      <Link
        href={`/${locale}/employee/training`}
        className="group block rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-xs transition-all duration-200 hover:border-[var(--color-line-2)] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-600)]"
        style={{
          marginTop: "10px",
          padding: "14px 16px",
          textDecoration: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          {/* Left: Title + Subtitle + Horizontal progress bar */}
          <div className="min-w-0 flex-1">
            <p
              className="font-bold text-[var(--color-ink)] leading-snug tracking-tight"
              style={{ fontSize: "15px" }}
            >
              {regularTitle}
            </p>
            <p
              className="text-xs text-[var(--color-ink-2)]"
              style={{ marginTop: "2px" }}
            >
              {regularSubtitle}
            </p>
            {/* Horizontal progress bar */}
            <div
              className="w-full rounded-full bg-[var(--color-line-2)] overflow-hidden"
              style={{ height: "5px", marginTop: "10px" }}
            >
              <div
                className="h-full rounded-full bg-[var(--color-brand)]"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Right: Circular 60% ring + chevron */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexShrink: 0,
            }}
          >
            <div
              className="relative flex shrink-0 items-center justify-center rounded-full"
              style={{
                width: "44px",
                height: "44px",
                border: "2.5px solid var(--color-brand)",
                fontSize: "12px",
                fontWeight: "bold",
                color: "var(--color-ink)",
              }}
            >
              {pct}%
            </div>
            <LuChevronRight
              aria-hidden="true"
              className="shrink-0 text-lg text-[var(--color-ink-3)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--color-ink)]"
            />
          </div>
        </div>
      </Link>
    </>
  );
}
