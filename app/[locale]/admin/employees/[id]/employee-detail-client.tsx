"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  LuArrowLeft,
  LuBriefcase,
  LuCalendar,
  LuCheck,
  LuCircleAlert,
  LuClock,
  LuCopy,
  LuDollarSign,
  LuMail,
  LuMapPin,
  LuPencil,
  LuPhone,
  LuPlus,
  LuShieldAlert,
  LuShieldCheck,
  LuShieldOff,
  LuTrash2,
  LuUser,
} from "react-icons/lu";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { Meter } from "@/components/ui/meter";
import { ChipStack } from "@/components/admin/chip-stack";
import { FormSection } from "@/components/admin/form-section";
import {
  summariseTraining,
  trainingStatusTone,
} from "@/components/admin/training-summary";
import { EmployeeRowActions } from "../employee-row-actions";
import { AssignCourseModal } from "./assign-course-modal";
import { GrantOverrideModal } from "@/components/admin/grant-override-modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchEmployeeById,
  fetchEmployeeTraining,
} from "@/services/employees/api";
import {
  revokeTrainingOverrideApi,
  unassignCourseApi,
} from "@/services/courses/api";
import { useRoles } from "@/services/jobs/hooks";
import { useStations } from "@/services/stations/hooks";
import { useLocations } from "@/services/locations/hooks";
import { useMe } from "@/services/auth/hooks";
import {
  canAssignCourses,
  canEditEmployees,
  formatSystemRole,
  isManager,
  isSuperAdmin,
  isSupervisor,
} from "@/lib/rbac";
import { EMPLOYEES_UPDATED_EVENT } from "@/services/employees/types";
import type {
  AdminEmployee,
  Procedure,
  TrainingAssignmentRow,
  TrainingAssignmentStatus,
} from "@/lib/types";

interface EmployeeDetailClientProps {
  locale: string;
  id?: string;
}

export function EmployeeDetailClient({
  locale,
  id: propId,
}: EmployeeDetailClientProps): React.ReactElement {
  const params = useParams<{ id: string }>();
  const id = propId ?? params.id;
  const router = useRouter();
  const t = useTranslations("admin");
  const tOverride = useTranslations("admin.training.override");
  const isEs = locale === "es";
  const { employee: me } = useMe();

  // The detail API is the ONE source for this page — called client-side
  // so the request is visible in the Network tab. React Query dedupes
  // StrictMode's double-mount into a single request and caches the
  // result for the session. Always live data: the backend returns the
  // active `inviteUrl` for pending employees, merged here so the banner
  // below can offer it for copy.
  const queryClient = useQueryClient();
  const employeeQuery = useQuery({
    queryKey: ["employee", id],
    enabled: Boolean(id),
    queryFn: async (): Promise<AdminEmployee> => {
      const res = await fetchEmployeeById(id);
      if (res.employee) {
        return res.inviteUrl
          ? { ...res.employee, inviteUrl: res.inviteUrl }
          : res.employee;
      }
      throw new Error("Employee not found");
    },
  });
  const employee = employeeQuery.data ?? null;

  const myRole = me?.role?.toLowerCase();
  const targetRole = employee?.role?.toLowerCase();
  const isSuper = isSuperAdmin(me?.role);
  const isMgr = isManager(me?.role);
  const isSuperv = isSupervisor(me?.role);

  // Can view confidential HR and payroll details (Date of birth, Address, Father's Name, Hourly Rate, SIN Number):
  // Super Admin and Manager only. Supervisors on kitchen floor do not manage payroll or personal files.
  const canViewConfidential = isSuper || isMgr;

  // Can edit this employee:
  // 1. Super Admin: can edit all employees
  // 2. Manager: can only edit subordinates (supervisors and employees) in their assigned location.
  //    Cannot edit other managers, cannot edit themselves from here.
  // 3. Supervisor / Employee: cannot edit anyone (view-only).
  const canEditThisEmployee = useMemo(() => {
    if (!employee || !me) return false;
    if (isSuper) return true;
    if (isMgr) {
      if (employee.id === me.id) return false;
      if (
        targetRole === "manager" ||
        targetRole === "super_admin" ||
        targetRole === "admin"
      )
        return false;
      if (
        me.locationId &&
        employee.locationId &&
        me.locationId !== employee.locationId
      )
        return false;
      return true;
    }
    return false;
  }, [employee, me, isSuper, isMgr, targetRole]);

  // Can assign courses to this employee:
  // 1. Super Admin: can assign courses to anyone
  // 2. Manager: can assign to subordinates in their location (cannot assign to themselves or other managers)
  // 3. Supervisor: can assign to subordinates in their shift
  const canAssignToThisEmployee = useMemo(() => {
    if (!employee || !me) return false;
    if (!canAssignCourses(me.role)) return false;
    if (isSuper) return true;
    if (isMgr) {
      if (employee.id === me.id) return false;
      if (
        targetRole === "manager" ||
        targetRole === "super_admin" ||
        targetRole === "admin"
      )
        return false;
      if (
        me.locationId &&
        employee.locationId &&
        me.locationId !== employee.locationId
      )
        return false;
      return true;
    }
    if (isSuperv) {
      if (employee.id === me.id) return false;
      if (
        targetRole === "supervisor" ||
        targetRole === "manager" ||
        targetRole === "super_admin" ||
        targetRole === "admin"
      )
        return false;
      return true;
    }
    return false;
  }, [employee, me, isSuper, isMgr, isSuperv, targetRole]);

  React.useEffect(() => {
    if (!id) return;
    const refresh = (): void => {
      void queryClient.invalidateQueries({ queryKey: ["employee", id] });
      void queryClient.invalidateQueries({
        queryKey: ["employee", "training", id],
      });
    };
    window.addEventListener("storage", refresh);
    window.addEventListener(EMPLOYEES_UPDATED_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener(EMPLOYEES_UPDATED_EVENT, refresh);
    };
  }, [id, queryClient]);

  // Label + edit-modal catalogs come from the shared TanStack Query cache
  // (staleTime 0, always fresh): concurrent views still share one in-flight
  // jobs/stations/locations call, and every mount refetches so the data is
  // never stale.
  const { roles } = useRoles();
  const { data: stations = [] } = useStations();
  const { data: locationsData } = useLocations();
  const locations = locationsData?.locations ?? [];
  const [assignCourseOpen, setAssignCourseOpen] = useState(false);
  const [unassigningCourse, setUnassigningCourse] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isUnassigning, setIsUnassigning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [confirmRevokeOpen, setConfirmRevokeOpen] = useState(false);
  const [revoking, setRevoking] = useState(false);

  function openEdit(): void {
    if (!employee || !canEditThisEmployee) return;
    router.push(`/${locale}/admin/employees/${employee.id}/edit`);
  }

  async function copyInvite(): Promise<void> {
    if (!employee?.inviteUrl) return;
    let ok = false;
    try {
      await navigator.clipboard.writeText(employee.inviteUrl);
      ok = true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = employee.inviteUrl;
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        ta.remove();
      } catch {
        ok = false;
      }
    }
    setCopied(ok);
  }

  // Lookup maps for the role / station chips
  const roleLabel = useMemo(
    () => new Map(roles.map((r) => [r.id, r.name] as const)),
    [roles],
  );
  const stationLabel = useMemo(
    () => new Map(stations.map((s) => [s.id, s.name] as const)),
    [stations],
  );

  // Job / station labels: prefer denormalised names carried by the
  // employee response itself (same shape as GET /auth/me — `jobs` /
  // `stations` arrays of {id, name}). When the backend provides them,
  // no catalog lookup is involved at all; the id→name maps from the
  // cached catalogs stay purely as a fallback for responses that still
  // return bare ids.
  const [roleLabels, stationLabels] = useMemo(() => {
    if (!employee) return [[], []];
    const denormJobs = Array.isArray(employee.jobs) ? employee.jobs : null;
    const denormStations = Array.isArray(employee.stations)
      ? employee.stations
      : null;
    const rIds = employee.roleIds ?? (employee as any).jobIds ?? [];
    const sIds = employee.stationIds ?? [];
    const nameFor = (
      xid: string,
      denorm: Array<{ id: string; name: string }> | null,
      map: Map<string, string>,
    ): string | undefined =>
      denorm?.find((d) => d.id === xid)?.name ?? map.get(xid);
    return [
      rIds
        .map((rid: string) => nameFor(rid, denormJobs, roleLabel))
        .filter((s: string | undefined): s is string => Boolean(s)),
      sIds
        .map((sid: string) => nameFor(sid, denormStations, stationLabel))
        .filter((s: string | undefined): s is string => Boolean(s)),
    ];
  }, [employee, roleLabel, stationLabel]);

  // Resolve location name either from employee or loaded locations
  const resolvedLocationName = useMemo(() => {
    if (employee?.locationName) return employee.locationName;
    if (employee?.locationId) {
      const match = locations.find((loc) => loc.id === employee.locationId);
      if (match) return match.name;
    }
    return "";
  }, [employee?.locationName, employee?.locationId, locations]);

  // Training for this person — dedicated admin endpoint
  // (GET /api/v1/employees/:id/training). Separate query from the employee
  // record so it refetches independently and stays cached keyed by id.
  const trainingQuery = useQuery({
    queryKey: ["employee", "training", id],
    enabled: Boolean(id),
    queryFn: () => fetchEmployeeTraining(id),
  });

  // The API returns one raw row per assigned course; the view consumes the
  // shared TrainingAssignmentRow shape (same picking logic as the employee
  // list), so adapt here. Only course title + chapter counts are rendered —
  // the rest of the Procedure surface is not part of this view, hence the
  // narrowed cast.
  const trainingRows: TrainingAssignmentRow[] = useMemo(() => {
    return (trainingQuery.data ?? []).map((row) => ({
      assignment: {
        id: row.assignmentId,
        courseId: row.courseId,
        employeeId: id ?? "",
        assignedAt: row.assignedAt,
        dueAt: row.dueDate,
        status:
          row.status === "complete"
            ? "complete"
            : row.status === "in_progress"
              ? "in_progress"
              : row.status === "not_started"
                ? "not_started"
                : "due",
        completedStepIds: [],
        quizPassedAt: null,
        acknowledgedAt: row.courseCompletedAt,
        isOverridden: row.isOverridden,
      },
      course: {
        id: row.courseId,
        titleEn: row.titleEn,
        titleEs: row.titleEs,
        purposeEn: row.purposeEn,
        purposeEs: row.purposeEs,
        chapterCount: row.chapterCount,
        completedChapterCount: row.completedChapterCount,
      } as unknown as Procedure,
      effectiveStatus: row.status,
    }));
  }, [trainingQuery.data, id]);
  const trainingSummary = summariseTraining(trainingRows);

  // Active override: the first row that is still within the override window
  const activeOverride = (trainingQuery.data ?? []).find(
    (r) => r.isOverridden && r.overrideUntil,
  );

  async function handleRevoke(): Promise<void> {
    if (!id) return;
    setRevoking(true);
    try {
      await revokeTrainingOverrideApi(id);
      await queryClient.invalidateQueries({
        queryKey: ["employee", "training", id],
      });
      setConfirmRevokeOpen(false);
    } catch (err) {
      console.error("Failed to revoke override:", err);
    } finally {
      setRevoking(false);
    }
  }

  async function handleUnassign(): Promise<void> {
    if (!id || !unassigningCourse) return;
    setIsUnassigning(true);
    try {
      await unassignCourseApi(unassigningCourse.id, [id]);
      await queryClient.invalidateQueries({
        queryKey: ["employee", "training", id],
      });
      setUnassigningCourse(null);
    } catch (err) {
      console.error("Failed to unassign course:", err);
    } finally {
      setIsUnassigning(false);
    }
  }

  const statusTone: StatusTone =
    employee?.status === "active"
      ? "ok"
      : employee?.status === "pending"
        ? "warn"
        : "bad";

  const joinedLabel = employee?.createdAt
    ? new Date(employee.createdAt).toLocaleDateString(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

  if (employeeQuery.isError) {
    const errorMsg =
      employeeQuery.error instanceof Error
        ? employeeQuery.error.message
        : isEs
          ? "No tienes permiso para ver a este empleado o no existe."
          : "You do not have permission to view this employee or they do not exist.";

    return (
      <div className="mx-auto max-w-page space-y-6 pb-12">
        <Link
          href={`/${locale}/admin/employees`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)]"
        >
          <LuArrowLeft className="size-4" aria-hidden="true" />
          <span>{t("backToList")}</span>
        </Link>
        <Card className="p-8 text-center max-w-md mx-auto">
          <div className="flex flex-col items-center gap-3">
            <div className="size-12 rounded-full bg-[var(--color-bad-tint)] flex items-center justify-center text-[var(--color-bad)]">
              <LuShieldAlert className="size-6" />
            </div>
            <h2 className="text-lg font-bold text-[var(--color-ink)]">
              {isEs ? "Acceso Restringido" : "Access Restricted"}
            </h2>
            <p className="text-sm text-[var(--color-ink-2)]">{errorMsg}</p>
            <Button
              type="button"
              variant="primary"
              onClick={() => router.push(`/${locale}/admin/employees`)}
              className="mt-2"
            >
              {t("backToList")}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-page space-y-6 pb-12">
      {/* Top navigation chrome: back link on the left, Edit on the right */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/${locale}/admin/employees`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)]"
        >
          <LuArrowLeft className="size-4" aria-hidden="true" />
          <span>{t("backToList")}</span>
        </Link>
        <div className="flex items-center gap-2">
          {canAssignToThisEmployee && (
            <Button
              type="button"
              variant="primary"
              onClick={() => setAssignCourseOpen(true)}
              icon={LuPlus}
              disabled={!employee}
            >
              <span>{isEs ? "Asignar curso" : "Assign Course"}</span>
            </Button>
          )}
          {trainingSummary.total > 0 &&
            (activeOverride ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmRevokeOpen(true)}
                icon={LuShieldOff}
                disabled={!employee}
              >
                {tOverride("revokeButton")}
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOverrideModalOpen(true)}
                icon={LuShieldCheck}
                disabled={!employee}
              >
                {tOverride("grantButton")}
              </Button>
            ))}
          {canEditThisEmployee ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => void openEdit()}
              icon={LuPencil}
              disabled={!employee}
            >
              {t("actionsEdit")}
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-start gap-4 p-6 sm:flex-nowrap">
          <Avatar
            initials={employee?.name ? initials(employee.name) : "—"}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold leading-display tracking-tight text-[var(--color-ink)] min-h-[32px]">
                {employee?.name ?? ""}
              </h1>
              {employee?.role && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize bg-[var(--color-panel)] text-[var(--color-ink)] border border-[var(--color-line-2)]">
                  {formatSystemRole(employee.role, isEs)}
                </span>
              )}
              {employee?.status && (
                <StatusPill tone={statusTone}>
                  {t(statusKey(employee.status))}
                </StatusPill>
              )}
            </div>
            <p className="mt-2 text-sm text-[var(--color-ink-2)] min-h-[20px]">
              {employee
                ? oneLiner({
                    roleLabels:
                      roleLabels.length > 0
                        ? roleLabels
                        : employee.roleIds?.length ||
                            (employee as any).jobIds?.length
                          ? [t("detailRolesEmpty")]
                          : [],
                    stationLabels:
                      stationLabels.length > 0
                        ? stationLabels
                        : employee.stationIds?.length
                          ? [t("stationsEmpty")]
                          : [],
                    location: resolvedLocationName || null,
                  })
                : ""}
            </p>
          </div>
          <div className="shrink-0">
            {employee && (
              <EmployeeRowActions
                locale={locale}
                employee={employee}
                hideEdit
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending invite — the backend returns the active magic-link
          `inviteUrl` for pending employees. Offer it for copy for the
          kitchens where email delivery is unreliable. */}
      {employee?.status === "pending" && employee?.inviteUrl ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4">
          <p className="text-sm font-semibold text-[var(--color-ink)]">
            {t("inviteCreatedHeading")}
          </p>
          <p className="mt-1 text-xs text-[var(--color-ink-2)]">
            {t("inviteEmailSent")}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 break-all rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-panel)] px-3 py-2 text-xs text-[var(--color-ink-2)]">
              {employee.inviteUrl}
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void copyInvite()}
              icon={copied ? LuCheck : LuCopy}
            >
              {copied ? t("copied") : t("copyUrl")}
            </Button>
          </div>
        </div>
      ) : null}

      {/* 1. Organization & Hierarchy */}
      <FormSection
        icon={LuBriefcase}
        title={isEs ? "Organización y Jerarquía" : "Organization & Hierarchy"}
        subtitle={
          isEs
            ? "Rol del sistema, ubicación, supervisores y puestos asignados."
            : "System role, assigned location, supervisors, and stations."
        }
      >
        <dl className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4 pt-1">
          <div>
            <dt className="text-sm font-medium text-[var(--color-ink-3)]">
              {isEs ? "Rol en el sistema" : "System Role"}
            </dt>
            <dd className="mt-1">
              <span className="text-sm font-semibold capitalize text-[var(--color-ink)]">
                {formatSystemRole(employee?.role, isEs)}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-[var(--color-ink-3)]">
              {isEs ? "Código de empleado" : "Employee Code"}
            </dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--color-ink)] font-mono">
              {employee?.employeeCode || "—"}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink-3)]">
              <LuMapPin
                className="size-4 shrink-0 text-[var(--color-ink-3)]"
                aria-hidden="true"
              />
              <span>{t("detailFactLocation")}</span>
            </dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
              {resolvedLocationName || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-[var(--color-ink-3)]">
              {isEs ? "Idioma preferido" : "Language Preference"}
            </dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
              {employee?.languagePref === "es"
                ? "Español (ES)"
                : "English (EN)"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-[var(--color-ink-3)]">
              {t("detailFactJobRole")}
            </dt>
            <dd className="mt-1 min-w-0">
              <ChipStack
                items={roleLabels}
                emptyText={employee ? t("jobRolesEmpty") : "—"}
              />
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-[var(--color-ink-3)]">
              {t("detailFactStation")}
            </dt>
            <dd className="mt-1 min-w-0">
              <ChipStack
                items={stationLabels}
                tone="station"
                emptyText={employee ? t("stationsEmpty") : "—"}
              />
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-[var(--color-ink-3)]">
              {isEs ? "Supervisores asignados" : "Assigned Supervisors"}
            </dt>
            <dd className="mt-1 min-w-0">
              {employee?.supervisors && employee.supervisors.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {employee.supervisors.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-panel)] px-3 py-1 text-xs font-medium text-[var(--color-ink)] border border-[var(--color-line-2)] shadow-2xs"
                    >
                      <span className="font-semibold">{s.name}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-[var(--color-ink-3)]">
                  {isEs ? "Ninguno asignado" : "None assigned"}
                </span>
              )}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-[var(--color-ink-3)]">
              {isEs ? "Gerente responsable" : "Responsible Manager"}
            </dt>
            <dd className="mt-1 min-w-0">
              {employee?.managers && employee.managers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {employee.managers.map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-panel)] px-3 py-1 text-xs font-medium text-[var(--color-ink)] border border-[var(--color-line-2)] shadow-2xs"
                    >
                      <span className="font-semibold">{m.name}</span>
                      {m.email && (
                        <span className="text-[var(--color-ink-3)]">
                          ({m.email})
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-[var(--color-ink-3)]">
                  {isEs ? "Ninguno asignado" : "None assigned"}
                </span>
              )}
            </dd>
          </div>
        </dl>
      </FormSection>

      {/* 2. Contact Information & Emergency Contacts */}
      <FormSection
        icon={LuPhone}
        title={isEs ? "Información de Contacto" : "Contact Information"}
        subtitle={
          isEs
            ? "Correo electrónico, teléfono y contacto para emergencias."
            : "Email address, phone number, and emergency contacts."
        }
      >
        <dl className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 pt-1">
          <div>
            <dt className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink-3)]">
              <LuMail
                className="size-4 shrink-0 text-[var(--color-ink-3)]"
                aria-hidden="true"
              />
              <span>{t("detailFactEmail")}</span>
            </dt>
            <dd className="mt-1 text-sm font-semibold">
              {employee?.email ? (
                <a
                  href={`mailto:${employee.email}`}
                  className="text-[var(--color-brand-600)] underline-offset-2 hover:underline"
                >
                  {employee.email}
                </a>
              ) : (
                <span className="text-sm text-[var(--color-ink-3)]">—</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink-3)]">
              <LuPhone
                className="size-4 shrink-0 text-[var(--color-ink-3)]"
                aria-hidden="true"
              />
              <span>{isEs ? "Teléfono móvil" : "Phone Number"}</span>
            </dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
              {employee?.phoneNumber ? (
                <a
                  href={`tel:${employee.phoneNumber}`}
                  className="hover:underline text-[var(--color-ink)]"
                >
                  {employee.phoneNumber}
                </a>
              ) : (
                <span className="text-sm text-[var(--color-ink-3)]">—</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink-3)]">
              <LuCalendar
                className="size-4 shrink-0 text-[var(--color-ink-3)]"
                aria-hidden="true"
              />
              <span>{t("detailFactJoined")}</span>
            </dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
              {joinedLabel}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-[var(--color-ink-3)]">
              {isEs ? "Contacto de emergencia" : "Emergency Contact"}
            </dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
              {employee?.emergencyContactName || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-[var(--color-ink-3)]">
              {isEs ? "Parentesco / Relación" : "Relationship"}
            </dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
              {employee?.emergencyContactRelation || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-[var(--color-ink-3)]">
              {isEs ? "Teléfono de emergencia" : "Emergency Phone"}
            </dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
              {employee?.emergencyContactPhone ? (
                <a
                  href={`tel:${employee.emergencyContactPhone}`}
                  className="hover:underline text-[var(--color-ink)]"
                >
                  {employee.emergencyContactPhone}
                </a>
              ) : (
                <span className="text-sm text-[var(--color-ink-3)]">—</span>
              )}
            </dd>
          </div>
        </dl>
      </FormSection>

      {/* 3. Personal Details (Visible to Super Admin & Manager only) */}
      {canViewConfidential && (
        <FormSection
          icon={LuUser}
          title={isEs ? "Datos Personales" : "Personal Details"}
          subtitle={
            isEs
              ? "Información personal confidencial accesible para gerencia y administración."
              : "Confidential personal details accessible to managers and administrators."
          }
        >
          <dl className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4 pt-1">
            <div>
              <dt className="text-sm font-medium text-[var(--color-ink-3)]">
                {isEs ? "Fecha de nacimiento" : "Date of Birth"}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
                {employee?.dateOfBirth
                  ? new Date(employee.dateOfBirth).toLocaleDateString(locale, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-[var(--color-ink-3)]">
                {isEs ? "Género" : "Gender"}
              </dt>
              <dd className="mt-1 text-sm font-semibold capitalize text-[var(--color-ink)]">
                {employee?.gender || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-[var(--color-ink-3)]">
                {isEs ? "Nombre del padre" : "Father's Name"}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
                {employee?.fathersName || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-[var(--color-ink-3)]">
                {isEs ? "Dirección particular" : "Home Address"}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
                {employee?.address || "—"}
              </dd>
            </div>
          </dl>
        </FormSection>
      )}

      {/* 4. Compensation & Payroll (Visible to Super Admin & Manager only) */}
      {canViewConfidential && (
        <FormSection
          icon={LuDollarSign}
          title={isEs ? "Compensación y Nómina" : "Compensation & Payroll"}
          subtitle={
            isEs
              ? "Tarifa por hora, número de seguridad social y fecha de inicio."
              : "Hourly pay rate, Social Insurance Number (SIN), and start date."
          }
        >
          <dl className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-3 pt-1">
            <div>
              <dt className="text-sm font-medium text-[var(--color-ink-3)]">
                {isEs ? "Tarifa por hora" : "Hourly Rate"}
              </dt>
              <dd className="mt-1 text-base font-bold text-[var(--color-ink)]">
                {employee?.hourlyRate ? `$${employee.hourlyRate} / hr` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-[var(--color-ink-3)]">
                {isEs ? "Número de Seguro Social (SIN)" : "SIN Number"}
              </dt>
              <dd className="mt-1 text-sm font-semibold font-mono text-[var(--color-ink)]">
                {employee?.sinNumber || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-[var(--color-ink-3)]">
                {isEs ? "Fecha de inicio" : "Start Date"}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
                {employee?.startDate
                  ? new Date(employee.startDate).toLocaleDateString(locale, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : joinedLabel}
              </dd>
            </div>
          </dl>
        </FormSection>
      )}

      {/* Training overview */}
      <FormSection
        icon={LuCheck}
        title={t("detailTrainingHeading")}
        subtitle={
          trainingSummary.total > 0
            ? t("detailTrainingCount", {
                done: trainingSummary.complete,
                total: trainingSummary.total,
              })
            : t("detailTrainingHint")
        }
      >
        {trainingSummary.total === 0 ? (
          trainingQuery.isLoading ? (
            <p className="text-sm text-[var(--color-ink-3)]">…</p>
          ) : (
            <p className="text-sm text-[var(--color-ink-2)]">
              {t("detailTrainingEmpty")}
            </p>
          )
        ) : (
          <>
            {activeOverride && activeOverride.overrideUntil && (
              <div className="mb-4 flex items-start gap-3 rounded-[var(--radius-md)] border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-900/20">
                <LuShieldCheck
                  className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
                  aria-hidden="true"
                />
                <p className="text-sm text-[var(--color-ink)]">
                  {tOverride("activeBadge", {
                    until: new Date(
                      activeOverride.overrideUntil,
                    ).toLocaleDateString(locale, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }),
                  })}
                </p>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-6">
              <Meter
                value={trainingSummary.complete}
                total={trainingSummary.total}
                size={70}
                stroke={7}
                tone={trainingSummary.overdue > 0 ? "warn" : "ok"}
                label={`${trainingSummary.share}%`}
              />
              <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
                <TrainingCount
                  label={t("detailTrainingCompleted")}
                  value={trainingSummary.complete}
                  tone="ok"
                />
                <TrainingCount
                  label={t("detailTrainingInProgress")}
                  value={trainingSummary.inProgress}
                  tone="neutral"
                />
                <TrainingCount
                  label={t("detailTrainingNotStarted")}
                  value={trainingSummary.notStarted}
                  tone="neutral"
                />
                <TrainingCount
                  label={t("detailTrainingOverdue")}
                  value={trainingSummary.overdue}
                  tone="bad"
                />
              </dl>
            </div>
          </>
        )}
      </FormSection>

      {/* Assigned training list */}
      <FormSection
        icon={LuClock}
        title={t("detailAssignedHeading")}
        subtitle={t("detailAssignedHint")}
        headerAction={
          canAssignToThisEmployee ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={LuPlus}
              onClick={() => setAssignCourseOpen(true)}
              className="gap-1.5"
            >
              <span>{isEs ? "Asignar curso" : "Assign Course"}</span>
            </Button>
          ) : null
        }
      >
        {trainingRows.length === 0 ? (
          trainingQuery.isLoading ? (
            <p className="text-sm text-[var(--color-ink-3)]">…</p>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm text-[var(--color-ink-2)]">
                {t("detailAssignedEmpty")}
              </p>
              {canAssignToThisEmployee && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={LuPlus}
                  onClick={() => setAssignCourseOpen(true)}
                  className="mt-3 gap-1.5"
                >
                  <span>
                    {isEs ? "Asignar primer curso" : "Assign First Course"}
                  </span>
                </Button>
              )}
            </div>
          )
        ) : (
          <ul className="divide-y divide-[var(--color-line)]">
            {trainingRows.map((row) => {
              const chapterCount =
                (row.course as { chapterCount?: number }).chapterCount ?? 0;
              const completedCount =
                (row.course as { completedChapterCount?: number })
                  .completedChapterCount ?? 0;
              const subtitle =
                row.effectiveStatus === "complete"
                  ? t("detailAssignedCompleted", {
                      when: formatDate(
                        row.assignment.acknowledgedAt ?? row.assignment.dueAt,
                        locale,
                      ),
                    })
                  : [
                      chapterCount > 0
                        ? t("detailAssignedProgress", {
                            done: completedCount,
                            total: chapterCount,
                          })
                        : null,
                      t("detailAssignedDueAt", {
                        when: formatDate(row.assignment.dueAt, locale),
                      }),
                    ]
                      .filter(Boolean)
                      .join(" · ");
              const courseTitle =
                isEs && (row.course as any).titleEs
                  ? (row.course as any).titleEs
                  : row.course.titleEn;

              return (
                <li
                  key={row.assignment.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-[family-name:var(--font-ui)] text-base font-semibold text-[var(--color-ink)]">
                      {courseTitle}
                    </p>
                    <p className="mt-0.5 text-sm text-[var(--color-ink-3)]">
                      {subtitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {(row.assignment as any).isOverridden ? (
                      <StatusPill tone="warn" withDot>
                        {tOverride("statusOverridden")}
                      </StatusPill>
                    ) : (
                      <StatusPill
                        tone={trainingStatusTone(row.effectiveStatus)}
                      >
                        {t(trainingStatusKey(row.effectiveStatus))}
                      </StatusPill>
                    )}
                    {canAssignToThisEmployee && (
                      <button
                        type="button"
                        onClick={() =>
                          setUnassigningCourse({
                            id: row.assignment.courseId,
                            title: courseTitle,
                          })
                        }
                        title={isEs ? "Desasignar curso" : "Unassign course"}
                        className="rounded p-1 text-[var(--color-ink-3)] hover:text-[var(--color-bad)] hover:bg-[var(--color-panel)] transition-colors cursor-pointer"
                        aria-label={
                          isEs
                            ? `Desasignar ${courseTitle}`
                            : `Unassign ${courseTitle}`
                        }
                      >
                        <LuTrash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </FormSection>

      {/* Grant Temporary Override modal */}
      {employee && overrideModalOpen && (
        <GrantOverrideModal
          open={overrideModalOpen}
          onClose={() => setOverrideModalOpen(false)}
          employeeId={id}
          employeeName={employee.name}
          onSuccess={async () => {
            setOverrideModalOpen(false);
            await queryClient.invalidateQueries({
              queryKey: ["employee", "training", id],
            });
          }}
        />
      )}

      {/* Revoke Override confirm */}
      {employee && (
        <ConfirmModal
          open={confirmRevokeOpen}
          onClose={() => setConfirmRevokeOpen(false)}
          onConfirm={() => void handleRevoke()}
          isLoading={revoking}
          title={tOverride("revokeTitle")}
          description={tOverride("revokeBody", { name: employee.name })}
          confirmLabel={tOverride("revokeConfirm")}
          variant="destructive"
        />
      )}

      {/* Assign Course Modal */}
      {employee && (
        <AssignCourseModal
          open={assignCourseOpen}
          onClose={() => setAssignCourseOpen(false)}
          employeeId={id}
          employeeName={employee.name}
          alreadyAssignedCourseIds={trainingRows.map(
            (r) => r.assignment.courseId,
          )}
          locale={locale}
          onAssigned={() => {
            void queryClient.invalidateQueries({
              queryKey: ["employee", "training", id],
            });
            void queryClient.invalidateQueries({
              queryKey: ["admin-training-progress"],
            });
          }}
        />
      )}

      {/* Unassign Course Confirm Modal */}
      {employee && (
        <ConfirmModal
          open={Boolean(unassigningCourse)}
          onClose={() => setUnassigningCourse(null)}
          onConfirm={() => void handleUnassign()}
          isLoading={isUnassigning}
          title={isEs ? "Desasignar curso" : "Unassign Course"}
          description={
            isEs
              ? `¿Estás seguro de que deseas desasignar "${unassigningCourse?.title ?? ""}" de ${employee.name}? El progreso del curso ya no estará activo para este empleado.`
              : `Are you sure you want to unassign "${unassigningCourse?.title ?? ""}" from ${employee.name}? Their progress will no longer be tracked.`
          }
          confirmLabel={isEs ? "Desasignar" : "Unassign"}
          variant="destructive"
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Small helpers local to the detail page.
// ----------------------------------------------------------------------------

function statusKey(status: AdminEmployee["status"] | undefined): string {
  if (status === "active") return "statusActive";
  if (status === "pending") return "statusPending";
  return "statusDeactivated";
}

type LmsRole = "admin" | "manager" | "employee";

function lmsRole(e: AdminEmployee | null | undefined): LmsRole {
  if (!e) return "employee";
  if (e.role === "admin" || (e.role as string) === "super_admin")
    return "admin";
  if (e.accessLevel === "manager" || (e.role as string) === "manager")
    return "manager";
  return "employee";
}

function accessLevelKey(role: LmsRole): string {
  if (role === "admin") return "accessLevelAdmin";
  if (role === "manager") return "accessLevelManager";
  return "accessLevelEmployee";
}

function accessLevelTone(role: LmsRole): StatusTone {
  if (role === "admin") return "info";
  if (role === "manager") return "warn";
  return "neutral";
}

function trainingStatusKey(status: TrainingAssignmentStatus): string {
  switch (status) {
    case "complete":
      return "detailAssignedStatusComplete";
    case "in_progress":
      return "detailAssignedStatusInProgress";
    case "due":
    case "due_soon":
      return "detailAssignedStatusDue";
    case "overdue":
      return "detailAssignedStatusOverdue";
    case "not_started":
    default:
      return "detailAssignedStatusDue";
  }
}

function initials(name?: string | null): string {
  if (!name) return "—";
  const words = name.trim().split(/\s+/).slice(0, 2);
  return words.map((w) => w.charAt(0).toUpperCase()).join("") || "—";
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function oneLiner({
  roleLabels,
  stationLabels,
  location,
}: {
  roleLabels: string[];
  stationLabels: string[];
  location: string | null;
}): string {
  const parts = [roleLabels[0], stationLabels[0], location].filter(Boolean);
  return parts.join(" · ");
}

function TrainingCount({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ok" | "bad" | "neutral";
}): React.ReactElement {
  const valueClass =
    tone === "ok"
      ? "text-[var(--color-ok)]"
      : tone === "bad"
        ? "text-[var(--color-bad)]"
        : "text-[var(--color-ink-2)]";
  return (
    <div>
      <dt className="text-sm text-[var(--color-ink-3)]">{label}</dt>
      <dd className={`mt-0.5 text-md font-semibold tabular-nums ${valueClass}`}>
        {value}
      </dd>
    </div>
  );
}
