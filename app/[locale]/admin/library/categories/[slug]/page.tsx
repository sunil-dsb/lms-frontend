import * as React from "react";
import { cookies } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { listLocations, ApiException, fetchMe } from "@/lib/api";
import { fetchBackendCategories } from "@/services/categories/api";
import type { Category } from "@/lib/types";
import { CategoryDetailClient } from "./category-detail-client";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export const dynamic = "force-dynamic";

async function readFirstManagedLocation(
  cookieHeader: string,
): Promise<string | null> {
  try {
    const res = await listLocations(cookieHeader);
    return res.locations[0]?.id ?? null;
  } catch {
    return null;
  }
}

export default async function AdminCategoryDetailPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  let locationId: string | null = null;
  try {
    const me = await fetchMe(cookieHeader);
    locationId = me.employee.locationId;
  } catch (err) {
    if (!(err instanceof ApiException)) throw err;
    locationId = await readFirstManagedLocation(cookieHeader);
  }
  if (!locationId) {
    locationId = await readFirstManagedLocation(cookieHeader);
  }

  let categories: Category[] = [];
  try {
    categories = await fetchBackendCategories(
      { page: 1, limit: 200 },
      cookieHeader,
    );
  } catch {
    // Let the client render its not-found state if the category API is unavailable.
  }

  // Resolve the route against the live backend catalog. The client retries
  // the same API if a category is not present in this server render.
  const category = categories.find((c) => c.slug === slug) ?? null;

  return (
    <CategoryDetailClient
      initialCategory={category}
      slug={slug}
      locale={locale}
      locationId={locationId}
    />
  );
}
