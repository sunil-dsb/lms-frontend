import * as React from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ApiException,
  fetchMe,
  listEmployees,
  listLocations,
  listProcedures,
  listRoles,
  listStations,
} from "@/lib/api";
import type {
  AdminEmployee,
  Procedure,
  Role,
  Station,
  TrainingProgressData,
} from "@/lib/types";
import { fetchTrainingProgress } from "@/lib/api/training-progress";
import { serverCookieHeader } from "@/lib/server-cookies";
import { fetchCourses } from "@/services/courses/api";
import { getCategoryIcon } from "@/lib/category-icons";
import {
  buildAttention,
  buildTrainingHome,
  coverOf,
  categoryName,
  missingSpanish,
  recentProcedures,
  relativeDays,
  resumeDraft,
  titleOf,
  type AttentionGroup,
} from "./components/home/home-data";
import {
  AttentionList,
  HomeHeader,
  RecentSection,
  StatStrip,
  TeamTraining,
  type GroupCopy,
  type RecentCard,
  type Stat,
} from "./components/home/HomeSections";
import {
  LuBookOpen,
  LuClock,
  LuFileText,
  LuGraduationCap,
  LuPlus,
  LuUsers,
} from "react-icons/lu";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = "force-dynamic";

/**
 * The manager's home answers one question first: does anything need me? The
 * team's training leads, because that is what the owner is accountable for;
 * then the content chores (invites, missing Spanish, drafts) and the draft they
 * left open. Counts of how much content exists, empty categories and a recent
 * list the library already shows were removed: none of them asked anything of
 * the manager.
 */
export default async function AdminHomePage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.home");

  // Server components call the API client directly, so the browser's auth
  // cookie has to be forwarded explicitly (lib/http.ts's interceptor only
  // sees client-side cookies).
  const cookieHeader = await serverCookieHeader();

  let meId: string | null = null;
  let employees: AdminEmployee[] = [];
  let procedures: Procedure[] = [];
  let roles: Role[] = [];
  let stations: Station[] = [];
  let trainingProgress: TrainingProgressData | null = null;
  let recentCourses: Awaited<ReturnType<typeof fetchCourses>> | null = null;

  try {
    // Auth + workspace resolve together: listLocations does not depend on
    // the /auth/me result (the match is local below), so running them in
    // parallel saves one full backend round-trip before first paint.
    const [me, { locations }] = await Promise.all([
      fetchMe(cookieHeader),
      listLocations(cookieHeader),
    ]);
    meId = me.employee.id;
    const location =
      locations.find((l) => l.id === me.employee.locationId) ?? locations[0];
    const locationId = location?.id ?? me.employee.locationId;
    [
      { employees },
      { procedures },
      { roles },
      { stations },
      trainingProgress,
      recentCourses,
    ] = await Promise.all([
      listEmployees({ status: "all" }, cookieHeader),
      listProcedures({}, cookieHeader),
      listRoles(cookieHeader),
      listStations(locationId, cookieHeader),
      // The training card + stat share the admin/progress payload (with a
      // local catch so a backend blip empties the card instead of 500ing).
      fetchTrainingProgress(cookieHeader).then((r) => r.data),
      // Recently updated courses: only the first page matters here.
      fetchCourses({ limit: 8, status: "published" }, cookieHeader).catch(
        () => null,
      ),
    ]);
  } catch (err) {
    if (err instanceof ApiException) return <HomeError message={err.message} />;
    throw err;
  }

  const now = Date.now();
  const resume = resumeDraft(procedures, meId);

  const groups = buildAttention({
    locale,
    now,
    meId,
    employees,
    procedures,
    roles,
    stations,
    resume,
    t: {
      inviteTitle: (name) => t("inviteTitle", { name }),
      invitedAgo: (when) => t("invitedAgo", { when }),
      readsSpanish: t("readsSpanish"),
      spanishTitle: (title) => t("spanishTitle", { title }),
      spanishReaders: (count) => t("spanishReaders", { count }),
      editedAgo: (when, name) =>
        name ? t("editedAgoBy", { when, name }) : t("editedAgo", { when }),
      noSpanishYet: t("noSpanishYet"),
      resumeMeta: (when) => t("resumeMeta", { when }),
      uncategorised: t("uncategorised"),
    },
  });

  // The Team training card and the Training stat read the live admin/progress
  // payload — the same rows the Progress tab renders, so the two never disagree.
  const nameById = new Map(employees.map((e) => [e.id, e.name]));
  const training = buildTrainingHome({
    progress: trainingProgress ?? {
      summary: { completed: 0, inProgress: 0, overdue: 0 },
      employees: [],
      courses: [],
    },
    locale,
    now,
    lineLabel: (state, at) => {
      const when = relativeDays(at, locale, now);
      if (state === "complete") return t("training.doneAgo", { when });
      return t(state === "overdue" ? "training.wasDue" : "training.due", {
        when,
      });
    },
  });

  // Four numbers the owner can act on; each card opens its page.
  const active = employees.filter((e) => e.status === "active").length;
  const invited = employees.filter((e) => e.status === "pending").length;
  const live = procedures.filter(
    (p) => p.status === "published" && !p.isArchived,
  );
  const drafts = procedures.filter(
    (p) => p.status === "draft" && !p.isArchived,
  ).length;
  const noSpanish = live.filter((p) => missingSpanish(p)).length;
  const trainedPct = training.total
    ? Math.round((training.complete / training.total) * 100)
    : 0;
  const stats: Stat[] = [
    {
      label: t("stat.training"),
      icon: LuGraduationCap,
      value: `${trainedPct}%`,
      note: t("stat.trainingNote", {
        done: training.complete,
        total: training.total,
      }),
      meter: training.total
        ? { value: training.complete, total: training.total }
        : undefined,
      href: `/${locale}/admin/training`,
    },
    {
      label: t("stat.overdue"),
      icon: LuClock,
      value: String(training.overdue.length),
      note: t("stat.overdueNote", { count: training.overdue.length }),
      tone: training.overdue.length ? "bad" : undefined,
      href: `/${locale}/admin/training`,
    },
    {
      label: t("stat.team"),
      icon: LuUsers,
      value: String(active),
      note: invited
        ? t("stat.teamInvited", { count: invited })
        : t("stat.teamAllJoined"),
      tone: invited ? "caution" : undefined,
      href: `/${locale}/admin/employees`,
    },
    {
      label: t("stat.library"),
      icon: LuBookOpen,
      value: String(live.length),
      note:
        drafts || noSpanish
          ? [
              drafts ? t("stat.libraryDrafts", { count: drafts }) : null,
              noSpanish
                ? t("stat.libraryNoSpanish", { count: noSpanish })
                : null,
            ]
              .filter(Boolean)
              .join(" · ")
          : t("stat.libraryClear"),
      tone: drafts || noSpanish ? "caution" : undefined,
      href: `/${locale}/admin/library`,
    },
  ];

  // Cap "Needs attention" at ten rows: past that the card outgrows the page
  // and the count badge alone tells the manager the size of the backlog.
  const ATTENTION_MAX = 10;
  const cappedGroups: AttentionGroup[] = [];
  let attentionQuota = ATTENTION_MAX;
  for (const g of groups) {
    if (attentionQuota <= 0) break;
    const items = g.items.slice(0, attentionQuota);
    attentionQuota -= items.length;
    cappedGroups.push({ ...g, items });
  }
  const attentionTotal = cappedGroups.reduce((n, g) => n + g.items.length, 0);

  const total = training.overdueCount + attentionTotal;
  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);

  const groupCopy: Record<AttentionGroup["kind"], GroupCopy> = {
    invite: {
      title: t("group.invite.title"),
      action: t("group.invite.action"),
      tone: "warn",
    },
    spanish: {
      title: t("group.spanish.title"),
      action: t("group.spanish.action"),
      tone: "bad",
    },
    resume: { title: t("resumeEyebrow"), action: t("resumeCta"), tone: "ink" },
    draft: {
      title: t("group.draft.title"),
      action: t("group.draft.action"),
      tone: "ink",
    },
  };

  // Recently updated: procedures and courses together, newest first, three
  // cards regardless of kind.
  const updatedAgoOf = (iso: string, authorId?: string): string => {
    const when = relativeDays(iso, locale, now);
    const name = authorId ? nameById.get(authorId) : undefined;
    return name ? t("updatedAgoBy", { when, name }) : t("updatedAgo", { when });
  };
  const courseTitleOf = (c: { titleEn: string; titleEs: string }): string =>
    (locale === "es" ? c.titleEs || c.titleEn : c.titleEn || c.titleEs) || "";
  const recentCards: RecentCard[] = [
    ...recentProcedures(procedures, 3).map((p) => ({
      key: `proc-${p.id}`,
      updatedAt: new Date(p.updatedAt).getTime(),
      href: `/${locale}/procedures/${p.slug}`,
      title: titleOf(p, locale),
      cover: coverOf(p, locale),
      icon: p.category ? getCategoryIcon(p.category) : LuFileText,
      statusLabel:
        p.status === "draft" ? t("statusDraft") : t("statusPublished"),
      statusTone: (p.status === "published" ? "ok" : "neutral") as
        "ok" | "neutral",
      badgeLabel: categoryName(p.category, locale),
      badgeIcon: p.category ? getCategoryIcon(p.category) : undefined,
      meta: updatedAgoOf(p.updatedAt, p.createdBy),
    })),
    ...(recentCourses?.items ?? []).map((c) => ({
      key: `course-${c.id}`,
      updatedAt: new Date(c.updatedAt).getTime(),
      href: `/${locale}/admin/training/${c.id}`,
      title: courseTitleOf(c),
      icon: LuGraduationCap,
      statusLabel: t("statusPublished"),
      statusTone: "ok" as const,
      badgeLabel: t("badgeCourse"),
      badgeIcon: LuGraduationCap,
      meta: updatedAgoOf(c.updatedAt),
    })),
  ]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 3)
    .map(({ updatedAt: _u, ...card }) => card);

  return (
    <div className="mx-auto max-w-page space-y-8 pb-12">
      {/* One way in to making content. */}
      <HomeHeader
        place={dateLabel}
        headline={
          total === 0 ? t("headlineClear") : t("headline", { count: total })
        }
        actions={[
          {
            href: `/${locale}/admin/library/new`,
            label: t("actionCreate"),
            icon: LuPlus,
            primary: true,
          },
        ]}
      />

      <StatStrip stats={stats} />

      <TeamTraining
        summary={training}
        heading={t("training.heading")}
        progress={t("training.complete", {
          done: training.complete,
          total: training.total,
        })}
        seeAll={{
          href: `/${locale}/admin/training`,
          label: t("training.seeAll"),
        }}
        groups={{
          overdue: t("training.overdue"),
          dueThisWeek: t("training.dueThisWeek"),
        }}
        dueLabel={(p, overdue) =>
          t(overdue ? "training.wasDue" : "training.due", {
            when: relativeDays(p.dueAt, locale, now),
          })
        }
        more={(count) => t("training.more", { count })}
        remind={{ label: t("training.remind"), sent: t("training.reminded") }}
        person={{ open: t("training.openPerson"), close: t("training.close") }}
        empty={{
          title: t("training.clearTitle"),
          body: t("training.clearBody"),
        }}
      />

      {/* With nothing in it, the card was a large box saying so. The headline
          already says whether anything needs the manager. */}
      {cappedGroups.length > 0 ? (
        <AttentionList
          heading={t("attentionHeading")}
          groups={cappedGroups}
          copy={groupCopy}
          empty={{ title: t("clearTitle"), body: t("clearBody") }}
        />
      ) : null}

      {/* The library's and courses' latest, with its photographs, across the
          page — whichever was touched last, both kinds in one recent list. */}
      <RecentSection
        heading={t("recentHeading")}
        seeAll={t("recentSeeAll")}
        seeAllHref={`/${locale}/admin/library`}
        cards={recentCards}
      />
    </div>
  );
}

function HomeError({ message }: { message: string }): React.ReactElement {
  return (
    <div
      role="alert"
      className="mx-auto max-w-narrow rounded-[var(--radius-lg)] bg-[var(--color-bad-tint)] p-6"
    >
      <p className="font-semibold text-[var(--color-bad)]">{message}</p>
    </div>
  );
}
