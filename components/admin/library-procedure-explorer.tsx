'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { deleteProcedure, listProcedures, clearLibraryListCache, canPublishProcedure, setProcedureState } from '@/lib/api';
import type { Procedure, Category, ProcedureStatus, Station, Subcategory, ProcedureBlock } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomSelect } from '@/components/ui/custom-select';
import {
  LuArchive,
  LuArchiveRestore,
  LuCircleCheck,
  LuFilePen,
  LuFileSearch,
  LuLock,
  LuPencil,
  LuPlus,
  LuFilter,
  LuRefreshCw,
  LuSearch,
  LuTrash2,
  LuX,
} from 'react-icons/lu';
import {
  PiBookOpenText,
  PiBookOpenUser,
  PiCookingPot,
  PiDoorOpen,
  PiFileText,
  PiFolder,
  PiFolders,
  PiShieldCheck,
  PiSparkle,
  PiSquaresFour,
  PiToolbox,
} from 'react-icons/pi';
import type { IconType } from 'react-icons';
import { StatusPill } from '@/components/ui/status-pill';
import { FilterChips } from '@/components/ui/filter-chips';
import { Skeleton } from '@/components/ui/skeleton';
import { IconTile } from '@/components/ui/icon-tile';
import { HoverImagePreview } from '@/components/ui/hover-image-preview';
import { EmptyState } from '@/components/ui/empty-state';
import { RowActions, type RowActionItem } from '@/components/ui/row-actions';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PROCEDURES_QUERY_KEY } from '@/services/library/hooks';
import { getProcedureIcon } from '@/lib/category-icons';
import { backendSlug, categorySlugsMatch } from '@/services/categories/api';
import { LibraryExplorerSkeleton } from '@/components/admin/library-explorer-skeleton';
import { Pagination } from '@/components/ui/pagination';
import { ProcedureExplorerFilters } from './library-procedure-explorer-filters';
import { ProcedureExplorerResults } from './library-procedure-explorer-results';
import { getCategoryTheme } from './library-category-theme';

interface LibraryProcedureExplorerProps {
  procedures: Procedure[];
  categories: Category[];
  /** Stations at the manager's location — drives the Station filter dropdown.
   *  Optional so callers that don't need the filter can keep passing the
   *  existing shape; when omitted the filter is hidden. */
  stations?: Station[];
  locale: string;
  isLoading?: boolean;
  /** Procedures query still resolving — the filter bar renders immediately
   *  with whatever catalog arrived, and only the list area shows a skeleton.
   *  The page no longer waits for every query before painting anything. */
  proceduresLoading?: boolean;
}

/**
 * The library, for a manager: category filters with counts, a search and sort
 * bar, and the procedures as a list or a grid.
 *
 * Every category wears the same neutral badge — the panel with ink-2 on it — and
 * is told apart by its icon and its name rather than by a colour of its own. A
 * palette of one hue per category was the first version; with eight categories it
 * turned the page into a chart of colours that mean nothing to a reader who has
 * not learnt the key.
 */
/** Rows per page. Fixed at 10 so long lists page instead of scrolling. */
const PAGE_SIZE = 10;

export function LibraryProcedureExplorer({
  procedures,
  categories,
  stations,
  locale,
  isLoading = false,
  proceduresLoading = false,
}: LibraryProcedureExplorerProps): React.ReactElement {
  if (isLoading) {
    return <LibraryExplorerSkeleton />;
  }

  const isEs = locale === 'es';
  const router = useRouter();

  const queryClient = useQueryClient();
  const [archivedIds, setArchivedIds] = React.useState<Set<string>>(new Set());
  const [deletedIds, setDeletedIds] = React.useState<Set<string>>(new Set());
  const [statusOverrides, setStatusOverrides] = React.useState<Map<string, ProcedureStatus>>(new Map());

  const onArchive = React.useCallback(
    async (id: string): Promise<void> => {
      setArchivedIds((prev) => new Set([...prev, id]));
      try {
        const { archiveProcedure } = await import('@/services/library/api');
        await archiveProcedure(id);
        clearLibraryListCache();
        await queryClient.invalidateQueries({ queryKey: PROCEDURES_QUERY_KEY });
      } catch {
        setArchivedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [queryClient],
  );

  const act = React.useCallback(
    async (
      id: string,
      change: { status?: ProcedureStatus; isArchived?: boolean },
      row?: Procedure,
    ) => {
      if (change.status) {
        setStatusOverrides((prev) => new Map(prev).set(id, change.status!));
      }
      if (change.isArchived !== undefined) {
        setArchivedIds((prev) => {
          const next = new Set(prev);
          if (change.isArchived) next.add(id);
          else next.delete(id);
          return next;
        });
      }
      try {
        await setProcedureState(id, change, row ? { row } : undefined);
        await queryClient.invalidateQueries({ queryKey: PROCEDURES_QUERY_KEY });
      } catch {
        await queryClient.invalidateQueries({ queryKey: PROCEDURES_QUERY_KEY });
      }
    },
    [queryClient],
  );

  // Filters State
  const searchParams = useSearchParams();
  const [selectedCategorySlug, setSelectedCategorySlug] = React.useState<string>(
    () => searchParams.get('category') || 'all'
  );

  React.useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      setSelectedCategorySlug(categoryParam);
    }
  }, [searchParams]);
  // The subcategory dropdown's options follow the category chip: pick
  // "Food Safety" and only Hygiene / Cross-Contamination / Labeling & Dating /
  // Allergy appear. Reset the subcategory whenever the category narrows so a
  // stale subcategory from another category does not produce an empty list.
  const [selectedSubcategoryId, setSelectedSubcategoryId] = React.useState<string>('all');

  const lastCategoryRef = React.useRef<string>(selectedCategorySlug);
  React.useEffect(() => {
    if (lastCategoryRef.current !== selectedCategorySlug) {
      lastCategoryRef.current = selectedCategorySlug;
      setSelectedSubcategoryId('all');
      setCurrentPage(1);
    }
  }, [selectedCategorySlug]);

  const [searchQuery, setSearchQuery] = React.useState<string>('');
  // Debounced search for the server round-trip. The client-side filter below
  // keeps using the live `searchQuery` so keystrokes feel instant on rows
  // already in hand; the backend query follows once the user pauses instead
  // of firing per keystroke.
  const [debouncedSearch, setDebouncedSearch] = React.useState<string>('');
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);
  // Archived is its own choice: out of the list by default, one pick away for
  // the audit.
  const [statusFilter, setStatusFilter] = React.useState<'all' | ProcedureStatus | 'archived'>('all');
  // Station filter: narrows the list to procedures whose stationScope covers
  // the chosen station. `mode: 'all'` procedures are always kept because they
  // apply to every station; `mode: 'specific'` matches when stationIds contains
  // the picked id. The 'all' option restores the un-narrowed view.
  const [stationFilter, setStationFilter] = React.useState<string>('all');
  const [sortBy, setSortBy] = React.useState<'updated_desc' | 'updated_asc' | 'title_asc' | 'title_desc'>(
    'updated_desc',
  );
  const [currentPage, setCurrentPage] = React.useState<number>(1);

  const isUuid = (val: string | null | undefined): boolean => {
    if (!val) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
  };

  const liveCategories = categories ?? [];
  const liveStations = stations ?? [];

  // Category counts & deduplication matching exact category pills in design reference
  const { categoryList, categoryCounts, categorySlugMap } = React.useMemo(() => {
    // The library's own categories first, then this fallback set for a location
    // that has none yet. Both orders matter: the real ones win, and the fallback
    // only fills gaps.
    const fallback: Category[] = [
      {
        id: 'cat-recipes',
        slug: 'recipes',
        nameEn: 'Recipe',
        nameEs: 'Recetas',
        isArchived: false,
        kind: 'general',
      },
      {
        id: 'cat-kitchen-ops',
        slug: 'kitchen-operations',
        nameEn: 'Kitchen Operations',
        nameEs: 'Operaciones de Cocina',
        isArchived: false,
        kind: 'general',
      },
      {
        id: 'cat-cleaning',
        slug: 'cleaning',
        nameEn: 'Cleaning Schedules',
        nameEs: 'Horarios de Limpieza',
        isArchived: false,
        kind: 'general',
      },
      {
        id: 'cat-onboarding',
        slug: 'onboarding',
        nameEn: 'Onboarding',
        nameEs: 'Inducción y Capacitación',
        isArchived: false,
        kind: 'general',
      },
    ];
    const rawCategories: Category[] = [...(liveCategories ?? []).filter((c) => !c.isArchived), ...fallback];

    const canonicalByName = new Map<string, Category>();
    const slugToCanonicalSlug = new Map<string, string>();

    for (const cat of rawCategories) {
      const normKey = (cat.slug || cat.nameEn || cat.nameEs).toLowerCase().trim();
      const existing =
        canonicalByName.get(normKey) ??
        Array.from(canonicalByName.values()).find(
          (c) =>
            categorySlugsMatch(c.slug, cat.slug) ||
            (Boolean(c.id) && Boolean(cat.id) && c.id === cat.id),
        );

      if (!existing) {
        canonicalByName.set(normKey, cat);
        slugToCanonicalSlug.set(cat.slug, cat.slug);
        if (cat.id) slugToCanonicalSlug.set(cat.id, cat.slug);
      } else {
        slugToCanonicalSlug.set(cat.slug, existing.slug);
        if (cat.id) slugToCanonicalSlug.set(cat.id, existing.slug);
      }
    }

    const uniqueCategories = Array.from(canonicalByName.values());
    const enrichedCategories = uniqueCategories.map((c) => ({
      ...c,
      subcategories: [...(c.subcategories ?? [])],
    }));
    const enrichedById = new Map(enrichedCategories.map((c) => [c.id, c]));
    for (const p of procedures ?? []) {
      const sub = (
        p as unknown as {
          subcategory?: { id: string; categoryId: string; nameEn: string; nameEs: string } | null;
        }
      ).subcategory;
      if (!sub?.id) continue;
      const cat = enrichedById.get(sub.categoryId);
      if (!cat || cat.subcategories.some((s) => s.id === sub.id)) continue;
      cat.subcategories.push({
        id: sub.id,
        slug: backendSlug(sub.nameEn),
        nameEn: sub.nameEn,
        nameEs: sub.nameEs,
        categoryId: sub.categoryId,
      });
    }

    const current = (procedures ?? []).filter((p) => !p.isArchived);
    const counts: Record<string, number> = { all: current.length };

    for (const p of current) {
      const procCat = p.category ?? (p.subcategoryId ? enrichedCategories.find((c) => c.subcategories?.some((s) => s.id === p.subcategoryId)) : null);
      if (!procCat) continue;
      const rawKey = procCat.slug || procCat.id;
      const canonicalSlug = slugToCanonicalSlug.get(rawKey) || procCat.slug;
      counts[canonicalSlug] = (counts[canonicalSlug] || 0) + 1;
    }

    return {
      categoryList: enrichedCategories,
      categoryCounts: counts,
      categorySlugMap: slugToCanonicalSlug,
    };
  }, [categories, procedures]);

  // Derive backend-compatible filter query params
  const selectedCategoryObj = React.useMemo(() => {
    if (selectedCategorySlug === 'all') return null;
    return (
      categoryList.find(
        (c) =>
          c.slug === selectedCategorySlug ||
          (c.id && c.id === selectedCategorySlug) ||
          categorySlugsMatch(c.slug, selectedCategorySlug),
      ) ?? null
    );
  }, [selectedCategorySlug, categoryList]);

  const backendCategoryIds = React.useMemo(() => {
    if (!selectedCategoryObj?.id || !isUuid(selectedCategoryObj.id)) return undefined;
    return [selectedCategoryObj.id];
  }, [selectedCategoryObj]);

  const backendSubcategoryIds = React.useMemo(() => {
    if (selectedSubcategoryId === 'all' || !isUuid(selectedSubcategoryId)) return undefined;
    return [selectedSubcategoryId];
  }, [selectedSubcategoryId]);

  const backendStationIds = React.useMemo(() => {
    if (stationFilter === 'all' || !isUuid(stationFilter)) return undefined;
    return [stationFilter];
  }, [stationFilter]);

  const backendStatus = React.useMemo(() => {
    if (statusFilter === 'all') return undefined;
    return statusFilter;
  }, [statusFilter]);

  const hasActiveBackendFilters = Boolean(
    backendCategoryIds?.length ||
    backendSubcategoryIds?.length ||
    backendStationIds?.length ||
    backendStatus ||
    debouncedSearch.trim(),
  );

  const { data: filterApiResponse, isLoading: isFilterLoading } = useQuery({
    queryKey: [
      ...PROCEDURES_QUERY_KEY,
      'admin-filter',
      {
        categoryIds: backendCategoryIds,
        subcategoryIds: backendSubcategoryIds,
        stationIds: backendStationIds,
        status: backendStatus,
        search: debouncedSearch.trim() || undefined,
      },
    ],
    queryFn: async () => {
      const { fetchProcedures } = await import('@/services/library/api');
      return fetchProcedures(
        {
          categoryIds: backendCategoryIds,
          subcategoryIds: backendSubcategoryIds,
          stationIds: backendStationIds,
          status: backendStatus,
          search: debouncedSearch.trim() || undefined,
        },
        true,
      );
    },
    enabled: hasActiveBackendFilters,
    staleTime: 5000,
  });

  const allProcedures = React.useMemo(() => {
    const list = (hasActiveBackendFilters && filterApiResponse?.procedures ? filterApiResponse.procedures : procedures) ?? [];
    return list
      .filter((p) => !deletedIds.has(p.id) && !deletedIds.has(p.slug))
      .map((p) => {
        let item = p;
        if (archivedIds.has(p.id) || archivedIds.has(p.slug)) {
          item = { ...item, isArchived: true };
        }
        const statusOverride = statusOverrides.get(p.id) || statusOverrides.get(p.slug);
        if (statusOverride) {
          item = { ...item, status: statusOverride };
        }
        return item;
      });
  }, [procedures, filterApiResponse, hasActiveBackendFilters, archivedIds, deletedIds, statusOverrides]);

  // Options for CustomSelect dropdowns
  const subById = React.useMemo(() => {
    const map = new Map<string, Subcategory>();
    for (const cat of categoryList) {
      for (const sub of cat.subcategories ?? []) {
        if (sub.id) map.set(sub.id, sub);
      }
    }
    return map;
  }, [categoryList]);

  // Category dropdown options: All, then each category (General removed)
  const categorySelectOptions = React.useMemo(() => {
    return [
      {
        value: 'all',
        label: `${isEs ? 'Todas las categorías' : 'All categories'} (${categoryCounts.all || 0})`,
        icon: PiSquaresFour,
      },
      ...categoryList.map((cat) => {
        const theme = getCategoryTheme(cat.slug);
        const name = isEs ? cat.nameEs : cat.nameEn;
        return {
          value: cat.slug,
          label: `${name} (${categoryCounts[cat.slug] || 0})`,
          icon: theme.icon,
        };
      }),
    ];
  }, [categoryList, categoryCounts, isEs]);

  // Subcategories the manager can pick. Scoped to the currently selected
  // category when one is chosen, so the dropdown is short and the picked
  // subcategory is guaranteed to live under the chosen category. "all" (no
  // category picked) shows every subcategory across every category.
  const subcategoryOptions = React.useMemo(() => {
    const pool: Subcategory[] =
      selectedCategorySlug === 'all'
        ? categoryList.flatMap((cat) => cat.subcategories ?? [])
        : categoryList
          .filter((cat) => cat.slug === selectedCategorySlug)
          .flatMap((cat) => cat.subcategories ?? []);

    // Dedupe by id — two categories with overlapping subcategory ids would
    // otherwise show the same name twice.
    const seen = new Set<string>();
    const unique = pool.filter((s) => {
      if (!s.id || seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });

    // Sort by display name in the active locale so the dropdown reads A-Z.
    unique.sort((a, b) => {
      const an = (isEs ? a.nameEs : a.nameEn).toLowerCase();
      const bn = (isEs ? b.nameEs : b.nameEn).toLowerCase();
      return an.localeCompare(bn);
    });

    return [
      {
        value: 'all',
        label: isEs ? 'Todas las subcategorías' : 'All subcategories',
        icon: PiFolders,
      },
      ...unique.map((sub) => {
        const name = isEs ? sub.nameEs : sub.nameEn;
        return {
          value: sub.id,
          label: name,
          icon: PiFolder,
        };
      }),
    ];
  }, [categoryList, selectedCategorySlug, isEs]);

  const statusOptions = React.useMemo(() => {
    return [
      {
        value: 'all',
        label: isEs ? 'Todos los estados' : 'All statuses',
        icon: PiFolder,
      },
      {
        value: 'published',
        label: isEs ? 'Publicados' : 'Published',
        icon: LuCircleCheck,
      },
      {
        value: 'draft',
        label: isEs ? 'Borradores' : 'Drafts',
        icon: LuFilePen,
      },
      {
        value: 'archived',
        label: isEs ? 'Archivados' : 'Archived',
        icon: LuArchive,
      },
    ];
  }, [isEs]);

  // Station options for the filter dropdown. Sorted by the station's
  // `sortOrder` so the picker reads in the same order the kitchen sees them.
  // Returns an empty list (and the dropdown is hidden) when no stations exist
  // at the current location — a single-station location doesn't need a picker.
  const stationOptions = React.useMemo(() => {
    const visible = (liveStations ?? []).filter((s) => !s.isArchived);
    if (visible.length === 0) return [];
    const sorted = [...visible].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
    return [
      {
        value: 'all',
        label: isEs ? 'Todas las estaciones' : 'All stations',
        icon: PiSquaresFour,
      },
      ...sorted.map((s) => ({
        value: s.id,
        label: s.name,
        icon: PiSquaresFour,
      })),
    ];
  }, [liveStations, isEs]);

  // Filtered procedures
  const filteredProcedures = React.useMemo(() => {
    return allProcedures
      .filter((p) => {
        // Category Filter
        if (selectedCategorySlug !== 'all') {
          const procCat = p.category ?? (p.subcategoryId ? categoryList.find((c) => c.subcategories?.some((s) => s.id === p.subcategoryId)) : null);
          if (!procCat) return false;
          const rawKey = procCat.slug || procCat.id;
          const canonicalSlug = categorySlugMap.get(rawKey) || procCat.slug;
          if (!categorySlugsMatch(canonicalSlug, selectedCategorySlug)) return false;
        }

        // Status Filter
        if (statusFilter === 'archived') {
          if (!p.isArchived) return false;
        } else {
          if (p.isArchived) return false;
          if (statusFilter !== 'all' && p.status !== statusFilter) return false;
        }

        // Subcategory Filter — string match on the procedure's FK. The
        // dropdown's options are already scoped to the selected category,
        // so an empty result means "no procedures in this subcategory yet".
        if (selectedSubcategoryId !== 'all') {
          if (!p.subcategoryId || p.subcategoryId !== selectedSubcategoryId) {
            return false;
          }
        }

        // Station Filter — keep kitchen-wide procedures (mode: 'all') and the
        // ones whose stationScope explicitly names the picked station.
        // Procedures with no stationScope are treated as kitchen-wide.
        if (stationFilter !== 'all') {
          const scope = p.stationScope;
          if (scope && scope.mode === 'specific' && !scope.stationIds.includes(stationFilter)) {
            return false;
          }
        }

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const titleEn = (p.titleEn || '').toLowerCase();
          const titleEs = (p.titleEs || '').toLowerCase();
          const purposeEn = (p.purposeEn || '').toLowerCase();
          const purposeEs = (p.purposeEs || '').toLowerCase();
          const slug = (p.slug || '').toLowerCase();
          const catName = p.category ? (isEs ? p.category.nameEs : p.category.nameEn).toLowerCase() : '';

          const match =
            titleEn.includes(q) ||
            titleEs.includes(q) ||
            purposeEn.includes(q) ||
            purposeEs.includes(q) ||
            slug.includes(q) ||
            catName.includes(q);

          if (!match) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Prioritize Guacamole Fresco dish at the top on default / updated sort
        const isGuacA = a.id === 'proc-guacamole-fresco' || a.slug === 'guacamole-fresco' ? 1 : 0;
        const isGuacB = b.id === 'proc-guacamole-fresco' || b.slug === 'guacamole-fresco' ? 1 : 0;
        if ((!sortBy || sortBy === 'updated_desc') && isGuacA !== isGuacB) {
          return isGuacB - isGuacA;
        }
        if (sortBy === 'title_asc') {
          const titleA = (isEs ? a.titleEs || a.titleEn : a.titleEn || a.titleEs).toLowerCase();
          const titleB = (isEs ? b.titleEs || b.titleEn : b.titleEn || b.titleEs).toLowerCase();
          return titleA.localeCompare(titleB);
        }
        if (sortBy === 'title_desc') {
          const titleA = (isEs ? a.titleEs || a.titleEn : a.titleEn || a.titleEs).toLowerCase();
          const titleB = (isEs ? b.titleEs || b.titleEn : b.titleEn || b.titleEs).toLowerCase();
          return titleB.localeCompare(titleA);
        }
        if (sortBy === 'updated_asc') {
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [allProcedures, selectedCategorySlug, selectedSubcategoryId, statusFilter, stationFilter, searchQuery, sortBy, isEs, categorySlugMap]);

  const hasActiveFilters =
    selectedCategorySlug !== 'all' ||
    selectedSubcategoryId !== 'all' ||
    statusFilter !== 'all' ||
    stationFilter !== 'all' ||
    searchQuery.trim().length > 0;

  const resetFilters = (): void => {
    setSelectedCategorySlug('all');
    setSelectedSubcategoryId('all');
    setStatusFilter('all');
    setStationFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Pagination: 10 rows per page. Filters always run on the whole dataset;
  // only the rendered slice is paged.
  const totalItems = filteredProcedures.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const visibleProcedures = filteredProcedures.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Clamp back into range when a filter shrinks the list under the page.
  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  /** Remove the procedure from state immediately (optimistic) then persist. */
  const handleDelete = React.useCallback(
    async (id: string): Promise<void> => {
      setDeletedIds((prev) => new Set([...prev, id]));
      try {
        await deleteProcedure(id);
        clearLibraryListCache();
        await queryClient.invalidateQueries({ queryKey: PROCEDURES_QUERY_KEY });
      } catch {
        setDeletedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [queryClient],
  );

  return (
    <div className="space-y-6">
      {/* One row for everything: the All / General pills, the four dropdowns,
          then the search stretching to fill what's left. Wraps on narrow
          screens, single line on desktop. */}
      <ProcedureExplorerFilters
        isEs={isEs}
        selectedCategorySlug={selectedCategorySlug}
        onCategoryChange={(value) => { setSelectedCategorySlug(value); setCurrentPage(1); }}
        categoryCounts={categoryCounts}
        categorySelectOptions={categorySelectOptions}
        selectedSubcategoryId={selectedSubcategoryId}
        onSubcategoryChange={(value) => { setSelectedSubcategoryId(value); setCurrentPage(1); }}
        subcategoryOptions={subcategoryOptions}
        stationOptions={stationOptions}
        stationFilter={stationFilter}
        onStationChange={(value) => { setStationFilter(value); setCurrentPage(1); }}
        statusFilter={statusFilter}
        onStatusChange={(value) => { setStatusFilter(value as ProcedureStatus | 'all' | 'archived'); setCurrentPage(1); }}
        statusOptions={statusOptions}
        searchQuery={searchQuery}
        onSearchChange={(value) => { setSearchQuery(value); setCurrentPage(1); }}
        hasActiveFilters={hasActiveFilters}
        filteredCount={filteredProcedures.length}
        totalCount={allProcedures.length}
        onReset={resetFilters}
      />
      <ProcedureExplorerResults
        loading={proceduresLoading || (hasActiveBackendFilters && isFilterLoading && !filterApiResponse)}
        isEs={isEs} locale={locale} allProcedures={allProcedures}
        filteredProcedures={filteredProcedures} visibleProcedures={visibleProcedures}
        hasActiveFilters={hasActiveFilters} resetFilters={resetFilters}
        categoryList={categoryList} subById={subById} liveStations={liveStations}
        act={act} onArchive={onArchive} onDelete={handleDelete}
      />
      {/* Pagination footer — 10 rows per page, no long scroll. */}
      {totalItems > 0 && (
        <Pagination
          page={safePage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={PAGE_SIZE}
          onPageChange={setCurrentPage}
          isEs={isEs}
          itemLabel={isEs ? 'procedimientos' : 'procedures'}
        />
      )}
    </div>
  );
}
