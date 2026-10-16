"use client";

/**
 * SeasonChip — the small pill that says which season(s) a recipe belongs to.
 *
 * Renders nothing for an empty list (non-recipes). When both `summer` and
 * `winter` are picked, the chip collapses them into a single "Summer & Winter"
 * label rather than two stacked pills. The tone reuses the brand-tint palette
 * already documented in DESIGN.md §3 so we don't add a new colour.
 *
 * Used by:
 *  - the cook view `DocBar` (right slot, see `procedure-view-client.tsx`)
 *  - the admin facts block (`procedure-article-body.tsx`)
 *  - the procedure row on every list (`procedure-row.tsx`)
 *
 * The component is presentational only — the active-season filter lives in
 * `lib/api.ts:canRead`. Switching active seasons here would change the chip's
 * label, not its visibility.
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import { LuSun } from "react-icons/lu";
import type { ProcedureSeason } from "@/lib/types";

interface SeasonChipProps {
  seasons: ProcedureSeason[] | undefined;
  className?: string;
}

export function SeasonChip({
  seasons,
  className,
}: SeasonChipProps): React.ReactElement | null {
  const t = useTranslations("seasons");
  if (!seasons || seasons.length === 0) return null;

  const label = seasons.length === 2 ? t("both") : t(seasons[0]);

  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-[var(--radius-sm)] " +
        "bg-[var(--color-brand-tint)] px-2 py-0.5 text-xs font-medium " +
        "text-[var(--color-brand-700)] " +
        className
      }
      data-testid="season-chip"
    >
      <LuSun aria-hidden className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
