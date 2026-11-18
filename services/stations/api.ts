import http from "@/lib/http";
import { STATIONS_ENDPOINTS } from "./endpoints";
import { ApiException } from "@/lib/errors";
import type {
  Station,
  CreateStationInput,
  UpdateStationInput,
  StationFilterOptions,
} from "./types";

const inFlightStations = new Map<string, Promise<{ stations: Station[] }>>();

export async function fetchStations(
  opts: StationFilterOptions = {},
  cookieHeader?: string,
): Promise<{ stations: Station[] }> {
  // No result cache — every call hits the API. In-flight coalescing stays
  // browser-only: the module-level Map persists in the server process across
  // requests, so server renders must never share a promise.
  const coalesce = typeof window !== "undefined";
  const cacheKey = `${JSON.stringify(opts)}_${cookieHeader || (coalesce ? "client" : "server_default")}`;

  if (coalesce) {
    const existing = inFlightStations.get(cacheKey);
    if (existing) {
      return existing;
    }
  }

  const stationsPromise = (async () => {
    try {
      const headers: Record<string, string> = {};

      if (cookieHeader) {
        headers["Cookie"] = cookieHeader;
        const tokenMatch = cookieHeader.match(/(?:^|;\s*)lms_token=([^;]+)/);
        if (tokenMatch) {
          headers["Authorization"] =
            `Bearer ${decodeURIComponent(tokenMatch[1])}`;
        }
      }

      const { data } = await http.get<{
        success: boolean;
        data: { stations: Array<{ id: string; name: string }> };
      }>(STATIONS_ENDPOINTS.LIST, {
        headers: Object.keys(headers).length ? headers : undefined,
        // Backend paginates (default 10) — stations per location fit one page.
        params: { limit: 200 },
      });

      const rawStations = data.data?.stations ?? [];
      // Backend rows are `{ id, name }` — map them through untouched.
      const stations: Station[] = rawStations.map((s) => ({
        id: s.id,
        name: s.name,
      }));

      return { stations };
    } finally {
      inFlightStations.delete(cacheKey);
    }
  })();

  if (coalesce) {
    inFlightStations.set(cacheKey, stationsPromise);
  }
  return stationsPromise;
}

export async function createStation(
  input: CreateStationInput,
): Promise<{ station: Station }> {
  // Backend `stationCreateSchema` accepts `{ name }` only — locationId /
  // sortOrder are UI legacy and must not be sent (zod strips them anyway).
  const { data } = await http.post<{
    success: boolean;
    data: { station: { id: string; name: string } };
  }>(STATIONS_ENDPOINTS.CREATE, {
    name: input.name,
  });

  const station: Station = {
    id: data.data.station.id,
    name: data.data.station.name,
  };

  return { station };
}

export async function updateStation(
  stationId: string,
  patch: UpdateStationInput,
): Promise<{ station: Station }> {
  // Backend `stationPatchSchema` accepts `{ name }` only — no archive flag
  // (removal goes through DELETE) and no location/sort fields.
  const payload: { name?: string } = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (Object.keys(payload).length === 0) {
    throw new ApiException(400, "INVALID_INPUT", "Nothing to update");
  }
  const { data } = await http.patch<{
    success: boolean;
    data: { station: { id: string; name: string } };
  }>(STATIONS_ENDPOINTS.UPDATE(stationId), payload);

  const station: Station = {
    id: data.data.station.id,
    name: data.data.station.name,
  };

  return { station };
}

export async function deleteStation(stationId: string): Promise<{ ok: true }> {
  await http.delete(STATIONS_ENDPOINTS.DELETE(stationId));
  return { ok: true };
}
