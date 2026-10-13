'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { backendSlug, fetchBackendSubcategories } from '@/services/categories/api';
import { useBackendCategories } from '@/services/categories/hooks';
import { getCachedProcedure, getProcedureBySlug } from '@/lib/api';
import { PROCEDURES_QUERY_KEY } from '@/services/library/hooks';
import { ProcedureEditor } from '@/components/admin/procedure-editor';
import { EditProcedureSkeleton } from '@/components/admin/edit-procedure-skeleton';
import type { Procedure } from '@/lib/types';

/**
 * Client data layer for the procedure editor.
 *
 * The server hands in the procedure when it can see it; when it can't
 * (cached-only procedure, backend down), the query resolves it here:
 * TanStack cache → on-device store → API. The editor mounts as soon as
 * the procedure is known.
 *
 * The Access-step category picker is the live backend catalog
 * (GET /api/v1/categories + per-category subcategories — the same source
 * the new-procedure wizard uses). There is intentionally no seed fallback:
 * an empty or erroring catalog must read as empty, never as mock rows.
 */
export function EditProcedureLoader({
  locale,
  id,
  initial,
}: {
  locale: string;
  id: string;
  initial: Procedure | null;
}): React.ReactElement {
  const queryClient = useQueryClient();

  const cached = React.useMemo(() => {
    if (initial) return initial;
    const browse = queryClient.getQueryData<Procedure[]>([...PROCEDURES_QUERY_KEY, 'browse']);
    return browse?.find((p) => p.id === id || p.slug === id) ?? getCachedProcedure(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, id]);

  const procedureQuery = useQuery<Procedure, Error>({
    queryKey: [...PROCEDURES_QUERY_KEY, 'edit', id],
    queryFn: () => getProcedureBySlug(id).then((r) => r.procedure),
    initialData: cached ?? undefined,
    enabled: !initial,
  });

  const procedure = initial ?? procedureQuery.data ?? null;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [backendCategories, subcategoryQueries],
  );

  if (!procedure && procedureQuery.isLoading) {
    return <EditProcedureSkeleton />;
  }

  if (!procedure) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
        <div className="mx-auto max-w-card space-y-4">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-ink)]">
            {locale === 'es' ? 'Este procedimiento no está disponible' : 'This procedure isn’t available'}
          </h1>
          <p className="text-base text-[var(--color-ink-2)]">
            {locale === 'es'
              ? 'Puede que se haya quitado o movido.'
              : 'It may have been removed or moved.'}
          </p>
          <div className="pt-4">
            <Link
              href={`/${locale}/admin/library`}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-600)] px-5 py-3 text-sm font-semibold text-white shadow-e1 hover:bg-[var(--color-brand-hover)]"
            >
              {locale === 'es' ? 'Volver a la biblioteca' : 'Back to library'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <ProcedureEditor locale={locale} categories={categories} initial={procedure} />;
}
