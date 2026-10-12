import * as React from 'react';
import { CategoriesSkeleton } from '@/components/admin/categories-skeleton';

export default function AdminLibraryCategoriesLoading(): React.ReactElement {
  return (
    <div className="mx-auto max-w-page space-y-6" aria-busy="true" aria-label="Loading categories">
      {/* Header skeleton — mirrors PageHeader + Add category button */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-2">
        <div className="h-8 w-48 rounded-[var(--radius-md)] bg-[var(--color-panel-2)] animate-pulse" />
        <div className="h-tap-admin w-36 rounded-full bg-[var(--color-brand-600)]/40 animate-pulse" />
      </div>

      <CategoriesSkeleton />
    </div>
  );
}
