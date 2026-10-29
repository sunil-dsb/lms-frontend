import type { Role, CreateRoleInput, UpdateRoleInput } from "@/lib/types";

export type { Role, CreateRoleInput, UpdateRoleInput };

export interface Job {
  id: string;
  name: string;
  createdAt: string;
  /** Station ids linked to this job (backend `station_ids`). */
  stationIds?: string[];
}

export interface JobWithStations extends Job {
  stations: Array<{ id: string; name: string }>;
}
