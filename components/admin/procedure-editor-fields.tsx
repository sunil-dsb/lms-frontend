"use client";

import * as React from "react";

import { useTranslations } from "next-intl";

import {
  LuCheck,
  LuChevronRight,
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

/** A run-window field rendered as a date input + a time input pair so the
 *  manager picks the wall-clock moment of the window edge, not just the day.
 *  A value picked on the date alone gets the default time joined on: runs
 *  start at 00:00 (whole first day) and end at 23:59 (whole last day),
 *  mirroring the previous save which stamped expiry end-of-day. */
function PromoDatetimeRow({
  id,
  label,
  value,
  defaultTime,
  onChange,
  minDate,
  children,
}: {
  id: string;
  label: string;
  value: string | null;
  defaultTime: string;
  onChange: (next: string | null) => void;
  minDate?: string;
  children?: React.ReactNode;
}): React.ReactElement {
  const { date, time } = ((): { date: string; time: string } => {
    if (!value) return { date: "", time: defaultTime };
    return {
      date: value.slice(0, 10),
      time: value.includes("T") ? value.slice(11, 16) : defaultTime,
    };
  })();
  return (
    <div className="space-y-2">
      <Label
        htmlFor={`${id}-date`}
        className="text-xs font-semibold text-[var(--color-ink)] block"
      >
        {label}
      </Label>
      <div className="flex flex-wrap items-center gap-3">
        <Input
          id={`${id}-date`}
          type="date"
          min={minDate}
          value={date}
          onChange={(e) =>
            onChange(e.target.value ? `${e.target.value}T${time}` : null)
          }
          className="h-[38px] w-[150px] shrink-0 rounded-[var(--radius-md)] border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 text-xs text-[var(--color-ink)]"
        />
        <Input
          id={`${id}-time`}
          type="time"
          value={time}
          onChange={(e) =>
            onChange(date ? `${date}T${e.target.value || defaultTime}` : null)
          }
          className="h-[38px] w-[120px] shrink-0 rounded-[var(--radius-md)] border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 text-xs text-[var(--color-ink)]"
        />
        {children}
      </div>
    </div>
  );
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
  people: AdminEmployee[];
  locale: string;
}): React.ReactElement {
  const t = useTranslations("admin.library.editor");
  const isEs = locale === "es";
  const [employeeSearch, setEmployeeSearch] = React.useState("");

  const pad = (n: number): string => String(n).padStart(2, "0");

  // Run-window presets land the expiration at end-of-day on the target day.
  const setExpiryPreset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    onChangePromoExpiresAt(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T23:59`,
    );
  };
  const today = new Date();
  const todayLocal = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  // All loaded employees are active rows (the editor fetches active-only),
  // so "everyone" is simply the full people list.
  const selectedIds = React.useMemo(
    () => new Set(promoEmployeeIds),
    [promoEmployeeIds],
  );
  const allSelected =
    people.length > 0 && people.every((p) => selectedIds.has(p.id));
  const filteredPeople = employeeSearch.trim()
    ? people.filter((p) =>
        `${p.name} ${p.employeeCode ?? ""}`
          .toLowerCase()
          .includes(employeeSearch.trim().toLowerCase()),
      )
    : people;

  const toggleEmployee = (id: string) => {
    onChangePromoEmployeeIds(
      selectedIds.has(id)
        ? promoEmployeeIds.filter((x) => x !== id)
        : [...promoEmployeeIds, id],
    );
  };

  return (
    <section
      id="proc-promo"
      className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6 transition-colors"
    >
      {/* Same header pattern as the other step-3 rows: icon tile, title,
          status pill; the on/off control sits at the row's end. The state
          is carried by the pill, so the card border stays neutral. */}
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

        {/* On/off control — the same checkbox-as-action pattern as the quiz
            attach toggle: the label says what the control does, the state
            lives in the pill. */}
        <label className="flex shrink-0 cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={isPromo}
            onChange={(event) => {
              const next = event.target.checked;
              onChangeIsPromo(next);
              if (next) {
                // Enabling prefills a sensible run window: starts now,
                // ends a month out at end-of-day. Both stay editable.
                if (!promoExpiresAt) setExpiryPreset(30);
                if (!promoStartsAt) {
                  const d = new Date();
                  onChangePromoStartsAt(
                    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
                  );
                }
              }
            }}
            className="size-5 cursor-pointer accent-[var(--color-brand-600)]"
          />
          <span className="text-xs font-semibold text-[var(--color-ink-2)] select-none">
            {isEs ? "Activar promoción" : "Enable promo"}
          </span>
        </label>
      </div>
      <p className="mt-2 text-xs leading-meta text-[var(--color-ink-3)]">
        {t("promoSubtitle")}
      </p>

      {isPromo ? (
        <div className="mt-5 pt-5 border-t border-[var(--color-line-2)] space-y-5">
          {/* Run window — start and end, each date + time */}
          <PromoDatetimeRow
            id="proc-promo-starts"
            label={t("promoStartsLabel")}
            value={promoStartsAt}
            defaultTime="00:00"
            onChange={onChangePromoStartsAt}
          />
          <div className="pt-1 border-t border-dashed border-[var(--color-line-2)]" />
          <PromoDatetimeRow
            id="proc-promo-expires"
            label={t("promoExpiresLabel")}
            value={promoExpiresAt}
            defaultTime="23:59"
            minDate={promoStartsAt?.slice(0, 10) ?? todayLocal}
            onChange={onChangePromoExpiresAt}
          >
            <div className="flex items-center flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setExpiryPreset(14)}
                className="rounded-full px-4 py-2 text-xs font-medium border border-[var(--color-line-2)] bg-[var(--color-surface)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)] text-[var(--color-ink-2)] transition-colors cursor-pointer"
              >
                {t("promoPreset2Weeks")}
              </button>
              <button
                type="button"
                onClick={() => setExpiryPreset(30)}
                className="rounded-full px-4 py-2 text-xs font-medium border border-[var(--color-line-2)] bg-[var(--color-surface)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)] text-[var(--color-ink-2)] transition-colors cursor-pointer"
              >
                {t("promoPreset1Month")}
              </button>
              <button
                type="button"
                onClick={() => setExpiryPreset(60)}
                className="rounded-full px-4 py-2 text-xs font-medium border border-[var(--color-line-2)] bg-[var(--color-surface)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)] text-[var(--color-ink-2)] transition-colors cursor-pointer"
              >
                {t("promoPreset2Months")}
              </button>
            </div>
          </PromoDatetimeRow>

          <p className="text-xs text-[var(--color-ink-3)] leading-relaxed mt-1">
            {t("promoExpiresHint")}
          </p>

          {/* Employee assignment — the promo is visible only to the
              employees picked here. "All employees" selects the whole
              loaded roster in one tap; the check icon + branded pill make
              the everyone-selected state visible at a glance. */}
          <div className="pt-4 border-t border-dashed border-[var(--color-line-2)] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <IconTile size="xs" icon={LuUsers} />
                <h4 className="text-sm font-semibold text-[var(--color-ink)]">
                  {t("promoEmployeesTitle")}
                </h4>
                <StatusPill
                  tone={
                    allSelected
                      ? "ok"
                      : promoEmployeeIds.length > 0
                        ? "info"
                        : "neutral"
                  }
                >
                  {t("promoEmployeesCount", { count: promoEmployeeIds.length })}
                </StatusPill>
              </div>
              <Button
                type="button"
                variant={allSelected ? "secondary" : "neutral"}
                size="sm"
                icon={LuCheck}
                onClick={() =>
                  onChangePromoEmployeeIds(
                    allSelected ? [] : people.map((p) => p.id),
                  )
                }
              >
                {t("promoAllEmployees")}
              </Button>
            </div>
            <p className="text-xs text-[var(--color-ink-3)] leading-relaxed">
              {t("promoEmployeesHint")}
            </p>

            {people.length > 0 ? (
              <>
                <div className="relative">
                  <LuSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-ink-3)]" />
                  <Input
                    type="search"
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    placeholder={t("promoSearchPlaceholder")}
                    className="h-[38px] w-full max-w-[280px] rounded-full border-[var(--color-line-2)] bg-[var(--color-surface)] pl-9 pr-3 text-xs text-[var(--color-ink)]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onChangePromoEmployeeIds(
                      allSelected ? [] : people.map((p) => p.id),
                    )
                  }
                  className="text-xs font-semibold text-[var(--color-brand-600)] hover:underline"
                >
                  {allSelected
                    ? t("promoDeselectAll")
                    : t("promoSelectAllCount", { count: people.length })}
                </button>
                <ul className="max-h-[240px] overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-line-2)] divide-y divide-[var(--color-line-2)]">
                  {filteredPeople.map((p) => {
                    const checked = selectedIds.has(p.id);
                    return (
                      <li key={p.id}>
                        <label
                          htmlFor={`promo-emp-${p.id}`}
                          className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-wash)] transition-colors"
                        >
                          <input
                            id={`promo-emp-${p.id}`}
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleEmployee(p.id)}
                            className="size-5 shrink-0 cursor-pointer accent-[var(--color-brand-600)]"
                          />
                          <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--color-ink)]">
                            {p.name}
                          </span>
                          {p.employeeCode ? (
                            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink-3)]">
                              {p.employeeCode}
                            </span>
                          ) : null}
                        </label>
                      </li>
                    );
                  })}
                  {filteredPeople.length === 0 ? (
                    <li className="px-4 py-3 text-xs text-[var(--color-ink-3)]">
                      {t("promoNobody")}
                    </li>
                  ) : null}
                </ul>
              </>
            ) : null}

            {promoEmployeeIds.length === 0 ? (
              <p className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-wash)] px-3 py-2 text-xs font-medium text-[var(--color-ink-2)]">
                <LuX className="size-4 shrink-0 text-[var(--color-bad)]" />
                {t("promoNoneSelected")}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
