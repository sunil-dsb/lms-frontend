export const STATIONS_ENDPOINTS = {
  LIST: "/api/v1/stations",
  CREATE: "/api/v1/stations",
  UPDATE: (id: string) => `/api/v1/stations/${id}`,
  DELETE: (id: string) => `/api/v1/stations/${id}`,
} as const;
