"use client";

import * as React from "react";
import { backendSlug } from "@/services/categories/api";
import {
  useBackendCategories,
  useAllSubcategories,
} from "@/services/categories/hooks";
import { ProcedureEditor } from "@/components/admin/procedure-editor";

/**
 * Client data layer for the new-procedure wizard.
 *
 * The page shell renders instantly; categories resolve through TanStack
 * Query (cached, so reopening the wizard is immediate). Subcategories
 * arrive in ONE call (GET /api/v1/categories/subcategories) and are
 * grouped by `categoryId` client-side — never one request per category.
 * The editor mounts with an empty picker and fills in when the queries
 * resolve.
 */
export function NewProcedureLoader({
  locale,
}: {
  locale: string;
}): React.ReactElement {
  const categoriesQuery = useBackendCategories();
  const backendCategories = categoriesQuery.data ?? [];
  const subcategoriesQuery = useAllSubcategories();
  const allSubcategories = subcategoriesQuery.data ?? [];

  const categories = React.useMemo(() => {
    const byCategory = new Map<string, typeof allSubcategories>();
    for (const sub of allSubcategories) {
      const list = byCategory.get(sub.categoryId) ?? [];
      list.push(sub);
      byCategory.set(sub.categoryId, list);
    }
    return backendCategories.map((category) => ({
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
  }, [backendCategories, allSubcategories]);

  return <ProcedureEditor locale={locale} categories={categories} />;
}
