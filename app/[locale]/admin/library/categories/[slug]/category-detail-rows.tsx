'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSubcategoryIcon } from '@/lib/category-icons';
import type { Category, Procedure, Subcategory } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/modal';
import { BilingualInput, type BilingualValue } from '@/components/ui/bilingual-input';
import { IconTile } from '@/components/ui/icon-tile';
import { Popover } from '@/components/ui/popover';
import { RowActions, type RowActionItem } from '@/components/ui/row-actions';
import { cn } from '@/lib/utils';
import { LuCheck, LuChevronDown, LuChevronRight, LuPlus, LuX } from 'react-icons/lu';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/admin/page-header';
import { Label } from '@/components/ui/label';
import { CategoryDetailSkeleton } from '@/components/admin/category-detail-skeleton';
import { fetchProcedures, updateProcedureStation } from '@/services/library/api';
import { PROCEDURES_QUERY_KEY } from '@/services/library/hooks';
import { backendSlug, categorySlugsMatch, createBackendSubcategory, fetchBackendCategories, fetchBackendSubcategories } from '@/services/categories/api';
import { AVAILABLE_ICONS } from '../category-actions';
export interface StationOption {
  id: string;
  name: string;
}

export interface ProcedureRow {
  id: string;
  slug: string;
  titleEn: string;
  titleEs: string;
  stationIds: string[];
  stations: Array<{ id: string; name: string }>;
  updatedAt: string;
}

/** Relative "Updated … ago" label from an ISO timestamp. */
function updatedAgoLabel(updatedAt: string, isEs: boolean): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(updatedAt).getTime()) / 60000));
  if (minutes < 1) return isEs ? 'Actualizado justo ahora' : 'Updated just now';
  if (minutes < 60) return isEs ? `Actualizado hace ${minutes} min` : `Updated ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours === 1
      ? isEs ? 'Actualizado hace 1 h' : 'Updated 1 hr ago'
      : isEs ? `Actualizado hace ${hours} h` : `Updated ${hours} hrs ago`;
  }
  const days = Math.floor(hours / 24);
  if (days === 1) return isEs ? 'Actualizado hace 1 día' : 'Updated 1 day ago';
  if (days < 7) return isEs ? `Actualizado hace ${days} días` : `Updated ${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) {
    return weeks === 1
      ? isEs ? 'Actualizado hace 1 sem' : 'Updated 1 wk ago'
      : isEs ? `Actualizado hace ${weeks} sem` : `Updated ${weeks} wks ago`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    return months === 1
      ? isEs ? 'Actualizado hace 1 mes' : 'Updated 1 mo ago'
      : isEs ? `Actualizado hace ${months} meses` : `Updated ${months} mos ago`;
  }
  return isEs ? 'Actualizado hace más de un año' : 'Updated over a year ago';
}
/** One accordion row. The header is the clickable subcategory row; the
 *  body lists the published procedures with one station chip (or the
 *  "All stations" label for general categories) + the change-station
 *  picker. There is no Add affordance — the chip (or the "No station"
 *  pill) opens the picker and picks the single station. Mirrors the demo
 *  recipes view: aggregated stations strip lives in the header when the
 *  panel is open, per-row chip + picker live inside. */
export function SubcategoryAccordion({
  category,
  subcategory,
  procedures,
  stations,
  isEs,
  isOpen,
  onToggle,
  onToggleStation,
  locale,
}: {
  category: Category;
  subcategory: Subcategory;
  procedures: ProcedureRow[];
  stations: StationOption[];
  isEs: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onToggleStation: (
    procedureId: string,
    next: Array<{ id: string; name: string }>,
  ) => void;
  locale: string;
}): React.ReactElement {
  const router = useRouter();
  const subName = isEs ? subcategory.nameEs : subcategory.nameEn;
  const subNameSecondary = isEs ? subcategory.nameEn : subcategory.nameEs;
  const headerId = `sub-header-${subcategory.id || subcategory.slug}`;
  const panelId = `sub-panel-${subcategory.id || subcategory.slug}`;
  const SubIcon = getSubcategoryIcon(subcategory);

  // General categories apply to every station — the header shows one
  // "All stations" pill instead of per-station chips.
  const isGeneral = category.kind === 'general';
  // Aggregated station list — the unique set of stations the visible
  // procedures resolve to. Drawn in the header when the panel is open.
  const linkedStations = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const proc of procedures) {
      for (const st of proc.stations) {
        if (!map.has(st.id)) {
          map.set(st.id, st.name);
        }
      }
    }
    return [...map].map(([id, name]) => ({ id, name }));
  }, [procedures]);

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xs">
      <div
        id={headerId}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button, a, [role="menuitem"], [role="dialog"]')) {
            return;
          }
          onToggle();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            if ((e.target as HTMLElement).closest('button, a')) return;
            e.preventDefault();
            onToggle();
          }
        }}
        className={cn(
          'flex w-full cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-3 text-left transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)]',
          isOpen ? 'bg-[var(--color-wash)]' : 'hover:bg-[var(--color-wash)]',
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <IconTile size="md" icon={SubIcon} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-semibold text-[var(--color-ink)]">
                {subName}
              </h2>
              <span className="inline-flex items-center rounded-full bg-[var(--color-panel-2)] px-2 py-0.5 text-xs font-medium text-[var(--color-ink-3)]">
                {procedures.length}{' '}
                {procedures.length === 1
                  ? isEs
                    ? 'proc.'
                    : 'proc.'
                  : isEs
                    ? 'procs.'
                    : 'procs.'}
              </span>
            </div>
            <p className="mt-0.5 truncate text-sm leading-meta text-[var(--color-ink-3)]">
              {subNameSecondary}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {isOpen && linkedStations.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="hidden text-xs font-medium text-[var(--color-ink-3)] md:inline">
                {isEs ? 'Estaciones:' : 'Stations:'}
              </span>
              {stations.length > 0 && linkedStations.length === stations.length ? (
                <span className="inline-flex items-center rounded-md bg-[var(--color-brand-tint)] px-3 py-1.5 text-xs font-semibold leading-normal text-[var(--color-brand-700)]">
                  {isEs ? 'Todas las estaciones' : 'All stations'}
                </span>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {linkedStations.slice(0, 3).map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center rounded-lg bg-[var(--color-brand-tint)] px-3 py-2 text-xs font-semibold leading-normal text-[var(--color-brand-700)]"
                    >
                      {s.name}
                    </span>
                  ))}
                  {linkedStations.length > 3 && (
                    <span className="inline-flex min-w-[38px] items-center justify-center rounded-lg border border-[var(--color-line-2)] bg-[var(--color-panel-2)] px-3 py-2 text-xs font-semibold leading-normal text-[var(--color-ink)] shadow-2xs">
                      +{linkedStations.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              // The wizard's Access step asks the manager to attach the
              // station — pre-filling it from this accordion would skip
              // that decision and leak the wrong station to general
              // procedures. Pass only category + subcategory; the wizard
              // applies its own default (general → all stations,
              // station-specific → none) once the manager reaches it.
              router.push(
                `/${locale}/admin/library/new?category=${category.slug}&subcategory=${subcategory.slug}`,
              );
            }}
            className="shrink-0 font-semibold shadow-2xs"
          >
            <LuPlus className="text-base" />
            <span>{isEs ? 'Añadir procedimiento' : 'Add procedure'}</span>
          </Button>

          <LuChevronRight
            aria-hidden="true"
            className={cn(
              'size-4 shrink-0 text-[var(--color-ink-3)] transition-transform',
              isOpen && 'rotate-90',
            )}
          />
        </div>
      </div>

      {isOpen && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          className="border-t border-[var(--color-line-2)] bg-[var(--color-surface)]"
        >
          {procedures.length === 0 ? (
            <div className="p-6">
              <EmptyState
                compact
                title={
                  isEs
                    ? 'Sin procedimientos publicados aún en esta subcategoría.'
                    : 'No published procedures yet in this subcategory.'
                }
              />
            </div>
          ) : (
            <div>
              <ul className="divide-y divide-[var(--color-line)]">
                {procedures.map((proc) => (
                  <ProcedureListItem
                    key={proc.id}
                    procedure={proc}
                    stations={stations}
                    isEs={isEs}
                    isGeneral={isGeneral}
                    onToggleStation={(next) => onToggleStation(proc.id, next)}
                    onOpenProcedure={() =>
                      router.push(`/${locale}/admin/library/${proc.slug}`)
                    }
                    onEditProcedure={() =>
                      router.push(`/${locale}/admin/library/${proc.slug}/edit`)
                    }
                  />
                ))}
              </ul>

              <div className="flex items-center justify-between border-t border-[var(--color-line)] px-4 py-3 text-xs font-medium text-[var(--color-ink-3)]">
                <span>
                  {procedures.length} {isEs ? 'procedimientos' : 'procedures'}
                  {linkedStations.length > 0 ? (
                    <>
                      {' · '}
                      {linkedStations.length}{' '}
                      {linkedStations.length === 1
                        ? isEs
                          ? 'estación enlazada'
                          : 'linked station'
                        : isEs
                          ? 'estaciones enlazadas'
                          : 'linked stations'}
                    </>
                  ) : null}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
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
    const targetStations = stations.filter((s) => draftStationIds.includes(s.id));
    setPickerOpen(false);
    onToggleStation(targetStations);
  };

  const canChangeStation = stations.length > 0;
  const assignedStations = procedure.stations;
  const isAllAssigned = stations.length > 0 && assignedStations.length === stations.length;

  const rowActions: RowActionItem[] = [
    {
      label: isEs ? 'Ver procedimiento' : 'View procedure',
      onSelect: onOpenProcedure,
    },
    {
      label: isEs ? 'Editar' : 'Edit',
      onSelect: onEditProcedure,
    },
    ...(canChangeStation
      ? [
          {
            label: isEs ? 'Asignar estaciones' : 'Assign stations',
            onSelect: () => openPicker(),
          } as RowActionItem,
        ]
      : []),
  ];

  return (
    <li className="transition-colors hover:bg-[var(--color-wash)]">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div
          role="button"
          tabIndex={0}
          onClick={onOpenProcedure}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenProcedure();
            }
          }}
          className="min-w-0 flex-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)] rounded-[var(--radius-sm)]"
        >
          <h4 className="truncate text-sm font-semibold text-[var(--color-ink)]">
            {isEs ? procedure.titleEs : procedure.titleEn}
          </h4>
          <p className="truncate text-sm text-[var(--color-ink-2)]">
            {isEs ? procedure.titleEn : procedure.titleEs}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-4 pl-2" onClick={(e) => e.stopPropagation()}>
          {!canChangeStation ? (
            assignedStations.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                {assignedStations.map((st) => (
                  <span
                    key={st.id}
                    className="inline-flex items-center rounded-md bg-[var(--color-panel-2)] px-3 py-1 text-xs font-semibold text-[var(--color-ink)] border border-[var(--color-line-2)]"
                  >
                    {st.name}
                  </span>
                ))}
              </div>
            ) : (
              <span className="inline-flex items-center rounded-lg border border-dashed border-[var(--color-line-2)] px-3.5 py-2 text-xs font-semibold text-[var(--color-ink-3)]">
                {isEs ? 'Sin estación' : 'No station'}
              </span>
            )
          ) : isAllAssigned ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-[var(--color-brand-tint)] px-3 py-1.5 text-xs font-semibold leading-normal text-[var(--color-brand-700)]">
                {isEs ? 'Todas las estaciones' : 'All stations'}
              </span>
              <button
                ref={pickerTriggerRef}
                type="button"
                onClick={() => openPicker()}
                aria-haspopup="menu"
                aria-expanded={pickerOpen}
                aria-label={isEs ? 'Cambiar estaciones' : 'Change stations'}
                className="inline-flex items-center gap-1 rounded-lg border border-dashed border-[var(--color-line-2)] px-2.5 py-2 text-xs font-semibold leading-normal text-[var(--color-ink-3)] transition-colors hover:border-[var(--color-line-hover)] hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              >
                <span>{isEs ? 'Cambiar' : 'Change'}</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {assignedStations.length > 0 ? (
                <>
                  {assignedStations.slice(0, 2).map((st) => (
                    <span
                      key={st.id}
                      className="group/chip inline-flex items-center gap-2 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-panel-2)] px-3 py-2 text-xs font-semibold leading-normal text-[var(--color-ink)]"
                    >
                      <span className="max-w-[120px] truncate">{st.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = assignedStations.filter((item) => item.id !== st.id);
                          onToggleStation(next);
                        }}
                        aria-label={isEs ? `Eliminar ${st.name}` : `Remove ${st.name}`}
                        className="rounded-sm p-0.5 text-[var(--color-ink-3)] transition-colors hover:bg-[var(--color-panel)] hover:text-[var(--color-ink)] focus-visible:outline-none"
                      >
                        <LuX className="text-[12px]" />
                      </button>
                    </span>
                  ))}
                  {assignedStations.length > 2 && (
                    <button
                      type="button"
                      onClick={() => openPicker()}
                      aria-label={isEs ? 'Ver más estaciones' : 'See more stations'}
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
                    aria-label={isEs ? 'Añadir estaciones' : 'Add stations'}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--color-line-2)] px-3 py-2 text-xs font-semibold leading-normal text-[var(--color-ink-3)] transition-colors hover:border-[var(--color-line-hover)] hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                  >
                    <LuPlus className="text-xs" />
                    <span>{isEs ? 'Añadir estación' : 'Add station'}</span>
                  </button>
                </>
              ) : (
                <button
                  ref={pickerTriggerRef}
                  type="button"
                  onClick={() => openPicker()}
                  aria-haspopup="menu"
                  aria-expanded={pickerOpen}
                  aria-label={isEs ? 'Añadir estaciones' : 'Add stations'}
                  className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-[var(--color-line-2)] px-3 py-1 text-xs font-semibold leading-normal text-[var(--color-ink-3)] transition-colors hover:border-[var(--color-line-hover)] hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                >
                  <LuPlus className="text-xs" />
                  <span>{isEs ? 'Añadir estaciones' : 'Add stations'}</span>
                </button>
              )}
            </div>
          )}

          <span className="hidden text-sm leading-meta text-[var(--color-ink-3)] sm:inline">
            {updatedAgoLabel(procedure.updatedAt, isEs)}
          </span>

          <RowActions
            items={rowActions}
            triggerLabel={procedure.titleEn}
          />
        </div>
      </div>

      {canChangeStation ? (
        <Popover
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          triggerRef={pickerTriggerRef}
          align="end"
          side="bottom"
          width={280}
        >
          <div className="space-y-1.5 p-1">
            <p className="px-2 pt-1 text-xs font-semibold text-[var(--color-ink-3)]">
              {isEs ? 'Asignar estaciones' : 'Assign stations'}
            </p>
            <ul className="max-h-60 overflow-y-auto space-y-0.5">
              {stations.map((s) => {
                const checked = draftStationIds.includes(s.id);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={checked}
                      onClick={() => {
                        setDraftStationIds((cur) =>
                          cur.includes(s.id)
                            ? cur.filter((id) => id !== s.id)
                            : [...cur, s.id],
                        );
                      }}
                      className={cn(
                        'flex w-full cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-md)] px-2 py-1.5 text-left transition-colors',
                        'hover:bg-[var(--color-panel)] focus-visible:bg-[var(--color-brand-tint)] focus-visible:outline-none',
                      )}
                    >
                      <span className="text-sm font-medium text-[var(--color-ink)]">
                        {s.name}
                      </span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          'inline-flex size-5 items-center justify-center rounded-[var(--radius-sm)] border transition-colors',
                          checked
                            ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-600)] text-white'
                            : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-transparent',
                        )}
                      >
                        <LuCheck className="text-[12px]" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="px-2 text-[11px] text-[var(--color-ink-3)]">
              {isEs
                ? 'Selecciona las estaciones correspondientes y guarda.'
                : 'Select all applicable stations and save.'}
            </p>
            <div className="flex items-center justify-end gap-2 border-t border-[var(--color-line)] px-2 py-2">
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="rounded-[var(--radius-md)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-ink-3)] transition-colors hover:bg-[var(--color-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              >
                {isEs ? 'Cancelar' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={savePicker}
                className="rounded-[var(--radius-md)] bg-[var(--color-brand-600)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--color-brand-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              >
                {isEs ? 'Guardar' : 'Save'}
              </button>
            </div>
          </div>
        </Popover>
      ) : null}
    </li>
  );
}
