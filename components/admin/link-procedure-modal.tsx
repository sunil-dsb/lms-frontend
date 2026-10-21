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

  // Fetch real procedures from the backend library
  const { data: apiData, isLoading } = useProcedures({}, true);

  // Resolve available procedures (live API first, with fallback to props / seeds)
  const allProcedures = React.useMemo(() => {
    if (availableProcedures && availableProcedures.length > 0) {
      return availableProcedures;
    }
    if (apiData?.procedures && apiData.procedures.length > 0) {
      return apiData.procedures;
    }
    return listAvailableSops();
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-[580px] max-h-[85vh] flex flex-col overflow-hidden rounded-[24px] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xl">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-[var(--color-line-2)] flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-bold text-[var(--color-ink)] font-[family-name:var(--font-ui)]">
              {isEs ? "Vincular procedimientos" : "Link procedures"}
            </h3>
            <p className="mt-1 text-xs text-[var(--color-ink-2)]">
              {isEs
                ? "Selecciona hasta 3 procedimientos para vincular a este contenido."
                : "Select up to 3 procedures to link into this content."}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 pt-0.5">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                selectedIds.length === 3
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                  : selectedIds.length > 0
                    ? "bg-[var(--color-brand-50)] text-[var(--color-brand-700)] dark:bg-[var(--color-brand-950)]/50 dark:text-[var(--color-brand-300)] border border-[var(--color-brand-200)] dark:border-[var(--color-brand-800)]"
                    : "bg-[var(--color-wash)] text-[var(--color-ink-2)] border border-[var(--color-line-2)]"
              }`}
            >
              {selectedIds.length}/3{" "}
              {selectedIds.length === 3
                ? isEs
                  ? "máx."
                  : "max"
                : isEs
                  ? "seleccionados"
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

        {/* Search Bar with perfectly aligned icon */}
        <div className="px-6 py-3 border-b border-[var(--color-line-2)] bg-[var(--color-wash)]/30">
          <div className="relative flex items-center w-full">
            <LuSearch
              aria-hidden="true"
              size={16}
              className="absolute pointer-events-none text-[var(--color-ink-3)]"
              style={{ left: "14px" }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isEs ? "Buscar procedimientos..." : "Search procedures..."
              }
              style={{
                paddingLeft: "42px",
                paddingRight: search ? "38px" : "16px",
                height: "40px",
              }}
              className="w-full rounded-full border border-[var(--color-line-2)] bg-[var(--color-surface)] text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-brand-600)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-600)] transition-colors shadow-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 p-1 rounded-full text-[var(--color-ink-3)] hover:text-[var(--color-ink)] hover:bg-[var(--color-wash)] transition-colors cursor-pointer"
              >
                <LuX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Procedures List */}
        <div className="flex-1 overflow-y-auto px-6 pt-3 pb-6 divide-y divide-[var(--color-line-2)] min-h-[220px]">
          {filteredProcedures.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--color-ink-2)]">
              {isEs
                ? "No se encontraron procedimientos."
                : "No procedures found."}
            </div>
          ) : (
            filteredProcedures.map((proc) => {
              const isSelected = selectedIds.includes(proc.id);
              const isMaxReached = selectedIds.length >= 3 && !isSelected;
              const title = isEs
                ? proc.titleEs || proc.titleEn
                : proc.titleEn || proc.titleEs;
              const purpose = isEs
                ? proc.purposeEs || proc.purposeEn
                : proc.purposeEn || proc.purposeEs;

              return (
                <div
                  key={proc.id}
                  onClick={() => !isMaxReached && handleToggle(proc.id)}
                  className={`flex items-start gap-3 py-3 px-2 rounded-xl transition-colors ${
                    isMaxReached
                      ? "opacity-45 cursor-not-allowed"
                      : "cursor-pointer hover:bg-[var(--color-wash)]"
                  } ${isSelected ? "bg-[var(--color-brand-50)]/40 dark:bg-[var(--color-brand-950)]/20" : ""}`}
                >
                  {/* Selection Checkbox */}
                  <div
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                      isSelected
                        ? "border-[var(--color-brand-600)] bg-[var(--color-brand-600)] text-white shadow-xs"
                        : "border-[var(--color-line-3)] bg-[var(--color-surface)]"
                    }`}
                  >
                    {isSelected && (
                      <LuCheck className="w-3.5 h-3.5 stroke-[3]" />
                    )}
                  </div>

                  {/* Procedure Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs sm:text-sm text-[var(--color-ink)] truncate">
                        {title}
                      </span>
                      {proc.slug && (
                        <span className="text-[10px] text-[var(--color-ink-3)] font-mono">
                          /{proc.slug}
                        </span>
                      )}
                    </div>
                    {purpose && (
                      <p className="mt-0.5 text-xs text-[var(--color-ink-2)] line-clamp-1">
                        {purpose}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Procedures Section with comfortable margin & padding */}
        <div className="border-t border-[var(--color-line-2)] bg-[var(--color-wash)]/60 px-6 py-4 space-y-3 shrink-0">
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
            <p className="text-xs text-[var(--color-ink-3)] italic py-1">
              {isEs
                ? "Ninguno seleccionado. Elige hasta 3 arriba."
                : "None selected. Pick up to 3 from the list above."}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1" style={{ gap: "8px" }}>
              {selectedProcedures.map((proc) => {
                const title = isEs
                  ? proc.titleEs || proc.titleEn
                  : proc.titleEn || proc.titleEs;
                return (
                  <span
                    key={proc.id}
                    style={{ gap: "8px" }}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] border border-[var(--color-ring)] shadow-xs animate-in zoom-in-95 duration-150"
                  >
                    <LuBookOpen className="w-3.5 h-3.5 text-[var(--color-brand-700)] shrink-0" />
                    <span className="max-w-[200px] truncate">{title}</span>
                    <button
                      type="button"
                      onClick={(e) => handleRemove(proc.id, e)}
                      title={isEs ? "Eliminar" : "Remove"}
                      style={{ marginLeft: "4px" }}
                      className="p-0.5 rounded-full text-[var(--color-brand-700)] hover:text-[var(--color-brand)] hover:bg-[var(--color-brand)]/10 transition-colors cursor-pointer"
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
        <div className="border-t border-[var(--color-line-2)] px-6 py-4 flex items-center justify-end gap-3 bg-[var(--color-surface)]">
          <Button type="button" variant="ghost" onClick={onClose}>
            {isEs ? "Cancelar" : "Cancel"}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleConfirm}
            disabled={selectedIds.length === 0}
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
