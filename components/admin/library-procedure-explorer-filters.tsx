"use client";

import { LuFilter, LuRefreshCw, LuSearch, LuX } from "react-icons/lu";
import { FilterChips } from "@/components/ui/filter-chips";
import { CustomSelect } from "@/components/ui/custom-select";

export function ProcedureExplorerFilters({
  isEs,
  selectedCategorySlug,
  onCategoryChange,
  categoryCounts,
  categorySelectOptions,
  selectedSubcategoryId,
  onSubcategoryChange,
  subcategoryOptions,
  stationOptions,
  stationFilter,
  onStationChange,
  statusFilter,
  onStatusChange,
  statusOptions,
  searchQuery,
  onSearchChange,
  hasActiveFilters,
  filteredCount,
  totalCount,
  onReset,
}: {
  isEs: boolean;
  selectedCategorySlug: string;
  onCategoryChange: (value: string) => void;
  categoryCounts: { all?: number };
  categorySelectOptions: Array<{ value: string; label: string }>;
  selectedSubcategoryId: string;
  onSubcategoryChange: (value: string) => void;
  subcategoryOptions: Array<{ value: string; label: string }>;
  stationOptions: Array<{ value: string; label: string }>;
  stationFilter: string;
  onStationChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  statusOptions: Array<{ value: string; label: string }>;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  hasActiveFilters: boolean;
  filteredCount: number;
  totalCount: number;
  onReset: () => void;
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <FilterChips
          label={isEs ? "Categoría" : "Category"}
          value={selectedCategorySlug}
          onChange={onCategoryChange}
          chips={[
            {
              value: "all",
              label: isEs ? "Todas" : "All",
              count: categoryCounts.all || 0,
            },
          ]}
        />

        <div className="w-field-md shrink-0">
          <CustomSelect
            value={selectedCategorySlug}
            onChange={onCategoryChange}
            options={categorySelectOptions}
            size="sm"
            className="h-tap-admin text-sm"
          />
        </div>
        <div className="w-field-md shrink-0">
          <CustomSelect
            value={selectedSubcategoryId}
            onChange={onSubcategoryChange}
            options={subcategoryOptions}
            size="sm"
            className="h-tap-admin text-sm"
          />
        </div>
        {stationOptions.length > 1 ? (
          <div className="w-field-sm shrink-0">
            <CustomSelect
              value={stationFilter}
              onChange={onStationChange}
              options={stationOptions}
              size="sm"
              className="h-tap-admin text-sm"
            />
          </div>
        ) : null}
        <div className="w-field-sm shrink-0">
          <CustomSelect
            value={statusFilter}
            onChange={onStatusChange}
            options={statusOptions}
            size="sm"
            className="h-tap-admin text-sm"
          />
        </div>

        <div className="find min-w-52 flex-1" role="search">
          <LuSearch aria-hidden="true" className="i" />
          <label className="sr-only" htmlFor="library-search">
            {isEs ? "Buscar en la biblioteca" : "Search the library"}
          </label>
          <input
            id="library-search"
            type="search"
            value={searchQuery}
            placeholder={isEs ? "Buscar procedimientos…" : "Search procedures…"}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label={isEs ? "Borrar búsqueda" : "Clear search"}
              className="shrink-0 text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
            >
              <LuX aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Active Filters Notification Bar */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between rounded-lg bg-[var(--color-panel)] px-4 py-2 text-sm border border-[var(--color-line)]">
          <div className="flex items-center gap-2 text-[var(--color-ink-2)]">
            <LuFilter
              aria-hidden="true"
              className="text-[var(--color-ink-2)]"
            />
            <span>
              {isEs ? "Mostrando" : "Showing"}{" "}
              <strong className="text-[var(--color-ink)]">
                {filteredCount}
              </strong>{" "}
              {isEs ? "de" : "of"}{" "}
              <strong className="text-[var(--color-ink)]">{totalCount}</strong>{" "}
              {isEs ? "procedimientos" : "procedures"}
            </span>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 font-semibold text-[var(--color-brand-700)] hover:underline"
          >
            <LuRefreshCw aria-hidden="true" />
            <span>{isEs ? "Limpiar filtros" : "Reset filters"}</span>
          </button>
        </div>
      )}
    </>
  );
}
