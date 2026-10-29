"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocations } from "@/services/locations/hooks";
import {
  useBackendCategories,
  useAllSubcategories,
} from "@/services/categories/hooks";
import { useStations } from "@/services/stations/hooks";
import { useProcedures } from "@/services/library/hooks";
import { LibraryProcedureExplorer } from "@/components/admin/library-procedure-explorer";
import { backendSlug } from "@/services/categories/api";

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

export function LibraryExplorerClient({
  locale,
}: {
  locale: string;
}): React.ReactElement {
  const locationsQuery = useLocations();
  const locationId = locationsQuery.data?.locations?.[0]?.id;
  const backendCategoriesQuery = useBackendCategories();
  const backendCategoryRows = backendCategoriesQuery.data ?? [];
  // Subcategories in ONE call — grouped by `categoryId` client-side.
  const allSubcategoriesQuery = useAllSubcategories();
  const allSubcategories = allSubcategoriesQuery.data ?? [];
  const stationsQuery = useStations({ locationId });
  // The admin library includes drafts and archived procedures too; the
  // employee browse query applies visibility filtering and can hide them.
  const proceduresQuery = useProcedures({}, true);

  // Backend rows only — no mock fallback.
  const categories = React.useMemo(() => {
    const byCategory = new Map<string, typeof allSubcategories>();
    for (const sub of allSubcategories) {
      const list = byCategory.get(sub.categoryId) ?? [];
      list.push(sub);
      byCategory.set(sub.categoryId, list);
    }
    return backendCategoryRows.map((category) => ({
      ...category,
      subcategories: (byCategory.get(category.id) ?? []).map((subcategory) => ({
        id: subcategory.id,
        categoryId: subcategory.categoryId || category.id,
        slug: backendSlug(subcategory.nameEn),
        nameEn: subcategory.nameEn,
        nameEs: subcategory.nameEs,
        subcategoryIcon: subcategory.subcategoryIcon || undefined,
      })),
    }));
  }, [backendCategoryRows, allSubcategories]);

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
