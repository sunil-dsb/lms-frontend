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
export function getCategoryTheme(slug: string): {
  icon: IconType;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
} {
  const normalized = (slug || '').toLowerCase();
  switch (normalized) {
    case 'recipes':
    case 'recipe':
      return {
        icon: PiBookOpenText,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    case 'station':
    case 'station-procedures':
      return {
        icon: PiSquaresFour,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    case 'cleaning':
    case 'cleaning-schedules':
      return {
        icon: PiSparkle,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    case 'admin':
    case 'general':
    case 'general-procedures':
      return {
        icon: PiFileText,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    case 'delivery':
    case 'delivery-receiving':
      return {
        icon: PiFolders,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    case 'food-safety':
    case 'safety':
      return {
        icon: PiShieldCheck,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    case 'equipment':
    case 'equipment-handling':
      return {
        icon: PiToolbox,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    case 'kitchen-operations':
      return {
        icon: PiCookingPot,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    case 'opening-closing':
      return {
        icon: PiDoorOpen,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    case 'onboarding':
      return {
        icon: PiBookOpenUser,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
    default:
      return {
        icon: PiFileText,
        badgeBg: 'bg-[var(--color-panel)] text-[var(--color-ink-2)]',
        badgeText: 'text-[var(--color-ink-2)]',
        badgeBorder: 'border-[var(--color-line)]',
      };
  }
}

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
      <div className="flex flex-wrap items-center gap-3">
        <FilterChips
          label={isEs ? 'Categoría' : 'Category'}
          value={selectedCategorySlug}
          onChange={(slug) => {
            setSelectedCategorySlug(slug);
            setCurrentPage(1);
          }}
          chips={[
            { value: 'all', label: isEs ? 'Todas' : 'All', count: categoryCounts.all || 0 },
          ]}
        />

        <div className="w-field-md shrink-0">
          <CustomSelect
            value={selectedCategorySlug}
            onChange={(val) => {
              setSelectedCategorySlug(val);
              setCurrentPage(1);
            }}
            options={categorySelectOptions}
            size="sm"
            className="h-tap-admin text-sm"
          />
        </div>
        <div className="w-field-md shrink-0">
          <CustomSelect
            value={selectedSubcategoryId}
            onChange={(val) => {
              setSelectedSubcategoryId(val);
              setCurrentPage(1);
            }}
            options={subcategoryOptions}
            size="sm"
            className="h-tap-admin text-sm"
          />
        </div>
        {stationOptions.length > 1 ? (
          <div className="w-field-sm shrink-0">
            <CustomSelect
              value={stationFilter}
              onChange={(val) => {
                setStationFilter(val);
                setCurrentPage(1);
              }}
              options={stationOptions}
              size="sm"
              className="h-tap-admin text-sm"
            />
          </div>
        ) : null}
        <div className="w-field-sm shrink-0">
          <CustomSelect
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val as ProcedureStatus | 'all' | 'archived');
              setCurrentPage(1);
            }}
            options={statusOptions}
            size="sm"
            className="h-tap-admin text-sm"
          />
        </div>

        <div className="find min-w-52 flex-1" role="search">
          <LuSearch aria-hidden="true" className="i" />
          <label className="sr-only" htmlFor="library-search">
            {isEs ? 'Buscar en la biblioteca' : 'Search the library'}
          </label>
          <input
            id="library-search"
            type="search"
            value={searchQuery}
            placeholder={isEs ? 'Buscar procedimientos…' : 'Search procedures…'}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label={isEs ? 'Borrar búsqueda' : 'Clear search'}
              className="shrink-0 text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
            >
              <LuX aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Active Filters Notification Bar */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between rounded-lg bg-[var(--color-panel)] px-4 py-2 text-sm border border-[var(--color-line)]">
          <div className="flex items-center gap-2 text-[var(--color-ink-2)]">
            <LuFilter aria-hidden="true" className="text-[var(--color-ink-2)]" />
            <span>
              {isEs ? 'Mostrando' : 'Showing'}{' '}
              <strong className="text-[var(--color-ink)]">{filteredProcedures.length}</strong> {isEs ? 'de' : 'of'}{' '}
              <strong className="text-[var(--color-ink)]">{allProcedures.length}</strong>{' '}
              {isEs ? 'procedimientos' : 'procedures'}
            </span>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="flex items-center gap-1 font-semibold text-[var(--color-brand-700)] hover:underline"
          >
            <LuRefreshCw aria-hidden="true" />
            <span>{isEs ? 'Limpiar filtros' : 'Reset filters'}</span>
          </button>
        </div>
      )}

      {/* List area. While the procedures query resolves, the filter bar above
          is already interactive (its catalog is local) and only the rows
          skeletonize — the page never waits for every query to paint. */}
      {proceduresLoading || (hasActiveBackendFilters && isFilterLoading && !filterApiResponse) ? (
        <ul
          aria-busy="true"
          aria-label={isEs ? 'Cargando procedimientos' : 'Loading procedures'}
          className="divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)]"
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="flex items-center gap-4 py-5 pl-4 pr-3">
              <Skeleton className="size-12 shrink-0 rounded-[var(--radius-md)] bg-[var(--color-panel)]" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-52" />
                  <Skeleton className="h-5 w-16 rounded-full bg-[var(--color-panel)]" />
                </div>
                <Skeleton className="h-3.5 w-2/3 bg-[var(--color-panel)]" />
                <Skeleton className="h-3 w-1/2 bg-[var(--color-panel)]" />
              </div>
              <Skeleton className="size-8 shrink-0 rounded-full bg-[var(--color-panel)]" />
            </li>
          ))}
        </ul>
      ) : allProcedures.length === 0 ? (
        <EmptyState
          icon={PiFileText}
          title={isEs ? 'Aún no hay procedimientos' : 'No procedures yet'}
          body={
            isEs
              ? 'Escribe el primero desde la plantilla.'
              : 'Write your first one from the template.'
          }
          action={
            <Link href={`/${locale}/admin/library/new`}>
              <Button icon={LuPlus}>{isEs ? 'Nuevo procedimiento' : 'New procedure'}</Button>
            </Link>
          }
        />
      ) : filteredProcedures.length === 0 ? (
        <EmptyState
          icon={LuFileSearch}
          title={isEs ? 'No se encontraron procedimientos' : 'No procedures found'}
          body={
            isEs
              ? 'Intenta ajustar tus términos de búsqueda o selecciona otra categoría.'
              : 'Try adjusting your search query or selecting another category filter.'
          }
          action={
            hasActiveFilters ? (
              <Button type="button" variant="secondary" onClick={resetFilters}>
                {isEs ? 'Ver todos los procedimientos' : 'View all procedures'}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)]">
          {visibleProcedures.map((p) => {
            const procCategory = p.category ?? (p.subcategoryId ? categoryList.find((c) => c.subcategories?.some((s) => s.id === p.subcategoryId)) : null);
            // No fabricated fallback ("General") when the row carries neither
            // a resolvable category nor a subcategory — unknown stays blank
            // instead of lying about where the procedure lives.
            const catName = procCategory ? (isEs ? procCategory.nameEs : procCategory.nameEn) : null;
            const title = (isEs ? p.titleEs || p.titleEn : p.titleEn || p.titleEs) || p.slug;
            const purpose = isEs ? p.purposeEs || p.purposeEn : p.purposeEn || p.purposeEs;
            // Subcategory resolves from the FK via the map the catalog already
            // builds; absent subcategories just don't render, no string-sniffing
            // fallback that used to lie about recipe sections.
            const sub = p.subcategoryId ? subById.get(p.subcategoryId) ?? null : null;
            const subName = sub ? (isEs ? sub.nameEs : sub.nameEn) : null;
            // Station names — the API sends the denormalised `station`
            // object on list rows, so prefer its name; fall back to the
            // stations list for legacy/detail rows that only carry an id.
            // Kitchen-wide procedures (no station) show no station in the
            // meta line because the whole floor follows them.
            const scopeStations =
              p.station?.name
                ? [p.station.name]
                : p.stationScope && p.stationScope.mode === 'specific' && p.stationScope.stationIds.length > 0
                ? p.stationScope.stationIds
                  .map((id) => liveStations.find((s) => s.id === id)?.name)
                  .filter((n): n is string => Boolean(n))
                : p.stationId
                  ? [liveStations.find((s) => s.id === p.stationId)?.name].filter((n): n is string => Boolean(n))
                  : [];

            return (
              <li key={p.id} className="flex items-center gap-2 pr-3 transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-wash)]">
                {/* The row is the link. Six identical "View" buttons down the
                    list were six copies of one action. What changes the
                    procedure's state sits in its menu. */}
                <Link
                  href={`/${locale}/admin/library/${p.slug || p.id}`}
                  className="group flex min-w-0 flex-1 items-center justify-between gap-4 py-5 pl-4"
                >
                  {/* The icon is a mark, not a framed object: the bordered tile was
                    the only one of its kind in the product. */}
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    {(() => {
                      // The card icon follows the same priority as the employee
                      // procedure list: the body's first image (the recipe photo
                      // or, here, the buckets) is the most specific so it wins;
                      // then the manager's iconImageUrl override; then the
                      // category's default SVG via getProcedureIcon.
                      const findCover = (blocks: ProcedureBlock[] | undefined): string | null => {
                        if (!blocks) return null;
                        const imageBlock = blocks.find(
                          (b): b is Extract<ProcedureBlock, { kind: 'image' }> => b.kind === 'image',
                        );
                        if (imageBlock?.src) return imageBlock.src;
                        for (const b of blocks) {
                          if (b.kind === 'recipe' && b.steps) {
                            for (const s of b.steps) {
                              if (s.imageSrc) return s.imageSrc;
                              if (s.images && s.images.length > 0 && s.images[0].src) return s.images[0].src;
                            }
                          }
                          if (b.kind === 'method' && b.steps) {
                            for (const s of b.steps) {
                              if (s.imageSrc) return s.imageSrc;
                              if (s.images && s.images.length > 0 && s.images[0].src) return s.images[0].src;
                            }
                          }
                        }
                        return null;
                      };
                      const bodyCover = findCover(p.bodyEn?.blocks) ?? findCover(p.bodyEs?.blocks);
                      const iconSrc = bodyCover ?? p.iconImageUrl ?? null;
                      return iconSrc ? (
                        <HoverImagePreview src={iconSrc} alt={title}>
                          <IconTile size="lg" image={{ src: iconSrc, alt: title }} />
                        </HoverImagePreview>
                      ) : (
                        <IconTile
                          size="lg"
                          icon={getProcedureIcon(p, p.subcategoryId ? subById.get(p.subcategoryId) ?? null : null)}
                        />
                      );
                    })()}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h4 className="min-w-0 text-base font-semibold leading-heading text-[var(--color-ink)] transition-colors">
                          {title}
                        </h4>
                        <StatusPill tone={p.isArchived ? 'neutral' : p.status === 'published' ? 'ok' : 'neutral'} withDot>
                          {p.isArchived
                            ? isEs ? 'Archivado' : 'Archived'
                            : p.status === 'published' ? (isEs ? 'Publicado' : 'Published') : isEs ? 'Borrador' : 'Draft'}
                        </StatusPill>
                      </div>

                      {purpose ? (
                        <p className="mt-1 line-clamp-2 text-sm leading-body text-[var(--color-ink-2)]">{purpose}</p>
                      ) : null}

                      {/* One meta line: what it is, what slice of the kitchen it lives
                        in (subcategory + station). The category was also a badge above
                        and a column to the right; it is said once, here. */}
                      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-meta text-[var(--color-ink-3)]">
                        {catName ? <span>{catName}</span> : null}
                        {subName ? (
                          <>
                            {catName ? <span aria-hidden="true">·</span> : null}
                            <span>{subName}</span>
                          </>
                        ) : null}
                        {scopeStations.length > 0 ? (
                          <>
                            {catName || subName ? <span aria-hidden="true">·</span> : null}
                            <span>
                              {scopeStations.length === 1
                                ? scopeStations[0]
                                : `${scopeStations[0]} + ${scopeStations.length - 1}`}
                            </span>
                          </>
                        ) : null}
                        {p.protection === 'confidential' || p.protection === 'master' ? (
                          <>
                            {catName || subName || scopeStations.length > 0 ? (
                              <span aria-hidden="true">·</span>
                            ) : null}
                            <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-ink-2)]">
                              <LuLock aria-hidden="true" />
                              {p.protection === 'master'
                                ? isEs ? 'Receta maestra' : 'Master recipe'
                                : isEs ? 'Confidencial' : 'Confidential'}
                            </span>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>

                </Link>
                <RowActions
                  triggerLabel={`${isEs ? 'Acciones' : 'Actions'}: ${title}`}
                  items={
                    [
                      p.isArchived
                        ? null
                        : { label: isEs ? 'Editar' : 'Edit', icon: LuPencil, onSelect: () => router.push(`/${locale}/admin/library/${p.slug || p.id}/edit`) },
                      p.isArchived
                        ? { label: isEs ? 'Restaurar' : 'Restore', icon: LuArchiveRestore, onSelect: () => void act(p.id, { isArchived: false }) }
                        : p.status === 'draft'
                          ? {
                              label: isEs ? 'Publicar' : 'Publish',
                              icon: LuCircleCheck,
                              onSelect: () => {
                                // Placement gate: publishing needs a station
                                // (or General). Unplaced rows go to the
                                // editor's Access step with the reason shown.
                                if (!canPublishProcedure(p)) {
                                  router.push(`/${locale}/admin/library/${p.slug || p.id}/edit?step=access&publishBlocked=1`);
                                  return;
                                }
                                void act(p.id, { status: 'published' }, p);
                              },
                            }
                          : null,
                      p.isArchived
                        ? null
                        : { label: isEs ? 'Archivar' : 'Archive', icon: LuArchive, onSelect: () => void onArchive(p.id) },
                      {
                        label: isEs ? 'Eliminar' : 'Delete',
                        icon: LuTrash2,
                        destructive: true,
                        confirmTitle: isEs ? 'Eliminar procedimiento' : 'Delete procedure',
                        confirmDescription: isEs
                          ? `"${title}" se eliminará permanentemente. Esta acción no se puede deshacer.`
                          : `"${title}" will be permanently deleted. This cannot be undone.`,
                        confirmLabel: isEs ? 'Sí, eliminar' : 'Yes, delete',
                        onSelect: () => void handleDelete(p.id),
                      },
                    ].filter(Boolean) as RowActionItem[]
                  }
                />
              </li>
            );
          })}
        </ul>
      )}

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
