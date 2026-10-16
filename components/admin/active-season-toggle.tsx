"use client";

/**
 * ActiveSeasonToggle — the smallest possible control.
 *
 * Two pill buttons. Summer / Winter. No panel, no copy, no third state.
 * Lives on the admin home header so the manager always sees what's
 * currently running; the actual filtering happens on the procedures
 * page, where the admin can choose to apply it.
 *
 * Cross-tab sync rides on the `lms_active_season_updated` event.
 */

import * as React from "react";
import { getActiveSeason, setActiveSeason } from "@/lib/api";
import type { ActiveSeason, ProcedureSeason } from "@/lib/types";

export function ActiveSeasonToggle(): React.ReactElement {
  const [active, setActive] = React.useState<ProcedureSeason | null>(null);
  React.useEffect(() => {
    setActive(getActiveSeason());
    const onRefresh = () => setActive(getActiveSeason());
    if (typeof window !== "undefined") {
      window.addEventListener("lms_active_season_updated", onRefresh);
      window.addEventListener("storage", onRefresh);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("lms_active_season_updated", onRefresh);
        window.removeEventListener("storage", onRefresh);
      }
    };
  }, []);

  const pick = (next: ProcedureSeason): void => {
    const value: ActiveSeason = active === next ? null : next;
    setActiveSeason(value);
    setActive(value);
  };

  return (
    <div
      role="group"
      aria-label="Active season"
      className="inline-flex items-center rounded-full border border-[var(--color-line-2)] bg-[var(--color-surface)] p-0.5 shadow-e1"
    >
      <button
        type="button"
        aria-pressed={active === "summer"}
        onClick={() => pick("summer")}
        className={`inline-flex min-h-tap-admin items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors duration-[var(--dur)] ease-[var(--ease)] ${
          active === "summer"
            ? "bg-[var(--color-brand-600)] text-white shadow-e1"
            : "text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
        }`}
      >
        <SeasonDot season="summer" on={active === "summer"} />
        Summer
      </button>
      <button
        type="button"
        aria-pressed={active === "winter"}
        onClick={() => pick("winter")}
        className={`inline-flex min-h-tap-admin items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors duration-[var(--dur)] ease-[var(--ease)] ${
          active === "winter"
            ? "bg-[var(--color-brand-600)] text-white shadow-e1"
            : "text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
        }`}
      >
        <SeasonDot season="winter" on={active === "winter"} />
        Winter
      </button>
    </div>
  );
}

function SeasonDot({
  season,
  on,
}: {
  season: ProcedureSeason;
  on: boolean;
}): React.ReactElement {
  const colour =
    season === "summer"
      ? on
        ? "bg-white/90"
        : "bg-[var(--color-warn)]"
      : on
        ? "bg-white/90"
        : "bg-[var(--color-info)]";
  return (
    <span
      aria-hidden="true"
      className={`size-2 shrink-0 rounded-full ${colour}`}
    />
  );
}
