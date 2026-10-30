"use client";

import * as React from "react";
import { LuBookOpen, LuCheck, LuLoader, LuSearch, LuX } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import type { Procedure } from "@/lib/types";
import { listAvailableSops } from "@/lib/mock-training";
import { useProcedures } from "@/services/library/hooks";

export interface LinkProcedureModalProps {
  open: boolean;
  onClose: () => void;
  initialSelectedIds?: string[];
  onConfirm: (procedureIds: string[]) => void;
  availableProcedures?: Procedure[];
  locale?: string;
}

const EMPTY_IDS: string[] = [];

export function LinkProcedureModal({
  open,
  onClose,
  initialSelectedIds = EMPTY_IDS,
  onConfirm,
  availableProcedures,
  locale = "en",
}: LinkProcedureModalProps): React.ReactElement | null {
  const isEs = locale === "es";

  // Fetch real procedures from the backend library only when modal is open
  const { data: apiData, isLoading } = useProcedures({}, true, open);

  // Resolve available procedures (live API first, with fallback to props)
  const allProcedures = React.useMemo(() => {
    if (availableProcedures && availableProcedures.length > 0) {
      return availableProcedures;
    }
    if (apiData?.procedures && apiData.procedures.length > 0) {
      return apiData.procedures;
    }
    return [];
  }, [availableProcedures, apiData]);

  const [selectedIds, setSelectedIds] =
    React.useState<string[]>(initialSelectedIds);
  const [search, setSearch] = React.useState("");
  const prevOpenRef = React.useRef(false);

  // Sync initialSelectedIds only when modal transitions from closed to open
  React.useEffect(() => {
    if (open && !prevOpenRef.current) {
      setSelectedIds(initialSelectedIds);
      setSearch("");
    }
    prevOpenRef.current = open;
  }, [open, initialSelectedIds]);

  const filteredProcedures = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allProcedures;
    return allProcedures.filter((p) => {
      const title = (
        isEs ? p.titleEs || p.titleEn : p.titleEn || p.titleEs
      ).toLowerCase();
      const purpose = (
        isEs ? p.purposeEs || p.purposeEn : p.purposeEn || p.purposeEs
      ).toLowerCase();
      return title.includes(q) || purpose.includes(q);
    });
  }, [allProcedures, search, isEs]);

  const selectedProcedures = React.useMemo(() => {
    const byId = new Map<string, Procedure>();
    for (const p of allProcedures) {
      byId.set(p.id, p);
      if (p.slug) byId.set(p.slug, p);
    }
    return selectedIds
      .map((id) => byId.get(id))
      .filter((p): p is Procedure => Boolean(p));
  }, [allProcedures, selectedIds]);

  if (!open) return null;

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      if (selectedIds.length >= 3) {
        return; // Max 3 reached
      }
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(selectedIds.filter((item) => item !== id));
  };

  const handleConfirm = () => {
    onConfirm(selectedIds);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative flex h-[min(760px,88dvh)] w-full max-w-[580px] flex-col overflow-hidden rounded-[20px] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xl sm:rounded-[24px]">
        {/* Header */}
        <div className="p-4 sm:p-6 sm:pb-4 border-b border-[var(--color-line-2)] flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg sm:text-xl font-bold text-[var(--color-ink)] font-[family-name:var(--font-ui)]">
              {isEs ? "Vincular procedimientos" : "Link procedures"}
            </h3>
            <p className="mt-0.5 sm:mt-1 text-xs text-[var(--color-ink-2)]">
              {isEs
                ? "Selecciona hasta 3 procedimientos para vincular a este contenido."
                : "Select up to 3 procedures to link into this content."}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0 pt-0.5">
            <span
              className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap min-w-[68px] text-center shrink-0 ${
                selectedIds.length === 3
                  ? "bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300 dark:border-amber-700"
                  : selectedIds.length > 0
                    ? "bg-[var(--color-brand-50)] text-[var(--color-brand-700)] dark:bg-[var(--color-brand-950)]/60 dark:text-[var(--color-brand-300)] border border-[var(--color-brand-200)] dark:border-[var(--color-brand-800)]"
                    : "bg-[var(--color-wash)] text-[var(--color-ink-2)] border border-[var(--color-line-2)]"
              }`}
            >
              {selectedIds.length}/3{" "}
              {selectedIds.length === 3
                ? isEs
                  ? "máx."
                  : "max"
                : isEs
                  ? "sel."
                  : "selected"}
            </span>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-[var(--color-ink-3)] hover:text-[var(--color-ink)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <LuX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="shrink-0 border-b border-[var(--color-line-2)] bg-[var(--color-wash)]/30 px-4 py-3 sm:px-6">
          <div className="relative flex items-center w-full">
            <LuSearch
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-ink-3)]"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isEs ? "Buscar procedimientos..." : "Search procedures..."
              }
              className="h-12 w-full rounded-xl border border-[var(--color-line-2)] bg-[var(--color-surface)] pl-12 pr-10 text-sm text-[var(--color-ink)] shadow-2xs outline-none transition-all placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-brand-600)] focus:ring-1 focus:ring-[var(--color-brand-600)]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--color-ink-3)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)] cursor-pointer"
              >
                <LuX className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Procedures List */}
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3 sm:px-6">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2.5 text-center text-xs text-[var(--color-ink-3)]">
              <LuLoader className="w-6 h-6 animate-spin text-[var(--color-brand-600)]" />
              <span>
                {isEs ? "Cargando procedimientos..." : "Loading procedures..."}
              </span>
            </div>
          ) : filteredProcedures.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--color-ink-2)]">
              {isEs
                ? "No se encontraron procedimientos."
                : "No procedures found."}
            </div>
          ) : (
            filteredProcedures.map((proc) => {
              const isSelected = selectedIds.includes(proc.id);
              const isMaxAndUnselected = selectedIds.length >= 3 && !isSelected;
              const title = isEs
                ? proc.titleEs || proc.titleEn
                : proc.titleEn || proc.titleEs;
              const purpose = isEs
                ? proc.purposeEs || proc.purposeEn
                : proc.purposeEn || proc.purposeEs;

              return (
                <div
                  key={proc.id}
                  onClick={() => !isMaxAndUnselected && handleToggle(proc.id)}
                  role="checkbox"
                  aria-checked={isSelected}
                  aria-disabled={isMaxAndUnselected}
                  tabIndex={isMaxAndUnselected ? -1 : 0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      if (!isMaxAndUnselected) handleToggle(proc.id);
                    }
                  }}
                  className={`group flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] sm:px-4 ${
                    isMaxAndUnselected
                      ? "cursor-not-allowed border-[var(--color-line-2)] opacity-50"
                      : isSelected
                        ? "cursor-pointer border-[var(--color-brand-200)] bg-[var(--color-brand-50)]/70 shadow-2xs dark:border-[var(--color-brand-800)]/60 dark:bg-[var(--color-brand-950)]/40"
                        : "cursor-pointer border-[var(--color-line-2)] bg-[var(--color-surface)] hover:border-[var(--color-line-3)] hover:bg-[var(--color-wash)]"
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {/* Custom Checkbox */}
                    <div
                      aria-hidden="true"
                      className={`flex size-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                        isSelected
                          ? "border-[var(--color-brand-600)] bg-[var(--color-brand-600)] text-white shadow-2xs"
                          : "border-[var(--color-line-3)] bg-[var(--color-surface)] group-hover:border-[var(--color-line-hover)]"
                      }`}
                    >
                      {isSelected && (
                        <LuCheck className="w-3.5 h-3.5 stroke-[3]" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="min-w-0 truncate text-sm font-semibold text-[var(--color-ink)] font-[family-name:var(--font-ui)]">
                          {title}
                        </span>
                        {proc.slug && (
                          <span className="hidden truncate text-[11px] font-mono text-[var(--color-ink-3)] sm:inline">
                            /{proc.slug}
                          </span>
                        )}
                      </div>
                      {purpose && (
                        <p className="mt-0.5 truncate text-xs text-[var(--color-ink-2)]">
                          {purpose}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Procedures Section */}
        <div className="border-t border-[var(--color-line-2)] bg-[var(--color-wash)]/60 px-4 sm:px-6 py-2.5 sm:py-3 shrink-0 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-ink)]">
            <span>
              {isEs ? "Procedimientos seleccionados" : "Selected procedures"} (
              {selectedIds.length}/3):
            </span>
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-[11px] font-medium text-[var(--color-ink-3)] hover:text-red-600 transition-colors cursor-pointer"
              >
                {isEs ? "Limpiar todos" : "Clear all"}
              </button>
            )}
          </div>

          {selectedIds.length === 0 ? (
            <p className="text-xs text-[var(--color-ink-3)] italic py-0.5">
              {isEs
                ? "Ninguno seleccionado. Elige hasta 3 arriba."
                : "None selected. Pick up to 3 from the list above."}
            </p>
          ) : (
            <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
              {selectedProcedures.map((proc) => {
                const title = isEs
                  ? proc.titleEs || proc.titleEn
                  : proc.titleEn || proc.titleEs;
                return (
                  <span
                    key={proc.id}
                    className="inline-flex shrink-0 items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] border border-[var(--color-ring)] shadow-2xs"
                  >
                    <LuBookOpen className="w-3.5 h-3.5 text-[var(--color-brand-700)] shrink-0" />
                    <span className="max-w-[140px] sm:max-w-[180px] truncate">
                      {title}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleRemove(proc.id, e)}
                      title={isEs ? "Eliminar" : "Remove"}
                      className="p-0.5 rounded-full text-[var(--color-brand-700)] hover:text-red-600 hover:bg-black/5 transition-colors cursor-pointer"
                    >
                      <LuX className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="border-t border-[var(--color-line-2)] px-4 sm:px-6 py-3 flex items-center justify-between gap-3 bg-[var(--color-surface)] shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="px-4 text-sm font-medium"
          >
            {isEs ? "Cancelar" : "Cancel"}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleConfirm}
            disabled={selectedIds.length === 0}
            className="px-6 text-sm font-semibold shadow-sm shrink-0"
          >
            {selectedIds.length > 0
              ? isEs
                ? `Vincular (${selectedIds.length})`
                : `Link (${selectedIds.length})`
              : isEs
                ? "Vincular procedimientos"
                : "Link procedures"}
          </Button>
        </div>
      </div>
    </div>
  );
}
