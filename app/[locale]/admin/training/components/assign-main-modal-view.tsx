"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LuCheck, LuEye, LuTriangleAlert, LuX } from "react-icons/lu";
import type { Procedure } from "@/lib/types";
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
  targetEmployeeCount: number;
  chapterCount: number;
  linkedSopsCount: number;
  hasQuiz: boolean;
  canAssign: boolean;
  isSubmitting: boolean;
  onOpenPeopleView: () => void;
  onClose: () => void;
  onExecuteAssign: () => void;
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
  targetEmployeeCount,
  chapterCount,
  linkedSopsCount,
  hasQuiz,
  canAssign,
  isSubmitting,
  onOpenPeopleView,
  onClose,
  onExecuteAssign,
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
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
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
                color="#16a34a"
                size={18}
                style={{ color: "#16a34a", stroke: "#16a34a", strokeWidth: 3 }}
                className="mr-1 shrink-0"
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
                  color="#16a34a"
                  size={18}
                  style={{
                    color: "#16a34a",
                    stroke: "#16a34a",
                    strokeWidth: 3,
                  }}
                  className="mr-1 shrink-0"
                />
                <span>
                  {isEs
                    ? "Cuestionario de prueba incluido"
                    : "Chapters have a quiz"}
                </span>
              </li>
            ) : (
              <li
                className="flex items-center gap-2.5 text-sm"
                style={{ color: "#92400e" }}
              >
                <LuTriangleAlert
                  aria-hidden="true"
                  color="#d97706"
                  size={18}
                  style={{
                    color: "#d97706",
                    stroke: "#d97706",
                    strokeWidth: 2.2,
                  }}
                  className="mr-1 shrink-0"
                />
                <span>
                  {isEs
                    ? "Este curso no tiene cuestionario. Los empleados pueden completarlo sin prueba."
                    : "Course has no quiz. Employees can finish it without a test."}{" "}
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/${locale}/admin/procedures/${course.id}/edit`,
                      )
                    }
                    className="font-bold underline hover:opacity-80 transition-opacity cursor-pointer ml-1"
                    style={{ color: "#c94327" }}
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

          {/* Station chips when "By station" is active */}
          {scope === "station" ? (
            <div className="space-y-2 pt-2 animate-in fade-in duration-150">
              <div className="flex flex-wrap items-center gap-2">
                {cleanStations.map((st) => {
                  const isSelected = selectedStations.has(st);
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => toggleStation(st)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium transition-colors border cursor-pointer",
                        isSelected
                          ? "border-[var(--color-brand-600)] bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] font-semibold shadow-2xs"
                          : "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)]",
                      )}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-[var(--color-ink-2)]">
                {isEs
                  ? `Se asignará a ${targetEmployeeCount} empleados en las estaciones seleccionadas.`
                  : `${targetEmployeeCount} employees in selected stations will be assigned.`}
              </p>
            </div>
          ) : scope === "everyone" ? (
            <p className="text-xs text-[var(--color-ink-2)] pt-1">
              {isEs
                ? `Se asignará a los ${targetEmployeeCount} empleados activos.`
                : `All ${targetEmployeeCount} active employees will be assigned.`}
            </p>
          ) : null}
        </div>

        {/* Due date picker with standard width */}
        <div className="space-y-2 pt-1">
          <Label
            htmlFor="main-due-at"
            className="text-sm font-semibold text-[var(--color-ink)]"
          >
            {isEs ? "Fecha de vencimiento (opcional)" : "Due date (optional)"}
          </Label>

          <Input
            id="main-due-at"
            type="date"
            value={dueAt}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDueAt(e.target.value)}
            className="h-10 text-sm border-[var(--color-line-2)] rounded-[var(--radius-md)] bg-[var(--color-surface)] w-[200px] px-3"
          />
        </div>
      </div>

      {/* Pinned Footer Actions */}
      <div className="shrink-0 flex items-center justify-between border-t border-[var(--color-line)] bg-[var(--color-wash)]/80 px-6 py-4 rounded-b-[var(--radius-xl)]">
        <Button
          type="button"
          variant="surface"
          size="sm"
          onClick={() =>
            router.push(`/${locale}/employee/training/${course.id}`)
          }
          className="text-xs font-medium bg-[var(--color-surface)] border border-[var(--color-line)] rounded-full px-4 py-2 shadow-2xs hover:bg-[var(--color-wash)] cursor-pointer"
        >
          <LuEye className="mr-1.5 text-sm" />
          {isEs ? "Vista previa" : "Preview as employee"}
        </Button>

        <div className="flex items-center gap-3">
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
            className="text-sm font-semibold px-5 py-2 rounded-full shadow-xs cursor-pointer"
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
