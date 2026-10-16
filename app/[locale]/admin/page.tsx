import * as React from "react";
import { cookies } from "next/headers";
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
import type { AdminEmployee, Procedure, Role, Station } from "@/lib/types";
import {
  findMockEmployee,
  getCourseById,
  listTrainingAssignments,
} from "@/lib/mock-training";
import {
  buildAttention,
  buildTrainingSummary,
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
  RecentProcedures,
  StatStrip,
  TeamTraining,
  type GroupCopy,
  type Stat,
} from "./components/home/HomeSections";
import {
  LuBookOpen,
  LuClock,
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

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  let meId: string | null = null;
  let employees: AdminEmployee[] = [];
  let procedures: Procedure[] = [];
  let roles: Role[] = [];
  let stations: Station[] = [];

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
    [{ employees }, { procedures }, { roles }, { stations }] =
      await Promise.all([
        listEmployees({ status: "all" }, cookieHeader),
        listProcedures({}, cookieHeader),
        listRoles(cookieHeader),
        listStations(locationId, cookieHeader),
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

  // Training comes from the same mock selectors the Training page reads until
  // the training API lands; swap these three calls for it then.
  // One name per person: the employee list first, the training mock's own
  // list for anyone it has that the API does not.
  const nameById = new Map(employees.map((e) => [e.id, e.name]));
  const employeeName = (id: string): string | null =>
    nameById.get(id) ?? findMockEmployee(id)?.name ?? null;
  const courseTitle = (id: string): string | null => {
    const c = getCourseById(id);
    return c ? titleOf(c, locale) : null;
  };
  const training = buildTrainingSummary({
    assignments: listTrainingAssignments(),
    now,
    locale,
    courseTitle,
    employeeName,
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

  const total =
    training.overdueCount + groups.reduce((n, g) => n + g.items.length, 0);
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
      {groups.length > 0 ? (
        <AttentionList
          heading={t("attentionHeading")}
          groups={groups}
          copy={groupCopy}
          empty={{ title: t("clearTitle"), body: t("clearBody") }}
        />
      ) : null}

      {/* The library's latest, with its photographs, across the page. */}
      <RecentProcedures
        locale={locale}
        heading={t("recentHeading")}
        seeAll={t("recentSeeAll")}
        procedures={recentProcedures(procedures, 3)}
        statusLabel={(p) =>
          p.status === "draft" ? t("statusDraft") : t("statusPublished")
        }
        metaFor={(p) => {
          const when = relativeDays(p.updatedAt, locale, now);
          const name = nameById.get(p.createdBy);
          return name
            ? t("updatedAgoBy", { when, name })
            : t("updatedAgo", { when });
        }}
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
