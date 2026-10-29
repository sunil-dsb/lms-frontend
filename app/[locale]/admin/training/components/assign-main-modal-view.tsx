"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LuCheck, LuEye, LuTriangleAlert, LuX } from "react-icons/lu";
import type { Procedure } from "@/lib/types";
import type { MockEmployee } from "@/lib/mock-training";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type AssignScope = "everyone" | "station" | "people";

interface AssignMainModalViewProps {
  course: Procedure;
  locale: string;
  scope: AssignScope;
  setScope: (scope: AssignScope) => void;
  selectedStations: Set<string>;
  toggleStation: (station: string) => void;
  availableStations: string[];
  dueAt: string;
  setDueAt: (dueAt: string) => void;
  getPresetDate?: (preset: "1week" | "2weeks" | "endOfMonth") => string;
  targetEmployeeCount: number;
  selectedPeopleCount?: number;
  chapterCount: number;
  linkedSopsCount: number;
  hasQuiz: boolean;
  canAssign: boolean;
  isSubmitting: boolean;
  onOpenPeopleView: () => void;
  onClose: () => void;
  onExecuteAssign: () => void;
  stationEmployeeCounts?: Record<string, number>;
  stationEmployees?: Record<string, MockEmployee[]>;
  allEmployees?: MockEmployee[];
  onSelectAllStations?: () => void;
  onDeselectAllStations?: () => void;
}

export function AssignMainModalView({
  course,
  locale,
  scope,
  setScope,
  selectedStations,
  toggleStation,
  availableStations,
  dueAt,
  setDueAt,
  getPresetDate,
  targetEmployeeCount,
  selectedPeopleCount = 0,
  chapterCount,
  linkedSopsCount,
  hasQuiz,
  canAssign,
  isSubmitting,
  onOpenPeopleView,
  onClose,
  onExecuteAssign,
  stationEmployeeCounts,
  stationEmployees,
  allEmployees,
  onSelectAllStations,
  onDeselectAllStations,
}: AssignMainModalViewProps): React.ReactElement {
  const router = useRouter();
  const tForm = useTranslations("admin.training.form");
  const isEs = locale === "es";
  const title = (isEs ? course.titleEs : course.titleEn) || course.slug;

  // Filter out any legacy or invalid stations like "Saucier"
  const cleanStations = availableStations.filter(
    (st) => st.toLowerCase() !== "saucier",
  );

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3.5">
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

        {/* Quick check clean list */}
        <div className="space-y-2 pt-1">
          <p className="text-sm font-semibold text-[var(--color-ink)]">
            {isEs ? "Revisión rápida" : "Quick check"}
          </p>

          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2.5 text-[var(--color-ink)]">
              <LuCheck
                aria-hidden="true"
                size={18}
                className="mr-1 shrink-0 text-[var(--color-ok)]"
                style={{ strokeWidth: 3 }}
              />
              <span>
                {chapterCount}{" "}
                {chapterCount === 1
                  ? isEs
                    ? "capítulo"
                    : "chapter"
                  : isEs
                    ? "capítulos"
                    : "chapters"}
                {linkedSopsCount > 0
                  ? `, ${linkedSopsCount} ${
                      isEs ? "SOPs vinculados" : "procedures linked"
                    }`
                  : ""}
              </span>
            </li>

            {hasQuiz ? (
              <li className="flex items-center gap-2.5 text-[var(--color-ink)]">
                <LuCheck
                  aria-hidden="true"
                  size={18}
                  className="mr-1 shrink-0 text-[var(--color-ok)]"
                  style={{ strokeWidth: 3 }}
                />
                <span>
                  {chapterCount === 1
                    ? isEs
                      ? "Cuestionario incluido"
                      : "Quiz included"
                    : isEs
                      ? "Cuestionario de prueba incluido"
                      : "Chapters have a quiz"}
                </span>
              </li>
            ) : (
              <li className="flex items-center gap-2.5 text-sm text-[var(--color-warn-ink)]">
                <LuTriangleAlert
                  aria-hidden="true"
                  size={18}
                  className="mr-1 shrink-0 text-[var(--color-warn)]"
                  style={{ strokeWidth: 2.2 }}
                />
                <span>
                  {isEs
                    ? "Este curso no tiene cuestionario. Los empleados pueden completarlo sin prueba."
                    : "Course has no quiz. Employees can finish it without a test."}{" "}
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/${locale}/admin/training/${course.id}/edit`)
                    }
                    className="font-bold underline hover:opacity-80 transition-opacity cursor-pointer ml-1 text-[var(--color-brand-600)]"
                  >
                    {isEs ? "Agregar quiz" : "Add quiz"}
                  </button>
                </span>
              </li>
            )}
          </ul>
        </div>

        {/* Assign to: Tabs [Everyone] [By station] [People] */}
        <div className="space-y-2.5 pt-1">
          <Label className="text-sm font-semibold text-[var(--color-ink)]">
            {isEs ? "Asignar a" : "Assign to"}
          </Label>

          {/* 3 Pill Tabs */}
          <div className="flex rounded-full bg-[var(--color-wash)] p-1 border border-[var(--color-line)] gap-1">
            <button
              type="button"
              onClick={() => setScope("everyone")}
              className={cn(
                "flex-1 py-2 text-sm font-medium rounded-full transition-all duration-150 text-center cursor-pointer",
                scope === "everyone"
                  ? "bg-[var(--color-brand-600)] text-white shadow-xs font-semibold"
                  : "text-[var(--color-ink-2)] hover:text-[var(--color-ink)]",
              )}
            >
              {isEs ? "Todos" : "Everyone"}
            </button>

            <button
              type="button"
              onClick={() => setScope("station")}
              className={cn(
                "flex-1 py-2 text-sm font-medium rounded-full transition-all duration-150 text-center cursor-pointer",
                scope === "station"
                  ? "bg-[var(--color-brand-600)] text-white shadow-xs font-semibold"
                  : "text-[var(--color-ink-2)] hover:text-[var(--color-ink)]",
              )}
            >
              {isEs ? "Por estación" : "By station"}
            </button>

            <button
              type="button"
              onClick={onOpenPeopleView}
              className={cn(
                "flex-1 py-2 text-sm font-medium rounded-full transition-all duration-150 text-center cursor-pointer",
                scope === "people"
                  ? "bg-[var(--color-brand-600)] text-white shadow-xs font-semibold"
                  : "text-[var(--color-ink-2)] hover:text-[var(--color-ink)]",
              )}
            >
              {isEs ? "Personas" : "People"}
            </button>
          </div>

          {/* Station cards when "By station" is active */}
          {scope === "station" ? (
            <div className="space-y-3 pt-2 animate-in fade-in duration-150">
              {/* Header with Quick Action */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-2)]">
                  {isEs ? "Estaciones disponibles" : "Available stations"}
                </span>

                {cleanStations.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      const allSelected = cleanStations.every((st) =>
                        selectedStations.has(st),
                      );
                      if (allSelected) {
                        onDeselectAllStations?.();
                      } else {
                        onSelectAllStations?.();
                      }
                    }}
                    className="text-xs font-semibold text-[var(--color-brand-600)] hover:underline cursor-pointer"
                  >
                    {cleanStations.every((st) => selectedStations.has(st))
                      ? isEs
                        ? "Deseleccionar todas"
                        : "Deselect all"
                      : isEs
                        ? `Seleccionar todas (${cleanStations.length})`
                        : `Select all (${cleanStations.length})`}
                  </button>
                ) : null}
              </div>

              {/* Station Cards Grid */}
              <div
                className="grid grid-cols-1 sm:grid-cols-2 max-h-[200px] overflow-y-auto p-1"
                style={{ gap: "10px" }}
              >
                {cleanStations.map((st) => {
                  const isSelected = selectedStations.has(st);
                  const assignableCount = stationEmployeeCounts?.[st] ?? 0;
                  const displayName = st.charAt(0).toUpperCase() + st.slice(1);

                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => toggleStation(st)}
                      style={{ padding: "8px 12px" }}
                      className={cn(
                        "flex items-center justify-between rounded-[var(--radius-lg)] border text-left transition-all duration-150 cursor-pointer group",
                        isSelected
                          ? "border-[var(--color-brand-600)] bg-[var(--color-brand-tint)]/40 shadow-2xs ring-1 ring-[var(--color-brand-600)]/20"
                          : "border-[var(--color-line)] bg-[var(--color-surface)] hover:border-[var(--color-line-3)] hover:bg-[var(--color-wash)]/60",
                      )}
                    >
                      <div
                        className="flex items-center gap-2.5 min-w-0"
                        style={{ gap: "10px" }}
                      >
                        {/* Checkbox icon */}
                        <div
                          className={cn(
                            "size-5 rounded-md flex items-center justify-center shrink-0 border transition-all duration-150",
                            isSelected
                              ? "bg-[var(--color-brand-600)] border-[var(--color-brand-600)] text-white"
                              : "border-[var(--color-line-3)] bg-[var(--color-surface)] group-hover:border-[var(--color-ink-3)]",
                          )}
                        >
                          <LuCheck
                            className={cn(
                              "text-xs transition-opacity",
                              isSelected ? "opacity-100" : "opacity-0",
                            )}
                            style={{ strokeWidth: 3 }}
                          />
                        </div>

                        {/* Station Name */}
                        <p className="text-sm font-semibold text-[var(--color-ink)] truncate leading-snug">
                          {displayName}
                        </p>
                      </div>

                      {/* Clean count badge */}
                      <span
                        style={{ padding: "3px 8px" }}
                        className={cn(
                          "mr-1 text-xs font-semibold rounded-full shrink-0 border transition-colors",
                          isSelected
                            ? "bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] border-[var(--color-brand-600)]/30 font-bold"
                            : "bg-[var(--color-wash)] text-[var(--color-ink-2)] border-[var(--color-line)]",
                        )}
                      >
                        {assignableCount}{" "}
                        {assignableCount === 1
                          ? isEs
                            ? "emp."
                            : "emp"
                          : isEs
                            ? "emps."
                            : "emps"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : scope === "everyone" ? (
            <div className="mt-2 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-wash)]/40 p-4 flex items-center justify-between gap-4 animate-in fade-in duration-150">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  {isEs
                    ? "Asignar a todos los empleados"
                    : "Assign to all employees"}
                </p>
                <p className="text-xs text-[var(--color-ink-2)]">
                  {isEs
                    ? `Todos los empleados activos y pendientes recibirán este curso (${
                        allEmployees?.filter((e) => e.status === "active")
                          .length || 0
                      } activos, ${
                        allEmployees?.filter((e) => e.status === "pending")
                          .length || 0
                      } pendientes).`
                    : `All active and pending employees will receive this course (${
                        allEmployees?.filter((e) => e.status === "active")
                          .length || 0
                      } active, ${
                        allEmployees?.filter((e) => e.status === "pending")
                          .length || 0
                      } pending).`}
                </p>
              </div>
              <span
                style={{ padding: "6px 14px" }}
                className="text-sm font-bold text-[var(--color-brand-700)] bg-[var(--color-brand-tint)] rounded-full border border-[var(--color-brand-600)]/20 shrink-0"
              >
                {targetEmployeeCount} {isEs ? "empleados" : "employees"}
              </span>
            </div>
          ) : scope === "people" ? (
            <div className="mt-2 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-wash)]/40 p-4 flex items-center justify-between gap-4 animate-in fade-in duration-150">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  {isEs ? "Asignación individual" : "Assign to specific people"}
                </p>
                <p className="text-xs text-[var(--color-ink-2)]">
                  {selectedPeopleCount && selectedPeopleCount > 0
                    ? isEs
                      ? `${selectedPeopleCount} ${selectedPeopleCount === 1 ? "persona seleccionada" : "personas seleccionadas"}.`
                      : `${selectedPeopleCount} ${selectedPeopleCount === 1 ? "person" : "people"} selected.`
                    : isEs
                      ? "Selecciona empleados específicos para este curso."
                      : "Select specific employees to assign this course."}
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenPeopleView}
                style={{ padding: "6px 14px" }}
                className="text-xs font-semibold rounded-full border border-[var(--color-brand-600)] text-[var(--color-brand-700)] bg-[var(--color-brand-tint)] hover:bg-[var(--color-brand-tint-2)] cursor-pointer transition-colors shrink-0"
              >
                {selectedPeopleCount && selectedPeopleCount > 0
                  ? isEs
                    ? "Editar selección"
                    : "Edit selection"
                  : isEs
                    ? "Seleccionar personas"
                    : "Select people"}
              </button>
            </div>
          ) : null}
        </div>

        {/* Due date picker with standard width and quick presets */}
        <div
          className="border-t border-[var(--color-line)]"
          style={{ paddingTop: "14px", marginTop: "14px" }}
        >
          <Label
            htmlFor="main-due-at"
            className="text-xs font-semibold text-[var(--color-ink)]"
            style={{ marginBottom: "8px", display: "block" }}
          >
            {isEs ? "Fecha de vencimiento" : "Due date"}
          </Label>

          <div className="flex flex-wrap items-center" style={{ gap: "10px" }}>
            <Input
              id="main-due-at"
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

            {getPresetDate ? (
              <div
                className="flex items-center flex-wrap"
                style={{ gap: "8px" }}
              >
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
            ) : null}
          </div>
        </div>
      </div>

      {/* Pinned Footer Actions */}
      <div className="shrink-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-[var(--color-line)] bg-[var(--color-wash)]/80 px-4 sm:px-6 py-3 sm:py-4 rounded-b-[var(--radius-xl)]">
        <Button
          type="button"
          variant="surface"
          size="sm"
          onClick={() =>
            router.push(`/${locale}/employee/training/${course.id}`)
          }
          className="text-xs font-medium bg-[var(--color-surface)] border border-[var(--color-line)] rounded-full px-4 py-2 shadow-2xs hover:bg-[var(--color-wash)] cursor-pointer justify-center"
        >
          <LuEye className="mr-1.5 text-sm" />
          {isEs ? "Vista previa" : "Preview as employee"}
        </Button>

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-sm text-[var(--color-ink-2)] hover:text-[var(--color-ink)] cursor-pointer px-3"
          >
            {tForm("cancel")}
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={!canAssign}
            onClick={onExecuteAssign}
            className="text-sm font-semibold px-5 py-2 rounded-full shadow-xs cursor-pointer flex-1 sm:flex-none justify-center"
          >
            {isSubmitting
              ? isEs
                ? "Asignando..."
                : "Assigning..."
              : isEs
                ? "Asignar curso"
                : "Assign course"}
          </Button>
        </div>
      </div>
    </div>
  );
}
