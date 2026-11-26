"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LuSearch, LuX, LuRefreshCw } from "react-icons/lu";
import type { AdminEmployee, EmployeeStatus } from "@/lib/types";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { Avatar } from "@/components/ui/avatar";
import {
  TrainingSummary,
  type TrainingCounts,
} from "@/components/admin/training-summary";
import { EmployeeRowActions } from "./employee-row-actions";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { fetchTrainingProgressApi } from "@/services/courses/api";
import { useEmployees, EMPLOYEES_QUERY_KEY } from "@/services/employees/hooks";
import { Pagination } from "@/components/ui/pagination";
import { useRoles } from "@/services/jobs/hooks";
import { useStations } from "@/services/stations/hooks";
import { useLocations } from "@/services/locations/hooks";
import { useMe } from "@/services/auth/hooks";
import {
  canEditEmployees,
  formatSystemRole,
  isSuperAdmin,
  isSupervisor,
} from "@/lib/rbac";
import { CustomSelect, type SelectOption } from "@/components/ui/custom-select";
import { cn } from "@/lib/utils";

interface EmployeesClientTableProps {
  initialStatus?: EmployeeStatus | "all";
  initialRole?:
    "all" | "supervisor" | "employee" | "manager" | "admin" | "super_admin";
  initialStation?: string;
  initialJob?: string;
  initialSearch?: string;
  /** Legacy props kept for compatibility */
  statusFilter?: EmployeeStatus | "all";
  roleFilter?:
    "all" | "supervisor" | "employee" | "manager" | "admin" | "super_admin";
  searchQuery?: string;
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
  initialStatus,
  initialRole,
  initialStation,
  initialJob,
  initialSearch,
  statusFilter,
  roleFilter,
  searchQuery,
  locale,
  labels,
}: EmployeesClientTableProps): React.ReactElement {
  const router = useRouter();

  // Multi-filter states
  const [status, setStatus] = useState<EmployeeStatus | "all">(
    statusFilter ?? initialStatus ?? "all",
  );
  const [role, setRole] = useState<
    "all" | "supervisor" | "employee" | "manager" | "admin" | "super_admin"
  >(roleFilter ?? initialRole ?? "all");
  const [station, setStation] = useState<string>(initialStation ?? "all");
  const [job, setJob] = useState<string>(initialJob ?? "all");

  const [search, setSearch] = useState(searchQuery ?? initialSearch ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  React.useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 250);
    return () => window.clearTimeout(id);
  }, [search]);

  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const isEs = locale === "es";

  // Trigger real server-side API queries on every filter, search, and page change
  const {
    employees,
    meta,
    statusCounts: apiStatusCounts,
    isLoading,
  } = useEmployees({
    page: currentPage,
    limit: PAGE_SIZE,
    status,
    role,
    stationId: station,
    jobId: job,
    q: debouncedSearch,
  });

  const { roles } = useRoles();
  const { data: stations = [] } = useStations();
  const { data: locationsData } = useLocations();
  const locations = locationsData?.locations ?? [];

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
  });

  const trainingByEmployee = React.useMemo(() => {
    const map = new Map<string, TrainingCounts>();
    for (const row of progress?.employees ?? []) {
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

  const { employee: me } = useMe();
  const isSuper = isSuperAdmin(me?.role);
  const isSuperv = isSupervisor(me?.role);
  const canEdit = canEditEmployees(me?.role);

  function openEdit(employee: AdminEmployee): void {
    if (!canEdit) return;
    if (employee.id === me?.id && !isSuper) return;
    router.push(`/${locale}/admin/employees/${employee.id}/edit`);
  }

  // Real status counts from server query
  const statusCounts = apiStatusCounts ?? {
    all: meta?.total ?? employees.length,
    pending: 0,
    active: 0,
    deactivated: 0,
  };

  const totalItems = meta?.total ?? employees.length;
  const totalPages =
    meta?.totalPages ?? Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paged = employees;

  // Filter change handlers that reset to page 1
  function handleStatusChange(nextStatus: EmployeeStatus | "all"): void {
    setStatus(nextStatus);
    setCurrentPage(1);
  }

  function handleRoleChange(nextRole: any): void {
    setRole(nextRole);
    setCurrentPage(1);
  }

  function handleStationChange(nextStation: string): void {
    setStation(nextStation);
    setCurrentPage(1);
  }

  function handleJobChange(nextJob: string): void {
    setJob(nextJob);
    setCurrentPage(1);
  }

  function clearSearch(): void {
    setSearch("");
    setDebouncedSearch("");
    setCurrentPage(1);
  }

  function resetAllFilters(): void {
    setStatus("all");
    setRole("all");
    setStation("all");
    setJob("all");
    setSearch("");
    setDebouncedSearch("");
    setCurrentPage(1);
  }

  // Shallow URL synchronization
  React.useEffect(() => {
    const id = window.setTimeout(() => {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      if (status !== "all") params.set("status", status);
      else params.delete("status");

      if (role !== "all") params.set("role", role);
      else params.delete("role");

      if (station !== "all") params.set("station", station);
      else params.delete("station");

      if (job !== "all") params.set("job", job);
      else params.delete("job");

      const q = debouncedSearch.trim();
      if (q) params.set("q", q);
      else params.delete("q");

      const qs = params.toString();
      const next = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
      const current = `${window.location.pathname}${window.location.search}`;
      if (next !== current) window.history.replaceState(null, "", next);
    }, 250);
    return () => window.clearTimeout(id);
  }, [status, role, station, job, debouncedSearch]);

  const roleLabel = React.useMemo(
    () => new Map(roles.map((r) => [r.id, r.name] as const)),
    [roles],
  );
  const stationLabel = React.useMemo(
    () => new Map(stations.map((s) => [s.id, s.name] as const)),
    [stations],
  );

  const roleOptions = React.useMemo<SelectOption[]>(() => {
    return [
      {
        value: "all",
        label: isEs ? "Todos los roles" : "All Roles",
      },
      ...(isSuper
        ? [
            {
              value: "manager",
              label: isEs ? "Gerentes" : "Managers",
            },
          ]
        : []),
      {
        value: "supervisor",
        label: isEs ? "Supervisores" : "Supervisors",
      },
      {
        value: "employee",
        label: isEs ? "Empleados" : "Employees",
      },
    ];
  }, [isEs, isSuper]);

  const stationOptions = React.useMemo<SelectOption[]>(() => {
    return [
      {
        value: "all",
        label: isEs ? "Todas las estaciones" : "All Stations",
      },
      ...stations.map((s) => ({
        value: s.id,
        label: s.name,
      })),
    ];
  }, [isEs, stations]);

  const jobOptions = React.useMemo<SelectOption[]>(() => {
    return [
      {
        value: "all",
        label: isEs ? "Todos los puestos" : "All Job Roles",
      },
      ...roles.map((r) => ({
        value: r.id,
        label: r.name,
      })),
    ];
  }, [isEs, roles]);

  const activeRoleLabel = React.useMemo(() => {
    if (role === "all") return "";
    return roleOptions.find((o) => o.value === role)?.label || role;
  }, [role, roleOptions]);

  const activeStationLabel = React.useMemo(() => {
    if (station === "all") return "";
    return stationLabel.get(station) || station;
  }, [station, stationLabel]);

  const activeJobLabel = React.useMemo(() => {
    if (job === "all") return "";
    return roleLabel.get(job) || job;
  }, [job, roleLabel]);

  const hasActiveFilters =
    status !== "all" ||
    role !== "all" ||
    station !== "all" ||
    job !== "all" ||
    debouncedSearch.trim() !== "";

  const statusBadge = (s: EmployeeStatus): string => {
    if (s === "pending") return labels.statusPending;
    if (s === "active") return labels.statusActive;
    return labels.statusDeactivated;
  };

  function openRow(id: string): void {
    router.push(`/${locale}/admin/employees/${id}`);
  }

  return (
    <div className="space-y-5">
      {/* 2-Row Full-Width Toolbar */}
      <div className="flex flex-col gap-4">
        {/* Row 1: Status Tabs (Full width, nothing clipped) */}
        <div className="w-full">
          <div
            role="tablist"
            aria-label={isEs ? "Filtro de estado" : "Status filter"}
            className="inline-flex flex-wrap items-center rounded-full border border-[var(--color-line-2)] bg-[var(--color-panel)] p-1 gap-1"
          >
            {[
              {
                value: "all" as const,
                label: isEs ? "Todos" : "All",
                count: statusCounts.all,
              },
              {
                value: "pending" as const,
                label: labels.statusPending,
                count: statusCounts.pending,
              },
              {
                value: "active" as const,
                label: labels.statusActive,
                count: statusCounts.active,
              },
              {
                value: "deactivated" as const,
                label: labels.statusDeactivated,
                count: statusCounts.deactivated,
              },
            ].map((tab) => {
              const isSelected = status === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => handleStatusChange(tab.value)}
                  className={cn(
                    "inline-flex cursor-pointer items-center justify-center rounded-full font-medium transition-all text-sm px-4 py-2 whitespace-nowrap gap-3",
                    isSelected
                      ? "bg-[var(--color-brand-600)] text-white font-semibold shadow-xs"
                      : "bg-transparent text-[var(--color-ink-2)] hover:text-[var(--color-ink)] hover:bg-[var(--color-wash)]",
                  )}
                >
                  <span className="font-medium tracking-tight">
                    {tab.label}
                  </span>
                  <span
                    className={cn(
                      "min-w-[24px] h-5 px-2 text-xs font-bold rounded-full inline-flex items-center justify-center transition-colors shadow-2xs",
                      isSelected
                        ? "bg-white/25 text-white"
                        : "bg-[var(--color-wash)] text-[var(--color-ink-2)] border border-[var(--color-line-2)]",
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Search on left (flexible width) + 3 Dropdowns on right (each 150px wide, 40px tall) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
          {/* Search box - flexible width */}
          <div
            className="find flex-1 min-w-[200px] !max-w-none h-10"
            role="search"
          >
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
                className="shrink-0 text-[var(--color-ink-3)] hover:text-[var(--color-ink)] cursor-pointer"
              >
                <LuX aria-hidden="true" />
              </button>
            ) : null}
          </div>

          {/* 3 Dropdowns on right side by side - each about 150px wide, 40px tall */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            {/* Role Filter Dropdown - Hidden for supervisors since all their subordinates are employees */}
            {!isSuperv && (
              <div className="w-full sm:w-[150px] shrink-0">
                <CustomSelect
                  value={role}
                  onChange={(val) => handleRoleChange(val as any)}
                  options={roleOptions}
                  size="default"
                  className="h-10 text-sm w-full"
                />
              </div>
            )}

            {/* Station Filter Dropdown */}
            <div className="w-full sm:w-[150px] shrink-0">
              <CustomSelect
                value={station}
                onChange={(val) => handleStationChange(val)}
                options={stationOptions}
                size="default"
                className="h-10 text-sm w-full"
              />
            </div>

            {/* Job Role Filter Dropdown */}
            <div className="w-full sm:w-[150px] shrink-0">
              <CustomSelect
                value={job}
                onChange={(val) => handleJobChange(val)}
                options={jobOptions}
                size="default"
                className="h-10 text-sm w-full"
              />
            </div>
          </div>
        </div>

        {/* Removable Active Filter Chips & Clear All */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-sm">
            <span className="text-xs font-semibold text-[var(--color-ink-3)] uppercase tracking-wider mr-1">
              {isEs ? "Filtros activos:" : "Active filters:"}
            </span>

            {status !== "all" && (
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-panel)] px-3 py-1 text-xs font-medium text-[var(--color-ink)] border border-[var(--color-line-2)] shadow-2xs">
                <span className="text-[var(--color-ink-3)] font-normal">
                  {isEs ? "Estado:" : "Status:"}
                </span>
                <strong className="font-semibold capitalize">
                  {statusBadge(status)}
                </strong>
                <button
                  type="button"
                  onClick={() => handleStatusChange("all")}
                  className="ml-1 p-0.5 rounded-full text-[var(--color-ink-3)] hover:text-[var(--color-brand-700)] hover:bg-[var(--color-wash)] cursor-pointer transition-colors"
                  aria-label={
                    isEs ? "Quitar filtro de estado" : "Remove status filter"
                  }
                >
                  <LuX className="h-3.5 w-3.5" />
                </button>
              </span>
            )}

            {role !== "all" && (
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-panel)] px-3 py-1 text-xs font-medium text-[var(--color-ink)] border border-[var(--color-line-2)] shadow-2xs">
                <span className="text-[var(--color-ink-3)] font-normal">
                  {isEs ? "Rol:" : "Role:"}
                </span>
                <strong className="font-semibold capitalize">
                  {activeRoleLabel}
                </strong>
                <button
                  type="button"
                  onClick={() => handleRoleChange("all")}
                  className="ml-1 p-0.5 rounded-full text-[var(--color-ink-3)] hover:text-[var(--color-brand-700)] hover:bg-[var(--color-wash)] cursor-pointer transition-colors"
                  aria-label={
                    isEs ? "Quitar filtro de rol" : "Remove role filter"
                  }
                >
                  <LuX className="h-3.5 w-3.5" />
                </button>
              </span>
            )}

            {station !== "all" && (
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-panel)] px-3 py-1 text-xs font-medium text-[var(--color-ink)] border border-[var(--color-line-2)] shadow-2xs">
                <span className="text-[var(--color-ink-3)] font-normal">
                  {isEs ? "Estación:" : "Station:"}
                </span>
                <strong className="font-semibold">{activeStationLabel}</strong>
                <button
                  type="button"
                  onClick={() => handleStationChange("all")}
                  className="ml-1 p-0.5 rounded-full text-[var(--color-ink-3)] hover:text-[var(--color-brand-700)] hover:bg-[var(--color-wash)] cursor-pointer transition-colors"
                  aria-label={
                    isEs ? "Quitar filtro de estación" : "Remove station filter"
                  }
                >
                  <LuX className="h-3.5 w-3.5" />
                </button>
              </span>
            )}

            {job !== "all" && (
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-panel)] px-3 py-1 text-xs font-medium text-[var(--color-ink)] border border-[var(--color-line-2)] shadow-2xs">
                <span className="text-[var(--color-ink-3)] font-normal">
                  {isEs ? "Puesto:" : "Job:"}
                </span>
                <strong className="font-semibold">{activeJobLabel}</strong>
                <button
                  type="button"
                  onClick={() => handleJobChange("all")}
                  className="ml-1 p-0.5 rounded-full text-[var(--color-ink-3)] hover:text-[var(--color-brand-700)] hover:bg-[var(--color-wash)] cursor-pointer transition-colors"
                  aria-label={
                    isEs ? "Quitar filtro de puesto" : "Remove job filter"
                  }
                >
                  <LuX className="h-3.5 w-3.5" />
                </button>
              </span>
            )}

            {debouncedSearch.trim() && (
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-panel)] px-3 py-1 text-xs font-medium text-[var(--color-ink)] border border-[var(--color-line-2)] shadow-2xs">
                <span className="text-[var(--color-ink-3)] font-normal">
                  {isEs ? "Búsqueda:" : "Search:"}
                </span>
                <strong className="font-semibold">
                  &ldquo;{debouncedSearch.trim()}&rdquo;
                </strong>
                <button
                  type="button"
                  onClick={clearSearch}
                  className="ml-1 p-0.5 rounded-full text-[var(--color-ink-3)] hover:text-[var(--color-brand-700)] hover:bg-[var(--color-wash)] cursor-pointer transition-colors"
                  aria-label={isEs ? "Borrar búsqueda" : "Clear search"}
                >
                  <LuX className="h-3.5 w-3.5" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={resetAllFilters}
              className="ml-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-brand-700)] hover:underline cursor-pointer"
            >
              <LuRefreshCw className="h-3 w-3" />
              <span>{isEs ? "Restablecer filtros" : "Clear all"}</span>
            </button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="px-6 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
              {labels.loading}
            </p>
          ) : paged.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
              {debouncedSearch.trim() ? labels.noMatches : labels.empty}
            </p>
          ) : (
            <>
              {/* Mobile Card List (< md) */}
              <div className="divide-y divide-[var(--color-line)] md:hidden">
                {paged.map((e) => {
                  const tone: StatusTone =
                    e.status === "active"
                      ? "ok"
                      : e.status === "pending"
                        ? "warn"
                        : "bad";

                  const roleLabels =
                    Array.isArray(e.jobs) && e.jobs.length
                      ? e.jobs.map((j) => j.name)
                      : (e.roleIds ?? (e as any).jobIds ?? [])
                          .map((id: string) => roleLabel.get(id))
                          .filter((s: string | undefined): s is string =>
                            Boolean(s),
                          );
                  const stationLabels =
                    Array.isArray(e.stations) && e.stations.length
                      ? e.stations.map((st) => st.name)
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
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar initials={initials(e.name)} size="sm" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-medium text-[var(--color-ink)]">
                                {e.name}
                              </span>
                              <span className="text-xs text-[var(--color-ink-3)] capitalize">
                                ({formatSystemRole(e.role, isEs)})
                              </span>
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

                      {e.role !== "manager" && (training?.total ?? 0) > 0 && (
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
                      <th>{locale === "es" ? "Rol" : "Role"}</th>
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
                    {paged.map((e) => {
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
                          ? e.stations.map((st) => st.name)
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
                          <td className="text-sm font-medium text-[var(--color-ink-2)] capitalize">
                            {formatSystemRole(e.role, isEs)}
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
                            {e.role === "manager" ? (
                              <span className="text-sm text-[var(--color-ink-3)]">
                                —
                              </span>
                            ) : (
                              <TrainingSummary counts={training} />
                            )}
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
    </div>
  );
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).slice(0, 2);
  return words.map((w) => w.charAt(0).toUpperCase()).join("") || "?";
}
