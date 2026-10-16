export const LOCATIONS_ENDPOINTS = {
  LIST: "/api/v1/locations",
  CREATE: "/api/v1/locations",
  UPDATE: (id: string) => `/api/v1/locations/${id}`,
  DELETE: (id: string) => `/api/v1/locations/${id}`,
} as const;
