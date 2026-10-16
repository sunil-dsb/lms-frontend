"use client";

import * as React from "react";

import { useTranslations } from "next-intl";

import {
  LuCheck,
  LuChevronRight,
  LuFileText,
  LuSearch,
  LuTrash2,
  LuUpload,
  LuUsers,
  LuX,
} from "react-icons/lu";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

import { IconTile } from "@/components/ui/icon-tile";

import {
  getCategoryIcon,
  getProcedureGlyphForSubcategory,
} from "@/lib/category-icons";

import { cn } from "@/lib/utils";
import { uploadMedia } from "@/lib/api";

import type { AdminEmployee, Category, Role, Station } from "@/lib/types";

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
    <div className="space-y-3">
      {categories.map((cat) => {
        const isOpen = openId === cat.id;
        const subs = cat.subcategories ?? [];
        // A row is "active" when this parent owns the current selection —
        // the whole header gets a brand tint and a brand icon tile, so the
        // chosen category is unmissable. The checkmark on the right is the
        // same affordance every selected list row wears.
        const isActiveParent = subs.some((s) => s.id === selectedSubcategoryId);
        const CatIcon = getCategoryIcon(cat);
        return (
          <div
            key={cat.id}
            className={cn(
              "overflow-hidden rounded-[var(--radius-lg)] border bg-[var(--color-surface)] shadow-2xs",
              isActiveParent
                ? "border-[var(--color-line-2)]"
                : "border-[var(--color-line-2)]",
            )}
          >
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
                "flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)]",
                isActiveParent
                  ? "bg-[var(--color-brand-tint)]"
                  : isOpen
                    ? "bg-[var(--color-wash)]"
                    : "hover:bg-[var(--color-wash)]",
              )}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
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
                <LuChevronRight
                  aria-hidden="true"
                  className={cn(
                    "size-4 shrink-0 text-[var(--color-ink-3)] transition-transform",
                    isOpen && "rotate-90 text-[var(--color-ink-2)]",
                  )}
                />
              )}
            </div>

            {isOpen ? (
              <div className="border-t border-[var(--color-line)] p-4">
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
                            onClick={() => onSelectSubcategory(cat.id, sub.id)}
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
            ) : null}
          </div>
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
          <IconTile size="xs" icon={LuUsers} />
          <h3 className="text-sm font-semibold text-[var(--color-ink)]">
            {t("assignTitle")}
          </h3>
          {selected.length > 0 ? (
            <span className="text-sm font-normal text-[var(--color-ink-3)] whitespace-nowrap">
              {t("assignPicked", { count: selected.length })}
            </span>
          ) : null}
        </div>
        <div className="relative ml-auto flex w-[380px] max-w-full shrink-0 items-center rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-2 transition-colors focus-within:border-[var(--color-brand)]">
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
            className="w-full min-w-0 bg-transparent text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:outline-none"
          />
          {search ? (
            <button
              type="button"
              aria-label={t("assignClear")}
              onClick={() => setSearch("")}
              className="ml-1 shrink-0 text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
            >
              <LuX aria-hidden="true" className="size-3.5" />
            </button>
          ) : null}
        </div>
        {filterStationIds && filterStationIds.length > 0 ? (
          <p className="-mt-2 text-xs leading-meta text-[var(--color-ink-3)]">
            {t("assignSubtitle")}
          </p>
        ) : null}
      </div>

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
                          <LuCheck className="size-3.5 stroke-[3]" />
                        </span>
                      ) : (
                        <span
                          className="flex size-[30px] items-center justify-center rounded-full border border-[var(--color-line-2)] bg-[var(--color-wash)] text-[11px] font-semibold text-[var(--color-ink-2)]"
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
          <p className="text-xs font-medium text-[var(--color-brand-600)] flex items-center gap-1.5">
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
