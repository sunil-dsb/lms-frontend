import * as React from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ApiException, fetchMe } from "@/lib/api";
import { readViewAs } from "@/lib/view-as-server";
import { withAs } from "@/lib/view-as";
import { LuArrowLeft } from "react-icons/lu";
import { TabBar } from "@/components/employee/tab-bar";
import { fetchMyTraining } from "@/services/courses/api";
import type { EmployeeRequiredTrainingStatus } from "@/services/courses/types";
import { ProceduresClientList } from "./procedures-client-list";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; category?: string; view?: string }>;
}

export const dynamic = "force-dynamic";

export default async function ProceduresPage({
  params,
  searchParams,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  const { q = "", category = "" } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("employee.browse");

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const viewAs = await readViewAs();
  const effectiveRole = viewAs ?? "employee";
  const requiredTrainingPromise: Promise<EmployeeRequiredTrainingStatus | null> =
    effectiveRole === "employee"
      ? fetchMyTraining(cookieHeader)
          .then((training) => training.requiredTraining)
          .catch((err) => {
            console.error("Could not load required-training status:", err);
            return null;
          })
      : Promise.resolve(null);

  let employee;
  try {
    const me = await fetchMe(cookieHeader);
    employee = me.employee;
  } catch (err) {
    if (
      err instanceof ApiException &&
      (err.status === 401 || err.code === "SESSION_INVALID")
    ) {
      redirect(`/${locale}/login`);
    }
    // Fall back to demo employee on transient server or network hiccups
    employee = {
      id: "emp-maria",
      name: "María González",
      role: "employee" as const,
      locationId: "loc-roma",
      roleIds: [],
      stationIds: [],
      languagePref: "en" as const,
    };
  }

  // ?as= override — procedures are reading content, so the page renders in
  // employee chrome by default. `?as=admin` opts into the admin chrome for
  // anyone who wants the library nav context while here. The proxy forwards
  // the query value into the x-lms-view-as request header.
  const tTraining = await getTranslations("employee.training");
  const requiredTraining = await requiredTrainingPromise;
  // Locks only once restrictions are active (an incomplete required course
  // past its due date) — being assigned alone leaves the sections open.
  const isTrainingLocked = Boolean(
    effectiveRole === "employee" && requiredTraining?.isRestricted,
  );

  // The list itself (categories + procedures) is fetched by
  // ProceduresClientList through TanStack Query — the shell above
  // (heading, search, tab bar) paints immediately and the list
  // streams in behind a skeleton. See procedures-client-list.tsx.

  const readsSpanish = employee.languagePref === "es";
  const backHref = withAs(
    effectiveRole === "admin"
      ? `/${locale}/admin/library`
      : `/${locale}/employee/home`,
    viewAs,
  );

  // Admins land here inside `AdminShell` (see /procedures/layout.tsx) which
  // owns the page padding — keep this page flush and skip the employee
  // `<TabBar>` so we don't stack a phone bar under the desktop sidebar.
  const isAdmin = effectiveRole === "admin";
  const mainClass = isAdmin
    ? "mx-auto w-full max-w-doc px-4 pt-6 sm:px-6 sm:pt-8"
    : "mx-auto w-full max-w-doc px-4 pt-6 sm:px-6 sm:pt-8";

  const resolvedStationIds =
    employee.stationIds ??
    (employee.stations
      ? employee.stations.map((s: { id: string }) => s.id)
      : []);

  return (
    <>
      <main
        className={mainClass}
        style={isAdmin ? undefined : { paddingBottom: "100px" }}
      >
        {/* Procedures is a tab: the bar at the foot already holds Home, and a
            "back" above a tab reads as if the tabs were a hierarchy. An admin
            reading inside the admin shell has no tab bar, so keeps the link. */}
        {isAdmin ? (
          <Link
            href={backHref}
            className="inline-flex min-h-tap items-center gap-2 text-base font-semibold text-[var(--color-ink-2)]"
          >
            <LuArrowLeft aria-hidden="true" />
            {t("back")}
          </Link>
        ) : null}

        <div className="mt-2">
          <h1 className="font-[family-name:var(--font-display)] text-xl font-bold leading-display tracking-tight text-[var(--color-ink)] sm:text-2xl">
            {t("heading")}
          </h1>
        </div>

        {isTrainingLocked && requiredTraining ? (
          <aside className="mt-5 rounded-2xl border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4 sm:p-5">
            <p className="font-semibold text-[var(--color-ink)]">
              {tTraining("requiredTrainingHeading")}
            </p>
            <p className="mt-1 text-sm text-[var(--color-ink-2)]">
              {tTraining("requiredTrainingProgress", {
                completed: requiredTraining.completedCount,
                total: requiredTraining.requiredCount,
              })}
              {requiredTraining.lockedCount > 0
                ? ` ${tTraining("requiredTrainingLocked", { count: requiredTraining.lockedCount })}`
                : ""}
            </p>
            <Link
              href={withAs(`/${locale}/employee/training`, viewAs)}
              className="mt-2 inline-flex min-h-11 items-center font-semibold text-[var(--color-brand-700)]"
            >
              {tTraining("requiredTrainingAction")}
            </Link>
          </aside>
        ) : null}

        <ProceduresClientList
          initialQuery={q}
          initialCategory={category}
          locationId={employee.locationId}
          locale={locale}
          readsSpanish={readsSpanish}
          viewAs={viewAs}
          stationId={resolvedStationIds[0] ?? null}
          stationIds={resolvedStationIds}
          employeeId={employee.id}
          locked={isTrainingLocked}
          lockedHref={withAs(`/${locale}/employee/training`, viewAs)}
          lockedReason={
            isTrainingLocked
              ? tTraining("requiredTrainingLockReason")
              : undefined
          }
        />
      </main>

      {isAdmin ? null : (
        <TabBar
          locale={locale}
          active="procedures"
          labels={{
            home: t("tabHome"),
            procedures: t("tabProcedures"),
            training: t("tabTraining"),
            soon: t("tabSoon"),
            nav: t("tabsNav"),
          }}
        />
      )}
    </>
  );
}
