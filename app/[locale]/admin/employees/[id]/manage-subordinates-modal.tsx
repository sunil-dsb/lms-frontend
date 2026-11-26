"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { LuSearch, LuCheck, LuLoader } from "react-icons/lu";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  fetchEmployees,
  updateEmployeeSubordinates,
} from "@/services/employees/api";
import { toast } from "@/components/ui/toast";
import type { AdminEmployee } from "@/lib/types";

interface ManageSubordinatesModalProps {
  targetEmployee: AdminEmployee;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  locale: string;
}

export function ManageSubordinatesModal({
  targetEmployee,
  isOpen,
  onClose,
  onSuccess,
  locale,
}: ManageSubordinatesModalProps): React.ReactElement | null {
  const isEs = locale === "es";
  const isSupervisor = targetEmployee.role === "supervisor";

  // Target candidate role:
  // For supervisor -> assign employees
  // For manager -> assign supervisors
  const candidateRole = isSupervisor ? "employee" : "supervisor";

  const [selectedIds, setSelectedIds] = useState<string[]>(
    targetEmployee.subordinateIds ??
      targetEmployee.subordinates?.map((s) => s.id) ??
      [],
  );
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Sync selectedIds when targetEmployee changes
  React.useEffect(() => {
    if (isOpen) {
      setSelectedIds(
        targetEmployee.subordinateIds ??
          targetEmployee.subordinates?.map((s) => s.id) ??
          [],
      );
      setSearch("");
    }
  }, [isOpen, targetEmployee]);

  // Fetch candidate pool in the same location
  const { data: employeesData, isLoading } = useQuery({
    queryKey: ["employees-pool", targetEmployee.locationId, candidateRole],
    queryFn: () =>
      fetchEmployees({
        limit: 100,
        status: "active",
        role: candidateRole,
      }),
    enabled: isOpen && Boolean(targetEmployee.locationId),
  });

  const candidates = useMemo(() => {
    const list = employeesData?.employees ?? [];
    // Filter to location and exclude self
    const inLoc = list.filter(
      (e) =>
        e.locationId === targetEmployee.locationId &&
        e.id !== targetEmployee.id,
    );
    if (!search.trim()) return inLoc;
    const q = search.toLowerCase().trim();
    return inLoc.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.email && e.email.toLowerCase().includes(q)) ||
        (e.employeeCode && e.employeeCode.toLowerCase().includes(q)),
    );
  }, [employeesData, targetEmployee, search]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    const candidateIds = candidates.map((c) => c.id);
    const allSelected = candidateIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !candidateIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...candidateIds])));
    }
  };

  const allFilteredSelected =
    candidates.length > 0 &&
    candidates.every((c) => selectedIds.includes(c.id));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateEmployeeSubordinates(targetEmployee.id, selectedIds);
      toast.success(
        isSupervisor
          ? isEs
            ? "Equipo de empleados actualizado con éxito"
            : "Supervised employees updated successfully"
          : isEs
            ? "Supervisores asignados actualizados con éxito"
            : "Reporting supervisors updated successfully",
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : isEs
            ? "Error al guardar el equipo"
            : "Failed to update team";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const title = isSupervisor
    ? isEs
      ? "Asignar empleados al supervisor"
      : "Assign Employees to Supervisor"
    : isEs
      ? "Asignar supervisores al gerente"
      : "Assign Supervisors to Manager";

  const subtitle = isSupervisor
    ? isEs
      ? `Selecciona los empleados de cocina que reportan directamente a ${targetEmployee.name}.`
      : `Select the kitchen employees reporting directly to ${targetEmployee.name}.`
    : isEs
      ? `Selecciona los supervisores de turno que reportan a ${targetEmployee.name}.`
      : `Select the shift supervisors reporting directly to ${targetEmployee.name}.`;

  return (
    <Modal open={isOpen} onClose={onClose} size="2xl">
      <ModalHeader
        title={title}
        description={subtitle}
        onClose={onClose}
        closeLabel={isEs ? "Cerrar" : "Close"}
      />

      <ModalBody className="p-5 sm:p-6 space-y-4">
        {/* Search Bar & Select All (Identical pattern to AssignCourseModal) */}
        <div className="shrink-0 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-semibold text-[var(--color-ink)] flex items-center gap-2">
              <span>
                {isSupervisor
                  ? isEs
                    ? "Empleados disponibles"
                    : "Available Employees"
                  : isEs
                    ? "Supervisores disponibles"
                    : "Available Supervisors"}
              </span>
              {selectedIds.length > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--color-brand-600)] text-white">
                  {selectedIds.length} {isEs ? "seleccionado(s)" : "selected"}
                </span>
              )}
            </label>
            {candidates.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="inline-flex items-center gap-2 text-xs font-medium text-[var(--color-brand-700)] hover:underline cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={handleSelectAll}
                  className="size-4 rounded border-[var(--color-line-2)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-600)] cursor-pointer pointer-events-none"
                  tabIndex={-1}
                />
                <span>
                  {allFilteredSelected
                    ? isEs
                      ? "Deseleccionar todos"
                      : "Deselect all"
                    : isEs
                      ? "Seleccionar todos"
                      : "Select all"}
                </span>
              </button>
            )}
          </div>

          <div className="relative flex items-center">
            <LuSearch
              className="pointer-events-none absolute left-3 text-[var(--color-ink-3)] size-4"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isEs
                  ? "Buscar por nombre o correo..."
                  : "Search by name or email..."
              }
              className="w-full h-10 rounded-md border border-[var(--color-line-2)] bg-[var(--color-surface)] pl-10 pr-4 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-brand-600)] focus:ring-1 focus:ring-[var(--color-brand-600)] focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Scrollable list (Matching AssignCourseModal) */}
        <div
          tabIndex={0}
          aria-label={
            isSupervisor
              ? isEs
                ? "Empleados disponibles"
                : "Available Employees"
              : isEs
                ? "Supervisores disponibles"
                : "Available Supervisors"
          }
          className="h-64 max-h-64 overflow-y-auto overscroll-contain rounded-md border border-[var(--color-line)] bg-[var(--color-wash)] p-2 space-y-2 focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-600)]"
          style={{
            maxHeight: "260px",
            height: "260px",
            overflowY: "auto",
          }}
        >
          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-[var(--color-ink-3)]">
              <LuLoader className="size-5 animate-spin" />
              <span className="text-xs">
                {isEs ? "Cargando personal..." : "Loading staff..."}
              </span>
            </div>
          ) : candidates.length === 0 ? (
            <p className="p-6 text-center text-sm text-[var(--color-ink-3)]">
              {search.trim()
                ? isEs
                  ? "No se encontraron coincidencias."
                  : "No matches found."
                : isSupervisor
                  ? isEs
                    ? "No hay empleados disponibles en esta ubicación."
                    : "No employees available in this location."
                  : isEs
                    ? "No hay supervisores disponibles en esta ubicación."
                    : "No supervisors available in this location."}
            </p>
          ) : (
            candidates.map((cand) => {
              const isSelected = selectedIds.includes(cand.id);
              return (
                <div
                  key={cand.id}
                  onClick={() => toggleSelect(cand.id)}
                  className={`group flex items-center justify-between p-3 rounded-md border transition-all cursor-pointer select-none ${
                    isSelected
                      ? "border-[var(--color-brand-600)] bg-[var(--color-surface)] shadow-xs"
                      : "border-[var(--color-line-2)] bg-[var(--color-surface)] hover:border-[var(--color-line)]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-3">
                    <div
                      className={`size-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                        isSelected
                          ? "bg-[var(--color-brand-600)] border-[var(--color-brand-600)] text-white"
                          : "border-[var(--color-line-2)] bg-[var(--color-surface)] group-hover:border-[var(--color-brand-500)]"
                      }`}
                    >
                      {isSelected && <LuCheck className="size-3 stroke-[3]" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--color-ink)] truncate">
                        {cand.name}
                      </p>
                      {cand.email && (
                        <p className="text-xs text-[var(--color-ink-3)] truncate">
                          {cand.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ModalBody>

      <ModalFooter className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--color-ink-2)]">
          {selectedIds.length}{" "}
          {selectedIds.length === 1
            ? isSupervisor
              ? isEs
                ? "empleado seleccionado"
                : "employee selected"
              : isEs
                ? "supervisor seleccionado"
                : "supervisor selected"
            : isSupervisor
              ? isEs
                ? "empleados seleccionados"
                : "employees selected"
              : isEs
                ? "supervisores seleccionados"
                : "supervisors selected"}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSaving}
          >
            {isEs ? "Cancelar" : "Cancel"}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={isSaving || isLoading}
          >
            {isSaving ? (
              <>
                <LuLoader className="size-4 animate-spin mr-1.5" />
                {isEs ? "Guardando..." : "Saving..."}
              </>
            ) : isEs ? (
              "Guardar equipo"
            ) : (
              "Save Team"
            )}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
