import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCategories, fetchBackendCategories, createCategory, updateCategory, archiveCategory } from './api';
import type { CreateCategoryInput, UpdateCategoryInput } from './types';

export const CATEGORIES_QUERY_KEY = ['categories'] as const;

export function useCategories(locationId?: string, includeArchived = false) {
  return useQuery({
    queryKey: [...CATEGORIES_QUERY_KEY, { locationId, includeArchived }],
    queryFn: () => fetchCategories(locationId, includeArchived),
    staleTime: 1000 * 60 * 60, // 1 hour stale time (categories rarely change)
    gcTime: 1000 * 60 * 60 * 24, // 24 hours in cache
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

/**
 * Real categories from the backend (GET /api/v1/categories, limit 100).
 * Joins the 1-hour query cache; the explorer merges these with the mock
 * store rows so backend-created categories filter and count correctly.
 */
export function useBackendCategories() {
  return useQuery({
    queryKey: [...CATEGORIES_QUERY_KEY, 'backend'],
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
