import * as React from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { fetchMe } from "@/lib/api";
import { canInviteEmployees } from "@/lib/rbac";
import { EmployeesClientTable } from "./employees-client-table";
import type { EmployeeStatus } from "@/lib/types";
import { PageHeader } from "@/components/admin/page-header";
import { LuPlus } from "react-icons/lu";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    status?: string;
    role?: string;
    station?: string;
    job?: string;
    q?: string;
  }>;
}

const STATUS_VALUES: readonly (EmployeeStatus | "all")[] = [
  "all",
  "pending",
  "active",
  "deactivated",
];

function parseStatus(raw: string | undefined): EmployeeStatus | "all" {
  if (raw && (STATUS_VALUES as readonly string[]).includes(raw)) {
    return raw as EmployeeStatus | "all";
  }
  return "all";
}

function parseRole(
  raw: string | undefined,
): "all" | "supervisor" | "employee" | "manager" {
  if (raw === "supervisor" || raw === "employee" || raw === "manager") {
    return raw;
  }
  return "all";
}

export default async function AdminEmployeesPage({
  params,
  searchParams,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const status = parseStatus(sp.status);
  const roleParam = parseRole(sp.role);
  const stationParam = sp.station || "all";
  const jobParam = sp.job || "all";
  const q = (sp.q ?? "").trim();

  const t = await getTranslations("admin");
  const tc = await getTranslations("common");

  const labels = {
    empty: t("empty"),
    loading: tc("loading"),
    thEmployee: t("thEmployee"),
    thJobRole: t("thJobRole"),
    thStation: t("thStation"),
    thTraining: t("thTraining"),
    thStatus: t("thStatus"),
    thActions: t("thActions"),
    statusPending: t("statusPending"),
    statusActive: t("statusActive"),
    statusDeactivated: t("statusDeactivated"),
    jobRolesEmpty: t("jobRolesEmpty"),
    stationsEmpty: t("stationsEmpty"),
    emailMissing: t("emailMissing"),
    searchLabel: t("searchLabel"),
    searchPlaceholder: t("searchPlaceholder"),
    clearSearch: t("clearSearch"),
    noMatches: t("noMatches"),
  };

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  let canInvite = false;
  try {
    const { employee: me } = await fetchMe(cookieHeader);
    canInvite = canInviteEmployees(me.role);
  } catch {
    // fallback
  }

  return (
    <div className="mx-auto w-full max-w-page space-y-6 pb-12">
      <PageHeader
        title={t("listHeading")}
        subtitle={t("peopleSubtitle")}
        actions={
          canInvite ? (
            <Link href={`/${locale}/admin/employees/new`}>
              <Button icon={LuPlus}>{t("inviteEmployee")}</Button>
            </Link>
          ) : null
        }
      />

      {/* Roster Table with unified Toolbar (Status CapsuleTabs with counts, 
          Search input, Role/Station/Job dropdowns, and Removable Active Filters) */}
      <EmployeesClientTable
        key={`${status}-${roleParam}-${stationParam}-${jobParam}-${q}`}
        initialStatus={status}
        initialRole={roleParam}
        initialStation={stationParam}
        initialJob={jobParam}
        initialSearch={q}
        locale={locale}
        labels={labels}
      />
    </div>
  );
}
