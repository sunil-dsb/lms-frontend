import * as React from "react";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { EmployeesClientTable } from "./employees-client-table";
import type { EmployeeStatus } from "@/lib/types";
import { PageHeader } from "@/components/admin/page-header";
import { FilterChips } from "@/components/ui/filter-chips";
import { LuPlus } from "react-icons/lu";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; q?: string }>;
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

export default async function AdminEmployeesPage({
  params,
  searchParams,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const status = parseStatus(sp.status);
  const q = (sp.q ?? "").trim();

  // No server-side fetching here on purpose: the list, role and station
  // calls are made client-side by EmployeesClientTable (React Query —
  // visible in the Network tab, cached and shared app-wide).
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
  };

  const statusBadge = (s: EmployeeStatus): string => {
    if (s === "pending") return t("statusPending");
    if (s === "active") return t("statusActive");
    return t("statusDeactivated");
  };

  return (
    <div className="mx-auto w-full max-w-page space-y-6 pb-12">
      <PageHeader
        title={t("listHeading")}
        subtitle={t("peopleSubtitle")}
        actions={
          <Link href={`/${locale}/admin/employees/new`}>
            <Button icon={LuPlus}>{t("inviteEmployee")}</Button>
          </Link>
        }
      />

      {q ? (
        <p className="flex flex-wrap items-center gap-2 text-base text-[var(--color-ink-2)]">
          {t("filteredBy", { q })}
          <Link
            href={`/${locale}/admin/employees?status=${status}`}
            className="font-semibold text-[var(--color-brand-700)] underline-offset-2 hover:underline"
          >
            {t("clearFilter")}
          </Link>
        </p>
      ) : null}

      <FilterChips
        label={locale === "es" ? "Estado" : "Status"}
        value={status}
        chips={STATUS_VALUES.map((s) => ({
          value: s,
          label: s === "all" ? t("filterAll") : statusBadge(s),
          href: `/${locale}/admin/employees?status=${s}`,
        }))}
      />

      <EmployeesClientTable
        statusFilter={status}
        searchQuery={q}
        locale={locale}
        labels={labels}
      />
    </div>
  );
}
