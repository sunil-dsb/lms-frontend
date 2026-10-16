"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Category, Subcategory } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";
import { RowActions } from "@/components/ui/row-actions";
import { getSubcategoryIcon } from "@/lib/category-icons";
import { IconTile } from "@/components/ui/icon-tile";
import { cn } from "@/lib/utils";
import {
  LuChevronLeft,
  LuChevronRight,
  LuPlus,
  LuSearch,
  LuX,
} from "react-icons/lu";

const STATIONS: ReadonlyArray<{ id: string; name: string }> = [
  { id: "stn-gm", name: "GM" },
  { id: "stn-grill", name: "Grill" },
  { id: "stn-expo", name: "Expo" },
  { id: "stn-prep", name: "Prep Kitchen" },
  { id: "stn-dish", name: "Dishwasher" },
];

interface ProcedureRow {
  id: string;
  slug: string;
  titleEn: string;
  titleEs: string;
  stationIds: string[];
  updatedAgoEn: string;
  updatedAgoEs: string;
}

const PLATING_PROCEDURES: ReadonlyArray<ProcedureRow> = [
  {
    id: "proc-1",
    slug: "cold-section-plating-sop",
    titleEn: "Cold Section Plating SOP",
    titleEs: "Emplatado - Sección fría",
    stationIds: ["stn-gm"],
    updatedAgoEn: "Updated 2 days ago",
    updatedAgoEs: "Actualizado hace 2 días",
  },
  {
    id: "proc-2",
    slug: "grill-plating-sop",
    titleEn: "Grill Plating SOP",
    titleEs: "Emplatado - Parrilla",
    stationIds: ["stn-grill"],
    updatedAgoEn: "Updated 3 days ago",
    updatedAgoEs: "Actualizado hace 3 días",
  },
  {
    id: "proc-3",
    slug: "expo-plating-sop",
    titleEn: "Expo Plating SOP",
    titleEs: "Emplatado - Expo",
    stationIds: ["stn-expo"],
    updatedAgoEn: "Updated 4 days ago",
    updatedAgoEs: "Actualizado hace 4 días",
  },
  {
    id: "proc-4",
    slug: "prep-kitchen-plating-sop",
    titleEn: "Prep Kitchen Plating SOP",
    titleEs: "Emplatado - Cocina de preparación",
    stationIds: ["stn-prep"],
    updatedAgoEn: "Updated 5 days ago",
    updatedAgoEs: "Actualizado hace 5 días",
  },
  {
    id: "proc-5",
    slug: "shared-plating-sop",
    titleEn: "Shared Plating SOP",
    titleEs: "Emplatado - Procedimiento compartido",
    stationIds: ["stn-grill", "stn-expo"],
    updatedAgoEn: "Updated 1 day ago",
    updatedAgoEs: "Actualizado hace 1 día",
  },
];

function getInitialProcedures(subcategory: Subcategory): ProcedureRow[] {
  const subSlug = subcategory.slug || "";
  const subNameEn = subcategory.nameEn || "General";
  const subNameEs = subcategory.nameEs || subNameEn;

  if (subSlug === "plating") {
    return [...PLATING_PROCEDURES];
  }

  return [
    {
      id: `${subSlug}-1`,
      slug: `${subSlug}-standard-sop`,
      titleEn: `${subNameEn} Standard Operating Procedure`,
      titleEs: `Procedimiento Operativo Estándar - ${subNameEs}`,
      stationIds: ["stn-gm", "stn-grill"],
      updatedAgoEn: "Updated 2 days ago",
      updatedAgoEs: "Actualizado hace 2 días",
    },
    {
      id: `${subSlug}-2`,
      slug: `${subSlug}-shift-prep`,
      titleEn: `${subNameEn} Shift Prep & Checklist`,
      titleEs: `Lista de preparación y verificación - ${subNameEs}`,
      stationIds: ["stn-prep", "stn-gm"],
      updatedAgoEn: "Updated 4 days ago",
      updatedAgoEs: "Actualizado hace 4 días",
    },
    {
      id: `${subSlug}-3`,
      slug: `${subSlug}-quality-check`,
      titleEn: `${subNameEn} Quality & Safety Inspection`,
      titleEs: `Inspección de Calidad y Seguridad - ${subNameEs}`,
      stationIds: ["stn-expo"],
      updatedAgoEn: "Updated 1 week ago",
      updatedAgoEs: "Actualizado hace 1 semana",
    },
    {
      id: `${subSlug}-4`,
      slug: `${subSlug}-station-maintenance`,
      titleEn: `${subNameEn} Station Maintenance & Cleaning`,
      titleEs: `Mantenimiento y Limpieza de Estación - ${subNameEs}`,
      stationIds: ["stn-grill", "stn-expo"],
      updatedAgoEn: "Updated 3 days ago",
      updatedAgoEs: "Actualizado hace 3 días",
    },
  ];
}

interface SubcategoryDetailClientProps {
  category: Category;
  subcategory: Subcategory;
  locale: string;
}

export function SubcategoryDetailClient({
  category,
  subcategory,
  locale,
}: SubcategoryDetailClientProps): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEs = locale === "es";
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortBy, setSortBy] = React.useState("newest");

  const catName = isEs ? category.nameEs : category.nameEn;
  const subName = isEs ? subcategory.nameEs : subcategory.nameEn;
  const subNameSecondary = isEs ? subcategory.nameEn : subcategory.nameEs;

  const [procedures] = React.useState<ReadonlyArray<ProcedureRow>>(() =>
    getInitialProcedures(subcategory),
  );

  // Multi-select: stations passed from the categories page (`?station=stn-gm&station=stn-grill&station=stn-expo`)
  const stationIdsFromUrl = React.useMemo(() => {
    const seen = new Set<string>();
    const known = new Set(STATIONS.map((s) => s.id));
    return searchParams.getAll("station").filter((id) => {
      if (seen.has(id) || !known.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [searchParams]);

  // Display only the stations that were selected on the categories page,
  // or all stations linked to this subcategory if no filter was picked.
  const displayedStations = React.useMemo(() => {
    if (stationIdsFromUrl.length > 0) {
      return STATIONS.filter((s) => stationIdsFromUrl.includes(s.id));
    }
    const set = new Set<string>();
    for (const proc of procedures) {
      for (const id of proc.stationIds) set.add(id);
    }
    return STATIONS.filter((s) => set.has(s.id));
  }, [stationIdsFromUrl, procedures]);

  const filteredProcedures = React.useMemo(() => {
    return procedures.filter((proc) => {
      const matchSearch =
        searchQuery.trim() === "" ||
        proc.titleEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        proc.titleEs.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStation =
        stationIdsFromUrl.length > 0
          ? proc.stationIds.length === 0 ||
            proc.stationIds.some((id) => stationIdsFromUrl.includes(id))
          : true;

      return matchSearch && matchStation;
    });
  }, [procedures, searchQuery, stationIdsFromUrl]);

  const sortedProcedures = React.useMemo(() => {
    const result = [...filteredProcedures];
    if (sortBy === "alphabetical") {
      result.sort((a, b) =>
        (isEs ? a.titleEs : a.titleEn).localeCompare(
          isEs ? b.titleEs : b.titleEn,
        ),
      );
    }
    return result;
  }, [filteredProcedures, sortBy, isEs]);

  const SubIcon = getSubcategoryIcon(subcategory);

  return (
    <div className="mx-auto max-w-page space-y-4 pb-12">
      {/* Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-xs text-[var(--color-ink-3)] font-medium"
      >
        <Link
          href={`/${locale}/admin/library/categories`}
          className="hover:text-[var(--color-ink)] transition-colors"
        >
          {isEs ? "Categorías" : "Categories"}
        </Link>
        <LuChevronRight className="text-[10px] text-[var(--color-ink-3)]" />
        <Link
          href={`/${locale}/admin/library/categories/${category.slug}`}
          className="hover:text-[var(--color-ink)] transition-colors"
        >
          {catName}
        </Link>
        <LuChevronRight className="text-[10px] text-[var(--color-ink-3)]" />
        <span className="text-[var(--color-ink)] font-semibold">{subName}</span>
      </nav>

      {/* Subcategory Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-line)] pb-5">
        <div className="flex min-w-0 items-center gap-3">
          <IconTile size="md" icon={SubIcon} />
          <div className="flex items-baseline gap-2 flex-wrap">
            <h1 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-[var(--color-ink)]">
              {subName}
            </h1>
            {subNameSecondary && subNameSecondary !== subName && (
              <span className="text-sm font-normal text-[var(--color-ink-3)]">
                ({subNameSecondary})
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {displayedStations.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[var(--color-ink-3)]">
                {isEs ? "Estaciones:" : "Stations:"}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {displayedStations.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center rounded-md bg-[var(--color-brand-tint)] px-3 py-1 text-xs font-semibold text-[var(--color-brand-700)]"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Button
            variant="primary"
            onClick={() => {
              const idsToForward =
                stationIdsFromUrl.length > 0
                  ? stationIdsFromUrl
                  : displayedStations.map((s) => s.id);
              const stationQuery =
                idsToForward.length > 0
                  ? `&${idsToForward.map((id) => `station=${encodeURIComponent(id)}`).join("&")}`
                  : "";
              router.push(
                `/${locale}/admin/library/new?category=${category.slug}&subcategory=${subcategory.slug}${stationQuery}`,
              );
            }}
            className="shrink-0 font-semibold shadow-2xs"
          >
            <LuPlus className="text-base" />
            <span>{isEs ? "Añadir procedimiento" : "Add procedure"}</span>
          </Button>
        </div>
      </div>

      {/* Search & Sort Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="find max-w-sm" role="search">
          <LuSearch aria-hidden="true" className="i" />
          <label className="sr-only" htmlFor="subcat-search">
            {isEs ? "Buscar procedimientos" : "Search procedures"}
          </label>
          <input
            id="subcat-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isEs ? "Buscar procedimientos…" : "Search procedures…"}
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label={isEs ? "Borrar búsqueda" : "Clear search"}
              className="shrink-0 text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
            >
              <LuX aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <div className="w-field-md shrink-0">
            <CustomSelect
              value={sortBy}
              onChange={(val) => setSortBy(val)}
              options={[
                {
                  value: "newest",
                  label: isEs ? "Más recientes" : "Sort by newest",
                },
                {
                  value: "alphabetical",
                  label: isEs ? "Alfabético" : "Sort A-Z",
                },
              ]}
              size="sm"
              className="h-tap-admin text-sm"
            />
          </div>
        </div>
      </div>

      {/* Procedures List */}
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xs">
        {sortedProcedures.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <p className="text-xs text-[var(--color-ink-2)]">
              {isEs
                ? "No se encontraron procedimientos en esta subcategoría."
                : "No procedures found in this subcategory."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-line)]">
            {sortedProcedures.map((proc) => (
              <li
                key={proc.id}
                className="transition-colors hover:bg-[var(--color-wash)]"
              >
                <div className="flex items-center justify-between gap-4 px-4 py-3">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      router.push(`/${locale}/admin/library/${proc.slug}`)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/${locale}/admin/library/${proc.slug}`);
                      }
                    }}
                    className="min-w-0 flex-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)] rounded-[var(--radius-sm)]"
                  >
                    <h4 className="truncate text-sm font-semibold text-[var(--color-ink)]">
                      {isEs ? proc.titleEs : proc.titleEn}
                    </h4>
                    <p className="truncate text-sm text-[var(--color-ink-2)]">
                      {isEs ? proc.titleEn : proc.titleEs}
                    </p>
                  </div>

                  <div
                    className="flex shrink-0 items-center gap-3 sm:gap-4 pl-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {proc.stationIds.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        {proc.stationIds.map((stationId) => {
                          const station = STATIONS.find(
                            (s) => s.id === stationId,
                          );
                          if (!station) return null;
                          return (
                            <span
                              key={stationId}
                              className="inline-flex items-center rounded-md bg-[var(--color-panel-2)] px-3 py-1 text-xs font-semibold text-[var(--color-ink)] border border-[var(--color-line-2)] shadow-2xs"
                            >
                              {station.name}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    <span className="hidden text-sm leading-meta text-[var(--color-ink-3)] sm:inline">
                      {isEs ? proc.updatedAgoEs : proc.updatedAgoEn}
                    </span>

                    <RowActions
                      items={[
                        {
                          label: isEs ? "Ver procedimiento" : "View procedure",
                          onSelect: () =>
                            router.push(
                              `/${locale}/admin/library/${proc.slug}`,
                            ),
                        },
                        {
                          label: isEs ? "Editar" : "Edit",
                          onSelect: () =>
                            router.push(
                              `/${locale}/admin/library/${proc.slug}/edit`,
                            ),
                        },
                      ]}
                      triggerLabel={proc.titleEn}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--color-line)] px-4 py-3 text-xs font-medium text-[var(--color-ink-3)]">
          <span>
            {sortedProcedures.length} {isEs ? "procedimientos" : "procedures"}
            {displayedStations.length > 0 && (
              <>
                {" "}
                · {displayedStations.length}{" "}
                {displayedStations.length === 1
                  ? isEs
                    ? "estación seleccionada"
                    : "selected station"
                  : isEs
                    ? "estaciones seleccionadas"
                    : "selected stations"}
              </>
            )}
          </span>
          <div className="flex items-center gap-2">
            <button
              aria-label="Previous page"
              type="button"
              disabled
              className="px-2 py-0.5 rounded border border-[var(--color-line-2)] opacity-40 cursor-not-allowed text-xs"
            >
              <LuChevronLeft aria-hidden="true" />
            </button>
            <span className="px-2 py-0.5 rounded bg-[var(--color-panel)] font-bold text-[var(--color-ink)] text-xs">
              1
            </span>
            <button
              aria-label="Next page"
              type="button"
              disabled
              className="px-2 py-0.5 rounded border border-[var(--color-line-2)] opacity-40 cursor-not-allowed text-xs"
            >
              <LuChevronRight aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
