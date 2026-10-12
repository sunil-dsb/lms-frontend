'use client';

import * as React from 'react';
import { useQueries } from '@tanstack/react-query';
import { useLocations } from '@/services/locations/hooks';
import { useCategories, useBackendCategories } from '@/services/categories/hooks';
import { useStations } from '@/services/stations/hooks';
import { useProcedures } from '@/services/library/hooks';
import { LibraryProcedureExplorer } from '@/components/admin/library-procedure-explorer';
import { backendSlug, fetchBackendSubcategories } from '@/services/categories/api';

/**
 * Client data layer for the admin library explorer.
 *
 * Progressive paint: the header (page) is already instant, and the explorer
 * renders its filter bar as soon as the component mounts — only the rows
 * skeletonize while the procedures query resolves. Nothing waits for every
 * query before painting; each dataset lands when it lands (React Query
 * cache makes repeat visits fully instant with no skeleton at all).
 */
const EMPTY_PROCEDURES: any[] = [];
const EMPTY_STATIONS: any[] = [];

export function LibraryExplorerClient({ locale }: { locale: string }): React.ReactElement {
  const locationsQuery = useLocations();
  const locationId = locationsQuery.data?.locations?.[0]?.id;
  const categoriesQuery = useCategories(locationId);
  const backendCategoriesQuery = useBackendCategories();
  const backendCategoryRows = backendCategoriesQuery.data ?? [];
  const subcategoryQueries = useQueries({
    queries: backendCategoryRows.map((category) => ({
      queryKey: ['categories', 'backend-subcategories', category.id],
      queryFn: () => fetchBackendSubcategories(category.id),
      enabled: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(category.id),
      staleTime: 60 * 60 * 1000,
    })),
  });
  const stationsQuery = useStations({ locationId });
  // The admin library includes drafts and archived procedures too; the
  // employee browse query applies visibility filtering and can hide them.
  const proceduresQuery = useProcedures({}, true);

  // Backend rows first (real data wins on slug clashes), mock store rows
  // after for demo/seed content. The explorer dedupes by slug.
  const categories = React.useMemo(() => {
    const liveCategories = backendCategoryRows.map((category, index) => ({
      ...category,
      subcategories: (subcategoryQueries[index]?.data ?? []).map((subcategory) => ({
        id: subcategory.id,
        categoryId: subcategory.categoryId || category.id,
        slug: backendSlug(subcategory.nameEn),
        nameEn: subcategory.nameEn,
        nameEs: subcategory.nameEs,
      })),
    }));
    return liveCategories.length ? liveCategories : categoriesQuery.data ?? [];
  }, [backendCategoryRows, categoriesQuery.data, subcategoryQueries]);

  return (
    <LibraryProcedureExplorer
      procedures={proceduresQuery.data?.procedures ?? EMPTY_PROCEDURES}
      categories={categories}
      stations={stationsQuery.data ?? EMPTY_STATIONS}
      locale={locale}
      proceduresLoading={proceduresQuery.isLoading}
    />
  );
}
