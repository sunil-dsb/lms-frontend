"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMe } from "@/services/auth/hooks";
import { useAssignedProcedures } from "@/services/library/hooks";
import type { Procedure, ProcedureBlock } from "@/lib/types";
import type { EmployeeTrainingAssignment } from "@/services/courses/types";
import { useMyTraining } from "@/services/courses/hooks";
import { parseAsParam, withAs } from "@/lib/view-as";
import { TabBar } from "@/components/employee/tab-bar";
import {
  EmployeeHome,
  type HomeRow,
  type TrainingSummary,
} from "./components/EmployeeHome";
import { allergenWords, factsOf } from "./components/procedure-facts";
import { pickPromoProcedures } from "@/lib/promos";
import EmployeeHomeLoading from "./loading";

const DAY = 24 * 60 * 60 * 1000;
/** Someone who joined this recently is still in their first weeks. */
const FIRST_WEEKS = 30 * DAY;

function coverOf(blocks: ProcedureBlock[]): string | undefined {
  const img = blocks.find((b) => b.kind === "image" && b.src);
  return img && img.kind === "image" ? img.src : undefined;
}

function dueLabel(
  dueAt: string,
  now: number,
  t: (k: string, v?: Record<string, string | number>) => string,
): string {
  // Rounded up, as the Training tab counts, so both say the same number.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueAt);
  const dueDate = dateOnly
    ? new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3]),
      )
    : new Date(dueAt);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(dueDate);
  dueDay.setHours(0, 0, 0, 0);
  const d = Math.ceil((dueDay.getTime() - today.getTime()) / DAY);
  if (d < -1) return t("trainingOverdueBy", { days: -d });
  if (d === -1) return t("trainingOverdueSince");
  if (d === 0) return t("trainingDueToday");
  if (d === 1) return t("trainingDueTomorrow");
  return t("trainingDueInDays", { days: d });
}

interface HomeTrainingRow {
  course: { id: string; titleEn: string; titleEs: string };
  assignment: { dueAt: string };
  effectiveStatus:
    "not_started" | "in_progress" | "complete" | "overdue" | "due";
}

/**
 * Employee home, client-first: the shell (header, toggle, tab bar) paints
 * immediately and each section resolves through the shared query caches —
 * greeting as soon as the session lands, training synchronously, procedure
 * rows as soon as the assigned procedures cache resolves.
 */
export function EmployeeHomeClient({
  locale,
}: {
  locale: string;
}): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("employee.home");

  const { employee, isLoading: meLoading, error: meError } = useMe();
  const assignedProceduresQuery = useAssignedProcedures({ limit: 100 });
  const trainingQuery = useMyTraining(employee?.id);

  React.useEffect(() => {
    if (!meLoading && (meError || !employee))
      router.replace(`/${locale}/login`);
  }, [meLoading, meError, employee, router, locale]);

  const viewAs = parseAsParam(searchParams.get("as"));
  const isEs = locale === "es";

  const procedures = React.useMemo<Procedure[]>(
    () =>
      (assignedProceduresQuery.data?.procedures ?? []).filter(
        (p) => p.status === "published" && !p.isArchived,
      ),
    [assignedProceduresQuery.data?.procedures],
  );
  const proceduresLoading = assignedProceduresQuery.isLoading;

  const titleOf = (p: { titleEn: string; titleEs: string }): string =>
    isEs ? p.titleEs || p.titleEn : p.titleEn || p.titleEs;

  if (meLoading || meError || !employee) {
    return (
      <>
        <EmployeeHomeLoading />
        <TabBar
          locale={locale}
          active="home"
          labels={{
            home: t("tabHome"),
            procedures: t("tabProcedures"),
            training: t("tabTraining"),
            soon: t("tabSoon"),
            nav: t("tabsNav"),
          }}
        />
      </>
    );
  }

  return (
    <HomeContent
      locale={locale}
      isEs={isEs}
      titleOf={titleOf}
      employee={employee}
      procedures={procedures}
      proceduresLoading={proceduresLoading}
      trainingAssignments={trainingQuery.data}
      trainingFailed={trainingQuery.isError}
      viewAs={viewAs}
      t={t}
    />
  );
}

function HomeContent({
  locale,
  isEs,
  titleOf,
  employee,
  procedures,
  proceduresLoading,
  trainingAssignments,
  trainingFailed,
  viewAs,
  t,
}: {
  locale: string;
  isEs: boolean;
  titleOf: (p: { titleEn: string; titleEs: string }) => string;
  employee: NonNullable<ReturnType<typeof useMe>["employee"]>;
  procedures: Procedure[];
  proceduresLoading: boolean;
  trainingAssignments?: EmployeeTrainingAssignment[];
  trainingFailed: boolean;
  viewAs: ReturnType<typeof parseAsParam>;
  t: (k: string, v?: Record<string, string | number>) => string;
}): React.ReactElement {
  const stationIds =
    employee.stationIds ??
    (employee.stations ? employee.stations.map((s) => s.id) : []);

  // Prefer denormalised names from GET /me (no extra fetch, no loading flash).
  const meJobName = employee.jobs?.[0]?.name ?? null;
  const displayRole =
    meJobName ??
    (employee.role
      ? employee.role.charAt(0).toUpperCase() + employee.role.slice(1)
      : null);
  const meStationNames = (employee.stations ?? [])
    .map((s) => s.name)
    .filter((n): n is string => Boolean(n));
  const procStationNames = procedures
    .map((p) => p.station?.name)
    .filter((n): n is string => Boolean(n));
  const stationNames =
    meStationNames.length > 0
      ? meStationNames
      : Array.from(new Set(procStationNames));
  const stationName = stationNames.length ? stationNames.join(", ") : null;

  const now = Date.now();
  const hour = new Date(now).getHours();
  const greetingKey =
    hour < 12
      ? "greetingMorning"
      : hour < 18
        ? "greetingAfternoon"
        : "greetingEvening";
  const greeting = t(greetingKey, { name: employee.name });

  const today = new Date(now).toISOString().slice(0, 10);
  const rows: HomeTrainingRow[] = trainingFailed
    ? []
    : trainingAssignments
      ? trainingAssignments.map((assignment) => ({
          course: {
            id: assignment.courseId,
            titleEn: assignment.titleEn,
            titleEs: assignment.titleEs,
          },
          assignment: { dueAt: assignment.dueDate },
          effectiveStatus:
            assignment.status === "complete"
              ? "complete"
              : assignment.dueDate < today
                ? "overdue"
                : assignment.completedChapterCount > 0
                  ? "in_progress"
                  : "not_started",
        }))
      : [];

  const open = rows.filter((r) => r.effectiveStatus !== "complete");
  const overdue = open.filter((r) => r.effectiveStatus === "overdue");
  const done = rows.length - open.length;
  const inFirstWeeks =
    now - new Date(employee.createdAt ?? 0).getTime() < FIRST_WEEKS;

  const rank = (r: HomeTrainingRow): number =>
    r.effectiveStatus === "overdue"
      ? 0
      : r.effectiveStatus === "in_progress"
        ? 1
        : 2;
  const next = [...open].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      new Date(a.assignment.dueAt).getTime() -
        new Date(b.assignment.dueAt).getTime(),
  )[0];

  const totalChapters = trainingAssignments
    ? trainingAssignments.reduce((acc, a) => acc + (a.chapterCount || 0), 0)
    : 0;
  const completedChapters = trainingAssignments
    ? trainingAssignments.reduce(
        (acc, a) => acc + (a.completedChapterCount || 0),
        0,
      )
    : 0;
  const progressPercent =
    totalChapters > 0
      ? Math.min(100, Math.round((completedChapters / totalChapters) * 100))
      : rows.length > 0
        ? Math.round((done / rows.length) * 100)
        : 0;

  const training: TrainingSummary | null = rows.length
    ? {
        heading:
          inFirstWeeks && open.length
            ? t("firstWeeksHeading")
            : t("trainingAttentionHeading"),
        doneLine: t("trainingDoneLine", { done, total: rows.length }),
        overdueLine: overdue.length
          ? t("trainingOverdueLine", { count: overdue.length })
          : undefined,
        done,
        total: rows.length,
        completedChapters,
        totalChapters,
        progressPercent,
        next: next
          ? {
              href: `/${locale}/employee/training/${next.course.id}`,
              title: titleOf(next.course),
              pill:
                next.effectiveStatus === "overdue"
                  ? { tone: "bad", text: t("trainingOverdueChip") }
                  : next.effectiveStatus === "in_progress"
                    ? { tone: "progress", text: t("trainingInProgressChip") }
                    : { tone: "neutral", text: t("trainingNotStarted") },
              when: dueLabel(next.assignment.dueAt, now, t),
              action:
                next.effectiveStatus === "in_progress"
                  ? t("continueAction")
                  : t("startAction"),
            }
          : undefined,
        caughtUp: t("trainingCatchUpTitle"),
        all: {
          href: `/${locale}/employee/training`,
          label: t("trainingSeeAll"),
        },
      }
    : null;

  const forMyStation = (p: Procedure): boolean =>
    Boolean(
      p.isStationProcedure ||
      (stationIds.length &&
        ((p.stationScope?.mode === "specific" &&
          p.stationScope.stationIds.some((id) => stationIds.includes(id))) ||
          (p.station?.id && stationIds.includes(p.station.id)) ||
          (p.audience?.mode === "some" &&
            p.audience.stationIds.some((id) => stationIds.includes(id))))),
    );
  const toRow = (p: Procedure, meta: string): HomeRow => {
    const facts = factsOf(p, isEs);
    const sub = p.subcategoryId
      ? (p.category?.subcategories?.find((s) => s.id === p.subcategoryId) ??
        null)
      : ((p as any).subcategory ?? null);
    const purposeOf = (p: {
      purposeEn?: string;
      purposeEs?: string;
    }): string =>
      isEs
        ? p.purposeEs || p.purposeEn || ""
        : p.purposeEn || p.purposeEs || "";
    return {
      key: p.id,
      slug: p.slug,
      updatedAt: p.updatedAt,
      href: withAs(`/${locale}/procedures/${p.slug}`, viewAs),
      cover:
        p.procedureImage ||
        coverOf(
          p.bodyEn?.blocks?.length ? p.bodyEn.blocks : (p.bodyEs?.blocks ?? []),
        ),
      iconImageUrl: p.iconImageUrl ?? p.procedureImage ?? null,
      category: p.category,
      subcategory: sub,
      title: titleOf(p),
      purpose: purposeOf(p),
      meta,
      flags: {
        ...facts,
        allergens: allergenWords(facts.allergens, isEs ? "es" : "en"),
      },
      locked: false,
    };
  };
  const categoryOf = (p: Procedure): string =>
    p.category
      ? isEs
        ? p.category.nameEs || p.category.nameEn
        : p.category.nameEn
      : t("uncategorised");

  const promoRows = pickPromoProcedures(procedures).map((p) =>
    toRow(p, categoryOf(p)),
  );
  const promoIds = new Set(promoRows.map((p) => p.key));

  const isGuac = (p: Procedure) =>
    p.id === "proc-guacamole-fresco" || p.slug === "guacamole-fresco";
  // Directly assigned to this person — its own section above the station's.
  // Assigned rows leave the station list so nothing appears twice.
  const assignedRows = procedures
    .filter(
      (p) =>
        !promoIds.has(p.id) &&
        (p.isDirectlyAssigned === true ||
          Boolean(p.assignUsers?.includes(employee.id))),
    )
    .sort((a, b) => {
      const gA = isGuac(a) ? 1 : 0;
      const gB = isGuac(b) ? 1 : 0;
      if (gA !== gB) return gB - gA;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  const assignedIds = new Set(assignedRows.map((p) => p.id));
  const stationRows = procedures
    .filter((p) => !promoIds.has(p.id) && !assignedIds.has(p.id))
    .sort((a, b) => {
      const gA = isGuac(a) ? 1 : 0;
      const gB = isGuac(b) ? 1 : 0;
      if (gA !== gB) return gB - gA;
      return (
        Number(forMyStation(b)) - Number(forMyStation(a)) ||
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    })
    .slice(0, 5);

  return (
    <>
      <main
        className="mx-auto w-full max-w-doc px-3 pt-4 sm:px-6 sm:pt-8"
        style={{ paddingBottom: "100px" }}
      >
        <div
          className="flex items-center justify-between"
          style={{ marginBottom: "14px" }}
        >
          <h1
            className="font-bold text-lg text-[var(--color-ink)]"
            style={{ letterSpacing: "-0.01em" }}
          >
            {t("tabHome")}
          </h1>
        </div>
        <EmployeeHome
          locale={locale}
          greeting={greeting}
          name={employee.name}
          roleName={displayRole}
          stationName={stationName}
          training={training}
          promo={{
            heading: t("promoHeading"),
            rows: promoRows,
          }}
          assigned={
            assignedRows.length > 0
              ? {
                  heading: t("assignedHeading"),
                  rows: assignedRows.map((p) => toRow(p, categoryOf(p))),
                }
              : null
          }
          station={{
            // Named for the station only when something here is the station's own.
            heading:
              stationName && stationRows.some(forMyStation)
                ? stationNames.length > 1
                  ? t("stationsHeading")
                  : t("stationHeading", { station: stationName })
                : t("forYouHeading"),
            rows: stationRows.map((p) => toRow(p, categoryOf(p))),
            all: { href: `/${locale}/procedures`, label: t("browseAll") },
            empty: t("noProceduresBody"),
          }}
          loading={proceduresLoading}
          flagLabels={{
            allergen: (list) => t("flagAllergen", { list }),
            critical: t("flagCritical"),
            english: t("flagEnglishOnly"),
          }}
          isOnboarding={false}
        />
      </main>

      <TabBar
        locale={locale}
        active="home"
        labels={{
          home: t("tabHome"),
          procedures: t("tabProcedures"),
          training: t("tabTraining"),
          soon: t("tabSoon"),
          nav: t("tabsNav"),
        }}
      />
    </>
  );
}
