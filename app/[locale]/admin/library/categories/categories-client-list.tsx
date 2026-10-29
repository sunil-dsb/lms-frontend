"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { backendSlug } from "@/services/categories/api";
import { useAllSubcategories } from "@/services/categories/hooks";
import { getCategoryIcon } from "@/lib/category-icons";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CategoryActions } from "./category-actions";
import { LuArrowRight, LuFolders } from "react-icons/lu";
import { IconTile } from "@/components/ui/icon-tile";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Categories library — single flat page.
 *
 *   ┌─ General (kind === 'general') ──────┐
 *   │  Onboarding · Food Safety · Cleaning │
 *   └──────────────────────────────────────┘
 *   ┌─ Station-specific (kind === 'station-tied') ─┐
 *   │  Hot Line · Grill · Cold Storage · Sanitation │
 *   └──────────────────────────────────────────────┘
 *   ┌─ Archived (isArchived) ────────────┐
 *   └──────────────────────────────────────┘
 *
 * Both kinds of category are immediately browseable from one scroll —
 * the previous two-panel flow asked the manager to pick a station before
 * any station-tied category would show. Now they live alongside the
 * general ones; the station filter moves to the drilldown where the
 * procedures are actually scoped by station.
 */
export function CategoriesClientList({
  initialCategories,
  locale,
}: {
  initialCategories: Category[];
  locale: string;
}): React.ReactElement {
  // Subcategories in ONE call (GET /api/v1/categories/subcategories),
  // grouped by `categoryId` client-side — never one request per category.
  const { data: allSubcategories = [] } = useAllSubcategories();
  const categories = React.useMemo(() => {
    const byCategory = new Map<string, typeof allSubcategories>();
    for (const sub of allSubcategories) {
      const list = byCategory.get(sub.categoryId) ?? [];
      list.push(sub);
      byCategory.set(sub.categoryId, list);
    }
    return initialCategories.map((category) => ({
      ...category,
      isArchived: category.status === "archived" || category.isArchived,
      subcategories: (byCategory.get(category.id) ?? []).map((subcategory) => ({
        id: subcategory.id,
        categoryId: subcategory.categoryId || category.id,
        slug: backendSlug(subcategory.nameEn),
        nameEn: subcategory.nameEn,
        nameEs: subcategory.nameEs,
        subcategoryIcon: subcategory.subcategoryIcon || undefined,
      })),
    }));
  }, [initialCategories, allSubcategories]);
  const isEs = locale === "es";

  // Procedure counts come straight from the backend (`proceduresCount` on
  // each category row) — no client-side counting over fetched procedures.
  const procedureCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of categories) {
      counts.set(c.id, c.proceduresCount ?? 0);
    }
    return counts;
  }, [categories]);

  const validCategories = categories.filter((c) =>
    Boolean(c && (c.nameEn?.trim() || c.nameEs?.trim())),
  );
  const active = validCategories.filter((c) => !c.isArchived);
  const archived = validCategories.filter((c) => c.isArchived);
  const generalCategories = active.filter((c) => c.kind === "general");
  const stationTiedCategories = active.filter((c) => c.kind === "station-tied");

  return (
    <div className="space-y-6">
      {/* Combined active categories grid */}
      {active.length > 0 ? (
        <section aria-labelledby="categories-heading" className="space-y-3">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((c) => (
              <li key={c.id}>
                <CategoryCard
                  category={c}
                  locale={locale}
                  archivedChipLabel={null}
                  procedureCount={procedureCounts.get(c.id) ?? 0}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* PREVIOUS SPLIT LAYOUT (General vs Station-specific) - Retained as commented code:
      {generalCategories.length > 0 ? (
        <section aria-labelledby="general-heading" className="space-y-3">
          <h2
            id="general-heading"
            className="text-sm font-semibold text-[var(--color-ink-2)]"
          >
            {isEs ? 'General' : 'General'}
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {generalCategories.map((c) => (
              <li key={c.id}>
                <CategoryCard category={c} locale={locale} archivedChipLabel={null} procedureCount={procedureCounts.get(c.id) ?? 0} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {stationTiedCategories.length > 0 ? (
        <section aria-labelledby="station-heading" className="space-y-3">
          <header className="space-y-1">
            <h2
              id="station-heading"
              className="text-sm font-semibold text-[var(--color-ink-2)]"
            >
              {isEs ? 'Por estación' : 'Station-specific'}
            </h2>
            <p className="text-xs text-[var(--color-ink-3)]">
              {isEs
                ? 'Estas categorías aplican a una estación específica.'
                : 'These categories apply to a specific station.'}
            </p>
          </header>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stationTiedCategories.map((c) => (
              <li key={c.id}>
                <CategoryCard category={c} locale={locale} archivedChipLabel={null} procedureCount={procedureCounts.get(c.id) ?? 0} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      */}

      {archived.length > 0 ? (
        <section className="space-y-3 pt-3" aria-labelledby="archived-heading">
          <header className="space-y-1">
            <h2
              id="archived-heading"
              className="text-sm font-semibold text-[var(--color-ink-2)]"
            >
              {isEs ? "Archivadas" : "Archived"}
            </h2>
            <p className="text-xs text-[var(--color-ink-3)]">
              {isEs
                ? "Ocultas de la biblioteca pero siguen asociadas a los procedimientos que las usan."
                : "Hidden from the library but still attached to any procedures that reference them."}
            </p>
          </header>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {archived.map((c) => (
              <li key={c.id}>
                <CategoryCard
                  category={c}
                  locale={locale}
                  archivedChipLabel={isEs ? "Archivada" : "Archived"}
                  procedureCount={procedureCounts.get(c.id) ?? 0}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {active.length === 0 && archived.length === 0 ? (
        <EmptyCategories
          heading={isEs ? "Aún no hay categorías" : "No categories yet"}
        />
      ) : null}
    </div>
  );
}

/** Clickable category card. Visually identical across all sections on the
 *  page — same hover, same chrome, same `CategoryActions` kebab. Clicking
 *  lands on the real category detail page. */
function CategoryCard({
  category,
  locale,
  archivedChipLabel,
  procedureCount,
}: {
  category: Category;
  locale: string;
  archivedChipLabel: string | null;
  procedureCount: number;
}): React.ReactElement {
  const router = useRouter();
  const isEs = locale === "es";
  const primaryName = isEs ? category.nameEs : category.nameEn;

  const handleCardClick = () => {
    router.push(`/${locale}/admin/library/categories/${category.slug}`);
  };

  const subcategories = category.subcategories ?? [];

  return (
    <article
      onClick={handleCardClick}
      className={cn(
        "group flex cursor-pointer flex-col justify-between rounded-[var(--radius-lg)] h-full min-h-[110px]",
        "border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4 shadow-2xs transition-all",
        "hover:border-[var(--color-line-hover)] hover:shadow-e1",
        archivedChipLabel ? "bg-[var(--color-wash)] opacity-75" : undefined,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <IconTile
            size="md"
            icon={getCategoryIcon(category)}
            className="group-hover:text-[var(--color-ink)]"
          />
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="truncate text-sm font-semibold text-[var(--color-ink)]">
              {primaryName}
            </h3>
          </div>
        </div>

        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {archivedChipLabel ? (
            <StatusPill tone="neutral">{archivedChipLabel}</StatusPill>
          ) : null}
          <CategoryActions category={category} />
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 mt-3 border-t border-[var(--color-line)] text-sm leading-meta text-[var(--color-ink-3)]">
        <span>
          {subcategories.length}{" "}
          {isEs
            ? subcategories.length === 1
              ? "subcategoría"
              : "subcategorías"
            : subcategories.length === 1
              ? "subcategory"
              : "subcategories"}
          {" · "}
          {procedureCount}{" "}
          {isEs
            ? procedureCount === 1
              ? "procedimiento"
              : "procedimientos"
            : procedureCount === 1
              ? "procedure"
              : "procedures"}
        </span>
        <LuArrowRight
          aria-hidden="true"
          className="text-[var(--color-ink-3)] transition-transform group-hover:translate-x-0.5"
        />
      </div>
    </article>
  );
}

function EmptyCategories({ heading }: { heading: string }): React.ReactElement {
  return <EmptyState icon={LuFolders} title={heading} />;
}
