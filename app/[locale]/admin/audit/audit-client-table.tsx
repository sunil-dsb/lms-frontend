"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LuSearch,
  LuX,
  LuRotateCcw,
  LuChevronDown,
  LuChevronRight,
  LuLockKeyhole,
} from "react-icons/lu";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonClassName } from "@/components/ui/button";
import { ApiException } from "@/lib/errors";
import { CustomSelect, type SelectOption } from "@/components/ui/custom-select";
import { FilterChips } from "@/components/ui/filter-chips";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuditLogs } from "@/services/audit/hooks";
import { useStations } from "@/services/stations/hooks";
import { useEmployees } from "@/services/employees/hooks";
import { useAllSubcategories } from "@/services/categories/hooks";
import type {
  AuditAction,
  AuditChanges,
  AuditItemType,
  AuditLogRow,
} from "@/services/audit/types";

/**
 * Rows whose diff came back empty (legacy no-op saves, action-only entries)
 * have nothing to expand into — no chevron, no toggle, no dead-end
 * "No field-level changes recorded." panel.
 */
function hasFieldChanges(changes: AuditChanges | null): boolean {
  return Boolean(changes && Object.keys(changes).length > 0);
}

interface AuditLabels {
  heading: string;
  empty: string;
  emptyBody: string;
  loading: string;
  thWhen: string;
  thWho: string;
  thAction: string;
  thWhat: string;
  thChanges: string;
  filterType: string;
  filterAction: string;
  filterAll: string;
  clearFilter: string;
  fromLabel: string;
  toLabel: string;
  yes: string;
  no: string;
  /** Localized values for diffed status fields (draft/published/…). */
  status: Record<string, string>;
  searchLabel: string;
  searchPlaceholder: string;
  changesNone: string;
  retry: string;
  noAccessTitle: string;
  noAccessBody: string;
  noAccessBack: string;
  itemType: Record<AuditItemType, string>;
  action: Record<string, string>;
  field: Record<string, string>;
}

interface AuditClientTableProps {
  locale: string;
  initialItemType?: AuditItemType | "all";
  initialSearch?: string;
  labels: AuditLabels;
}

const ITEM_TYPES: readonly (AuditItemType | "all")[] = [
  "all",
  "course",
  "chapter",
  "quiz",
  "procedure",
  "assignment",
  "station",
  "location",
  "job",
];

const ACTIONS: readonly (AuditAction | "all")[] = [
  "all",
  "create",
  "update",
  "delete",
  "publish",
  "archive",
  "unarchive",
  "assign",
  "unassign",
  "reorder",
  "override",
  "revoke_override",
];

const PAGE_SIZE = 20;

/** Lifecycle actions read as good news, destructive ones as bad. */
const ACTION_TONE: Record<string, StatusTone> = {
  create: "ok",
  publish: "ok",
  unarchive: "ok",
  assign: "info",
  unassign: "warn",
  update: "neutral",
  reorder: "neutral",
  archive: "warn",
  delete: "bad",
  override: "warn",
  revoke_override: "neutral",
};

export function AuditClientTable({
  locale,
  initialItemType = "all",
  initialSearch = "",
  labels,
}: AuditClientTableProps): React.ReactElement {
  const router = useRouter();
  const isEs = locale === "es";

  const [itemType, setItemType] = React.useState<AuditItemType | "all">(
    initialItemType,
  );
  const [action, setAction] = React.useState<AuditAction | "all">("all");
  const [datePreset, setDatePreset] = React.useState<string>("all");
  const [search, setSearch] = React.useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = React.useState(initialSearch);
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  // Typing should not fire a request per keystroke — the query runs on the
  // debounced copy instead.
  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  // Sync filter changes to URL search params without hard reloads
  React.useEffect(() => {
    const params = new URLSearchParams();
    if (itemType !== "all") params.set("itemType", itemType);
    if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
    const qs = params.toString();
    const nextUrl = `/${locale}/admin/audit${qs ? `?${qs}` : ""}`;
    window.history.replaceState(null, "", nextUrl);
  }, [itemType, debouncedSearch, locale]);

  const filters = React.useMemo(
    () => ({
      itemType,
      action,
      search: debouncedSearch,
      from: from || undefined,
      to: to || undefined,
      page,
    }),
    [itemType, action, debouncedSearch, from, to, page],
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useAuditLogs(filters);

  // The diff stores raw field values — station ids, assigned-user ids and a
  // subcategory id among them. Map them to names the admin recognises;
  // anything missing (deleted record, >200 employees) falls back to the raw
  // value, so the entry still says what changed rather than showing nothing.
  const { data: stations } = useStations();
  const { employees } = useEmployees();
  const { data: subcategories } = useAllSubcategories();

  const nameById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const s of stations ?? []) map.set(s.id, s.name);
    for (const e of employees ?? []) map.set(e.id, e.name);
    for (const sc of subcategories ?? []) {
      const name = locale === "es" ? sc.nameEs : sc.nameEn;
      map.set(sc.id, name || sc.nameEn || sc.nameEs);
    }
    return map;
  }, [stations, employees, subcategories, locale]);

  /** One before/after value as it should read: names, localized words, no raw ids. */
  const formatValue = React.useCallback(
    (value: unknown): string => {
      if (value === null || value === undefined || value === "")
        return isEs ? "Ninguno" : "None";
      if (typeof value === "boolean") return value ? labels.yes : labels.no;
      if (Array.isArray(value)) {
        // If the array contains null/undefined alongside valid values, filter them out so we don't display "—, Nov 25, 2026"
        const cleanValues = value.filter(
          (v) => v !== null && v !== undefined && v !== "",
        );
        const targetList = cleanValues.length > 0 ? cleanValues : value;
        if (targetList.length === 0) return "—";
        // Array of objects (the content blocks of a procedure): the objects
        // ARE the document body — a count is the only shape that reads.
        if (targetList.some((v) => v !== null && typeof v === "object")) {
          return String(targetList.length);
        }
        const joined = targetList
          .map((v) => {
            if (v === null || v === undefined || v === "") return "—";
            if (
              typeof v === "string" &&
              /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/.test(v)
            ) {
              const d = new Date(v);
              if (!Number.isNaN(d.getTime())) {
                return d.toLocaleString(isEs ? "es-MX" : "en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: v.includes("T") ? "2-digit" : undefined,
                  minute: v.includes("T") ? "2-digit" : undefined,
                });
              }
            }
            const s = String(v);
            return nameById.get(s) ?? labels.status[s] ?? s;
          })
          .join(", ");
        return joined.length > 96 ? `${joined.slice(0, 95)}…` : joined;
      }
      if (typeof value === "object") return JSON.stringify(value);
      const s = String(value);

      // Check if value is an ISO date string (e.g. overrideUntil, or a date diff)
      if (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/.test(value)
      ) {
        const d = new Date(value);
        if (!Number.isNaN(d.getTime())) {
          return d.toLocaleString(isEs ? "es-MX" : "en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: value.includes("T") ? "2-digit" : undefined,
            minute: value.includes("T") ? "2-digit" : undefined,
          });
        }
      }

      // Exact-match lookup: maps are keyed by opaque ids and enum words, so
      // a plain title/prose value can never collide with them.
      return nameById.get(s) ?? labels.status[s] ?? s;
    },
    [labels, nameById, isEs],
  );

  const actionOptions: SelectOption[] = React.useMemo(
    () =>
      ACTIONS.map((a) => ({
        value: a,
        label:
          a === "all"
            ? isEs
              ? "Todas las acciones"
              : "All actions"
            : (labels.action[a] ?? a),
      })),
    [labels, isEs],
  );

  const dateOptions: SelectOption[] = React.useMemo(
    () => [
      { value: "all", label: isEs ? "Todo el tiempo" : "All time" },
      { value: "today", label: isEs ? "Hoy" : "Today" },
      { value: "7d", label: isEs ? "Últimos 7 días" : "Last 7 days" },
      { value: "30d", label: isEs ? "Últimos 30 días" : "Last 30 days" },
      { value: "90d", label: isEs ? "Últimos 90 días" : "Last 90 days" },
      { value: "custom", label: isEs ? "Personalizado..." : "Custom range..." },
    ],
    [isEs],
  );

  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    setPage(1);
    if (preset === "all") {
      setFrom("");
      setTo("");
    } else if (preset === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setFrom(today.toISOString().slice(0, 10));
      setTo("");
    } else if (preset === "7d") {
      const d = new Date(Date.now() - 7 * 86400000);
      setFrom(d.toISOString().slice(0, 10));
      setTo("");
    } else if (preset === "30d") {
      const d = new Date(Date.now() - 30 * 86400000);
      setFrom(d.toISOString().slice(0, 10));
      setTo("");
    } else if (preset === "90d") {
      const d = new Date(Date.now() - 90 * 86400000);
      setFrom(d.toISOString().slice(0, 10));
      setTo("");
    }
  };

  const rows = data?.auditLogs ?? [];
  const meta = data?.meta;

  // Any filter change invalidates the current page — page 7 of a narrower
  // result set may not exist. Reset during render rather than in an effect:
  // React discards the current render's output and re-renders immediately.
  const filterKey = `${itemType}|${action}|${datePreset}|${debouncedSearch}|${from}|${to}`;
  const [prevFilterKey, setPrevFilterKey] = React.useState(filterKey);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
    setExpandedId(null);
  }

  const hasFilters =
    itemType !== "all" ||
    action !== "all" ||
    datePreset !== "all" ||
    search.trim().length > 0 ||
    from.length > 0 ||
    to.length > 0;

  function clearFilters(): void {
    setItemType("all");
    setAction("all");
    setDatePreset("all");
    setSearch("");
    setFrom("");
    setTo("");
    setPage(1);
    setExpandedId(null);
    router.replace(`/${locale}/admin/audit`, { scroll: false });
  }

  /**
   * Field labels are a flat lookup, except for chapter-diff keys, which the
   * backend writes as `Chapter “Intro” · blocks` (the head carries data — a
   * chapter title — only the tail is a label). Split there, localize the
   * noun via the item type, and keep the `(#2)` marker used when two
   * chapters share a title.
   */
  const fieldLabel = (key: string): string => {
    const sep = key.indexOf(" · ");
    if (sep === -1) return labels.field[key] ?? key;

    const rawTail = key.slice(sep + 3);
    const marker = rawTail.match(/ \(#\d+\)$/)?.[0] ?? "";
    const tail = marker ? rawTail.slice(0, -marker.length) : rawTail;
    const head = key
      .slice(0, sep)
      .replace(/^Chapter /, `${labels.itemType.chapter} `);

    return `${head} · ${labels.field[tail] ?? tail}${marker}`;
  };

  if (isError && error instanceof ApiException && error.status === 403) {
    return (
      <EmptyState
        icon={LuLockKeyhole}
        title={labels.noAccessTitle}
        body={labels.noAccessBody}
        action={
          <Link
            href={`/${locale}/admin`}
            className={buttonClassName({ variant: "neutral" })}
          >
            {labels.noAccessBack}
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. Entity / Item Type FilterChips (using design system .chipbar) */}
      <FilterChips
        label={labels.filterType}
        value={itemType}
        onChange={(val) => {
          setItemType(val as AuditItemType | "all");
          setPage(1);
        }}
        chips={ITEM_TYPES.map((type) => ({
          value: type,
          label:
            type === "all"
              ? labels.filterAll
              : (labels.itemType[type as AuditItemType] ?? type),
        }))}
      />

      {/* 2. Controls toolbar: search on left, action dropdown + date range on right */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search using standard house .find component */}
        <div className="find max-w-sm w-full sm:w-auto" role="search">
          <LuSearch aria-hidden="true" className="i" />
          <label className="sr-only" htmlFor="audit-search">
            {labels.searchLabel}
          </label>
          <input
            id="audit-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={labels.searchPlaceholder}
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="shrink-0 text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
            >
              <LuX aria-hidden="true" />
            </button>
          ) : null}
        </div>

        {/* Right filters: Action select, Date preset / custom range, Clear button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-[170px] shrink-0">
            <CustomSelect
              value={action}
              onChange={(val) => {
                setAction(val as AuditAction | "all");
                setPage(1);
              }}
              options={actionOptions}
              size="sm"
              className="h-tap-admin text-sm"
            />
          </div>

          <div className="w-[160px] shrink-0">
            <CustomSelect
              value={datePreset}
              onChange={handleDatePresetChange}
              options={dateOptions}
              size="sm"
              className="h-tap-admin text-sm"
            />
          </div>

          {datePreset === "custom" && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-[var(--color-ink-2)]">
                <span className="font-medium shrink-0">
                  {labels.fromLabel}:
                </span>
                <input
                  id="audit-from"
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-tap-admin rounded-[var(--radius-md)] border border-[var(--color-line-3)] bg-[var(--color-field)] px-2.5 text-xs text-[var(--color-ink)] focus:border-[var(--color-brand)] focus:outline-none"
                />
              </label>
              <label className="flex items-center gap-1.5 text-xs text-[var(--color-ink-2)]">
                <span className="font-medium shrink-0">{labels.toLabel}:</span>
                <input
                  id="audit-to"
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-tap-admin rounded-[var(--radius-md)] border border-[var(--color-line-3)] bg-[var(--color-field)] px-2.5 text-xs text-[var(--color-ink)] focus:border-[var(--color-brand)] focus:outline-none"
                />
              </label>
            </div>
          )}

          {hasFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              icon={LuRotateCcw}
              className="h-tap-admin text-xs font-semibold text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
            >
              {labels.clearFilter}
            </Button>
          ) : null}
        </div>
      </div>

      {/* 3. Table Card */}
      <Card>
        <CardContent className="p-0">
          {isLoading && !data ? (
            <AuditTableSkeleton labels={labels} />
          ) : isError ? (
            <div className="p-6">
              <EmptyState
                title={labels.empty}
                body={error instanceof Error ? error.message : labels.emptyBody}
                action={
                  <Button variant="neutral" onClick={() => void refetch()}>
                    {labels.retry}
                  </Button>
                }
              />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-6">
              <EmptyState
                compact
                icon={LuSearch}
                title={labels.empty}
                body={labels.emptyBody}
                action={
                  hasFilters ? (
                    <Button variant="neutral" onClick={clearFilters}>
                      {labels.clearFilter}
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div
              className={cn(
                "transition-opacity duration-150",
                isFetching ? "opacity-60" : "opacity-100",
              )}
            >
              {/* Mobile: stacked entries */}
              <div className="divide-y divide-[var(--color-line)] md:hidden">
                {rows.map((row) => (
                  <AuditEntry
                    key={row.id}
                    row={row}
                    locale={locale}
                    labels={labels}
                    expanded={expandedId === row.id}
                    onToggle={() =>
                      setExpandedId(expandedId === row.id ? null : row.id)
                    }
                    fieldLabel={fieldLabel}
                    formatValue={formatValue}
                  />
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="atable min-w-[720px]">
                  <thead>
                    <tr>
                      <th>{labels.thWhen}</th>
                      <th>{labels.thWho}</th>
                      <th>{labels.thAction}</th>
                      <th>{labels.thWhat}</th>
                      <th>
                        <span className="sr-only">{labels.thChanges}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const expandable = hasFieldChanges(row.changes);
                      const open = expandable && expandedId === row.id;
                      return (
                        <React.Fragment key={row.id}>
                          <tr
                            onClick={
                              expandable
                                ? () =>
                                    setExpandedId(
                                      expandedId === row.id ? null : row.id,
                                    )
                                : undefined
                            }
                            className={cn(
                              "transition-colors",
                              expandable &&
                                "cursor-pointer hover:bg-[var(--color-panel)]",
                            )}
                          >
                            <td className="whitespace-nowrap text-sm text-[var(--color-ink-2)]">
                              {formatWhen(row.createdAt, locale)}
                            </td>
                            <td className="text-sm font-medium text-[var(--color-ink)]">
                              {row.userName}
                            </td>
                            <td>
                              <StatusPill
                                tone={ACTION_TONE[row.action] ?? "neutral"}
                              >
                                {labels.action[row.action] ?? row.action}
                              </StatusPill>
                            </td>
                            <td className="text-sm text-[var(--color-ink-2)]">
                              <span className="font-medium text-[var(--color-ink)]">
                                {row.itemName ?? row.itemId}
                              </span>
                              <span className="ml-2 text-[var(--color-ink-3)]">
                                {labels.itemType[row.itemType]}
                              </span>
                            </td>
                            <td className="w-8 text-[var(--color-ink-3)]">
                              {expandable ? (
                                expandedId === row.id ? (
                                  <LuChevronDown aria-hidden="true" />
                                ) : (
                                  <LuChevronRight aria-hidden="true" />
                                )
                              ) : null}
                            </td>
                          </tr>
                          {open ? (
                            <tr>
                              <td
                                colSpan={5}
                                className="bg-[var(--color-panel)] px-4 py-3"
                              >
                                <ChangeList
                                  changes={row.changes}
                                  noneLabel={labels.changesNone}
                                  fieldLabel={fieldLabel}
                                  formatValue={formatValue}
                                />
                              </td>
                            </tr>
                          ) : null}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Pagination */}
      {meta && meta.total > 0 ? (
        <Pagination
          page={meta.page}
          totalPages={meta.totalPages}
          totalItems={meta.total}
          pageSize={meta.limit || PAGE_SIZE}
          onPageChange={(p) => {
            setPage(p);
            setExpandedId(null);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          isEs={isEs}
          itemLabel={isEs ? "registros" : "entries"}
        />
      ) : null}
    </div>
  );
}

/** One entry — shared by the mobile stack; the desktop table has its own cells. */
function AuditEntry({
  row,
  locale,
  labels,
  expanded,
  onToggle,
  fieldLabel,
  formatValue,
}: {
  row: AuditLogRow;
  locale: string;
  labels: AuditLabels;
  expanded: boolean;
  onToggle: () => void;
  fieldLabel: (key: string) => string;
  formatValue: (value: unknown) => string;
}): React.ReactElement {
  const expandable = hasFieldChanges(row.changes);
  return (
    <button
      type="button"
      onClick={expandable ? onToggle : undefined}
      aria-expanded={expandable && expanded}
      className={cn(
        "w-full p-4 text-left transition-colors",
        expandable && "hover:bg-[var(--color-panel)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={ACTION_TONE[row.action] ?? "neutral"}>
              {labels.action[row.action] ?? row.action}
            </StatusPill>
            <span className="text-sm font-medium text-[var(--color-ink)]">
              {row.userName}
            </span>
          </div>
          <div className="mt-1 truncate text-sm text-[var(--color-ink-2)]">
            <span className="font-medium text-[var(--color-ink)]">
              {row.itemName ?? row.itemId}
            </span>
            <span className="ml-2 text-[var(--color-ink-3)]">
              {labels.itemType[row.itemType]}
            </span>
          </div>
          <div className="mt-1 text-xs text-[var(--color-ink-3)]">
            {formatWhen(row.createdAt, locale)}
          </div>
        </div>
        {expandable ? (
          <span className="shrink-0 text-[var(--color-ink-3)]">
            {expanded ? (
              <LuChevronDown aria-hidden="true" />
            ) : (
              <LuChevronRight aria-hidden="true" />
            )}
          </span>
        ) : null}
      </div>

      {expandable && expanded ? (
        <div className="mt-3 border-t border-[var(--color-line-2)] pt-3">
          <ChangeList
            changes={row.changes}
            noneLabel={labels.changesNone}
            fieldLabel={fieldLabel}
            formatValue={formatValue}
          />
        </div>
      ) : null}
    </button>
  );
}

/** `dueDate: Nov 18 → Nov 25`, one styled card per changed field. */
function ChangeList({
  changes,
  noneLabel,
  fieldLabel,
  formatValue,
}: {
  changes: AuditChanges | null;
  noneLabel: string;
  fieldLabel: (key: string) => string;
  formatValue: (value: unknown) => string;
}): React.ReactElement {
  const entries = changes ? Object.entries(changes) : [];

  if (entries.length === 0) {
    return (
      <p className="text-xs text-[var(--color-ink-3)] italic py-1">
        {noneLabel}
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--color-line-2)] bg-[var(--color-wash)] p-3">
      <dl className="grid gap-2">
        {entries.map(([key, change]) => {
          const isNewlySet =
            change.from === null ||
            change.from === undefined ||
            change.from === "";
          return (
            <div
              key={key}
              className="flex flex-wrap items-center gap-2 text-xs"
            >
              <dt className="min-w-[120px] font-semibold text-[var(--color-ink-2)]">
                {fieldLabel(key)}:
              </dt>
              <dd className="flex flex-wrap items-center gap-2 text-[var(--color-ink)]">
                {!isNewlySet ? (
                  <>
                    <span className="rounded bg-[var(--color-panel-2)]/70 px-2 py-0.5 text-[var(--color-ink-3)] line-through">
                      {formatValue(change.from)}
                    </span>
                    <span
                      className="text-[var(--color-ink-3)] font-bold"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  </>
                ) : null}
                <span className="rounded bg-[var(--color-panel)] border border-[var(--color-line-2)] px-2 py-0.5 font-medium text-[var(--color-ink)] shadow-xs">
                  {isNewlySet
                    ? `${formatValue(change.to)}`
                    : formatValue(change.to)}
                </span>
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

function formatWhen(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(locale === "es" ? "es-MX" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AuditTableSkeleton({
  labels,
}: {
  labels: AuditLabels;
}): React.ReactElement {
  return (
    <>
      {/* Mobile skeleton */}
      <div className="divide-y divide-[var(--color-line)] md:hidden p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="py-3 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-4 w-52" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Desktop skeleton table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="atable min-w-[720px]">
          <thead>
            <tr>
              <th>{labels.thWhen}</th>
              <th>{labels.thWho}</th>
              <th>{labels.thAction}</th>
              <th>{labels.thWhat}</th>
              <th>
                <span className="sr-only">{labels.thChanges}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-[var(--color-line)]">
                <td className="p-4">
                  <Skeleton className="h-4 w-28" />
                </td>
                <td className="p-4">
                  <Skeleton className="h-4 w-24" />
                </td>
                <td className="p-4">
                  <Skeleton className="h-5 w-20 rounded-full" />
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </td>
                <td className="p-4 w-8">
                  <Skeleton className="h-4 w-4 rounded-full" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
