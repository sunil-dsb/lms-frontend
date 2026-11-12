"use client";

import * as React from "react";

import { useTranslations } from "next-intl";

import {
  LuCheck,
  LuChevronDown,
  LuFileText,
  LuSearch,
  LuSparkles,
  LuTrash2,
  LuUpload,
  LuUsers,
  LuX,
} from "react-icons/lu";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusPill } from "@/components/ui/status-pill";

import { IconTile } from "@/components/ui/icon-tile";

import {
  getCategoryIcon,
  getProcedureGlyphForSubcategory,
} from "@/lib/category-icons";

import { cn } from "@/lib/utils";
import { uploadMedia } from "@/lib/api";

import type { AdminEmployee, Category, Role, Station } from "@/lib/types";
import { PromoConfigModal, type PromoData } from "./promo-config-modal";

export function CategoryAccordion({
  categories,
  selectedSubcategoryId,
  onSelectSubcategory,
  locale,
}: {
  categories: Category[];
  selectedSubcategoryId: string;
  onSelectSubcategory: (categoryId: string, subcategoryId: string) => void;
  locale: string;
}): React.ReactElement {
  const t = useTranslations("admin.library.editor");
  const isEs = locale === "es";

  // Open the parent that holds the currently selected subcategory, falling
  // back to the first category so the accordion never starts fully closed.
  const owningParentId = React.useMemo(() => {
    for (const c of categories) {
      if (c.subcategories?.some((s) => s.id === selectedSubcategoryId)) {
        return c.id;
      }
    }
    return categories[0]?.id ?? null;
  }, [categories, selectedSubcategoryId]);

  const [openId, setOpenId] = React.useState<string | null>(owningParentId);
  React.useEffect(() => {
    // Keep the parent of the live selection expanded even after the user
    // picks a subcategory from elsewhere — otherwise the pill they just
    // tapped disappears inside a closed card.
    if (owningParentId) setOpenId(owningParentId);
  }, [owningParentId]);

  if (categories.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-3)] bg-[var(--color-wash)] p-4 text-sm text-[var(--color-ink-2)]">
        {t("categoriesEmpty")}
      </div>
    );
  }

  const subName = (s: { nameEn: string; nameEs?: string }): string =>
    isEs ? s.nameEs || s.nameEn : s.nameEn;
  const catName = (c: { nameEn: string; nameEs?: string }): string =>
    isEs ? c.nameEs || c.nameEn : c.nameEn;

  return (
    // Dense flow reproduces the demo layout at any breakpoint: tiles fill
    // rows of three, the open panel drops in right after its tile's row
    // (the tiles that follow backfill the rest of that row), then the grid
    // continues below — pure CSS, same accordion behaviour as before.
    <div className="grid grid-flow-row-dense grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((cat) => {
        const isOpen = openId === cat.id;
        const subs = cat.subcategories ?? [];
        // A tile is "active" when this parent owns the current selection —
        // brand tint + brand icon tile, so the chosen category is
        // unmissable. The checkmark on the right is the same affordance
        // every selected list row wears.
        const isActiveParent = subs.some((s) => s.id === selectedSubcategoryId);
        const CatIcon = getCategoryIcon(cat);
        return (
          <React.Fragment key={cat.id}>
            <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xs">
              <div
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                onClick={() => setOpenId(isOpen ? null : cat.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpenId(isOpen ? null : cat.id);
                  }
                }}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-3 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)]",
                  isActiveParent
                    ? "bg-[var(--color-brand-tint)]"
                    : isOpen
                      ? "bg-[var(--color-wash)]"
                      : "hover:bg-[var(--color-wash)]",
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <IconTile
                    size="sm"
                    icon={CatIcon}
                    tone={isActiveParent ? "quiet" : "neutral"}
                  />
                  <div className="min-w-0">
                    <h3
                      className={cn(
                        "truncate text-sm font-semibold",
                        isActiveParent
                          ? "text-[var(--color-brand-700)]"
                          : "text-[var(--color-ink)]",
                      )}
                    >
                      {catName(cat)}
                    </h3>
                    <p
                      className={cn(
                        "mt-0.5 truncate text-xs leading-meta",
                        isActiveParent
                          ? "text-[var(--color-brand-700)] opacity-80"
                          : "text-[var(--color-ink-3)]",
                      )}
                    >
                      {subs.length === 0
                        ? t("categoriesNoSubs")
                        : t("categoriesCount", { count: subs.length })}
                    </p>
                  </div>
                </div>
                {isActiveParent ? (
                  <span
                    aria-hidden="true"
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-[var(--color-surface)]"
                  >
                    <LuCheck aria-hidden="true" className="size-4" />
                  </span>
                ) : (
                  <LuChevronDown
                    aria-hidden="true"
                    className={cn(
                      "size-4 shrink-0 text-[var(--color-ink-3)] transition-transform",
                      isOpen && "-rotate-180 text-[var(--color-ink-2)]",
                    )}
                  />
                )}
              </div>
            </div>

            {/* Full-width chips panel — sits directly under the row that
                holds its tile (dense flow backfills the rest of that row). */}
            {isOpen ? (
              <div
                className={cn(
                  "col-span-full rounded-[var(--radius-lg)] border bg-[var(--color-surface)] p-4",
                  isActiveParent
                    ? "border-[var(--color-brand-600)]"
                    : "border-[var(--color-line-2)]",
                )}
              >
                <p className="text-xs leading-meta text-[var(--color-ink-3)]">
                  {t("categoriesSubLabel", { name: catName(cat) })}
                </p>
                <div className="mt-3">
                  {subs.length === 0 ? (
                    <p className="text-sm text-[var(--color-ink-3)]">
                      {t("categoriesNoSubs")}
                    </p>
                  ) : (
                    <ul className="flex flex-wrap gap-2" role="list">
                      {subs.map((sub) => {
                        const isSelected = selectedSubcategoryId === sub.id;
                        return (
                          <li key={sub.id}>
                            <button
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() =>
                                onSelectSubcategory(cat.id, sub.id)
                              }
                              className={cn(
                                "inline-flex items-center gap-2 rounded-full border bg-[var(--color-surface)] px-4 py-3 text-sm font-semibold transition-colors",
                                isSelected
                                  ? "border-[var(--color-brand-600)] text-[var(--color-brand-700)] ring-2 ring-[var(--color-brand-tint)]"
                                  : "border-[var(--color-line)] text-[var(--color-ink)] hover:border-[var(--color-line-hover)] hover:bg-[var(--color-wash)]",
                              )}
                            >
                              {isSelected ? (
                                <LuCheck
                                  aria-hidden="true"
                                  className="size-4 text-[var(--color-brand-600)]"
                                />
                              ) : null}
                              <span>{subName(sub)}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function AssignBlock({
  people,
  stations,
  roles = [],
  filterStationIds,
  selected,
  onToggle,
}: {
  people: AdminEmployee[];
  stations: Station[];
  roles?: Role[];
  filterStationIds: string[] | null;
  selected: string[];
  onToggle: (id: string) => void;
  isEs: boolean;
}): React.ReactElement {
  const t = useTranslations("admin.library.editor");
  const [search, setSearch] = React.useState("");
  const [expanded, setExpanded] = React.useState(false);
  const VISIBLE_COUNT = 9;

  const roleNameById = React.useMemo(
    () => new Map((roles ?? []).map((r) => [r.id, r.name])),
    [roles],
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    // Everyone stays visible: employees of the selected stations sort
    // first, the rest follow alphabetically so extras can be assigned too.
    const inStation = (p: (typeof people)[number]): boolean =>
      !filterStationIds || filterStationIds.length === 0
        ? true
        : p.stationIds.some((id) => filterStationIds.includes(id));
    return people
      .filter((p) => {
        if (!q) return true;
        const role = (p.role ?? "").toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.employeeCode ?? "").toLowerCase().includes(q) ||
          role.includes(q)
        );
      })
      .sort(
        (a, b) =>
          Number(inStation(b)) - Number(inStation(a)) ||
          a.name.localeCompare(b.name),
      );
  }, [people, filterStationIds, search]);

  const stationNameById = React.useMemo(
    () => new Map(stations.map((s) => [s.id, s.name])),
    [stations],
  );

  // When the search query narrows the list past the visible threshold, we
  // just show everything that matches — no need to gate behind "Show more"
  // when the manager is already drilling down with text.
  const visible =
    search.trim() || expanded ? filtered : filtered.slice(0, VISIBLE_COUNT);
  const hiddenCount = filtered.length - visible.length;

  return (
    <div className="space-y-4">
      {/* Top bar — title + count + search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <IconTile size="xs" icon={LuUsers} />
          <h3 className="text-sm font-semibold text-[var(--color-ink)]">
            {t("assignTitle")}
          </h3>
          {selected.length > 0 ? (
            <span className="text-xs sm:text-sm font-normal text-[var(--color-ink-3)] whitespace-nowrap">
              {t("assignPicked", { count: selected.length })}
            </span>
          ) : null}
        </div>

        <div className="relative flex w-full sm:w-[280px] md:w-[340px] items-center rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-2 sm:py-2 transition-colors focus-within:border-[var(--color-brand)]">
          <LuSearch
            aria-hidden="true"
            className="mr-2 size-4 shrink-0 text-[var(--color-ink-3)]"
          />
          <label className="sr-only" htmlFor="assign-search">
            {t("assignSearch")}
          </label>
          <input
            id="assign-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("assignSearchPlaceholder")}
            className="w-full min-w-0 bg-transparent text-xs sm:text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:outline-none"
          />
          {search ? (
            <button
              type="button"
              aria-label={t("assignClear")}
              onClick={() => setSearch("")}
              className="ml-1 shrink-0 text-[var(--color-ink-3)] hover:text-[var(--color-ink)] cursor-pointer"
            >
              <LuX aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>
      </div>
      {filterStationIds && filterStationIds.length > 0 ? (
        <p className="-mt-1 text-xs leading-meta text-[var(--color-ink-3)]">
          {t("assignSubtitle")}
        </p>
      ) : null}

      {/* Employee cards — three columns, generous tap targets. */}
      {filtered.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-3)] bg-[var(--color-wash)] p-6 text-center text-sm text-[var(--color-ink-2)]">
          {t("assignEmpty")}
        </div>
      ) : (
        <>
          <ul
            role="list"
            aria-label={t("assignTitle")}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {visible.map((p) => {
              const isOn = selected.includes(p.id);
              const initials = initialsOf(p.name);
              const assignedRoleName =
                p.roleIds
                  .map((id) => roleNameById.get(id))
                  .filter(Boolean)[0] ||
                (p.role === "admin" ? "Head Chef" : "Line Cook");
              const stationList = p.stationIds
                .map((id) => stationNameById.get(id))
                .filter(Boolean);
              const personStations = stationList.join(" · ");
              const subtitle =
                [assignedRoleName, personStations]
                  .filter(Boolean)
                  .join(" · ") || assignedRoleName;

              return (
                <li key={p.id}>
                  <button
                    type="button"
                    aria-pressed={isOn}
                    onClick={() => onToggle(p.id)}
                    className={cn(
                      "flex w-full items-center gap-[12px] rounded-[var(--radius-lg)] border-2 px-[14px] py-[8px] text-left transition-all",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
                      isOn
                        ? "border-[var(--color-brand-600)] bg-[var(--color-brand-tint)]"
                        : "border-[var(--color-line-2)] bg-[var(--color-surface)] hover:border-[var(--color-brand-600)]",
                    )}
                  >
                    <div className="flex size-[30px] shrink-0 items-center justify-center">
                      {isOn ? (
                        <span
                          className="flex size-[22px] items-center justify-center rounded-full bg-[var(--color-brand-600)] text-[var(--color-surface)] shadow-xs"
                          aria-hidden="true"
                        >
                          <LuCheck className="size-4 stroke-[3]" />
                        </span>
                      ) : (
                        <span
                          className="flex size-[30px] items-center justify-center rounded-full border border-[var(--color-line-2)] bg-[var(--color-wash)] text-xs font-semibold text-[var(--color-ink-2)]"
                          aria-hidden="true"
                        >
                          {initials}
                        </span>
                      )}
                    </div>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-sm font-semibold leading-tight",
                          isOn
                            ? "text-[var(--color-brand-700)]"
                            : "text-[var(--color-ink)]",
                        )}
                      >
                        {p.name}
                      </span>
                      <span
                        className={cn(
                          "block truncate text-xs leading-tight mt-0.5",
                          isOn
                            ? "text-[var(--color-brand-700)] opacity-85"
                            : "text-[var(--color-ink-3)]",
                        )}
                      >
                        {subtitle}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {hiddenCount > 0 && !search.trim() ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)] py-[10px] text-sm font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-line-3)] hover:bg-[var(--color-panel)]"
            >
              <LuFileText
                aria-hidden="true"
                className="size-4 text-[var(--color-ink-2)]"
              />
              <span>{t("assignShowMore", { count: hiddenCount })}</span>
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

/** First letter of the first two words, uppercase. "María González" -> "MG". */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("");
}

export function ProcedureIconPicker({
  subcategorySlug,
  imageUrl,
  onChange,
}: {
  subcategorySlug: string | null;
  imageUrl: string | null;
  onChange: (next: string | null, fileName?: string | null) => void;
}): React.ReactElement {
  const t = useTranslations("admin.library.editor");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState<boolean>(false);
  const [fileName, setFileName] = React.useState<string | null>(null);

  const DefaultGlyph = getProcedureGlyphForSubcategory(subcategorySlug);

  const displayFileName = React.useMemo(() => {
    if (fileName) return fileName;
    if (imageUrl) {
      const clean = imageUrl.split("/").pop()?.split("?")[0];
      return clean && clean.length > 0 ? clean : t("iconLabelDefault");
    }
    return t("iconLabelDefault");
  }, [fileName, imageUrl, t]);

  function pick(): void {
    if (uploading) return;
    setError(null);
    inputRef.current?.click();
  }

  async function onFile(
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const isImage =
      (file.type && file.type.startsWith("image/")) ||
      /\.(jpe?g|png|webp|gif|svg|avif|bmp|jfif|pjpeg)$/i.test(file.name);
    if (!isImage) {
      setError(t("iconFileTypeError"));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image too large (max 10 MB)");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const uploadedUrl = await uploadMedia(file);
      if (!uploadedUrl) {
        throw new Error("No URL returned from upload");
      }
      setFileName(file.name);
      onChange(uploadedUrl, file.name);
      toast.success("Icon uploaded successfully");
    } catch (err) {
      console.error("Failed to upload procedure icon:", err);
      setError(
        err instanceof Error ? err.message : "Upload failed. Please try again.",
      );
      toast.error("Failed to upload icon");
    } finally {
      setUploading(false);
    }
  }

  function clear(): void {
    if (uploading) return;
    if (imageUrl && imageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(imageUrl);
    }
    setFileName(null);
    onChange(null, null);
    setError(null);
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      {imageUrl ? (
        <div className="relative">
          <IconTile size="lg" image={{ src: imageUrl, alt: displayFileName }} />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-[var(--radius-md)] bg-black/40 backdrop-blur-[1px]">
              <span className="spinner text-white" aria-hidden="true" />
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          <IconTile size="lg" icon={DefaultGlyph} />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-[var(--radius-md)] bg-black/40 backdrop-blur-[1px]">
              <span className="spinner text-white" aria-hidden="true" />
            </div>
          )}
        </div>
      )}

      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-bold leading-tight text-[var(--color-ink)]">
          {imageUrl ? displayFileName : t("iconLabelDefault")}
        </p>
        <p className="text-xs text-[var(--color-ink-3)]">
          {t("iconPickerHint")}
        </p>
        {uploading ? (
          <p className="text-xs font-medium text-[var(--color-brand-600)] flex items-center gap-2">
            <span className="spinner size-3" aria-hidden="true" />
            Uploading icon…
          </p>
        ) : error ? (
          <p className="text-xs font-semibold text-[var(--color-bad)]">
            {error}
          </p>
        ) : null}
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          icon={LuUpload}
          disabled={uploading}
          onClick={pick}
        >
          {uploading
            ? "Uploading…"
            : imageUrl
              ? t("iconReplace")
              : t("iconUpload")}
        </Button>
        {imageUrl && !uploading ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={LuTrash2}
            onClick={clear}
          >
            {t("iconRemove")}
          </Button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif"
        className="hidden"
        onChange={(e) => void onFile(e)}
      />
    </div>
  );
}

function formatDateTime(iso: string, locale: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  } catch {
    return iso;
  }
}

export function PromoSection({
  isPromo,
  onChangeIsPromo,
  promoStartsAt,
  onChangePromoStartsAt,
  promoExpiresAt,
  onChangePromoExpiresAt,
  promoEmployeeIds,
  onChangePromoEmployeeIds,
  title,
  stations,
  stationIds,
  onChangeStationIds,
  people,
  locale,
}: {
  isPromo: boolean;
  onChangeIsPromo: (val: boolean) => void;
  promoStartsAt: string | null;
  onChangePromoStartsAt: (val: string | null) => void;
  promoExpiresAt: string | null;
  onChangePromoExpiresAt: (val: string | null) => void;
  promoEmployeeIds: string[];
  onChangePromoEmployeeIds: (ids: string[]) => void;
  title?: string;
  stations?: Station[];
  stationIds?: string[];
  onChangeStationIds?: (ids: string[]) => void;
  people: AdminEmployee[];
  locale: string;
}): React.ReactElement {
  const t = useTranslations("admin.library.editor");
  const isEs = locale === "es";
  const [modalOpen, setModalOpen] = React.useState(false);

  const handleSaveModal = (data: PromoData) => {
    onChangeIsPromo(data.isPromo);
    onChangePromoStartsAt(data.promoStartsAt);
    onChangePromoExpiresAt(data.promoExpiresAt);
    onChangePromoEmployeeIds(data.promoEmployeeIds);
    if (data.stationIds && onChangeStationIds) {
      onChangeStationIds(data.stationIds);
    }
  };

  const selectedIds = React.useMemo(
    () => new Set(promoEmployeeIds),
    [promoEmployeeIds],
  );
  const allSelected =
    people.length > 0 && people.every((p) => selectedIds.has(p.id));

  return (
    <section
      id="proc-promo"
      className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6 transition-colors"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <IconTile size="xs" icon={LuSparkles} />
          <h3 className="text-sm font-semibold text-[var(--color-ink)]">
            {t("promoTitle")}
          </h3>
          <StatusPill tone={isPromo ? "ok" : "neutral"} withDot={isPromo}>
            {isPromo
              ? isEs
                ? "Activo"
                : "Active"
              : isEs
                ? "Inactivo"
                : "Inactive"}
          </StatusPill>
        </div>

        {/* Action button + quick toggle */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant={isPromo ? "secondary" : "primary"}
            size="sm"
            icon={LuSparkles}
            onClick={() => setModalOpen(true)}
          >
            {isPromo
              ? isEs
                ? "Configurar promoción"
                : "Configure promo"
              : isEs
                ? "Activar promoción"
                : "Enable promo"}
          </Button>

          <label className="flex shrink-0 cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={isPromo}
              onChange={(event) => {
                const next = event.target.checked;
                onChangeIsPromo(next);
                if (next) {
                  setModalOpen(true);
                }
              }}
              className="size-5 cursor-pointer accent-[var(--color-brand-600)]"
            />
          </label>
        </div>
      </div>

      <p className="mt-2 text-xs leading-meta text-[var(--color-ink-3)]">
        {t("promoSubtitle")}
      </p>

      {isPromo ? (
        <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)]/40 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-semibold text-[var(--color-ink)] block">
                {isEs ? "Periodo de promoción" : "Promotion window"}
              </span>
              <span className="text-[var(--color-ink-2)] mt-0.5 block">
                {promoStartsAt
                  ? formatDateTime(promoStartsAt, locale)
                  : isEs
                    ? "Inicia de inmediato"
                    : "Active immediately"}
                {" → "}
                {promoExpiresAt
                  ? formatDateTime(promoExpiresAt, locale)
                  : isEs
                    ? "Sin fecha de expiración"
                    : "No expiration date"}
              </span>
            </div>

            <div>
              <span className="font-semibold text-[var(--color-ink)] block">
                {isEs ? "Audiencia asignada" : "Assigned audience"}
              </span>
              <span className="text-[var(--color-ink-2)] mt-0.5 block">
                {allSelected
                  ? isEs
                    ? "Todos los empleados"
                    : "All employees"
                  : promoEmployeeIds.length > 0
                    ? isEs
                      ? `${promoEmployeeIds.length} empleados seleccionados`
                      : `${promoEmployeeIds.length} employees selected`
                    : isEs
                      ? "Sin empleados específicos seleccionados"
                      : "No specific employees selected"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[var(--color-line-2)] text-xs">
            <span className="text-[var(--color-ink-3)] text-[11px] leading-relaxed">
              {isEs
                ? "Al terminar la promoción, el platillo abandona automáticamente la sección de promoción y permanece en el menú de la estación."
                : "When the promo ends, the dish automatically leaves the promo section and remains in the regular station menu."}
            </span>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={LuSparkles}
              onClick={() => setModalOpen(true)}
            >
              {isEs ? "Editar promoción" : "Edit promo"}
            </Button>
          </div>
        </div>
      ) : null}

      <PromoConfigModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        procedureTitle={title}
        initialValues={{
          isPromo,
          promoStartsAt,
          promoExpiresAt,
          promoEmployeeIds,
          stationIds,
        }}
        initialEmployees={people}
        initialStations={stations}
        onSave={handleSaveModal}
        locale={locale}
      />
    </section>
  );
}
