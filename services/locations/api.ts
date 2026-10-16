import http from "@/lib/http";
import { LOCATIONS_ENDPOINTS } from "./endpoints";
import type {
  Location,
  CreateLocationInput,
  UpdateLocationInput,
} from "./types";

export async function fetchLocations(
  cookieHeader?: string,
): Promise<{ locations: Location[] }> {
  const headers: Record<string, string> = {};

  if (cookieHeader) {
    headers["Cookie"] = cookieHeader;
    const tokenMatch = cookieHeader.match(/(?:^|;\s*)lms_token=([^;]+)/);
    if (tokenMatch) {
      headers["Authorization"] = `Bearer ${decodeURIComponent(tokenMatch[1])}`;
    }
  }

  const { data } = await http.get<{
    success: boolean;
    data: { locations: Location[] };
  }>(LOCATIONS_ENDPOINTS.LIST, {
    headers: Object.keys(headers).length ? headers : undefined,
    // Backend paginates (default 10) — locations fit one page.
    params: { limit: 200 },
  });

  return { locations: data.data?.locations ?? [] };
}

export async function createLocation(
  input: CreateLocationInput,
): Promise<{ location: Location }> {
  const { data } = await http.post<{
    success: boolean;
    data: { location: Location };
  }>(LOCATIONS_ENDPOINTS.CREATE, input);

  return { location: data.data.location };
}

export async function updateLocation(
  locationId: string,
  patch: UpdateLocationInput,
): Promise<{ location: Location }> {
  const { data } = await http.patch<{
    success: boolean;
    data: { location: Location };
  }>(LOCATIONS_ENDPOINTS.UPDATE(locationId), patch);

  return { location: data.data.location };
}

export async function deleteLocation(
  locationId: string,
): Promise<{ ok: true }> {
  await http.delete(LOCATIONS_ENDPOINTS.DELETE(locationId));
  return { ok: true };
}
