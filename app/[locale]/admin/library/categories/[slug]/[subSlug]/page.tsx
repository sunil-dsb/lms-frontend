import * as React from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  backendSlug,
  fetchBackendCategories,
  fetchBackendSubcategories,
} from "@/services/categories/api";
import type { Category, Subcategory } from "@/lib/types";
import { SubcategoryDetailClient } from "./subcategory-detail-client";

interface PageProps {
  params: Promise<{ locale: string; slug: string; subSlug: string }>;
}

export const dynamic = "force-dynamic";

/**
 * Dedicated subcategory page. The category page lists every subcategory
 * inline; clicking one lands here so the manager sees only that
 * subcategory's procedures (filtered by the `?station=` picked on the
 * categories page) with an "Add procedure" button and nothing else —
 * no add-station affordances, since the station is already determined
 * by the URL.
 */
export default async function AdminSubcategoryDetailPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale, slug, subSlug } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  let category: Category | null = null;
  let subcategory: Subcategory | null = null;

  try {
    const categories = await fetchBackendCategories(
      { page: 1, limit: 200 },
      cookieHeader,
    );
    const match = categories.find((c) => c.slug === slug);
    if (match) {
      const subs = await fetchBackendSubcategories(match.id, cookieHeader);
      const sub = subs.find((item) => backendSlug(item.nameEn) === subSlug);
      if (sub) {
        category = match;
        subcategory = {
          id: sub.id,
          categoryId: sub.categoryId,
          slug: backendSlug(sub.nameEn),
          nameEn: sub.nameEn,
          nameEs: sub.nameEs,
        };
      }
    }
  } catch {
    // Fall through to notFound().
  }

  if (!category || !subcategory) {
    notFound();
  }

  return (
    <SubcategoryDetailClient
      category={category}
      subcategory={subcategory}
      locale={locale}
    />
  );
}
