"use client";

import * as React from "react";
import { useState, useTransition, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select";
import { MultiSelectChips } from "@/components/ui/multi-select-chips";
import { PageHeader } from "@/components/admin/page-header";
import { LuUserPlus, LuLoader } from "react-icons/lu";
import {
  createEmployee,
  fetchSupervisors,
  fetchManagers,
  fetchEmployees,
} from "@/services/employees/api";
import { toast } from "@/components/ui/toast";
import { fetchLocations } from "@/services/locations/api";
import { fetchJobs, fetchJobStations } from "@/services/jobs/api";
import { ApiException } from "@/lib/api";
import type {
  AccessLevel,
  Employee,
  InviteResult,
  LanguagePref,
  Location,
  Role,
  Station,
} from "@/lib/types";
import { InviteResultCard } from "./invite-result";
import {
  EmployeeAccessSection,
  EmployeeAdditionalSection,
  EmployeeDetailsSection,
  EmployeeEmergencySection,
  EmployeePayrollSection,
  EmployeePersonalSection,
} from "./employee-form-sections";
import {
  type FieldErrors,
  type FormState,
  validateEmployeeForm,
} from "./employee-form-validation";

export type { FieldErrors, FormState };

interface NewEmployeeFormProps {
  locale: string;
  locations: Location[];
  roles: Role[];
  currentUserRole?: string | null;
  currentUserLocationId?: string | null;
}

const initialState = (defaultLocationId: string): FormState => ({
  name: "",
  email: "",
  locationId: defaultLocationId,
  accessLevel: "",
  roleIds: [],
  stationIds: [],
  employeeCode: "",
  languagePref: "en",
  dateOfBirth: "",
  fathersName: "",
  gender: "",
  address: "",
  phoneNumber: "",
  emergencyContactName: "",
  emergencyContactRelation: "",
  emergencyContactPhone: "",
  startDate: "",
  sinNumber: "",
  hourlyRate: "",
  supervisorIds: [],
  managerIds: [],
  subordinateIds: [],
});

export function NewEmployeeForm({
  locale,
  locations: initialLocations,
  roles: initialRoles,
  currentUserRole,
  currentUserLocationId,
}: NewEmployeeFormProps): React.ReactElement {
  const t = useTranslations("admin");

  // Filter out any mock 'loc-main' id from initial locations
  const validInitialLocations = initialLocations.filter(
    (l) => l.id !== "loc-main",
  );
  // If user is a manager, restrict locations to their assigned location
  const filteredLocations =
    currentUserRole === "manager" && currentUserLocationId
      ? validInitialLocations.filter((l) => l.id === currentUserLocationId)
      : validInitialLocations;

  const [locations, setLocations] = useState<Location[]>(
    filteredLocations.length > 0 ? filteredLocations : validInitialLocations,
  );
  const [roles, setRoles] = useState<Role[]>(initialRoles);

  const defaultLocationId =
    (currentUserRole === "manager" && currentUserLocationId) ||
    filteredLocations[0]?.id ||
    validInitialLocations[0]?.id ||
    "";
  const [form, setForm] = useState<FormState>(initialState(defaultLocationId));

  const [allStations, setAllStations] = useState<Station[]>([]);
  const [availableStations, setAvailableStations] = useState<Station[]>([]);
  const [supervisors, setSupervisors] = useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [managers, setManagers] = useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [kitchenStaff, setKitchenStaff] = useState<
    Array<{ id: string; name: string; email?: string | null }>
  >([]);
  const [isLoadingKitchenStaff, setIsLoadingKitchenStaff] =
    useState<boolean>(false);
  const [isLoadingSupervisors, setIsLoadingSupervisors] =
    useState<boolean>(false);
  const [isLoadingManagers, setIsLoadingManagers] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isLoadingLocations, setIsLoadingLocations] = useState<boolean>(false);
  const [isLoadingRoles, setIsLoadingRoles] = useState<boolean>(false);
  const [isLoadingStations, setIsLoadingStations] = useState<boolean>(false);
  const [result, setResult] = useState<{
    employee: Employee;
    invite: InviteResult;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const hasLoadedRef = React.useRef(false);
  const roleFetchSeq = React.useRef(0);

  // Load supervisors, managers, and kitchen staff whenever the location changes
  useEffect(() => {
    if (!form.locationId) return;
    setIsLoadingSupervisors(true);
    setIsLoadingManagers(true);
    setIsLoadingKitchenStaff(true);
    fetchSupervisors(form.locationId)
      .then((res) => setSupervisors(res.supervisors))
      .catch(() => setSupervisors([]))
      .finally(() => setIsLoadingSupervisors(false));
    fetchManagers(form.locationId)
      .then((res) => setManagers(res.managers))
      .catch(() => setManagers([]))
      .finally(() => setIsLoadingManagers(false));
    fetchEmployees({
      locationId: form.locationId,
      role: "employee",
      status: "active",
      limit: 100,
    })
      .then((res) => setKitchenStaff(res.employees))
      .catch(() => setKitchenStaff([]))
      .finally(() => setIsLoadingKitchenStaff(false));
  }, [form.locationId]);

  // Load real locations from the API on mount (do NOT load jobs or stations yet)
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    async function loadInitial() {
      setIsLoadingLocations(true);
      try {
        const locsRes = await fetchLocations();
        if (locsRes.locations.length > 0) {
          setLocations(locsRes.locations);
          setForm((f) => ({
            ...f,
            locationId:
              !f.locationId || f.locationId === "loc-main"
                ? locsRes.locations[0].id
                : f.locationId,
          }));
        }
      } catch {
        // keep fallback
      } finally {
        setIsLoadingLocations(false);
      }
    }

    void loadInitial();
  }, []);

  function clearFieldError(field: keyof FieldErrors): void {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function update<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ): void {
    setForm((f) => ({ ...f, [key]: value }));
    clearFieldError(key as keyof FieldErrors);
    if (error) setError(null);
  }

  function onLocationChange(newLocationId: string): void {
    setForm((f) => ({ ...f, locationId: newLocationId }));
    clearFieldError("locationId");
    if (error) setError(null);
  }

  // Handle access level toggle:
  // When Employee is selected: fetch jobs from jobs API; selections kept empty until user selects role
  // When Manager or Supervisor is selected: no station/job role required; clear roleIds & stationIds
  async function setAccessLevel(next: AccessLevel | ""): Promise<void> {
    clearFieldError("accessLevel");
    clearFieldError("roleIds");
    clearFieldError("stationIds");
    clearFieldError("supervisorIds");
    clearFieldError("managerIds");
    if (error) setError(null);

    if (next === "manager" || next === "supervisor") {
      setAvailableStations([]);
      setForm((f) => ({
        ...f,
        accessLevel: next,
        roleIds: [],
        stationIds: [],
        supervisorIds: [],
        managerIds: next === "supervisor" ? f.managerIds : [],
        subordinateIds: [],
      }));
      return;
    }

    if (next === "employee") {
      setIsLoadingRoles(true);
      try {
        const { jobs: fetchedJobs } = await fetchJobs();
        const currentRoles: Role[] = fetchedJobs.map((j) => ({
          id: j.id,
          name: j.name,
          clearanceLevel: "general",
          stationIds: [],
          createdAt: j.createdAt || new Date().toISOString(),
        }));
        setRoles(currentRoles);
      } catch (err) {
        const msg =
          err instanceof ApiException && err.message
            ? err.message
            : err instanceof Error && err.message
              ? err.message
              : t("errorGeneric");
        toast.error(msg);
      } finally {
        setIsLoadingRoles(false);
      }

      setAvailableStations([]);
      setForm((f) => ({
        ...f,
        accessLevel: "employee",
        roleIds: [],
        stationIds: [],
        managerIds: [],
      }));
      return;
    }

    // Switched to none
    setAvailableStations([]);
    setForm((f) => ({
      ...f,
      accessLevel: "",
      roleIds: [],
      stationIds: [],
    }));
  }

  // Handle role selection change:
  // When a role is selected/removed, call /api/v1/jobs/stations for the selected jobs.
  // If jobs are cancelled, remove stations per their job.
  async function handleRoleIdsChange(nextRoleIds: string[]): Promise<void> {
    if (nextRoleIds.length > 0) {
      clearFieldError("roleIds");
    }

    if (nextRoleIds.length === 0) {
      setAvailableStations([]);
      setForm((f) => ({
        ...f,
        roleIds: [],
        stationIds: [],
      }));
      return;
    }

    const seq = ++roleFetchSeq.current;
    setIsLoadingStations(true);
    try {
      const { stations: fetchedStations } = await fetchJobStations(nextRoleIds);
      // A newer role change already fired â€” this response is stale, drop it.
      if (seq !== roleFetchSeq.current) return;
      const newAvailableStations: Station[] = fetchedStations.map((s, idx) => ({
        id: s.id,
        name: s.name,
        locationId: form.locationId,
        sortOrder: idx + 1,
        isArchived: false,
      }));

      const availableStationIdSet = new Set(
        newAvailableStations.map((s) => s.id),
      );

      setAvailableStations(newAvailableStations);
      setForm((f) => ({
        ...f,
        roleIds: nextRoleIds,
        // Automatically remove any stations that belonged to the cancelled/deselected job
        stationIds: f.stationIds.filter((id) => availableStationIdSet.has(id)),
      }));
    } catch (err) {
      // Surface the backend message â€” a stuck "Loading stations..." with
      // only a console line left the manager guessing.
      const msg =
        err instanceof ApiException && err.message
          ? err.message
          : err instanceof Error && err.message
            ? err.message
            : t("errorGeneric");
      toast.error(msg);
      setForm((f) => ({
        ...f,
        roleIds: nextRoleIds,
      }));
    } finally {
      // Only the latest request owns the flag: a stale response must not
      // clear a newer request's loading state (or the spinner flaps), and
      // a newer request must not leave a stale one spinning.
      if (seq === roleFetchSeq.current) setIsLoadingStations(false);
    }
  }

  function handleStationIdsChange(nextStationIds: string[]): void {
    setForm((f) => ({
      ...f,
      stationIds: nextStationIds,
    }));
    if (nextStationIds.length > 0) {
      clearFieldError("stationIds");
    }
  }

  const stationsBlockedReason = useMemo<string | undefined>(() => {
    if (!form.accessLevel || form.roleIds.length === 0)
      return t("stationsEmptyNeedRole");
    if (availableStations.length === 0) return t("stationsEmptyForRoles");
    return undefined;
  }, [form.accessLevel, form.roleIds.length, availableStations.length, t]);

  function reset(): void {
    setForm(initialState(locations[0]?.id ?? ""));
    setAvailableStations([]);
    setError(null);
    setFieldErrors({});
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);

    const {
      isValid,
      errors: validationErrors,
      firstError,
    } = validateEmployeeForm(form, t);
    if (!isValid) {
      setFieldErrors(validationErrors);
      if (firstError) {
        setError(firstError);
        toast.error(firstError);
      }
      const firstInvalidKey = Object.keys(validationErrors)[0];
      if (firstInvalidKey) {
        const el = document.getElementById(firstInvalidKey);
        el?.focus();
      }
      return;
    }

    startTransition(async () => {
      try {
        // Send EXACTLY what's checked â€” and only what's still offered for
        // the current roles. Anything checked but no longer available (e.g.
        // roles changed while a stations fetch failed) is dropped rather
        // than silently persisted.
        const offered = new Set(availableStations.map((s) => s.id));
        const selectedStationIds =
          offered.size > 0
            ? form.stationIds.filter((id) => offered.has(id))
            : [...form.stationIds];
        const res = await createEmployee({
          name: form.name.trim(),
          email: form.email.trim(),
          locationId: form.locationId,
          accessLevel: form.accessLevel as AccessLevel,
          role: form.accessLevel as any,
          roleIds: form.roleIds,
          stationIds: selectedStationIds,
          employeeCode: form.employeeCode.trim() || null,
          languagePref: form.languagePref,
          dateOfBirth: form.dateOfBirth.trim() || null,
          fathersName: form.fathersName.trim() || null,
          gender: (form.gender || null) as any,
          address: form.address.trim() || null,
          phoneNumber: form.phoneNumber.trim() || null,
          emergencyContactName: form.emergencyContactName.trim() || null,
          emergencyContactRelation:
            form.emergencyContactRelation.trim() || null,
          emergencyContactPhone: form.emergencyContactPhone.trim() || null,
          startDate: form.startDate.trim() || null,
          sinNumber: form.sinNumber.trim() || null,
          hourlyRate: form.hourlyRate.trim() || null,
          supervisorIds:
            form.accessLevel === "employee" ? form.supervisorIds : [],
          managerIds: form.accessLevel === "supervisor" ? form.managerIds : [],
          subordinateIds:
            form.accessLevel === "supervisor" || form.accessLevel === "manager"
              ? form.subordinateIds
              : [],
        });
        // Server-truth check: the backend must echo exactly what we sent.
        // If it ever stores extras, say so loudly instead of looking saved.
        const saved = new Set(res.employee.stationIds ?? []);
        const extras = selectedStationIds.filter((id) => !saved.has(id));
        const added = [...saved].filter(
          (id) => !selectedStationIds.includes(id),
        );
        if (extras.length > 0 || added.length > 0) {
          toast.warning(
            `Stations mismatch: sent ${selectedStationIds.length}, saved ${saved.size}.`,
          );
        }
        toast.success(
          t("inviteCreatedHeading") || "Employee invite generated successfully",
        );
        setResult(res);
      } catch (err) {
        // Surface the backend's own message field (ApiException.message is
        // the server text) in both the inline alert and a toast â€” same
        // pattern as the invite-accept flow. Falls back to generic strings
        // only when the server sent no text.
        const msg =
          err instanceof ApiException && err.message
            ? err.message
            : err instanceof Error && err.message
              ? err.message
              : t("errorGeneric");
        setError(msg);
        toast.error(msg);

        // Map backend errors to inline field errors
        const newFieldErrors: FieldErrors = {};

        if (err instanceof ApiException) {
          if (err.code === "EMAIL_TAKEN" || /email/i.test(msg)) {
            newFieldErrors.email = msg;
          }
          if (
            err.code === "EMPLOYEE_CODE_TAKEN" ||
            /employee code/i.test(msg) ||
            /code.*taken/i.test(msg) ||
            /code.*already/i.test(msg)
          ) {
            newFieldErrors.employeeCode = msg;
          }
          if (err.code === "LOCATION_NOT_FOUND" || /location/i.test(msg)) {
            newFieldErrors.locationId = msg;
          }
          if (err.code === "JOB_NOT_FOUND" || /job/i.test(msg)) {
            newFieldErrors.roleIds = msg;
          }
          if (Array.isArray(err.details) && err.details.length > 0) {
            for (const d of err.details) {
              if (d.path) {
                const fieldKey = (
                  d.path === "jobIds" ? "roleIds" : d.path
                ) as keyof FieldErrors;
                newFieldErrors[fieldKey] = d.message;
              }
            }
          }
        } else if (err instanceof Error) {
          if (/email/i.test(err.message)) {
            newFieldErrors.email = err.message;
          } else if (/employee code|code/i.test(err.message)) {
            newFieldErrors.employeeCode = err.message;
          }
        }

        if (Object.keys(newFieldErrors).length > 0) {
          setFieldErrors((prev) => ({ ...prev, ...newFieldErrors }));
        }
      }
    });
  }

  if (result) {
    return (
      <InviteResultCard
        locale={locale}
        invite={result.invite}
        employeeName={result.employee.name}
        onCreateAnother={() => {
          setResult(null);
          reset();
        }}
      />
    );
  }

  const field = "flex flex-col gap-2";

  return (
    <div className="mx-auto max-w-[760px] w-full space-y-6">
      <PageHeader
        title={t("newHeading")}
        subtitle={t("newDescription")}
        actions={
          <Link href={`/${locale}/admin/employees`}>
            <Button type="button" variant="neutral">
              {t("cancel")}
            </Button>
          </Link>
        }
      />

      <form onSubmit={onSubmit} noValidate className="space-y-6">
        <EmployeeDetailsSection
          form={form}
          fieldErrors={fieldErrors}
          locations={locations}
          isPending={isPending}
          isLoadingLocations={isLoadingLocations}
          onUpdate={update}
          onLocationChange={onLocationChange}
        />
        <EmployeeAccessSection
          form={form}
          fieldErrors={fieldErrors}
          roles={roles}
          stations={availableStations}
          supervisors={supervisors}
          managers={managers}
          kitchenStaff={kitchenStaff}
          currentUserRole={currentUserRole}
          isPending={isPending}
          isLoadingRoles={isLoadingRoles}
          isLoadingStations={isLoadingStations}
          isLoadingSupervisors={isLoadingSupervisors}
          isLoadingManagers={isLoadingManagers}
          isLoadingKitchenStaff={isLoadingKitchenStaff}
          stationsBlockedReason={stationsBlockedReason}
          onAccessChange={(level) => void setAccessLevel(level)}
          onRolesChange={(ids) => void handleRoleIdsChange(ids)}
          onStationsChange={handleStationIdsChange}
          onSupervisorsChange={(ids) => update("supervisorIds", ids)}
          onManagersChange={(ids) => update("managerIds", ids)}
          onSubordinatesChange={(ids) => update("subordinateIds", ids)}
        />
        <EmployeePersonalSection
          form={form}
          fieldErrors={fieldErrors}
          isPending={isPending}
          onUpdate={update}
        />
        <EmployeeEmergencySection
          form={form}
          fieldErrors={fieldErrors}
          isPending={isPending}
          onUpdate={update}
        />
        <EmployeePayrollSection
          form={form}
          fieldErrors={fieldErrors}
          isPending={isPending}
          onUpdate={update}
        />
        <EmployeeAdditionalSection
          form={form}
          fieldErrors={fieldErrors}
          isPending={isPending}
          onUpdate={update}
        />
        {error ? (
          <p
            role="alert"
            className="text-sm font-medium text-[var(--color-bad)]"
          >
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-3 rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-6 py-4 shadow-e1 sm:px-8">
          <Button
            type="submit"
            disabled={
              isPending ||
              isLoadingLocations ||
              isLoadingRoles ||
              isLoadingStations
            }
            icon={LuUserPlus}
          >
            {isPending ? t("submitting") : t("submit")}
          </Button>
        </div>
      </form>
    </div>
  );
}
