import * as React from 'react';
import { cookies } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { fetchBackendCategories } from '@/services/categories/api';
import type { Category } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CategoriesClientList } from './categories-client-list';
import { CreateCategoryButton } from './category-actions';
import { PageHeader } from '@/components/admin/page-header';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = 'force-dynamic';

export default async function AdminLibraryCategoriesPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('admin.library.categories');

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  let categories: Category[] = [];
  let loadError: string | null = null;
  try {
    categories = await fetchBackendCategories({ page: 1, limit: 200 }, cookieHeader);
  } catch (err) {
    loadError = err instanceof Error ? err.message : 'LOAD_FAILED';
  }

  return (
    <div className="mx-auto max-w-page space-y-6">
      <PageHeader
        title={t('pageTitle')}
        actions={<CreateCategoryButton />}
      />

      {loadError ? (
        <p
          role="alert"
          className={cn(
            'rounded-[var(--radius-md)] bg-[var(--color-bad-tint)]',
            'px-3 py-2 text-sm text-[var(--color-bad)]',
          )}
        >
          {loadError}
        </p>
      ) : null}

      <CategoriesClientList
        initialCategories={categories}
        locale={locale}
      />
    </div>
  );
}
