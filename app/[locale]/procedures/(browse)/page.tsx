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
import {
  getOnboardingChapters,
  mockTrainingEmployees,
} from "@/lib/mock-training";
import { ProceduresClientList } from "./procedures-client-list";
import { HomeViewToggle } from "@/app/[locale]/employee/home/components/HomeViewToggle";

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
  const { q = "", category = "", view = "" } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("employee.browse");

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

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
  const viewAs = await readViewAs();
  const effectiveRole = viewAs ?? "employee";

  // Onboarding gate — when the cook hasn't cleared orientation, every row on
  // this tab is locked and tapping pushes them back to /employee/training.
  // Admins reading the library (effectiveRole === 'admin') skip the gate.
  // The demo view toggle (?view=regular or cookie lms_demo_view) unlocks procedures.
  const onboardingEmployeeId =
    mockTrainingEmployees.find((e) => e.id === employee.id)?.id ??
    mockTrainingEmployees.find(
      (e) => e.name.toLowerCase() === employee.name.toLowerCase(),
    )?.id ??
    employee.id;
  const cookieView = cookieStore.get("lms_demo_view")?.value;
  const effectiveView = view || cookieView;
  const isOrientationPending =
    effectiveView === "onboarding"
      ? true
      : effectiveView === "regular"
        ? false
        : !getOnboardingChapters(onboardingEmployeeId, new Date())
            .onboardingDone;
  const onboardingDone = effectiveRole === "admin" || !isOrientationPending;
  const lockedHref = `/${locale}/employee/training`;
  let lockedReason = "Locked until orientation is done";
  try {
    lockedReason = t("lockedRowReason");
  } catch {
    // fallback
  }

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

        <div className="mt-2 flex items-center justify-between">
          <h1 className="font-[family-name:var(--font-display)] text-xl font-bold leading-display tracking-tight text-[var(--color-ink)] sm:text-2xl">
            {t("heading")}
          </h1>
          {!isAdmin ? (
            <HomeViewToggle value={onboardingDone ? "regular" : "onboarding"} />
          ) : null}
        </div>

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
          locked={!onboardingDone}
          lockedHref={lockedHref}
          lockedReason={lockedReason}
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
