'use client';

import * as React from 'react';
import { useQueries } from '@tanstack/react-query';
import { backendSlug, fetchBackendSubcategories } from '@/services/categories/api';
import { useBackendCategories } from '@/services/categories/hooks';
import { ProcedureEditor } from '@/components/admin/procedure-editor';

/**
 * Client data layer for the new-procedure wizard.
 *
 * The page shell renders instantly; the location (which scopes the
 * category picker) and the categories themselves resolve through
 * TanStack Query — cached for 5 minutes, so reopening the wizard
 * is immediate. The editor mounts with an empty picker and fills
 * in when the queries resolve.
 */
export function NewProcedureLoader({ locale }: { locale: string }): React.ReactElement {
  const categoriesQuery = useBackendCategories();
  const backendCategories = categoriesQuery.data ?? [];
  const subcategoryQueries = useQueries({
    queries: backendCategories.map((category) => ({
      queryKey: ['categories', 'backend-subcategories', category.id],
      queryFn: () => fetchBackendSubcategories(category.id),
      enabled: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(category.id),
      staleTime: 60 * 60 * 1000,
    })),
  });
  const categories = React.useMemo(
    () => backendCategories.map((category, index) => ({
      ...category,
      subcategories: (subcategoryQueries[index]?.data ?? []).map((subcategory) => ({
        id: subcategory.id,
        categoryId: subcategory.categoryId || category.id,
        slug: backendSlug(subcategory.nameEn),
        nameEn: subcategory.nameEn,
        nameEs: subcategory.nameEs,
      })),
    })),
    [backendCategories, subcategoryQueries],
  );

  return <ProcedureEditor locale={locale} categories={categories} />;
}
