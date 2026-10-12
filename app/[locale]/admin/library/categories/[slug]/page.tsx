import * as React from 'react';
import { cookies } from 'next/headers';
import { setRequestLocale } from 'next-intl/server';
import { listCategories, listLocations, ApiException, fetchMe } from '@/lib/api';
import type { Category } from '@/lib/types';
import { CategoryDetailClient } from './category-detail-client';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export const dynamic = 'force-dynamic';

async function readFirstManagedLocation(cookieHeader: string): Promise<string | null> {
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
    .join('; ');

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
  if (locationId) {
    try {
      const result = await listCategories(locationId, { includeArchived: true }, cookieHeader);
      categories = result.categories;
    } catch {
      // Fallback to local
    }
  }

  // Server-side we only know about the seed categories — anything created
  // through the Create Category modal lives in the client mock store. Don't
  // bounce the user with a 404 when their freshly-created category isn't on
  // the server; pass `null` and let the client resolve it from localStorage.
  const category = categories.find((c) => c.slug === slug) ?? null;

  return <CategoryDetailClient initialCategory={category} slug={slug} locale={locale} locationId={locationId} />;
}
