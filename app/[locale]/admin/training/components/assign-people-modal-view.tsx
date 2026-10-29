"use client";

import * as React from "react";
import { LuCheck, LuSearch, LuUserPlus, LuX } from "react-icons/lu";
import type { Procedure } from "@/lib/types";
import type { MockEmployee } from "@/lib/mock-training";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface AssignPeopleModalViewProps {
  course: Procedure;
  locale: string;
  filteredPeople: MockEmployee[];
  assignedEmployeeIds: Set<string>;
  selectedPeopleIds: Set<string>;
  togglePerson: (id: string) => void;
  onSelectAllVisible: () => void;
  onClearSelected: () => void;
  peopleSearch: string;
  setPeopleSearch: (search: string) => void;
  stationFilter: string;
  setStationFilter: (station: string) => void;
  availableStations: string[];
  dueAt: string;
  setDueAt: (date: string) => void;
  getPresetDate: (preset: "1week" | "2weeks" | "endOfMonth") => string;
  chapterCount: number;
  hasQuiz: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onClose: () => void;
  onExecuteAssign: () => void;
}

export function AssignPeopleModalView({
  course,
  locale,
  filteredPeople,
  assignedEmployeeIds,
  selectedPeopleIds,
  togglePerson,
  onSelectAllVisible,
  onClearSelected,
  peopleSearch,
  setPeopleSearch,
  stationFilter,
  setStationFilter,
  availableStations,
  dueAt,
  setDueAt,
  getPresetDate,
  chapterCount,
  hasQuiz,
  isSubmitting,
  onBack,
  onClose,
  onExecuteAssign,
}: AssignPeopleModalViewProps): React.ReactElement {
  const isEs = locale === "es";
  const title = (isEs ? course.titleEs : course.titleEn) || course.slug;

  // Filter out any legacy or invalid stations like "Saucier"
  const cleanStations = availableStations.filter(
    (st) => st.toLowerCase() !== "saucier",
  );

  // Unassigned employees in filtered list
  const unassignedInView = filteredPeople.filter(
    (e) => !assignedEmployeeIds.has(e.id),
  );
  const allUnassignedSelected =
    unassignedInView.length > 0 &&
    unassignedInView.every((e) => selectedPeopleIds.has(e.id));

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-[family-name:var(--font-ui)] text-xl font-bold tracking-tight text-[var(--color-ink)] leading-snug">
              {isEs ? `Asignar ${title}` : `Assign ${title}`}
            </h2>
            <p className="text-sm text-[var(--color-ink-2)]">
              {isEs
                ? "Los empleados lo ven en cuanto se asigna. Puedes seguir editándolo después."
                : "Employees see it as soon as you assign it. You can keep editing afterwards."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[var(--color-ink-3)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <LuX className="text-xl" />
          </button>
        </div>

        {/* Polished Search Bar with Perfectly Aligned Icon */}
        <div className="relative flex items-center w-full">
          <LuSearch
            aria-hidden="true"
            size={16}
            className="ml-1 absolute pointer-events-none left-3.5 text-[var(--color-ink-3)]"
          />
          <input
            type="text"
            value={peopleSearch}
            onChange={(e) => setPeopleSearch(e.target.value)}
            placeholder={
              isEs
                ? "Buscar por nombre o estación"
                : "Search by name or station"
            }
            style={{
              paddingLeft: "38px",
              paddingRight: peopleSearch ? "36px" : "14px",
              height: "38px",
            }}
            className="w-full text-xs rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)]/70 text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:outline-none focus:border-[var(--color-brand)] focus:bg-[var(--color-surface)] focus:ring-1 focus:ring-[var(--color-brand)] transition-colors"
          />
          {peopleSearch ? (
            <button
              type="button"
              onClick={() => setPeopleSearch("")}
              aria-label="Clear search"
              style={{ right: "12px" }}
              className="absolute p-1 rounded-full text-[var(--color-ink-3)] hover:text-[var(--color-ink)] hover:bg-[var(--color-panel)] cursor-pointer flex items-center justify-center transition-colors"
            >
              <LuX style={{ width: "15px", height: "15px" }} />
            </button>
          ) : null}
        </div>

        {/* Station Filter Chips + Select All */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
          <div className="flex flex-wrap items-center" style={{ gap: "8px" }}>
            <button
              type="button"
              onClick={() => setStationFilter("all")}
              style={{ padding: "4px 12px" }}
              className={cn(
                "rounded-full text-xs font-medium transition-colors border cursor-pointer",
                stationFilter === "all"
                  ? "border-[var(--color-brand-600)] text-[var(--color-brand-700)] bg-[var(--color-brand-tint)] font-semibold shadow-2xs"
                  : "border-[var(--color-line)] text-[var(--color-ink-2)] bg-[var(--color-surface)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)]",
              )}
            >
              {isEs ? "Todos" : "All"}
            </button>
            {cleanStations.map((st) => {
              const isActive = stationFilter === st;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStationFilter(st)}
                  style={{ padding: "4px 12px" }}
                  className={cn(
                    "rounded-full text-xs font-medium transition-colors border cursor-pointer",
                    isActive
                      ? "border-[var(--color-brand-600)] text-[var(--color-brand-700)] bg-[var(--color-brand-tint)] font-semibold shadow-2xs"
                      : "border-[var(--color-line)] text-[var(--color-ink-2)] bg-[var(--color-surface)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)]",
                  )}
                >
                  {st}
                </button>
              );
            })}
          </div>

          {unassignedInView.length > 0 ? (
            <button
              type="button"
              onClick={onSelectAllVisible}
              className="text-xs font-semibold text-[var(--color-brand-600)] hover:underline cursor-pointer"
            >
              {allUnassignedSelected
                ? isEs
                  ? "Deseleccionar todos"
                  : "Deselect all"
                : isEs
                  ? `Seleccionar todos (${unassignedInView.length})`
                  : `Select all ${unassignedInView.length}`}
            </button>
          ) : null}
        </div>

        {/* Unified Employee List (Both unassigned and already assigned in the same block) */}
        <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] divide-y divide-[var(--color-line)] h-[185px] overflow-y-auto">
          {filteredPeople.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--color-ink-3)]">
              {isEs
                ? "No se encontraron empleados disponibles en esta estación."
                : "No available employees match this station or search."}
            </div>
          ) : (
            filteredPeople.map((emp) => {
              const isAlreadyAssigned = assignedEmployeeIds.has(emp.id);
              const isSelected = selectedPeopleIds.has(emp.id);

              if (isAlreadyAssigned) {
                // Already assigned row in the same block
                return (
                  <div
                    key={emp.id}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 bg-[var(--color-wash)]/40 text-left select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Checkmark indicator with design system token */}
                      <span
                        aria-hidden="true"
                        className="inline-flex size-5 shrink-0 items-center justify-center rounded-md border border-[var(--color-ok-tint-2)] bg-[var(--color-ok-tint)] text-[var(--color-ok)]"
                      >
                        <LuCheck
                          aria-hidden="true"
                          size={13}
                          style={{ strokeWidth: 3 }}
                          className="text-xs shrink-0"
                        />
                      </span>

                      {/* Name & Station */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--color-ink)] leading-snug">
                          {emp.name}
                        </p>
                        <p className="truncate text-xs text-[var(--color-ink-3)] leading-snug mt-0.5">
                          {emp.station}
                        </p>
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-2 shrink-0"
                      style={{ marginRight: "6px" }}
                    >
                      {emp.status === "pending" ? (
                        <span
                          style={{
                            padding: "4px 12px",
                            minWidth: "64px",
                            textAlign: "center",
                          }}
                          className="text-xs font-semibold rounded-full bg-[var(--color-warn-tint)] text-[var(--color-warn-ink)] border border-[var(--color-warn)]/30"
                        >
                          {isEs ? "Pendiente" : "Pending"}
                        </span>
                      ) : null}
                      <span
                        style={{ padding: "4px 10px" }}
                        className="text-xs font-semibold rounded-[var(--radius-sm)] bg-[var(--color-panel)] text-[var(--color-ink-2)] border border-[var(--color-line)]"
                      >
                        {isEs ? "Asignado" : "Assigned"}
                      </span>
                    </div>
                  </div>
                );
              }

              // Unassigned interactive row
              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => togglePerson(emp.id)}
                  style={{ padding: "10px 16px" }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 text-left transition-colors duration-150 cursor-pointer",
                    isSelected
                      ? "bg-[var(--color-brand-tint)]/60"
                      : "hover:bg-[var(--color-wash)]",
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Interactive Checkbox with design system token */}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "inline-flex size-5 shrink-0 items-center justify-center rounded-md border transition-all duration-150",
                        isSelected
                          ? "bg-[var(--color-brand-600)] border-[var(--color-brand-600)] text-[var(--color-white)]"
                          : "border-[var(--color-line-3)] bg-transparent",
                      )}
                    >
                      <LuCheck
                        style={{ strokeWidth: 3 }}
                        className={cn(
                          "text-xs",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </span>

                    {/* Name & Station */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--color-ink)] leading-snug">
                        {emp.name}
                      </p>
                      <p className="truncate text-xs text-[var(--color-ink-2)] leading-snug mt-0.5">
                        {emp.station}
                      </p>
                    </div>
                  </div>

                  {/* Status badge on the right with generous padding */}
                  {emp.status === "pending" ? (
                    <span
                      style={{
                        padding: "4px 12px",
                        marginRight: "6px",
                        minWidth: "64px",
                        textAlign: "center",
                      }}
                      className="shrink-0 text-xs font-semibold rounded-full bg-[var(--color-warn-tint)] text-[var(--color-warn-ink)] border border-[var(--color-warn)]/30"
                    >
                      {isEs ? "Pendiente" : "Pending"}
                    </span>
                  ) : (
                    <span
                      style={{
                        padding: "4px 12px",
                        marginRight: "6px",
                        minWidth: "64px",
                        textAlign: "center",
                      }}
                      className="shrink-0 text-xs font-semibold rounded-full bg-[var(--color-ok-tint)] text-[var(--color-ok-700)] border border-[var(--color-ok)]/30"
                    >
                      {isEs ? "Activo" : "Active"}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Due date + Quick Presets (Always visible at first view without scrolling) */}
        <div
          className="border-t border-[var(--color-line)]"
          style={{ paddingTop: "14px", marginTop: "14px" }}
        >
          <Label
            htmlFor="people-due-at"
            className="text-xs font-semibold text-[var(--color-ink)]"
            style={{ marginBottom: "8px", display: "block" }}
          >
            {isEs ? "Fecha de vencimiento" : "Due date"}
          </Label>

          <div className="flex flex-wrap items-center" style={{ gap: "10px" }}>
            <Input
              id="people-due-at"
              type="date"
              value={dueAt}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDueAt(e.target.value)}
              style={{
                width: "170px",
                height: "36px",
                paddingLeft: "10px",
                paddingRight: "10px",
              }}
              className="text-xs border-[var(--color-line-2)] rounded-[var(--radius-md)] bg-[var(--color-surface)] text-[var(--color-ink)]"
            />

            {/* Quick Presets */}
            <div className="flex items-center flex-wrap" style={{ gap: "8px" }}>
              <button
                type="button"
                onClick={() => setDueAt(getPresetDate("1week"))}
                style={{ padding: "6px 14px" }}
                className="rounded-full text-xs font-medium border border-[var(--color-line-2)] bg-[var(--color-surface)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)] text-[var(--color-ink-2)] transition-colors cursor-pointer"
              >
                {isEs ? "En 1 sem." : "In 1 week"}
              </button>
              <button
                type="button"
                onClick={() => setDueAt(getPresetDate("2weeks"))}
                style={{ padding: "6px 14px" }}
                className="rounded-full text-xs font-medium border border-[var(--color-line-2)] bg-[var(--color-surface)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)] text-[var(--color-ink-2)] transition-colors cursor-pointer"
              >
                {isEs ? "En 2 sem." : "In 2 weeks"}
              </button>
              <button
                type="button"
                onClick={() => setDueAt(getPresetDate("endOfMonth"))}
                style={{ padding: "6px 14px" }}
                className="rounded-full text-xs font-medium border border-[var(--color-line-2)] bg-[var(--color-surface)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)] text-[var(--color-ink-2)] transition-colors cursor-pointer"
              >
                {isEs ? "Fin de mes" : "End of month"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pinned Bottom Bar matching Main view footer (no !dueAt blocker) */}
      <div className="shrink-0 flex items-center justify-between border-t border-[var(--color-line)] bg-[var(--color-wash)]/80 px-6 py-4 rounded-b-[var(--radius-xl)]">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-[var(--color-ink)]">
            {selectedPeopleIds.size} {isEs ? "seleccionados" : "selected"}
          </span>
          {selectedPeopleIds.size > 0 ? (
            <>
              <span className="text-[var(--color-ink-3)]">·</span>
              <button
                type="button"
                onClick={onClearSelected}
                className="text-[var(--color-brand-600)] font-medium hover:underline cursor-pointer"
              >
                {isEs ? "Limpiar" : "Clear"}
              </button>
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-sm text-[var(--color-ink-2)] hover:text-[var(--color-ink)] cursor-pointer px-3"
          >
            {isEs ? "Volver" : "Back"}
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={
              selectedPeopleIds.size === 0 ||
              !dueAt ||
              !dueAt.trim() ||
              isSubmitting
            }
            onClick={onExecuteAssign}
            className="text-sm font-semibold px-5 py-2 rounded-full shadow-xs cursor-pointer"
          >
            <LuUserPlus className="mr-1.5 text-sm" />
            {isSubmitting
              ? isEs
                ? "Asignando..."
                : "Assigning..."
              : isEs
                ? `Asignar ${selectedPeopleIds.size} ${selectedPeopleIds.size === 1 ? "persona" : "personas"}`
                : `Assign ${selectedPeopleIds.size} ${selectedPeopleIds.size === 1 ? "person" : "people"}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
