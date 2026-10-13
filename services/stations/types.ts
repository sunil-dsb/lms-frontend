import type { Station, CreateStationInput, UpdateStationInput } from '@/lib/types';

export type { Station, CreateStationInput, UpdateStationInput };

export interface StationFilterOptions {
  // Accepted for backward compatibility only — the backend has no
  // location scoping or archive flag, so these are ignored.
  locationId?: string;
  includeArchived?: boolean;
}
