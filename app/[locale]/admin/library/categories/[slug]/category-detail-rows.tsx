"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSubcategoryIcon } from "@/lib/category-icons";
import type { Category, Procedure, Subcategory } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/modal";
import {
  BilingualInput,
  type BilingualValue,
} from "@/components/ui/bilingual-input";
import { IconTile } from "@/components/ui/icon-tile";
import { Popover } from "@/components/ui/popover";
import { RowActions, type RowActionItem } from "@/components/ui/row-actions";
import { cn } from "@/lib/utils";
import {
  LuCheck,
  LuChevronDown,
  LuChevronRight,
  LuPlus,
  LuSparkles,
  LuX,
} from "react-icons/lu";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { Label } from "@/components/ui/label";
import { CategoryDetailSkeleton } from "@/components/admin/category-detail-skeleton";
import {
  fetchProcedures,
  updateProcedureStation,
} from "@/services/library/api";
import { PROCEDURES_QUERY_KEY } from "@/services/library/hooks";
import {
  backendSlug,
  categorySlugsMatch,
  createBackendSubcategory,
  fetchBackendCategories,
  fetchBackendSubcategories,
} from "@/services/categories/api";
import { StatusPill } from "@/components/ui/status-pill";
import {
  ProcedureListItem,
  type ProcedureRow,
  type StationOption,
  updatedAgoLabel,
} from "./procedure-list-item";

export {
  ProcedureListItem,
  type ProcedureRow,
  type StationOption,
  updatedAgoLabel,
};
/** One accordion row. The header is the clickable subcategory row; the
 *  body lists the published procedures with one station chip (or the
 *  "All stations" label for general categories) + the change-station
 *  picker. There is no Add affordance — the chip (or the "No station"
 *  pill) opens the picker and picks the single station. Mirrors the demo
 *  recipes view: aggregated stations strip lives in the header when the
 *  panel is open, per-row chip + picker live inside. */
export function SubcategoryAccordion({
  category,
  subcategory,
  procedures,
  stations,
  isEs,
  isOpen,
  onToggle,
  onToggleStation,
  locale,
}: {
  category: Category;
  subcategory: Subcategory;
  procedures: ProcedureRow[];
  stations: StationOption[];
  isEs: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onToggleStation: (
    procedureId: string,
    next: Array<{ id: string; name: string }>,
  ) => void;
  locale: string;
}): React.ReactElement {
  const router = useRouter();
  const subName = isEs ? subcategory.nameEs : subcategory.nameEn;
  const subNameSecondary = isEs ? subcategory.nameEn : subcategory.nameEs;
  const headerId = `sub-header-${subcategory.id || subcategory.slug}`;
  const panelId = `sub-panel-${subcategory.id || subcategory.slug}`;
  const SubIcon = getSubcategoryIcon(subcategory);

  // General categories apply to every station — the header shows one
  // "All stations" pill instead of per-station chips.
  const isGeneral = category.kind === "general";

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xs">
      <div
        id={headerId}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={(e) => {
          if (
            (e.target as HTMLElement).closest(
              'button, a, [role="menuitem"], [role="dialog"]',
            )
          ) {
            return;
          }
          onToggle();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            if ((e.target as HTMLElement).closest("button, a")) return;
            e.preventDefault();
            onToggle();
          }
        }}
        className={cn(
          "flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)]",
          isOpen ? "bg-[var(--color-wash)]" : "hover:bg-[var(--color-wash)]",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <IconTile size="md" icon={SubIcon} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-semibold text-[var(--color-ink)]">
                {subName}
              </h2>
              <span className="text-xs font-normal text-[var(--color-ink-3)]">
                · {procedures.length}{" "}
                {procedures.length === 1
                  ? isEs
                    ? "procedimiento"
                    : "procedure"
                  : isEs
                    ? "procedimientos"
                    : "procedures"}
              </span>
            </div>
            <p className="mt-0.5 truncate text-sm leading-meta text-[var(--color-ink-3)]">
              {subNameSecondary}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <Button
            variant="primary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              // The wizard's Access step asks the manager to attach the
              // station — pre-filling it from this accordion would skip
              // that decision and leak the wrong station to general
              // procedures. Pass only category + subcategory; the wizard
              // applies its own default (general → all stations,
              // station-specific → none) once the manager reaches it.
              router.push(
                `/${locale}/admin/library/new?category=${category.slug}&subcategory=${subcategory.slug}`,
              );
            }}
            className="shrink-0 font-semibold shadow-2xs"
          >
            <LuPlus className="text-base" />
            <span>{isEs ? "Añadir procedimiento" : "Add procedure"}</span>
          </Button>

          <LuChevronRight
            aria-hidden="true"
            className={cn(
              "size-4 shrink-0 text-[var(--color-ink-3)] transition-transform",
              isOpen && "rotate-90",
            )}
          />
        </div>
      </div>

      {isOpen && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          className="border-t border-[var(--color-line-2)] bg-[var(--color-surface)]"
        >
          {procedures.length === 0 ? (
            <div className="p-6">
              <EmptyState
                compact
                title={
                  isEs
                    ? "Sin procedimientos aún en esta subcategoría."
                    : "No procedures yet in this subcategory."
                }
              />
            </div>
          ) : (
            <div>
              <ul className="divide-y divide-[var(--color-line)]">
                {procedures.map((proc) => (
                  <ProcedureListItem
                    key={proc.id}
                    procedure={proc}
                    stations={stations}
                    isEs={isEs}
                    isGeneral={isGeneral}
                    onToggleStation={(next) => onToggleStation(proc.id, next)}
                    onOpenProcedure={() =>
                      router.push(`/${locale}/admin/library/${proc.slug}`)
                    }
                    onEditProcedure={() =>
                      router.push(`/${locale}/admin/library/${proc.slug}/edit`)
                    }
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}