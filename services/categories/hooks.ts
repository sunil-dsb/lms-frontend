import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchBackendCategories,
  fetchAllSubcategories,
  createCategory,
  updateCategory,
  archiveCategory,
  unarchiveBackendCategory,
  type AllSubcategoriesOptions,
  type LiveSubcategory,
} from "./api";
import type { CreateCategoryInput, UpdateCategoryInput } from "./types";

export const CATEGORIES_QUERY_KEY = ["categories"] as const;

/**
 * Live categories from the backend (GET /api/v1/categories, limit 100).
 * Rows carry `status` and `proceduresCount` straight from the API.
 */
export function useBackendCategories() {
  return useQuery({
    queryKey: [...CATEGORIES_QUERY_KEY, "backend"],
    queryFn: () => fetchBackendCategories(),
    staleTime: 1000 * 60 * 60, // 1 hour stale time
    gcTime: 1000 * 60 * 60 * 24, // 24 hours in cache
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCategoryInput) => createCategory(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCategoryInput }) =>
      updateCategory(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
    },
  });
}

export function useArchiveCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => archiveCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
    },
  });
}

export function useUnarchiveCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => unarchiveBackendCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
    },
  });
}

/**
 * Every subcategory in one call (GET /api/v1/categories/subcategories).
 * The single-call replacement for the old per-category `useQueries`
 * fan-out — callers group by `categoryId` client-side.
 */
export function useAllSubcategories(options: AllSubcategoriesOptions = {}) {
  const { categoryId, search, page, limit } = options;
  return useQuery({
    queryKey: [
      ...CATEGORIES_QUERY_KEY,
      "all-subcategories",
      { categoryId, search, page, limit },
    ],
    queryFn: () => fetchAllSubcategories(options),
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export type { AllSubcategoriesOptions, LiveSubcategory };
