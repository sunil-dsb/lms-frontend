"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusPill } from "@/components/ui/status-pill";
import { fetchEmployees } from "@/services/employees/api";
import { fetchStations } from "@/services/stations/api";
import type { Procedure, AdminEmployee } from "@/lib/types";
import type { Station } from "@/services/stations/types";
import {
  LuSparkles,
  LuCheck,
  LuSearch,
  LuUsers,
  LuCalendar,
  LuInfo,
  LuUtensils,
  LuX,
} from "react-icons/lu";
import { cn } from "@/lib/utils";

export interface PromoData {
  isPromo: boolean;
  promoStartsAt: string | null;
  promoExpiresAt: string | null;
  promoAudience: "station" | "everyone";
  promoEmployeeIds: string[];
  stationIds?: string[];
}

interface PromoConfigModalProps {
  open: boolean;
  onClose: () => void;
  procedure?: Procedure | null;
  procedureTitle?: string;
  initialValues?: Partial<PromoData>;
  initialEmployees?: AdminEmployee[];
  initialStations?: Station[];
  onSave: (data: PromoData) => Promise<void> | void;
  locale: string;
}

const pad = (n: number): string => String(n).padStart(2, "0");

export function PromoConfigModal({
  open,
  onClose,
  procedure,
  procedureTitle,
  initialValues,
  initialEmployees,
  initialStations,
  onSave,
  locale,
}: PromoConfigModalProps): React.ReactElement | null {
  const isEs = locale === "es";

  // Data fetching states
  const [employees, setEmployees] = React.useState<AdminEmployee[]>(
    initialEmployees ?? [],
  );
  const [stations, setStations] = React.useState<Station[]>(
    initialStations ?? [],
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  // Form states
  const [isPromo, setIsPromo] = React.useState(true);
  const [promoStartsAt, setPromoStartsAt] = React.useState<string | null>(null);
  const [promoExpiresAt, setPromoExpiresAt] = React.useState<string | null>(
    null,
  );
  const [selectedEmployeeIds, setSelectedEmployeeIds] = React.useState<
    Set<string>
  >(new Set());
  const [selectedStationIds, setSelectedStationIds] = React.useState<
    Set<string>
  >(new Set());
  const [employeeSearch, setEmployeeSearch] = React.useState("");

  // Setup defaults
  const today = new Date();
  const todayLocal = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const setExpiryPreset = (days: number) => {
    const base = promoStartsAt ? new Date(promoStartsAt) : new Date();
    base.setDate(base.getDate() + days);
    setPromoExpiresAt(
      `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T23:59`,
    );
  };

  // Load data & sync initial values whenever modal opens
  React.useEffect(() => {
    if (!open) return;

    if (initialEmployees && initialEmployees.length > 0) {
      setEmployees(initialEmployees);
    }
    if (initialStations && initialStations.length > 0) {
      setStations(initialStations);
    }

    // Initial employee IDs: default to ALL employees selected on
    const initialRawIds =
      initialValues?.promoEmployeeIds &&
      initialValues.promoEmployeeIds.length > 0
        ? initialValues.promoEmployeeIds
        : Array.isArray(procedure?.assignUsers) &&
            procedure.assignUsers.length > 0
          ? (procedure.assignUsers as unknown[]).filter(
              (u): u is string => typeof u === "string",
            )
          : null;

    if (initialRawIds !== null) {
      setSelectedEmployeeIds(new Set(initialRawIds));
    } else {
      const list =
        initialEmployees && initialEmployees.length > 0 ? initialEmployees : [];
      if (list.length > 0) {
        setSelectedEmployeeIds(new Set(list.map((e) => e.id)));
      }
    }

    if (!initialEmployees || !initialStations) {
      setIsLoading(true);
      Promise.all([
        fetchEmployees().catch(() => ({ employees: [] })),
        fetchStations().catch(() => ({ stations: [] })),
      ])
        .then(([empRes, stRes]) => {
          if (!initialEmployees) {
            const fetched = empRes.employees || [];
            setEmployees(fetched);
            if (initialRawIds === null && fetched.length > 0) {
              setSelectedEmployeeIds(new Set(fetched.map((e) => e.id)));
            }
          }
          if (!initialStations) setStations(stRes.stations || []);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }

    // Populate initial values
    const effectiveIsPromo =
      initialValues?.isPromo ?? procedure?.isPromo ?? true;
    setIsPromo(effectiveIsPromo);

    const now = new Date();
    const defaultStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T00:00`;
    setPromoStartsAt(
      initialValues?.promoStartsAt ?? procedure?.promoStartsAt ?? defaultStart,
    );

    const defaultEnd = new Date();
    defaultEnd.setDate(defaultEnd.getDate() + 30);
    const defaultEndStr = `${defaultEnd.getFullYear()}-${pad(defaultEnd.getMonth() + 1)}-${pad(defaultEnd.getDate())}T23:59`;
    setPromoExpiresAt(
      initialValues?.promoExpiresAt ??
        procedure?.promoExpiresAt ??
        defaultEndStr,
    );

    // Initial stations
    const rawProc = procedure as
      (Procedure & { stationIds?: string[] }) | undefined | null;
    const procStations =
      rawProc?.stationIds ??
      rawProc?.stationScope?.stationIds ??
      (rawProc?.stationId ? [rawProc.stationId] : []);
    const stIds = initialValues?.stationIds ?? procStations;
    setSelectedStationIds(new Set(stIds));

    setEmployeeSearch("");
    setIsSaving(false);
  }, [open, procedure, initialValues, initialEmployees, initialStations]);

  if (!open) return null;

  const title =
    procedureTitle ||
    (isEs ? procedure?.titleEs : procedure?.titleEn) ||
    procedure?.titleEn ||
    procedure?.titleEs ||
    "Dish";

  const allEmployeesSelected =
    employees.length > 0 &&
    employees.every((e) => selectedEmployeeIds.has(e.id));

  const allStationsSelected =
    stations.length > 0 &&
    stations.every((st) => selectedStationIds.has(st.id));

  const handleToggleAllEmployees = () => {
    if (allEmployeesSelected) {
      setSelectedEmployeeIds(new Set());
    } else {
      setSelectedEmployeeIds(new Set(employees.map((e) => e.id)));
    }
  };

  const empHasStation = (e: AdminEmployee, sId: string): boolean => {
    if ((e as { stationId?: string }).stationId === sId) return true;
    if (Array.isArray(e.stationIds) && e.stationIds.includes(sId)) return true;
    if (Array.isArray(e.stations)) {
      return e.stations.some((st) =>
        typeof st === "string" ? st === sId : st.id === sId,
      );
    }
    return false;
  };

  const handleToggleAllStations = () => {
    if (allStationsSelected) {
      setSelectedStationIds(new Set());
    } else {
      setSelectedStationIds(new Set(stations.map((st) => st.id)));
      // Automatically select employees belonging to all stations
      const stationEmps = employees.filter((e) =>
        stations.some((st) => empHasStation(e, st.id)),
      );
      if (stationEmps.length > 0) {
        setSelectedEmployeeIds((prev) => {
          const next = new Set(prev);
          stationEmps.forEach((e) => next.add(e.id));
          return next;
        });
      }
    }
  };

  const handleToggleStation = (stationId: string) => {
    const nextStations = new Set(selectedStationIds);
    const willSelect = !nextStations.has(stationId);
    if (willSelect) {
      nextStations.add(stationId);
    } else {
      nextStations.delete(stationId);
    }
    setSelectedStationIds(nextStations);

    // Automatically toggle employees belonging to this station
    const stationEmps = employees.filter((e) => empHasStation(e, stationId));
    if (stationEmps.length > 0) {
      setSelectedEmployeeIds((prev) => {
        const next = new Set(prev);
        for (const emp of stationEmps) {
          if (willSelect) {
            next.add(emp.id);
          } else {
            // Only uncheck if employee has no other currently selected stations
            const otherSelected = employees.some(
              (o) =>
                o.id === emp.id &&
                Array.from(nextStations).some((otherStId) =>
                  empHasStation(o, otherStId),
                ),
            );
            if (!otherSelected) {
              next.delete(emp.id);
            }
          }
        }
        return next;
      });
    }
  };

  const handleToggleEmployee = (empId: string) => {
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId);
      else next.add(empId);
      return next;
    });
  };

  const filteredEmployees = employeeSearch.trim()
    ? employees.filter((e) =>
        `${e.name} ${e.employeeCode ?? ""}`
          .toLowerCase()
          .includes(employeeSearch.trim().toLowerCase()),
      )
    : employees;

  const handleSubmit = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSave({
        isPromo,
        promoStartsAt: isPromo ? promoStartsAt : null,
        promoExpiresAt: isPromo ? promoExpiresAt : null,
        promoAudience: allEmployeesSelected ? "everyone" : "station",
        promoEmployeeIds: isPromo ? Array.from(selectedEmployeeIds) : [],
        stationIds: isPromo ? Array.from(selectedStationIds) : [],
      });
      onClose();
    } catch (err) {
      console.error("Failed to save promo config:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const { startDate, startTime } = ((): {
    startDate: string;
    startTime: string;
  } => {
    if (!promoStartsAt) return { startDate: "", startTime: "00:00" };
    return {
      startDate: promoStartsAt.slice(0, 10),
      startTime: promoStartsAt.includes("T")
        ? promoStartsAt.slice(11, 16)
        : "00:00",
    };
  })();

  const { endDate, endTime } = ((): { endDate: string; endTime: string } => {
    if (!promoExpiresAt) return { endDate: "", endTime: "23:59" };
    return {
      endDate: promoExpiresAt.slice(0, 10),
      endTime: promoExpiresAt.includes("T")
        ? promoExpiresAt.slice(11, 16)
        : "23:59",
    };
  })();

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      className="p-0 overflow-hidden w-full max-w-[700px] max-h-[90vh] rounded-[var(--radius-xl)] shadow-2xl flex flex-col border border-[var(--color-line)] bg-[var(--color-surface)]"
    >
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-[var(--color-line)] bg-[var(--color-wash)]/40 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="p-1 rounded-md bg-[var(--color-brand-tint)] text-[var(--color-brand-600)] shrink-0">
                <LuSparkles className="size-4" />
              </span>
              <h2 className="font-[family-name:var(--font-ui)] text-base sm:text-lg font-bold text-[var(--color-ink)] truncate">
                {isEs ? "Platillo en promoción" : "Promo dish"}
              </h2>
              <StatusPill
                tone={isPromo ? "ok" : "neutral"}
                withDot={isPromo}
                className="shrink-0 text-[11px]"
              >
                {isPromo
                  ? isEs
                    ? "Activo"
                    : "Active"
                  : isEs
                    ? "Inactivo"
                    : "Inactive"}
              </StatusPill>
            </div>

            <label
              className={cn(
                "flex shrink-0 cursor-pointer items-center rounded-full border transition-all select-none shadow-2xs",
                isPromo
                  ? "bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] border-[var(--color-brand-600)] font-semibold"
                  : "bg-[var(--color-surface)] text-[var(--color-ink-2)] border-[var(--color-line-2)] hover:border-[var(--color-ink-3)]",
              )}
              style={{ padding: "4px 10px", gap: "6px" }}
            >
              <input
                type="checkbox"
                checked={isPromo}
                onChange={(e) => setIsPromo(e.target.checked)}
                className="size-4 cursor-pointer accent-[var(--color-brand-600)]"
              />
              <span className="text-xs font-semibold select-none">
                {isEs ? "Activar promoción" : "Enable promo"}
              </span>
            </label>
          </div>
          <p className="text-xs text-[var(--color-ink-2)] leading-relaxed">
            {isEs
              ? `Destaca "${title}" como promoción por tiempo limitado en el panel del personal.`
              : `Feature "${title}" as a limited-time promo on the staff dashboard.`}
          </p>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
          {/* Start Date & Time */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[var(--color-ink)] block">
              {isEs ? "Fecha y hora de inicio" : "Start date & time"}
            </Label>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Input
                type="date"
                value={startDate}
                onChange={(e) =>
                  setPromoStartsAt(
                    e.target.value ? `${e.target.value}T${startTime}` : null,
                  )
                }
                className="h-9 w-full sm:w-[150px] text-xs bg-[var(--color-surface)] border-[var(--color-line-2)]"
              />
              <Input
                type="time"
                value={startTime}
                onChange={(e) =>
                  setPromoStartsAt(
                    startDate
                      ? `${startDate}T${e.target.value || "00:00"}`
                      : null,
                  )
                }
                className="h-9 w-full sm:w-[120px] text-xs bg-[var(--color-surface)] border-[var(--color-line-2)]"
              />
            </div>
          </div>

          {/* End Date & Time + Presets */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-[var(--color-ink)] block">
              {isEs ? "Fecha y hora de fin" : "End date & time"}
            </Label>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Input
                type="date"
                min={startDate || todayLocal}
                value={endDate}
                onChange={(e) =>
                  setPromoExpiresAt(
                    e.target.value ? `${e.target.value}T${endTime}` : null,
                  )
                }
                className="h-9 w-full sm:w-[150px] text-xs bg-[var(--color-surface)] border-[var(--color-line-2)]"
              />
              <Input
                type="time"
                value={endTime}
                onChange={(e) =>
                  setPromoExpiresAt(
                    endDate ? `${endDate}T${e.target.value || "23:59"}` : null,
                  )
                }
                className="h-9 w-full sm:w-[120px] text-xs bg-[var(--color-surface)] border-[var(--color-line-2)]"
              />

              <div
                className="flex items-center flex-wrap pt-1 sm:pt-0"
                style={{ gap: "6px" }}
              >
                <button
                  type="button"
                  onClick={() => setExpiryPreset(14)}
                  className="rounded-full text-xs font-medium border border-[var(--color-line-2)] bg-[var(--color-surface)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)] text-[var(--color-ink-2)] transition-colors cursor-pointer"
                  style={{ padding: "4px 10px" }}
                >
                  +2 Weeks
                </button>
                <button
                  type="button"
                  onClick={() => setExpiryPreset(30)}
                  className="rounded-full text-xs font-medium border border-[var(--color-line-2)] bg-[var(--color-surface)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)] text-[var(--color-ink-2)] transition-colors cursor-pointer"
                  style={{ padding: "4px 10px" }}
                >
                  +1 Month
                </button>
                <button
                  type="button"
                  onClick={() => setExpiryPreset(60)}
                  className="rounded-full text-xs font-medium border border-[var(--color-line-2)] bg-[var(--color-surface)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)] text-[var(--color-ink-2)] transition-colors cursor-pointer"
                  style={{ padding: "4px 10px" }}
                >
                  +2 Months
                </button>
              </div>
            </div>

            {/* Explanatory note */}
            <div className="flex items-start gap-2 pt-1 text-xs text-[var(--color-ink-3)] leading-relaxed">
              <LuInfo className="size-4 shrink-0 mt-0.5 text-[var(--color-brand-600)]" />
              <span>
                {isEs
                  ? "Después de esta fecha, el platillo abandona automáticamente la sección de promoción y permanece en el menú regular de la estación."
                  : "After this time, the dish automatically leaves the promo section and remains in the regular station menu."}
              </span>
            </div>
          </div>

          <div className="border-t border-[var(--color-line)] pt-4 space-y-4">
            {/* Stations Selection */}
            {stations.length > 0 && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center" style={{ gap: "8px" }}>
                    <LuUtensils className="size-4 text-[var(--color-ink-2)]" />
                    <Label className="text-xs font-semibold text-[var(--color-ink)]">
                      {isEs ? "Seleccionar por estación" : "Select by station"}
                    </Label>
                    <StatusPill
                      tone={
                        allStationsSelected
                          ? "ok"
                          : selectedStationIds.size > 0
                            ? "info"
                            : "neutral"
                      }
                      className="text-[11px]"
                    >
                      {selectedStationIds.size}{" "}
                      {isEs ? "seleccionadas" : "selected"}
                    </StatusPill>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleAllStations}
                    className={cn(
                      "inline-flex items-center rounded-full text-xs font-semibold border transition-all cursor-pointer",
                      allStationsSelected
                        ? "bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] border-[var(--color-brand-600)] shadow-2xs"
                        : "bg-[var(--color-surface)] text-[var(--color-ink-2)] border-[var(--color-line-2)] hover:border-[var(--color-ink-3)]",
                    )}
                    style={{ padding: "4px 12px", gap: "6px" }}
                  >
                    <LuCheck className="text-xs" />
                    <span>
                      {allStationsSelected
                        ? isEs
                          ? "Deseleccionar todas"
                          : "Deselect all"
                        : isEs
                          ? "Todas las estaciones"
                          : "All stations"}
                    </span>
                  </button>
                </div>

                <div className="flex flex-wrap pt-1" style={{ gap: "8px" }}>
                  {stations.map((st) => {
                    const isSelected = selectedStationIds.has(st.id);
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => handleToggleStation(st.id)}
                        className={cn(
                          "inline-flex items-center rounded-full text-xs font-medium border transition-all cursor-pointer select-none",
                          isSelected
                            ? "bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] border-[var(--color-brand-600)] font-semibold shadow-2xs"
                            : "bg-[var(--color-surface)] text-[var(--color-ink)] border-[var(--color-line-2)] hover:border-[var(--color-brand-600)]",
                        )}
                        style={{ padding: "6px 14px", gap: "6px" }}
                      >
                        {isSelected && (
                          <LuCheck className="text-xs stroke-[3] text-[var(--color-brand-600)]" />
                        )}
                        <span>{st.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Assign to Employees */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center" style={{ gap: "8px" }}>
                  <LuUsers className="size-4 text-[var(--color-ink-2)]" />
                  <Label className="text-xs font-semibold text-[var(--color-ink)]">
                    {isEs ? "Asignar a empleados" : "Assign to employees"}
                  </Label>
                  <StatusPill
                    tone={
                      allEmployeesSelected
                        ? "ok"
                        : selectedEmployeeIds.size > 0
                          ? "info"
                          : "neutral"
                    }
                    className="text-[11px]"
                  >
                    {selectedEmployeeIds.size}{" "}
                    {isEs ? "seleccionados" : "selected"}
                  </StatusPill>
                </div>

                <button
                  type="button"
                  onClick={handleToggleAllEmployees}
                  className={cn(
                    "inline-flex items-center rounded-full text-xs font-semibold border transition-all cursor-pointer",
                    allEmployeesSelected
                      ? "bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] border-[var(--color-brand-600)] shadow-2xs"
                      : "bg-[var(--color-surface)] text-[var(--color-ink-2)] border-[var(--color-line-2)] hover:border-[var(--color-ink-3)]",
                  )}
                  style={{ padding: "4px 12px", gap: "6px" }}
                >
                  <LuCheck className="text-xs" />
                  <span>
                    {allEmployeesSelected
                      ? isEs
                        ? "Deseleccionar todos"
                        : "Deselect all"
                      : isEs
                        ? "Todos los empleados"
                        : "All employees"}
                  </span>
                </button>
              </div>

              <p className="text-xs text-[var(--color-ink-3)]">
                {isEs
                  ? "Solo los empleados seleccionados verán este platillo en su sección de Promoción."
                  : "Only selected employees see this dish in their Promo section."}
              </p>

              {/* Employee search */}
              <div className="relative">
                <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-ink-3)]" />
                <Input
                  type="text"
                  placeholder={
                    isEs ? "Buscar empleados..." : "Search employees..."
                  }
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-[var(--color-surface)] border-[var(--color-line-2)] rounded-[var(--radius-md)]"
                />
              </div>

              {/* Employee list - scrollable block */}
              <div
                style={{ maxHeight: "190px" }}
                className="overflow-y-auto divide-y divide-[var(--color-line-2)] rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-inner"
              >
                {filteredEmployees.length === 0 ? (
                  <p className="p-3 text-center text-xs text-[var(--color-ink-3)]">
                    {isEs
                      ? "No se encontraron empleados"
                      : "No employees found"}
                  </p>
                ) : (
                  filteredEmployees.map((emp) => {
                    const isChecked = selectedEmployeeIds.has(emp.id);
                    return (
                      <label
                        key={emp.id}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 text-xs cursor-pointer transition-colors",
                          isChecked
                            ? "bg-[var(--color-brand-tint)]/30 text-[var(--color-ink)]"
                            : "hover:bg-[var(--color-wash)] text-[var(--color-ink-2)]",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleEmployee(emp.id)}
                          className="size-4 rounded accent-[var(--color-brand-600)] cursor-pointer"
                        />
                        <span className="font-medium text-[var(--color-ink)]">
                          {emp.name}
                        </span>
                        {emp.role && (
                          <span className="text-[10px] text-[var(--color-ink-3)] capitalize">
                            • {emp.role}
                          </span>
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--color-line)] flex items-center justify-between gap-3 bg-[var(--color-wash)]/40">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
          >
            {isEs ? "Cancelar" : "Cancel"}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={LuSparkles}
              onClick={handleSubmit}
              disabled={isSaving}
            >
              {isSaving
                ? isEs
                  ? "Guardando..."
                  : "Saving..."
                : isPromo
                  ? isEs
                    ? "Guardar promoción"
                    : "Save promo"
                  : isEs
                    ? "Guardar cambios"
                    : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
