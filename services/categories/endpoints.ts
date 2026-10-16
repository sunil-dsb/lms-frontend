export const CATEGORIES_ENDPOINTS = {
  LIST_PUBLIC: "/procedures/categories",
  LIST_ADMIN: "/admin/library/categories",
  CREATE: "/admin/library/categories",
  UPDATE: (id: string) => `/admin/library/categories/${id}`,
  ARCHIVE: (id: string) => `/admin/library/categories/${id}/archive`,
} as const;
