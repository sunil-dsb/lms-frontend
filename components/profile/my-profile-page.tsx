"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useMe } from "@/services/auth/hooks";
import { fetchEmployeeById } from "@/services/employees/api";
import { formatSystemRole } from "@/lib/rbac";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LuBriefcaseBusiness, LuContact, LuUserRound } from "react-icons/lu";

function ProfileSection({
  title,
  icon: Icon,
  rows,
}: {
  title: string;
  icon: React.ElementType;
  rows: Array<{ label: string; value?: React.ReactNode }>;
}): React.ReactElement | null {
  const visibleRows = rows.filter(
    (row) => row.value !== undefined && row.value !== null && row.value !== "",
  );
  if (!visibleRows.length) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-3 border-b border-[var(--color-line)] pb-4">
        <span className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-panel)] text-[var(--color-ink-2)]">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleRows.map((row) => (
            <div key={row.label} className="min-w-0">
              <dt className="text-sm font-medium text-[var(--color-ink-3)]">
                {row.label}
              </dt>
              <dd className="mt-1 break-words text-sm font-semibold text-[var(--color-ink)]">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

export function MyProfilePage({
  locale,
}: {
  locale: string;
}): React.ReactElement {
  const { employee: basicEmployee, isLoading, error } = useMe();
  const isEs = locale === "es";
  const isManagementUser = [
    "admin",
    "super_admin",
    "manager",
    "supervisor",
  ].includes(basicEmployee?.role ?? "");
  const backHref = isManagementUser
    ? `/${locale}/admin`
    : `/${locale}/employee/home`;
  const detailsQuery = useQuery({
    queryKey: ["employees", "my-profile", basicEmployee?.id],
    queryFn: () =>
      fetchEmployeeById(basicEmployee!.id).then((result) => result.employee),
    enabled: Boolean(
      basicEmployee?.id &&
      basicEmployee.role !== "super_admin" &&
      basicEmployee.role !== "admin",
    ),
  });

  if (
    (isLoading && !basicEmployee) ||
    (detailsQuery.isLoading && !detailsQuery.data)
  ) {
    return (
      <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow={isEs ? "Volver al inicio" : "Back to home"}
          eyebrowHref={backHref}
          title={isEs ? "Mi perfil" : "My Profile"}
        />
        <Skeleton className="h-36 w-full rounded-[var(--radius-lg)]" />
        <Skeleton className="h-56 w-full rounded-[var(--radius-lg)]" />
      </main>
    );
  }

  if (error || !basicEmployee) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow={isEs ? "Volver al inicio" : "Back to home"}
          eyebrowHref={backHref}
          title={isEs ? "Mi perfil" : "My Profile"}
        />
        <p
          role="alert"
          className="rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-ink-2)]"
        >
          {isEs
            ? "No se pudo cargar tu perfil. Inténtalo de nuevo."
            : "Your profile could not be loaded. Please try again."}
        </p>
      </main>
    );
  }

  const employee = detailsQuery.data ?? basicEmployee;

  const date = (value?: string | null): string | undefined => {
    if (!value) return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? value
      : new Intl.DateTimeFormat(isEs ? "es" : "en", {
          dateStyle: "medium",
        }).format(parsed);
  };
  const chips = (
    values?: Array<{ id: string; name: string }>,
  ): React.ReactNode =>
    values?.length ? (
      <span className="flex flex-wrap gap-2">
        {values.map((item) => (
          <span
            key={item.id}
            className="rounded-full border border-[var(--color-line-2)] bg-[var(--color-panel)] px-3 py-1 text-xs font-medium"
          >
            {item.name}
          </span>
        ))}
      </span>
    ) : undefined;
  const links = (
    values?: Array<{ id: string; name: string; email?: string | null }>,
  ): string | undefined =>
    values?.length ? values.map((item) => item.name).join(", ") : undefined;

  const initials = employee.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow={isEs ? "Volver al inicio" : "Back to home"}
        eyebrowHref={backHref}
        title={isEs ? "Mi perfil" : "My Profile"}
        subtitle={
          isEs
            ? "Tu información personal y laboral."
            : "Your personal and work information."
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 py-6">
          <span
            aria-hidden="true"
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[var(--color-panel)] text-lg font-semibold text-[var(--color-ink)]"
          >
            {initials || "?"}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[var(--color-ink)]">
              {employee.name}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-ink-2)]">
              {employee.email ||
                (isEs ? "Sin correo electrónico" : "No email on file")}
            </p>
          </div>
          <span className="rounded-full border border-[var(--color-line-2)] bg-[var(--color-panel)] px-3 py-1 text-xs font-semibold text-[var(--color-ink)]">
            {formatSystemRole(employee.role, isEs)}
          </span>
        </CardContent>
      </Card>

      <ProfileSection
        title={isEs ? "Información de contacto" : "Contact Information"}
        icon={LuContact}
        rows={[
          {
            label: isEs ? "Correo electrónico" : "Email",
            value: employee.email,
          },
          {
            label: isEs ? "Teléfono" : "Phone number",
            value: employee.phoneNumber,
          },
          {
            label: isEs ? "Dirección particular" : "Home address",
            value: employee.address,
          },
          {
            label: isEs ? "Fecha de nacimiento" : "Date of birth",
            value: date(employee.dateOfBirth),
          },
          {
            label: isEs ? "Nombre del padre" : "Father's name",
            value: employee.fathersName,
          },
          {
            label: isEs ? "Género" : "Gender",
            value: employee.gender
              ? isEs
                ? (
                    {
                      male: "Hombre",
                      female: "Mujer",
                      other: "Otro",
                      prefer_not_to_say: "Prefiero no decirlo",
                    } as const
                  )[employee.gender]
                : employee.gender.replaceAll("_", " ")
              : undefined,
          },
        ]}
      />

      <ProfileSection
        title={isEs ? "Información laboral" : "Work Information"}
        icon={LuBriefcaseBusiness}
        rows={[
          {
            label: isEs ? "Rol del sistema" : "System role",
            value: formatSystemRole(employee.role, isEs),
          },
          {
            label: isEs ? "Estado" : "Status",
            value: employee.status
              ? isEs
                ? (
                    {
                      active: "Activo",
                      pending: "Pendiente",
                      deactivated: "Desactivado",
                    } as const
                  )[employee.status]
                : employee.status
              : undefined,
          },
          {
            label: isEs ? "Código de empleado" : "Employee code",
            value: employee.employeeCode,
          },
          {
            label: isEs ? "Ubicación" : "Location",
            value: employee.locationName,
          },
          { label: isEs ? "Puesto" : "Job roles", value: chips(employee.jobs) },
          {
            label: isEs ? "Estaciones" : "Stations",
            value: chips(employee.stations),
          },
          {
            label: isEs ? "Supervisores" : "Supervisors",
            value: links(employee.supervisors),
          },
          {
            label: isEs ? "Gerentes" : "Managers",
            value: links(employee.managers),
          },
          {
            label: isEs ? "Fecha de inicio" : "Start date",
            value: date(employee.startDate),
          },
          {
            label: isEs ? "Idioma preferido" : "Preferred language",
            value:
              employee.languagePref === "es"
                ? isEs
                  ? "Español"
                  : "Spanish"
                : isEs
                  ? "Inglés"
                  : "English",
          },
          {
            label: isEs ? "Tarifa por hora" : "Hourly rate",
            value:
              employee.hourlyRate != null && employee.hourlyRate !== ""
                ? `$${employee.hourlyRate} / hr`
                : undefined,
          },
          {
            label: isEs ? "Número de Seguro Social (SIN)" : "SIN number",
            value: employee.sinNumber,
          },
        ]}
      />

      <ProfileSection
        title={isEs ? "Contacto de emergencia" : "Emergency Contact"}
        icon={LuUserRound}
        rows={[
          {
            label: isEs ? "Nombre" : "Name",
            value: employee.emergencyContactName,
          },
          {
            label: isEs ? "Relación" : "Relationship",
            value: employee.emergencyContactRelation,
          },
          {
            label: isEs ? "Teléfono" : "Phone number",
            value: employee.emergencyContactPhone,
          },
        ]}
      />
    </main>
  );
}
