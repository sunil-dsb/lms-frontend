"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { LuLoader, LuSave } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/admin/page-header";
import { useMe } from "@/services/auth/hooks";
import {
  fetchEmployeeById,
  fetchManagers,
  fetchSupervisors,
  updateEmployee,
} from "@/services/employees/api";
import type { UpdateEmployeeRequest } from "@/services/employees/api";
import { EMPLOYEES_QUERY_KEY } from "@/services/employees/hooks";
import type { AdminEmployee, AccessLevel, Role, Station } from "@/lib/types";
import {
  canEditEmployees,
  formatSystemRole,
  isManager,
  isSuperAdmin,
} from "@/lib/rbac";
import { useLocations } from "@/services/locations/hooks";
import { useRoles } from "@/services/jobs/hooks";
import { useStations } from "@/services/stations/hooks";
import { useDynamicStations } from "../use-dynamic-stations";
import {
  EmployeeAccessSection,
  EmployeeAdditionalSection,
  EmployeeDetailsSection,
  EmployeeEmergencySection,
  EmployeePayrollSection,
  EmployeePersonalSection,
} from "../../new/employee-form-sections";
import {
  validateEmployeeForm,
  type FieldErrors,
  type FormState,
} from "../../new/employee-form-validation";
import { ApiException } from "@/lib/errors";

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  locationId: "",
  accessLevel: "employee",
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
};

function formFromEmployee(employee: AdminEmployee): FormState {
  const initialStationIds =
    Array.isArray(employee.stationIds) && employee.stationIds.length > 0
      ? employee.stationIds
      : Array.isArray(employee.stations)
        ? employee.stations
            .map((s: any) => (typeof s === "string" ? s : s.id))
            .filter(Boolean)
        : [];

  const initialRoleIds =
    Array.isArray(employee.roleIds) && employee.roleIds.length > 0
      ? employee.roleIds
      : Array.isArray(employee.jobIds) && employee.jobIds.length > 0
        ? employee.jobIds
        : Array.isArray(employee.jobs)
          ? employee.jobs
              .map((j: any) => (typeof j === "string" ? j : j.id))
              .filter(Boolean)
          : [];

  return {
    name: employee.name ?? "",
    email: employee.email ?? "",
    locationId: employee.locationId ?? "",
    accessLevel:
      employee.role === "manager" || employee.role === "supervisor"
        ? employee.role
        : "employee",
    roleIds: initialRoleIds,
    stationIds: initialStationIds,
    employeeCode: employee.employeeCode ?? "",
    languagePref: employee.languagePref ?? "en",
    dateOfBirth: employee.dateOfBirth?.slice(0, 10) ?? "",
    fathersName: employee.fathersName ?? "",
    gender: employee.gender ?? "",
    address: employee.address ?? "",
    phoneNumber: employee.phoneNumber ?? "",
    emergencyContactName: employee.emergencyContactName ?? "",
    emergencyContactRelation: employee.emergencyContactRelation ?? "",
    emergencyContactPhone: employee.emergencyContactPhone ?? "",
    startDate: employee.startDate?.slice(0, 10) ?? "",
    sinNumber: employee.sinNumber ?? "",
    hourlyRate: employee.hourlyRate == null ? "" : String(employee.hourlyRate),
    supervisorIds:
      employee.supervisorIds ??
      employee.supervisors?.map((item) => item.id) ??
      [],
    managerIds:
      employee.managerIds ?? employee.managers?.map((item) => item.id) ?? [],
  };
}

export function EmployeeEditPage({
  id,
  locale,
}: {
  id: string;
  locale: string;
}): React.ReactElement {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("admin");
  const isEs = locale === "es";
  const { employee: me, isLoading: isLoadingMe } = useMe();
  const isAdmin = isSuperAdmin(me?.role);
  const isManagerUser = isManager(me?.role);
  const employeeQuery = useQuery({
    queryKey: ["employee", id],
    queryFn: async () => {
      const result = await fetchEmployeeById(id);
      return result.inviteUrl
        ? { ...result.employee, inviteUrl: result.inviteUrl }
        : result.employee;
    },
    enabled: Boolean(id),
  });
  const employee = employeeQuery.data;
  const { data: locationsData, isLoading: isLoadingLocations } = useLocations();
  const { roles, isLoading: isLoadingRoles } = useRoles();
  const { data: allStations = [] } = useStations();
  const locations = locationsData?.locations ?? [];
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [supervisors, setSupervisors] = React.useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [managers, setManagers] = React.useState<
    Array<{ id: string; name: string; email: string }>
  >([]);
  const [loadingHierarchy, setLoadingHierarchy] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const initializedFor = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!employee || initializedFor.current === employee.id) return;
    initializedFor.current = employee.id;
    setForm(formFromEmployee(employee));
  }, [employee]);

  React.useEffect(() => {
    if (!form.locationId) return;
    let cancelled = false;
    setLoadingHierarchy(true);
    Promise.all([
      fetchSupervisors(form.locationId).catch(() => ({ supervisors: [] })),
      fetchManagers(form.locationId).catch(() => ({ managers: [] })),
    ])
      .then(([supervisorResult, managerResult]) => {
        if (cancelled) return;
        setSupervisors(supervisorResult.supervisors);
        setManagers(managerResult.managers);
      })
      .finally(() => {
        if (!cancelled) setLoadingHierarchy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.locationId]);

  const setStationIds = React.useCallback<
    React.Dispatch<React.SetStateAction<string[]>>
  >(
    (value) =>
      setForm((current) => ({
        ...current,
        stationIds:
          typeof value === "function" ? value(current.stationIds) : value,
      })),
    [],
  );
  const {
    availableStations,
    isLoading: isLoadingDynamicStations,
    stationsBlockedReason,
  } = useDynamicStations({
    roleIds: form.roleIds,
    locationId: form.locationId,
    roles,
    stations: allStations,
    initialStations: employee?.stations ?? [],
    setStationIds,
    needRoleMessage: isEs
      ? "Selecciona primero un puesto."
      : "Select a job role first.",
    stationsEmptyMessage: isEs
      ? "No hay estaciones disponibles para estos puestos."
      : "No stations are available for these job roles.",
  });

  const canEditTarget = Boolean(
    employee &&
    me &&
    canEditEmployees(me.role) &&
    (isAdmin ||
      (isManagerUser &&
        Boolean(me.locationId) &&
        employee.id !== me.id &&
        employee.role !== "manager" &&
        employee.role !== "super_admin" &&
        employee.role !== "admin" &&
        me.locationId === employee.locationId)),
  );

  function update<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ): void {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[key as keyof FieldErrors];
      return next;
    });
    setError(null);
  }

  function changeAccessLevel(level: AccessLevel): void {
    setForm((current) => ({
      ...current,
      accessLevel: level,
      roleIds: level === "employee" ? current.roleIds : [],
      stationIds: level === "employee" ? current.stationIds : [],
      supervisorIds: level === "employee" ? current.supervisorIds : [],
      managerIds: level === "supervisor" ? current.managerIds : [],
    }));
    setFieldErrors((current) => ({
      ...current,
      accessLevel: undefined,
      roleIds: undefined,
      stationIds: undefined,
      supervisorIds: undefined,
      managerIds: undefined,
    }));
  }

  function changeLocation(locationId: string): void {
    update("locationId", locationId);
  }

  async function save(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!employee || !canEditTarget || pending) return;
    setError(null);
    const validation = validateEmployeeForm(form, (key) => t(key));
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      setError(validation.firstError);
      document.getElementById(Object.keys(validation.errors)[0] ?? "")?.focus();
      return;
    }

    const role: UpdateEmployeeRequest["role"] = isAdmin
      ? (form.accessLevel as UpdateEmployeeRequest["role"])
      : employee.role === "manager" || employee.role === "supervisor"
        ? employee.role
        : "employee";
    const payload: UpdateEmployeeRequest = {
      name: form.name.trim(),
      email: form.email.trim(),
      locationId: form.locationId,
      role,
      jobIds: [...form.roleIds],
      stationIds: [...form.stationIds],
      languagePref: form.languagePref,
      status: employee.status,
      employeeCode: form.employeeCode.trim() || null,
      dateOfBirth: form.dateOfBirth,
      fathersName: form.fathersName.trim(),
      gender: form.gender as Exclude<FormState["gender"], "">,
      address: form.address.trim(),
      phoneNumber: form.phoneNumber.trim(),
      emergencyContactName: form.emergencyContactName.trim(),
      emergencyContactRelation: form.emergencyContactRelation.trim(),
      emergencyContactPhone: form.emergencyContactPhone.trim(),
      startDate: form.startDate,
      sinNumber: form.sinNumber.trim(),
      hourlyRate: form.hourlyRate.trim(),
      supervisorIds: role === "employee" ? [...form.supervisorIds] : [],
      managerIds: role === "supervisor" ? [...form.managerIds] : [],
    };

    setPending(true);
    try {
      const result = await updateEmployee(employee.id, payload);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ["employee", employee.id] }),
      ]);
      if (result.inviteUrl) {
        queryClient.setQueryData(["employee", employee.id], {
          ...result.employee,
          inviteUrl: result.inviteUrl,
        });
      }
      router.push(`/${locale}/admin/employees/${employee.id}`);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof ApiException || caught instanceof Error
          ? caught.message
          : isEs
            ? "No se pudo guardar el empleado."
            : "Unable to save employee.",
      );
    } finally {
      setPending(false);
    }
  }

  const backHref = `/${locale}/admin/employees/${id}`;
  if (employeeQuery.isLoading || isLoadingMe) {
    return (
      <main className="mx-auto w-full max-w-5xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-36 w-full rounded-[var(--radius-lg)]" />
        <Skeleton className="h-56 w-full rounded-[var(--radius-lg)]" />
        <Skeleton className="h-56 w-full rounded-[var(--radius-lg)]" />
      </main>
    );
  }

  if (employeeQuery.error || !employee || !canEditTarget) {
    const failedToLoad = Boolean(employeeQuery.error || !employee);
    return (
      <main className="mx-auto w-full max-w-5xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow={isEs ? "Volver al empleado" : "Back to employee"}
          eyebrowHref={backHref}
          title={isEs ? "Editar empleado" : "Edit employee"}
        />
        <Card>
          <CardContent className="p-6">
            <p role="alert" className="text-sm text-[var(--color-ink-2)]">
              {failedToLoad
                ? isEs
                  ? "No se pudo cargar el empleado."
                  : "Employee could not be loaded."
                : isEs
                  ? "No tienes permiso para editar este empleado."
                  : "You do not have permission to edit this employee."}
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 px-4 py-8 pb-12 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow={isEs ? "Volver al empleado" : "Back to employee"}
        eyebrowHref={backHref}
        title={isEs ? "Editar empleado" : "Edit employee"}
        subtitle={employee.name}
      />
      <header>
        {!isAdmin ? (
          <p className="mt-2 rounded-[var(--radius-md)] bg-[var(--color-panel)] px-3 py-2 text-sm text-[var(--color-ink-2)]">
            {isEs
              ? `El rol del sistema se mantiene como ${formatSystemRole(employee.role, true)}. Solo un administrador puede cambiarlo.`
              : `System role stays ${formatSystemRole(employee.role)}. Only an admin can change it.`}
          </p>
        ) : null}
      </header>

      <form onSubmit={(event) => void save(event)} className="space-y-5">
        {error ? (
          <p
            role="alert"
            className="rounded-[var(--radius-md)] border border-[var(--color-bad)] bg-[var(--color-bad-tint)] px-4 py-3 text-sm text-[var(--color-bad-ink)]"
          >
            {error}
          </p>
        ) : null}
        <EmployeeDetailsSection
          form={form}
          fieldErrors={fieldErrors}
          locations={locations}
          isPending={pending}
          isLoadingLocations={isLoadingLocations}
          onUpdate={update}
          onLocationChange={changeLocation}
        />
        <EmployeeAccessSection
          form={form}
          fieldErrors={fieldErrors}
          roles={roles as Role[]}
          stations={availableStations as Station[]}
          supervisors={supervisors}
          managers={managers}
          currentUserRole={me?.role}
          hideAccessLevel={!isAdmin}
          isPending={pending}
          isLoadingRoles={isLoadingRoles}
          isLoadingStations={isLoadingDynamicStations}
          isLoadingSupervisors={loadingHierarchy}
          isLoadingManagers={loadingHierarchy}
          stationsBlockedReason={stationsBlockedReason}
          onAccessChange={changeAccessLevel}
          onRolesChange={(ids) => update("roleIds", ids)}
          onStationsChange={(ids) => update("stationIds", ids)}
          onSupervisorsChange={(ids) => update("supervisorIds", ids)}
          onManagersChange={(ids) => update("managerIds", ids)}
        />
        <EmployeeAdditionalSection
          form={form}
          fieldErrors={fieldErrors}
          isPending={pending}
          onUpdate={update}
        />
        <EmployeePersonalSection
          form={form}
          fieldErrors={fieldErrors}
          isPending={pending}
          onUpdate={update}
        />
        <EmployeeEmergencySection
          form={form}
          fieldErrors={fieldErrors}
          isPending={pending}
          onUpdate={update}
        />
        <EmployeePayrollSection
          form={form}
          fieldErrors={fieldErrors}
          isPending={pending}
          onUpdate={update}
        />
        <div className="flex justify-end gap-3 rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4">
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => router.push(backHref)}
          >
            {isEs ? "Cancelar" : "Cancel"}
          </Button>
          <Button
            type="submit"
            disabled={pending || isLoadingRoles || !form.locationId}
            icon={pending ? LuLoader : LuSave}
          >
            {pending
              ? isEs
                ? "Guardando…"
                : "Saving…"
              : isEs
                ? "Guardar cambios"
                : "Save changes"}
          </Button>
        </div>
      </form>
    </main>
  );
}
