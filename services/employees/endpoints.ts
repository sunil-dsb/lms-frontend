export const EMPLOYEES_ENDPOINTS = {
  LIST: "/api/v1/employees",
  GET: (id: string) => `/api/v1/employees/${id}`,
  CREATE: "/api/v1/employees",
  UPDATE: (id: string) => `/api/v1/employees/${id}`,
  RESEND_INVITE: (id: string) => `/api/v1/employees/${id}/invites`,
  DEACTIVATE: (id: string) => `/api/v1/employees/${id}/deactivate`,
  // Reactivation removed — a deactivated employee stays deactivated.
  // REACTIVATE: (id: string) => `/api/v1/employees/${id}/reactivate`,
  TRAINING: (id: string) => `/api/v1/employees/${id}/training`,
  SUPERVISORS: "/api/v1/employees/supervisors",
  MANAGERS: "/api/v1/employees/managers",
} as const;
