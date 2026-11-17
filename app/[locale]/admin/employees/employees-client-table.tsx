"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LuSearch, LuX } from "react-icons/lu";
import type { AdminEmployee, EmployeeStatus } from "@/lib/types";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { Avatar } from "@/components/ui/avatar";
import {
  TrainingSummary,
  type TrainingCounts,
} from "@/components/admin/training-summary";
import { EmployeeRowActions } from "./employee-row-actions";
import { EditRolesModal } from "./[id]/edit-roles-modal";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTrainingProgressApi } from "@/services/courses/api";
import { useEmployees, EMPLOYEES_QUERY_KEY } from "@/services/employees/hooks";
import { Pagination } from "@/components/ui/pagination";
import { useRoles } from "@/services/jobs/hooks";
import { useStations } from "@/services/stations/hooks";
import { useLocations } from "@/services/locations/hooks";
import type { UpdateEmployeeInput } from "@/services/employees/types";

interface EmployeesClientTableProps {
  statusFilter: EmployeeStatus | "all";
  searchQuery: string;
  locale: string;
  /** Label lookups translated by the server page. Role / station /
   *  location catalogs and the employee list are fetched client-side
   *  from the shared React Query cache. */
  labels: {
    empty: string;
    loading: string;
    thEmployee: string;
    thJobRole: string;
    thStation: string;
    thTraining: string;
    thStatus: string;
    thActions: string;
    statusPending: string;
    statusActive: string;
    statusDeactivated: string;
    jobRolesEmpty: string;
    stationsEmpty: string;
    emailMissing: string;
    searchLabel: string;
    searchPlaceholder: string;
    clearSearch: string;
    noMatches: string;
  };
}

export function EmployeesClientTable({
  statusFilter,
  searchQuery,
  locale,
  labels,
}: EmployeesClientTableProps): React.ReactElement {
  const router = useRouter();
  const queryClient = useQueryClient();

  // The box owns its value so typing feels instant; the list query runs
  // on the debounced copy (backend ?search=). Seeded from ?q= on mount —
  // external URL changes re-seed it through the `key` the server page sets.
  const [search, setSearch] = useState(searchQuery);
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  // The list call is client-side (visible in the Network tab). The query
  // key carries the status filter and the debounced search, so chip or
  // search changes refetch through the same cache; StrictMode's
  // double-mount dedupes into one request.
  const { employees, isLoading } = useEmployees({
    status: statusFilter,
    q: debouncedSearch,
  });

  // Label + edit-modal catalogs from the shared session cache — same
  // queries the employee detail page uses, so switching between list
  // and detail costs no extra calls.
  const { roles } = useRoles();
  const { data: stations = [] } = useStations();
  const { data: locationsData } = useLocations();
  const locations = locationsData?.locations ?? [];

  // Real training counts for the Training column — one request to the same
  // endpoint the Progress tab uses, folded to one counts record per person.
  // (This column used to read lib/mock-training rows keyed to demo ids like
  // `emp-001`, so every real employee showed the "no training" dash.)
  const { data: progress } = useQuery({
    queryKey: [
      "admin-training-progress",
      { groupBy: "employee", includeAssignments: true, limit: 100 },
    ],
    queryFn: () =>
      fetchTrainingProgressApi({
        groupBy: "employee",
        includeAssignments: true,
        limit: 100,
      }),
    staleTime: 30_000,
  });

  const trainingByEmployee = React.useMemo(() => {
    const map = new Map<string, TrainingCounts>();
    for (const row of progress?.employees ?? []) {
      // `assignments` carries the per-course due flags; without it, fall
      // back to the row's overall status so the overdue tone still lands.
      const overdue = row.assignments
        ? row.assignments.filter((a) => a.isOverdue && !a.isComplete).length
        : row.status === "overdue"
          ? 1
          : 0;
      map.set(row.employeeId, {
        total: row.coursesTotal,
        complete: row.coursesDone,
        overdue,
      });
    }
    return map;
  }, [progress]);

  // In-place edit modal. The kebab's Edit item calls `openEdit(employee)`
  // instead of navigating to the detail page — so the user can edit
  // without losing the list (and without paying a full route change).
  const [editing, setEditing] = useState<AdminEmployee | null>(null);

  /** 10 rows per page — long rosters page instead of scrolling. */
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const isEs = locale === "es";

  function openEdit(employee: AdminEmployee): void {
    setEditing(employee);
  }

  function onModalSaved(
    next: AdminEmployee,
    _prior: UpdateEmployeeInput,
  ): void {
    setEditing(null);
    // The PUT already persisted server-side — refresh the cached list so
    // the row reflects the new state.
    void queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY });
  }

  // The server already applied ?search= (name / email / employee code)
  // and status — rows arrive filtered, so the client only reapplies the
  // status chip defensively (as before) and sorts.
  //
  // After filtering, sort so anyone with training assigned rises to the
  // top — this is the People triage screen, and the people who need the
  // admin's eye are the ones already on a training clock. Ties keep their
  // existing order (Array#sort is stable) so a manager who just opened
  // the page doesn't see the list shuffle within the same group.
  const visible = React.useMemo<AdminEmployee[]>(() => {
    const byStatus =
      statusFilter === "all"
        ? employees
        : employees.filter((e) => e.status === statusFilter);
    return [...byStatus].sort((a, b) => {
      const aHas = trainingByEmployee.get(a.id)?.total ? 0 : 1;
      const bHas = trainingByEmployee.get(b.id)?.total ? 0 : 1;
      return aHas - bHas;
    });
  }, [employees, statusFilter, trainingByEmployee]);

  // Reset to page 1 whenever the filter set changes; clamp when the list
  // shrinks under the current page (e.g. deactivation).
  const totalItems = visible.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paged = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, debouncedSearch]);

  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  // Mirror the typed query into ?q= with a shallow history update — no
  // navigation, so the shareable URL stays in step without racing the
  // list query. The server's "showing people matching …" notice picks the
  // value up on the next real render (same trick as the audit page).
  React.useEffect(() => {
    const id = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const q = search.trim();
      if (q) params.set("q", q);
      else params.delete("q");
      const qs = params.toString();
      const next = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
      const current = `${window.location.pathname}${window.location.search}`;
      if (next !== current) window.history.replaceState(null, "", next);
    }, 300);
    return () => window.clearTimeout(id);
  }, [search]);

  // Lookup maps for the role/station cells. The whole catalog is small and
  // stable for the lifetime of the page, so we pay the map cost once.
  const roleLabel = React.useMemo(
    () => new Map(roles.map((r) => [r.id, r.name] as const)),
    [roles],
  );
  const stationLabel = React.useMemo(
    () => new Map(stations.map((s) => [s.id, s.name] as const)),
    [stations],
  );

  const statusBadge = (s: EmployeeStatus): string => {
    if (s === "pending") return labels.statusPending;
    if (s === "active") return labels.statusActive;
    return labels.statusDeactivated;
  };

  function clearSearch(): void {
    setSearch("");
    // The page's notice is server-rendered from the original ?q=; a
    // shallow history update can't clear it, so navigate only when the
    // server actually rendered one.
    if (searchQuery) {
      const params = new URLSearchParams(window.location.search);
      params.delete("q");
      const qs = params.toString();
      router.replace(`/${locale}/admin/employees${qs ? `?${qs}` : ""}`, {
        scroll: false,
      });
    }
  }

  /** Whole-row navigation. Click anywhere on the row to open the detail
   *  page; the kebab cell calls `stopPropagation` so its menu still opens
   *  independently. Enter / Space activate the row when focused. */
  function openRow(id: string): void {
    router.push(`/${locale}/admin/employees/${id}`);
  }

  return (
    <>
      {/* Search filters the rows client-side; the query is mirrored into
          ?q= so the page's notice and shared links keep working. */}
      <div className="find max-w-sm w-full sm:w-auto" role="search">
        <LuSearch aria-hidden="true" className="i" />
        <label className="sr-only" htmlFor="employees-search">
          {labels.searchLabel}
        </label>
        <input
          id="employees-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={labels.searchPlaceholder}
        />
        {search ? (
          <button
            type="button"
            onClick={clearSearch}
            aria-label={labels.clearSearch}
            className="shrink-0 text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
          >
            <LuX aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="px-6 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
              {labels.loading}
            </p>
          ) : visible.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
              {debouncedSearch.trim() ? labels.noMatches : labels.empty}
            </p>
          ) : (
            <>
              {/* Mobile Card List (< md) */}
              <div className="divide-y divide-[var(--color-line)] md:hidden">
                {visible.map((e) => {
                  const tone: StatusTone =
                    e.status === "active"
                      ? "ok"
                      : e.status === "pending"
                        ? "warn"
                        : "bad";

                  const roleLabels =
                    Array.isArray(e.jobs) && e.jobs.length
                      ? e.jobs.map((job) => job.name)
                      : (e.roleIds ?? (e as any).jobIds ?? [])
                          .map((id: string) => roleLabel.get(id))
                          .filter((s: string | undefined): s is string =>
                            Boolean(s),
                          );
                  const stationLabels =
                    Array.isArray(e.stations) && e.stations.length
                      ? e.stations.map((station) => station.name)
                      : (e.stationIds ?? [])
                          .map((id: string) => stationLabel.get(id))
                          .filter((s: string | undefined): s is string =>
                            Boolean(s),
                          );

                  const training = trainingByEmployee.get(e.id);

                  return (
                    <div
                      key={`mobile-${e.id}`}
                      role="link"
                      tabIndex={0}
                      aria-label={e.name}
                      onClick={() => openRow(e.id)}
                      className="p-4 transition-colors hover:bg-[var(--color-panel)] focus-visible:bg-[var(--color-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-brand-600)] cursor-pointer"
                    >
                      {/* Top: Avatar + Name/Email + Actions */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar initials={initials(e.name)} size="sm" />
                          <div className="min-w-0">
                            <div className="truncate font-medium text-[var(--color-ink)]">
                              {e.name}
                            </div>
                            <div className="truncate text-sm text-[var(--color-ink-3)]">
                              {e.email || "—"}
                            </div>
                          </div>
                        </div>
                        <div
                          className="flex items-center gap-2 shrink-0"
                          onClick={(ev) => ev.stopPropagation()}
                        >
                          <StatusPill tone={tone}>
                            {statusBadge(e.status)}
                          </StatusPill>
                          <EmployeeRowActions
                            locale={locale}
                            employee={e}
                            onEdit={() => void openEdit(e)}
                          />
                        </div>
                      </div>

                      {/* Metadata: Roles & Stations */}
                      <div className="mt-3 grid grid-cols-2 gap-3 text-sm border-t border-[var(--color-line-2)] pt-3">
                        <div>
                          <span className="text-xs font-semibold text-[var(--color-ink-3)] block uppercase tracking-wider mb-1">
                            {labels.thJobRole}
                          </span>
                          <span className="text-[var(--color-ink-2)] line-clamp-1">
                            {roleLabels.length > 0
                              ? roleLabels.join(", ")
                              : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-[var(--color-ink-3)] block uppercase tracking-wider mb-1">
                            {labels.thStation}
                          </span>
                          <span className="text-[var(--color-ink-2)] line-clamp-1">
                            {stationLabels.length > 0
                              ? stationLabels.join(", ")
                              : "—"}
                          </span>
                        </div>
                      </div>

                      {/* Training row */}
                      {(training?.total ?? 0) > 0 && (
                        <div className="mt-3 pt-3 border-t border-[var(--color-line-2)] flex items-center justify-between">
                          <span className="text-xs font-semibold text-[var(--color-ink-3)] uppercase tracking-wider">
                            {labels.thTraining}
                          </span>
                          <TrainingSummary counts={training} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="atable min-w-[640px]">
                  <thead>
                    <tr>
                      <th>{labels.thEmployee}</th>
                      <th>{labels.thJobRole}</th>
                      <th>{labels.thStation}</th>
                      <th>{labels.thTraining}</th>
                      <th>{labels.thStatus}</th>
                      <th>
                        <span className="sr-only">{labels.thActions}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((e) => {
                      const tone: StatusTone =
                        e.status === "active"
                          ? "ok"
                          : e.status === "pending"
                            ? "warn"
                            : "bad";

                      const roleLabels =
                        Array.isArray(e.jobs) && e.jobs.length
                          ? e.jobs.map((job) => job.name)
                          : (e.roleIds ?? (e as any).jobIds ?? [])
                              .map((id: string) => roleLabel.get(id))
                              .filter((s: string | undefined): s is string =>
                                Boolean(s),
                              );
                      const stationLabels =
                        Array.isArray(e.stations) && e.stations.length
                          ? e.stations.map((station) => station.name)
                          : (e.stationIds ?? [])
                              .map((id: string) => stationLabel.get(id))
                              .filter((s: string | undefined): s is string =>
                                Boolean(s),
                              );

                      const training = trainingByEmployee.get(e.id);

                      return (
                        <tr
                          key={e.id}
                          role="link"
                          tabIndex={0}
                          aria-label={e.name}
                          onClick={() => openRow(e.id)}
                          onKeyDown={(ev) => {
                            const target = ev.target as HTMLElement | null;
                            if (
                              target?.closest(
                                "button, a, input, select, textarea",
                              )
                            )
                              return;
                            if (ev.key === "Enter" || ev.key === " ") {
                              ev.preventDefault();
                              openRow(e.id);
                            }
                          }}
                          className="cursor-pointer transition-colors hover:bg-[var(--color-panel)] focus-visible:bg-[var(--color-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-brand-600)]"
                        >
                          <td>
                            <div className="flex items-center gap-3">
                              <Avatar initials={initials(e.name)} size="sm" />
                              <div className="min-w-0">
                                <div className="truncate font-medium text-[var(--color-ink)]">
                                  {e.name}
                                </div>
                                <div className="truncate text-sm text-[var(--color-ink-3)]">
                                  {e.email || "—"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="text-sm text-[var(--color-ink-2)]">
                            {roleLabels.length > 0
                              ? roleLabels.join(", ")
                              : "—"}
                          </td>
                          <td className="text-sm text-[var(--color-ink-2)]">
                            {stationLabels.length > 0
                              ? stationLabels.join(", ")
                              : "—"}
                          </td>
                          <td>
                            <TrainingSummary counts={training} />
                          </td>
                          <td>
                            <StatusPill tone={tone}>
                              {statusBadge(e.status)}
                            </StatusPill>
                          </td>
                          <td onClick={(ev) => ev.stopPropagation()}>
                            <EmployeeRowActions
                              locale={locale}
                              employee={e}
                              onEdit={() => void openEdit(e)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      {totalItems > 0 && !isLoading ? (
        <div className="pt-2">
          <Pagination
            page={safePage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
            onPageChange={(p) => {
              setCurrentPage(p);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            isEs={isEs}
            itemLabel={isEs ? "empleados" : "employees"}
          />
        </div>
      ) : null}
      {/* In-place edit modal. Mounted at the table level so the kebab Edit
        can open it without a route change. The list re-renders off the
        same `lms_employees_updated` event the modal dispatches on save,
        so the row reflects the new state without `router.refresh`. */}
      {editing ? (
        <EditRolesModal
          open
          onClose={() => setEditing(null)}
          employee={editing}
          roles={roles}
          locations={locations}
          stations={stations}
          onLocationChange={() => undefined}
          onSaved={onModalSaved}
        />
      ) : null}
    </>
  );
}

/** First letter of the first two words, uppercase. "María González" → "MG".
 *  Diacritics kept (the design system uses DM Sans which has them) and a
 *  hyphenated surname counts as one word: "Hiro Watanabe" → "HW". A
 *  single-word name returns the first letter. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).slice(0, 2);
  return words.map((w) => w.charAt(0).toUpperCase()).join("") || "?";
}
