"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LuArchive,
  LuArchiveRestore,
  LuCircleCheck,
  LuFileSearch,
  LuFilter,
  LuLock,
  LuPencil,
  LuPlus,
  LuRefreshCw,
  LuSearch,
  LuTrash2,
  LuX,
} from "react-icons/lu";
import { PiFileText } from "react-icons/pi";
import type {
  Category,
  Procedure,
  ProcedureBlock,
  ProcedureStatus,
  Station,
  Subcategory,
} from "@/lib/types";
import { canPublishProcedure } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { HoverImagePreview } from "@/components/ui/hover-image-preview";
import { IconTile } from "@/components/ui/icon-tile";
import { Pagination } from "@/components/ui/pagination";
import { RowActions, type RowActionItem } from "@/components/ui/row-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ui/status-pill";
import { getProcedureIcon } from "@/lib/category-icons";

export function ProcedureExplorerResults({
  loading,
  isEs,
  locale,
  allProcedures,
  filteredProcedures,
  visibleProcedures,
  hasActiveFilters,
  resetFilters,
  categoryList,
  subById,
  liveStations,
  act,
  onArchive,
  onDelete,
}: {
  loading: boolean;
  isEs: boolean;
  locale: string;
  allProcedures: Procedure[];
  filteredProcedures: Procedure[];
  visibleProcedures: Procedure[];
  hasActiveFilters: boolean;
  resetFilters: () => void;
  categoryList: Category[];
  subById: Map<string, Subcategory>;
  liveStations: Station[];
  act: (
    id: string,
    change: { status?: ProcedureStatus; isArchived?: boolean },
    row?: Procedure,
  ) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const router = useRouter();
  return (
    <>
      {loading ? (
        <ul
          aria-busy="true"
          aria-label={isEs ? "Cargando procedimientos" : "Loading procedures"}
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
          title={isEs ? "Aún no hay procedimientos" : "No procedures yet"}
          body={
            isEs
              ? "Escribe el primero desde la plantilla."
              : "Write your first one from the template."
          }
          action={
            <Link href={`/${locale}/admin/library/new`}>
              <Button icon={LuPlus}>
                {isEs ? "Nuevo procedimiento" : "New procedure"}
              </Button>
            </Link>
          }
        />
      ) : filteredProcedures.length === 0 ? (
        <EmptyState
          icon={LuFileSearch}
          title={
            isEs ? "No se encontraron procedimientos" : "No procedures found"
          }
          body={
            isEs
              ? "Intenta ajustar tus términos de búsqueda o selecciona otra categoría."
              : "Try adjusting your search query or selecting another category filter."
          }
          action={
            hasActiveFilters ? (
              <Button type="button" variant="secondary" onClick={resetFilters}>
                {isEs ? "Ver todos los procedimientos" : "View all procedures"}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)]">
          {visibleProcedures.map((p) => {
            const procCategory =
              p.category ??
              (p.subcategoryId
                ? categoryList.find((c) =>
                    c.subcategories?.some((s) => s.id === p.subcategoryId),
                  )
                : null);
            // No fabricated fallback ("General") when the row carries neither
            // a resolvable category nor a subcategory — unknown stays blank
            // instead of lying about where the procedure lives.
            const catName = procCategory
              ? isEs
                ? procCategory.nameEs
                : procCategory.nameEn
              : null;
            const title =
              (isEs ? p.titleEs || p.titleEn : p.titleEn || p.titleEs) ||
              p.slug;
            const purpose = isEs
              ? p.purposeEs || p.purposeEn
              : p.purposeEn || p.purposeEs;
            // Subcategory resolves from the FK via the map the catalog already
            // builds; absent subcategories just don't render, no string-sniffing
            // fallback that used to lie about recipe sections.
            const sub = p.subcategoryId
              ? (subById.get(p.subcategoryId) ?? null)
              : null;
            const subName = sub ? (isEs ? sub.nameEs : sub.nameEn) : null;
            // Station names — the API sends the denormalised `station`
            // object on list rows, so prefer its name; fall back to the
            // stations list for legacy/detail rows that only carry an id.
            // Kitchen-wide procedures (no station) show no station in the
            // meta line because the whole floor follows them.
            const scopeStations = p.station?.name
              ? [p.station.name]
              : p.stationScope &&
                  p.stationScope.mode === "specific" &&
                  p.stationScope.stationIds.length > 0
                ? p.stationScope.stationIds
                    .map((id) => liveStations.find((s) => s.id === id)?.name)
                    .filter((n): n is string => Boolean(n))
                : p.stationId
                  ? [
                      liveStations.find((s) => s.id === p.stationId)?.name,
                    ].filter((n): n is string => Boolean(n))
                  : [];

            return (
              <li
                key={p.id}
                className="flex items-center gap-2 pr-3 transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-wash)]"
              >
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
                      const findCover = (
                        blocks: ProcedureBlock[] | undefined,
                      ): string | null => {
                        if (!blocks) return null;
                        const imageBlock = blocks.find(
                          (
                            b,
                          ): b is Extract<ProcedureBlock, { kind: "image" }> =>
                            b.kind === "image",
                        );
                        if (imageBlock?.src) return imageBlock.src;
                        for (const b of blocks) {
                          if (b.kind === "recipe" && b.steps) {
                            for (const s of b.steps) {
                              if (s.imageSrc) return s.imageSrc;
                              if (
                                s.images &&
                                s.images.length > 0 &&
                                s.images[0].src
                              )
                                return s.images[0].src;
                            }
                          }
                          if (b.kind === "method" && b.steps) {
                            for (const s of b.steps) {
                              if (s.imageSrc) return s.imageSrc;
                              if (
                                s.images &&
                                s.images.length > 0 &&
                                s.images[0].src
                              )
                                return s.images[0].src;
                            }
                          }
                        }
                        return null;
                      };
                      const bodyCover =
                        findCover(p.bodyEn?.blocks) ??
                        findCover(p.bodyEs?.blocks);
                      const iconSrc = bodyCover ?? p.iconImageUrl ?? null;
                      return iconSrc ? (
                        <HoverImagePreview src={iconSrc} alt={title}>
                          <IconTile
                            size="lg"
                            image={{ src: iconSrc, alt: title }}
                          />
                        </HoverImagePreview>
                      ) : (
                        <IconTile
                          size="lg"
                          icon={getProcedureIcon(
                            p,
                            p.subcategoryId
                              ? (subById.get(p.subcategoryId) ?? null)
                              : null,
                          )}
                        />
                      );
                    })()}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h4 className="min-w-0 text-base font-semibold leading-heading text-[var(--color-ink)] transition-colors">
                          {title}
                        </h4>
                        <StatusPill
                          tone={
                            p.isArchived
                              ? "neutral"
                              : p.status === "published"
                                ? "ok"
                                : "neutral"
                          }
                          withDot
                        >
                          {p.isArchived
                            ? isEs
                              ? "Archivado"
                              : "Archived"
                            : p.status === "published"
                              ? isEs
                                ? "Publicado"
                                : "Published"
                              : isEs
                                ? "Borrador"
                                : "Draft"}
                        </StatusPill>
                      </div>

                      {purpose ? (
                        <p className="mt-1 line-clamp-2 text-sm leading-body text-[var(--color-ink-2)]">
                          {purpose}
                        </p>
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
                            {catName || subName ? (
                              <span aria-hidden="true">·</span>
                            ) : null}
                            <span>
                              {scopeStations.length === 1
                                ? scopeStations[0]
                                : `${scopeStations[0]} + ${scopeStations.length - 1}`}
                            </span>
                          </>
                        ) : null}
                        {p.protection === "confidential" ||
                        p.protection === "master" ? (
                          <>
                            {catName || subName || scopeStations.length > 0 ? (
                              <span aria-hidden="true">·</span>
                            ) : null}
                            <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-ink-2)]">
                              <LuLock aria-hidden="true" />
                              {p.protection === "master"
                                ? isEs
                                  ? "Receta maestra"
                                  : "Master recipe"
                                : isEs
                                  ? "Confidencial"
                                  : "Confidential"}
                            </span>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>
                </Link>
                <RowActions
                  triggerLabel={`${isEs ? "Acciones" : "Actions"}: ${title}`}
                  items={
                    [
                      p.isArchived
                        ? null
                        : {
                            label: isEs ? "Editar" : "Edit",
                            icon: LuPencil,
                            onSelect: () =>
                              router.push(
                                `/${locale}/admin/library/${p.slug || p.id}/edit`,
                              ),
                          },
                      p.isArchived
                        ? {
                            label: isEs ? "Restaurar" : "Restore",
                            icon: LuArchiveRestore,
                            onSelect: () =>
                              void act(p.id, { isArchived: false }),
                          }
                        : p.status === "draft"
                          ? {
                              label: isEs ? "Publicar" : "Publish",
                              icon: LuCircleCheck,
                              onSelect: () => {
                                // Placement gate: publishing needs a station
                                // (or General). Unplaced rows go to the
                                // editor's Access step with the reason shown.
                                if (!canPublishProcedure(p)) {
                                  router.push(
                                    `/${locale}/admin/library/${p.slug || p.id}/edit?step=access&publishBlocked=1`,
                                  );
                                  return;
                                }
                                void act(p.id, { status: "published" }, p);
                              },
                            }
                          : null,
                      p.isArchived
                        ? null
                        : {
                            label: isEs ? "Archivar" : "Archive",
                            icon: LuArchive,
                            onSelect: () => void onArchive(p.id),
                          },
                      {
                        label: isEs ? "Eliminar" : "Delete",
                        icon: LuTrash2,
                        destructive: true,
                        confirmTitle: isEs
                          ? "Eliminar procedimiento"
                          : "Delete procedure",
                        confirmDescription: isEs
                          ? `"${title}" se eliminará permanentemente. Esta acción no se puede deshacer.`
                          : `"${title}" will be permanently deleted. This cannot be undone.`,
                        confirmLabel: isEs ? "Sí, eliminar" : "Yes, delete",
                        onSelect: () => void onDelete(p.id),
                      },
                    ].filter(Boolean) as RowActionItem[]
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
