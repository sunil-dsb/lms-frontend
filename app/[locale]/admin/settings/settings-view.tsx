'use client';

import * as React from 'react';
import { LuPencil } from 'react-icons/lu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Location, Role, Station } from '@/lib/types';
import {
  LocationsManager,
  type LocationsManagerLabels,
  type LocationsManagerState,
} from './locations/locations-manager';
import {
  RolesManager,
  type RolesManagerLabels,
  type RolesManagerState,
} from './roles/roles-manager';
import {
  StationsManager,
  type StationsManagerLabels,
  type StationsManagerState,
} from './stations/stations-manager';

export interface SettingsViewLabels {
  stationsHeading: string;
  rolesHeading: string;
  locationsHeading: string;
  addStation: string;
  addRole: string;
  addLocation: string;
  emptyStations: string;
  emptyRoles: string;
  emptyLocations: string;
  employeesPlaceholder: string;
  drawerClose: string;
  rowActionsLabel: string;
  errorGeneric: string;
  errorNotFound: string;
}

interface SettingsViewProps {
  stations: Station[];
  roles: Role[];
  locations: Location[];
  labels: SettingsViewLabels & StationsManagerLabels & RolesManagerLabels & LocationsManagerLabels;
}

type Chip = { id: string; name: string };

/**
 * Settings page — Stations / Roles / Locations as three side-by-side panels.
 *
 * Each panel is a `SettingsCard`: a heading + total, a vertical stack of
 * full-width entity chips, and a full-width Add button pinned at the bottom.
 * Names render exactly as stored — no title-casing, so user-entered values
 * ("McDonald", "GM") are never mangled at the display layer.
 */
export function SettingsView({
  stations,
  roles,
  locations,
  labels,
}: SettingsViewProps): React.ReactElement {
  const [stationsState, setStationsState] = React.useState<StationsManagerState>({ mode: 'closed' });
  const [rolesState, setRolesState] = React.useState<RolesManagerState>({ mode: 'closed' });
  const [locationsState, setLocationsState] = React.useState<LocationsManagerState>({ mode: 'closed' });

  const stationChips: Chip[] = stations.map((s) => ({
    id: s.id,
    name: s.name,
  }));

  const roleChips: Chip[] = roles.map((r) => ({
    id: r.id,
    name: r.name,
  }));

  const locationChips: Chip[] = locations.map((l) => ({
    id: l.id,
    name: l.name,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <SettingsCard
          heading={labels.stationsHeading}
          total={stationChips.length}
          addLabel={labels.addStation}
          onAdd={() => setStationsState({ mode: 'create' })}
          emptyLabel={labels.emptyStations}
        >
          {stationChips.map((chip) => {
            const s = stations.find((x) => x.id === chip.id) ?? null;
            return (
              <EntityChip
                key={chip.id}
                name={chip.name}
                onEdit={() => {
                  if (s) setStationsState({ mode: 'edit', entity: s });
                }}
                editLabel={labels.stationEdit}
              />
            );
          })}
        </SettingsCard>

        <SettingsCard
          heading={labels.rolesHeading}
          total={roleChips.length}
          addLabel={labels.addRole}
          onAdd={() => setRolesState({ mode: 'create' })}
          emptyLabel={labels.emptyRoles}
        >
          {roleChips.map((chip) => {
            const r = roles.find((x) => x.id === chip.id) ?? null;
            return (
              <EntityChip
                key={chip.id}
                name={chip.name}
                onEdit={() => {
                  if (r) setRolesState({ mode: 'edit', entity: r });
                }}
                editLabel={labels.roleEdit}
              />
            );
          })}
        </SettingsCard>

        <SettingsCard
          heading={labels.locationsHeading}
          total={locationChips.length}
          addLabel={labels.addLocation}
          onAdd={() => setLocationsState({ mode: 'create' })}
          emptyLabel={labels.emptyLocations}
        >
          {locationChips.map((chip) => {
            const l = locations.find((x) => x.id === chip.id) ?? null;
            return (
              <EntityChip
                key={chip.id}
                name={chip.name}
                onEdit={() => {
                  if (l) setLocationsState({ mode: 'edit', entity: l });
                }}
                editLabel={labels.locationEdit}
              />
            );
          })}
        </SettingsCard>
      </div>

      <StationsManager
        state={stationsState}
        onStateChange={setStationsState}
        labels={labels}
      />
      <RolesManager state={rolesState} onStateChange={setRolesState} stations={stations} labels={labels} />
      <LocationsManager state={locationsState} onStateChange={setLocationsState} labels={labels} />
    </div>
  );
}

/**
 * One card-shaped panel on the settings page: a heading with total, a
 * vertical stack of full-width entity chips, and a full-width Add button.
 * Sits on the page ground (DESIGN.md §2.1 `--bg-admin`), card surface is
 * white with a hairline border.
 *
 * The Add button lives below the chips (not beside the heading) so the
 * heading row can never wrap, even in narrow `md:grid-cols-3` columns.
 * Chips are full-width rows so entity names get the maximum available
 * space before truncating.
 */
function SettingsCard({
  heading,
  total,
  addLabel,
  onAdd,
  emptyLabel,
  children,
}: {
  heading: string;
  total: number;
  addLabel: string;
  onAdd: () => void;
  emptyLabel: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <article className="flex flex-col rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-6">
      <header className="mb-1">
        <h2 className="whitespace-nowrap text-base font-semibold leading-heading text-[var(--color-ink)]">
          {heading}
          <span className="ml-2 text-sm font-medium tabular-nums text-[var(--color-ink-3)]">
            · {total}
          </span>
        </h2>
      </header>

      {total === 0 ? (
        <p className="text-sm text-[var(--color-ink-3)] py-2">{emptyLabel}</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2 items-stretch">
          {children}
        </div>
      )}

      <Button variant="secondary" onClick={onAdd} className="mt-4 w-full">
        {addLabel}
      </Button>
    </article>
  );
}

/**
 * A single entity row in a SettingsCard. The whole tile is one button that
 * opens the edit drawer for the entity. Full-width so the name gets maximum
 * room; overflow truncates with a native tooltip carrying the full name.
 */
function EntityChip({
  name,
  onEdit,
  editLabel,
}: {
  name: string;
  onEdit: () => void;
  editLabel: string;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onEdit}
      title={name}
      aria-label={`${editLabel}: ${name}`}
      className={cn(
        'group flex w-full min-w-0 items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-inset',
        'border-[var(--color-line-2)] bg-[var(--color-surface)] hover:bg-[var(--color-panel)]',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-[var(--color-ink)]">{name}</span>
      </span>
      <LuPencil
        aria-hidden="true"
        className="size-3.5 shrink-0 text-[var(--color-ink-3)] group-hover:text-[var(--color-ink-2)]"
      />
    </button>
  );
}