'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  isEs?: boolean;
  itemLabel?: string;
}

/** Page numbers with ellipsis: 1 … 4 5 6 … 12 */
function pageNumbers(page: number, totalPages: number): (number | '…')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const set = new Set<number>([1, 2, page - 1, page, page + 1, totalPages - 1, totalPages]);
  const sorted = [...set].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  for (let i = 0; i < sorted.length; i++) {
    out.push(sorted[i]);
    if (i < sorted.length - 1 && sorted[i + 1] - sorted[i] > 1) out.push('…');
  }
  return out;
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  isEs = false,
  itemLabel,
}: PaginationProps): React.ReactElement | null {
  if (totalPages <= 1 && totalItems <= pageSize) {
    if (totalItems === 0) return null;
    // Still show the "Showing x of y" line for a single page so counts stay visible.
  }
  if (totalItems === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  const label = itemLabel ?? (isEs ? 'elementos' : 'items');

  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t border-[var(--color-line)] pt-4 text-sm text-[var(--color-ink-3)] sm:flex-row">
      <div aria-live="polite">
        {isEs ? 'Mostrando' : 'Showing'} {start}–{end} {isEs ? 'de' : 'of'} {totalItems} {label}
      </div>

      {totalPages > 1 ? (
        <nav
          aria-label={isEs ? 'Paginación' : 'Pagination'}
          className="flex items-center gap-1"
        >
          <Button
            type="button"
            variant="neutral"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label={isEs ? 'Página anterior' : 'Previous page'}
            className="rounded-full px-2"
          >
            <LuChevronLeft aria-hidden="true" />
          </Button>

          {pageNumbers(page, totalPages).map((n, i) =>
            n === '…' ? (
              <span key={`gap-${i}`} aria-hidden="true" className="px-1">
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => onPageChange(n)}
                aria-label={`${isEs ? 'Página' : 'Page'} ${n}`}
                aria-current={n === page ? 'page' : undefined}
                className={cn(
                  'min-h-8 min-w-8 rounded-full px-2 text-sm font-medium transition-colors',
                  n === page
                    ? 'bg-[var(--color-brand-600)] text-white'
                    : 'text-[var(--color-ink-2)] hover:bg-[var(--color-panel)]',
                )}
              >
                {n}
              </button>
            ),
          )}

          <Button
            type="button"
            variant="neutral"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label={isEs ? 'Página siguiente' : 'Next page'}
            className="rounded-full px-2"
          >
            <LuChevronRight aria-hidden="true" />
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
