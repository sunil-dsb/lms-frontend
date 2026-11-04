"use client";

import * as React from "react";
import { Popover } from "@/components/ui/popover";
import { RowActions, type RowActionItem } from "@/components/ui/row-actions";
import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/utils";
import { LuCheck, LuPlus, LuSparkles, LuX } from "react-icons/lu";

export interface StationOption {
  id: string;
  name: string;
}

export interface ProcedureRow {
  id: string;
  slug: string;
  titleEn: string;
  titleEs: string;
  status?: string;
  stationIds: string[];
  stations: Array<{ id: string; name: string }>;
  updatedAt: string;
  isPromo?: boolean;
}

/** Relative "Updated … ago" label from an ISO timestamp. */
export function updatedAgoLabel(updatedAt: string, isEs: boolean): string {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(updatedAt).getTime()) / 60000),
  );
  if (minutes < 1) return isEs ? "Actualizado justo ahora" : "Updated just now";
  if (minutes < 60)
    return isEs
      ? `Actualizado hace ${minutes} min`
      : `Updated ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours === 1
      ? isEs
        ? "Actualizado hace 1 h"
        : "Updated 1 hr ago"
      : isEs
        ? `Actualizado hace ${hours} h`
        : `Updated ${hours} hrs ago`;
  }
  const days = Math.floor(hours / 24);
  if (days === 1) return isEs ? "Actualizado hace 1 día" : "Updated 1 day ago";
  if (days < 7)
    return isEs ? `Actualizado hace ${days} días` : `Updated ${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) {
    return weeks === 1
      ? isEs
        ? "Actualizado hace 1 sem"
        : "Updated 1 wk ago"
      : isEs
        ? `Actualizado hace ${weeks} sem`
        : `Updated ${weeks} wks ago`;
  }
  return isEs ? "Actualizado hace más de 1 mes" : "Updated over 1 mo ago";
}

/** One procedure row. General categories show a static "All stations"
 *  label; station-tied rows show the station chip (or the "No station"
 *  pill) which opens the change-station picker — one procedure, one
 *  station, no separate Add affordance. Kebab holds View / Edit /
 *  Change station. */
export function ProcedureListItem({
  procedure,
  stations,
  isEs,
  isGeneral: _isGeneral,
  onToggleStation,
  onOpenProcedure,
  onEditProcedure,
}: {
  procedure: ProcedureRow;
  stations: StationOption[];
  isEs: boolean;
  isGeneral?: boolean;
  onToggleStation: (next: Array<{ id: string; name: string }>) => void;
  onOpenProcedure: () => void;
  onEditProcedure: () => void;
}): React.ReactElement {
  const pickerTriggerRef = React.useRef<HTMLButtonElement>(null);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [draftStationIds, setDraftStationIds] = React.useState<string[]>([]);

  const openPicker = (): void => {
    setDraftStationIds(procedure.stationIds);
    setPickerOpen(true);
  };

  const savePicker = (): void => {
    const targetStations = stations.filter((s) =>
      draftStationIds.includes(s.id),
    );
    setPickerOpen(false);
    onToggleStation(targetStations);
  };

  const canChangeStation = stations.length > 0;
  const assignedStations = procedure.stations;
  const isAllAssigned =
    stations.length > 0 && assignedStations.length === stations.length;

  const rowActions: RowActionItem[] = [
    {
      label: isEs ? "Ver procedimiento" : "View procedure",
      onSelect: onOpenProcedure,
    },
    {
      label: isEs ? "Editar" : "Edit",
      onSelect: onEditProcedure,
    },
    ...(canChangeStation
      ? [
          {
            label: isEs ? "Asignar estaciones" : "Assign stations",
            onSelect: () => openPicker(),
          } as RowActionItem,
        ]
      : []),
  ];

  return (
    <li className="transition-colors hover:bg-[var(--color-wash)]">
      <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-4">
        {/* Left: Procedure Title + Inline Status Pill + Subtitle */}
        <div className="flex items-start justify-between gap-3 min-w-0 flex-1">
          <div
            role="button"
            tabIndex={0}
            onClick={onOpenProcedure}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpenProcedure();
              }
            }}
            className="group/link text-left cursor-pointer min-w-0 flex-1"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-[var(--color-ink)] transition-colors group-hover/link:text-[var(--color-brand-600)]">
                {isEs ? procedure.titleEs : procedure.titleEn}
              </span>
              {procedure.status && (
                <StatusPill
                  tone={
                    procedure.status.toLowerCase() === "published"
                      ? "ok"
                      : "neutral"
                  }
                >
                  {procedure.status.toLowerCase() === "published"
                    ? isEs
                      ? "Publicado"
                      : "Published"
                    : isEs
                      ? "Borrador"
                      : "Draft"}
                </StatusPill>
              )}
              {procedure.isPromo ? (
                <span className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-brand-600)] bg-[var(--color-brand-tint)] px-2 py-0.5 text-xs font-semibold text-[var(--color-brand-700)] shadow-2xs">
                  <LuSparkles className="size-2.5" />
                  {isEs ? "Plato en promoción" : "Promo dish"}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-sm text-[var(--color-ink-2)]">
              {isEs ? procedure.titleEn : procedure.titleEs}
            </p>
          </div>

          <div className="md:hidden shrink-0">
            <RowActions items={rowActions} triggerLabel={procedure.titleEn} />
          </div>
        </div>

        {/* Right: Stations and row actions */}
        <div
          className="flex min-w-0 flex-wrap items-center justify-between gap-3 md:justify-end"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {!canChangeStation ? (
              assignedStations.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  {assignedStations.map((st) => (
                    <span
                      key={st.id}
                      className="inline-flex items-center rounded-lg bg-[var(--color-panel-2)] px-3 py-2 text-xs font-semibold leading-normal text-[var(--color-ink)] border border-[var(--color-line-2)]"
                    >
                      {st.name}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="inline-flex items-center rounded-lg border border-dashed border-[var(--color-line-2)] px-4 py-2 text-xs font-semibold text-[var(--color-ink-3)]">
                  {isEs ? "Sin estación" : "No station"}
                </span>
              )
            ) : isAllAssigned ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-lg border border-[var(--color-line-2)] bg-[var(--color-panel-2)] px-3 py-2 text-xs font-semibold leading-normal text-[var(--color-ink)]">
                  {isEs ? "Todas las estaciones" : "All stations"}
                </span>
                <button
                  ref={pickerTriggerRef}
                  type="button"
                  onClick={() => openPicker()}
                  aria-haspopup="menu"
                  aria-expanded={pickerOpen}
                  aria-label={isEs ? "Cambiar estaciones" : "Change stations"}
                  className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-dashed border-[var(--color-line-2)] px-3 py-2 text-xs font-semibold leading-normal text-[var(--color-ink-3)] transition-colors hover:border-[var(--color-line-hover)] hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                >
                  <span>{isEs ? "Cambiar" : "Change"}</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {assignedStations.length > 0 ? (
                  <>
                    {assignedStations.slice(0, 2).map((st) => (
                      <span
                        key={st.id}
                        className="group/chip inline-flex items-center gap-2 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-panel-2)] px-3 py-2 text-xs font-semibold leading-normal text-[var(--color-ink)]"
                      >
                        <span>{st.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const next = assignedStations.filter(
                              (s) => s.id !== st.id,
                            );
                            onToggleStation(next);
                          }}
                          aria-label={
                            isEs
                              ? `Eliminar estación ${st.name}`
                              : `Remove station ${st.name}`
                          }
                          className="cursor-pointer rounded-full p-0.5 text-[var(--color-ink-3)] transition-colors hover:bg-[var(--color-panel)] hover:text-[var(--color-bad)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                        >
                          <LuX className="text-xs" />
                        </button>
                      </span>
                    ))}
                    {assignedStations.length > 2 && (
                      <button
                        type="button"
                        onClick={() => openPicker()}
                        aria-label={
                          isEs ? "Ver más estaciones" : "See more stations"
                        }
                        className="inline-flex min-w-[38px] items-center justify-center rounded-lg border border-[var(--color-line-2)] bg-[var(--color-panel-2)] px-3 py-2 text-xs font-semibold leading-normal text-[var(--color-ink)] shadow-2xs transition-colors hover:border-[var(--color-line-hover)] hover:bg-[var(--color-panel)]"
                      >
                        +{assignedStations.length - 2}
                      </button>
                    )}
                    <button
                      ref={pickerTriggerRef}
                      type="button"
                      onClick={() => openPicker()}
                      aria-haspopup="menu"
                      aria-expanded={pickerOpen}
                      aria-label={isEs ? "Añadir estaciones" : "Add stations"}
                      className="inline-flex items-center gap-2 rounded-lg border border-dashed border-[var(--color-line-2)] px-3 py-2 text-xs font-semibold leading-normal text-[var(--color-ink-3)] transition-colors hover:border-[var(--color-line-hover)] hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                    >
                      <LuPlus className="text-xs" />
                      <span>{isEs ? "Añadir estación" : "Add station"}</span>
                    </button>
                  </>
                ) : (
                  <button
                    ref={pickerTriggerRef}
                    type="button"
                    onClick={() => openPicker()}
                    aria-haspopup="menu"
                    aria-expanded={pickerOpen}
                    aria-label={isEs ? "Añadir estaciones" : "Add stations"}
                    className="inline-flex items-center gap-2 rounded-lg border border-dashed border-[var(--color-line-2)] px-3 py-2 text-xs font-semibold leading-normal text-[var(--color-ink-3)] transition-colors hover:border-[var(--color-line-hover)] hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                  >
                    <LuPlus className="text-xs" />
                    <span>{isEs ? "Añadir estación" : "Add station"}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden text-xs leading-meta text-[var(--color-ink-3)] xl:inline">
              {updatedAgoLabel(procedure.updatedAt, isEs)}
            </span>

            <div className="hidden md:block">
              <RowActions items={rowActions} triggerLabel={procedure.titleEn} />
            </div>
          </div>
        </div>
      </div>

      {/* Popover Station Picker */}
      {pickerOpen ? (
        <Popover
          triggerRef={pickerTriggerRef}
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          align="end"
          className="w-72 p-2"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-[var(--color-line)] px-2 pb-2 pt-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-3)]">
                {isEs ? "Estaciones" : "Stations"}
              </span>
              <button
                type="button"
                onClick={() =>
                  setDraftStationIds(
                    draftStationIds.length === stations.length
                      ? []
                      : stations.map((s) => s.id),
                  )
                }
                className="text-xs font-semibold text-[var(--color-brand-600)] hover:underline"
              >
                {draftStationIds.length === stations.length
                  ? isEs
                    ? "Deseleccionar todas"
                    : "Clear all"
                  : isEs
                    ? "Todas"
                    : "Select all"}
              </button>
            </div>
            <ul className="max-h-60 space-y-1 overflow-y-auto px-1 py-1">
              {stations.map((s) => {
                const checked = draftStationIds.includes(s.id);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setDraftStationIds((cur) =>
                          cur.includes(s.id)
                            ? cur.filter((id) => id !== s.id)
                            : [...cur, s.id],
                        );
                      }}
                      className={cn(
                        "flex w-full cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-md)] px-2 py-2 text-left transition-colors",
                        "hover:bg-[var(--color-panel)] focus-visible:bg-[var(--color-brand-tint)] focus-visible:outline-none",
                      )}
                    >
                      <span className="text-sm font-medium text-[var(--color-ink)]">
                        {s.name}
                      </span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "inline-flex size-5 items-center justify-center rounded-[var(--radius-sm)] border transition-colors",
                          checked
                            ? "border-[var(--color-brand-600)] bg-[var(--color-brand-600)] text-white"
                            : "border-[var(--color-line-2)] bg-[var(--color-surface)] text-transparent",
                        )}
                      >
                        <LuCheck className="text-xs" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="px-2 text-xs text-[var(--color-ink-3)]">
              {isEs
                ? "Selecciona las estaciones correspondientes y guarda."
                : "Select all applicable stations and save."}
            </p>
            <div className="flex items-center justify-end gap-2 border-t border-[var(--color-line)] px-2 py-2">
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="rounded-[var(--radius-md)] px-3 py-2 text-xs font-semibold text-[var(--color-ink-3)] transition-colors hover:bg-[var(--color-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              >
                {isEs ? "Cancelar" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={savePicker}
                className="rounded-[var(--radius-md)] bg-[var(--color-brand-600)] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              >
                {isEs ? "Guardar" : "Save"}
              </button>
            </div>
          </div>
        </Popover>
      ) : null}
    </li>
  );
}
