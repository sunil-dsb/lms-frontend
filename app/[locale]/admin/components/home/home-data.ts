import { getCategoryIcon } from "@/lib/category-icons";
import type {
  AdminEmployee,
  Category,
  EmployeeProgressAssignment,
  EmployeeProgressRow,
  Procedure,
  Role,
  Station,
  TrainingProgressData,
} from "@/lib/types";
import { LuFileText, LuLanguages } from "react-icons/lu";
import type { IconType } from "react-icons";

export type AttentionKind = "invite" | "spanish" | "resume" | "draft";

export interface AttentionItem {
  kind: AttentionKind;
  key: string;
  title: string;
  /** Pieces of the meta line, joined with a middot by the view. */
  meta: string[];
  href: string;
  image?: { src: string; alt: string };
  icon?: IconType;
  initials?: string;
  /** Oldest first inside a group: the thing left longest goes to the top. */
  since: number;
}

export interface AttentionGroup {
  kind: AttentionKind;
  items: AttentionItem[];
}

const DAY = 24 * 60 * 60 * 1000;

export function coverOf(
  p: Procedure,
  locale: string,
): { src: string; alt: string } | undefined {
  const body = (p.bodyEn?.blocks?.length ?? 0) > 0 ? p.bodyEn : p.bodyEs;
  if (!body?.blocks) return undefined;
  for (const b of body.blocks) {
    if (b.kind === "image" && b.src)
      return {
        src: b.src,
        alt:
          locale === "es"
            ? b.alt?.es || b.alt?.en || ""
            : b.alt?.en || b.alt?.es || "",
      };
  }
  return undefined;
}

export function titleOf(p: Procedure, locale: string): string {
  return locale === "es" ? p.titleEs || p.titleEn : p.titleEn || p.titleEs;
}

export function categoryName(
  c: Category | null,
  locale: string,
): string | null {
  if (!c) return null;
  return locale === "es" ? c.nameEs || c.nameEn : c.nameEn || c.nameEs;
}

/** A procedure a Spanish-reading cook cannot read: no Spanish title, or an
 *  English body with nothing on the Spanish side. */
export function missingSpanish(p: Procedure): boolean {
  return (
    !p.titleEs?.trim() ||
    ((p.bodyEn?.blocks?.length ?? 0) > 0 &&
      (p.bodyEs?.blocks?.length ?? 0) === 0)
  );
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function relativeDays(iso: string, locale: string, now: number): string {
  const days = Math.round((new Date(iso).getTime() - now) / DAY);
  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
    days,
    "day",
  );
}

export interface HomeInput {
  locale: string;
  now: number;
  meId: string | null;
  employees: AdminEmployee[];
  procedures: Procedure[];
  roles: Role[];
  stations: Station[];
  /** The draft this manager touched last. It gets a group of its own, "Pick
   *  up where you left off", and is left out of the general drafts. */
  resume?: Procedure | null;
  t: {
    inviteTitle: (name: string) => string;
    invitedAgo: (when: string) => string;
    readsSpanish: string;
    spanishTitle: (title: string) => string;
    spanishReaders: (count: number) => string;
    editedAgo: (when: string, name: string) => string;
    noSpanishYet: string;
    resumeMeta: (when: string) => string;
    uncategorised: string;
  };
}

export function buildAttention(input: HomeInput): AttentionGroup[] {
  const { locale, now, employees, procedures, roles, stations, resume, t } =
    input;
  const nameById = new Map(employees.map((e) => [e.id, e.name]));
  const roleById = new Map(roles.map((r) => [r.id, r.name]));
  const stationById = new Map(stations.map((s) => [s.id, s.name]));
  const spanishReaders = employees.filter(
    (e) => e.status === "active" && e.languagePref === "es",
  ).length;

  // Somebody is locked out until the invite is used: they come first.
  const invites: AttentionItem[] = employees
    .filter((e) => e.status === "pending")
    .map((e) => ({
      kind: "invite" as const,
      key: `invite-${e.id}`,
      title: t.inviteTitle(e.name),
      // A dishwasher at the Dishwasher station read "Dishwasher · Dishwasher".
      meta: [
        ...new Set([
          (e.roleIds?.[0] ?? (e as any).jobIds?.[0])
            ? roleById.get(e.roleIds?.[0] ?? (e as any).jobIds?.[0])
            : undefined,
          e.stationIds?.[0] ? stationById.get(e.stationIds[0]) : undefined,
        ]),
        t.invitedAgo(relativeDays(e.createdAt, locale, now)),
        e.languagePref === "es" ? t.readsSpanish : undefined,
      ].filter((x): x is string => Boolean(x)),
      href: `/${locale}/admin/employees?status=pending`,
      initials: initialsOf(e.name),
      since: new Date(e.createdAt).getTime(),
    }));

  // Published, so cooks are already opening it, and part of the team cannot read it.
  const spanish: AttentionItem[] =
    spanishReaders === 0
      ? []
      : procedures
          .filter((p) => p.status === "published" && missingSpanish(p))
          .map((p) => ({
            kind: "spanish" as const,
            key: `es-${p.id}`,
            title: t.spanishTitle(titleOf(p, "en")),
            meta: [
              categoryName(p.category, locale) ?? t.uncategorised,
              t.spanishReaders(spanishReaders),
            ],
            // The fix is adding the Spanish, which happens in the editor.
            href: `/${locale}/admin/library/${p.slug || p.id}/edit`,
            image: coverOf(p, locale),
            icon: LuLanguages,
            since: new Date(p.updatedAt).getTime(),
          }));

  const drafts: AttentionItem[] = procedures
    .filter((p) => p.status === "draft" && p.id !== resume?.id)
    .map((p) => ({
      kind: "draft" as const,
      key: `draft-${p.id}`,
      title: titleOf(p, locale),
      meta: [
        categoryName(p.category, locale) ?? t.uncategorised,
        t.editedAgo(
          relativeDays(p.updatedAt, locale, now),
          nameById.get(p.createdBy) ?? "",
        ),
        missingSpanish(p) ? t.noSpanishYet : undefined,
      ].filter((x): x is string => Boolean(x)),
      href: `/${locale}/admin/library/${p.slug || p.id}/edit`,
      image: coverOf(p, locale),
      icon: p.category ? getCategoryIcon(p.category) : LuFileText,
      since: new Date(p.updatedAt).getTime(),
    }));

  const mine: AttentionItem[] = resume
    ? [
        {
          kind: "resume" as const,
          key: `resume-${resume.id}`,
          title: titleOf(resume, locale),
          meta: [
            categoryName(resume.category, locale) ?? t.uncategorised,
            t.resumeMeta(relativeDays(resume.updatedAt, locale, now)),
          ],
          // Continue means write: the editor, not the page a cook reads.
          href: `/${locale}/admin/library/${resume.id}/edit`,
          image: coverOf(resume, locale),
          icon: resume.category ? getCategoryIcon(resume.category) : LuFileText,
          since: 0,
        },
      ]
    : [];

  return [
    { kind: "invite" as const, items: invites },
    { kind: "spanish" as const, items: spanish },
    { kind: "resume" as const, items: mine },
    { kind: "draft" as const, items: drafts },
  ]
    .map((g) => ({
      ...g,
      items: [...g.items].sort((a, b) => a.since - b.since),
    }))
    .filter((g) => g.items.length > 0);
}

/** The draft the signed-in manager touched last. The home opens with it, so
 *  whoever was interrupted last night lands back where they stopped. */
export function resumeDraft(
  procedures: Procedure[],
  meId: string | null,
): Procedure | null {
  const mine = procedures.filter(
    (p) => p.status === "draft" && (!meId || p.createdBy === meId),
  );
  mine.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  return mine[0] ?? null;
}

/* --------------------------------------------------------------- training -- */

/** One person, once: every course they owe in this group on one row. */
export interface TrainingPerson {
  key: string;
  name: string;
  initials: string;
  courses: string[];
  /** The earliest deadline among those courses. */
  dueAt: string;
  /** Everything assigned to them, for the drawer: open first, done last. */
  trainings: TrainingLine[];
}

export type TrainingState = "overdue" | "open" | "complete";

export interface TrainingLine {
  key: string;
  course: string;
  href: string;
  state: TrainingState;
  label: string;
}

export interface TrainingSummary {
  complete: number;
  total: number;
  /** Assignments past their date, not people: the headline counts these. */
  overdueCount: number;
  overdue: TrainingPerson[];
  dueThisWeek: TrainingPerson[];
}

/**
 * What the owner opens the admin for: is the team trained, and who do I chase
 * today. Built from the live `admin/progress` payload — the same data the
 * Training Progress tab renders, so the two never disagree. Grouped by person,
 * because the owner follows up with people, not with assignment rows.
 */
export function buildTrainingHome({
  progress,
  locale,
  now,
  lineLabel,
}: {
  progress: TrainingProgressData;
  locale: string;
  now: number;
  /** "Due in 2 days", "Due 8 days ago", "Done 9 days ago". */
  lineLabel: (state: TrainingState, at: string) => string;
}): TrainingSummary {
  const weekOut = now + 7 * DAY;
  const rows = progress.employees ?? [];
  const due = (a: EmployeeProgressAssignment): number =>
    new Date(a.dueDate).getTime();
  const courseTitle = (a: EmployeeProgressAssignment): string =>
    (locale === "es"
      ? a.courseTitleEs || a.courseTitleEn
      : a.courseTitleEn || a.courseTitleEs) || a.courseId;

  const order: Record<TrainingState, number> = {
    overdue: 0,
    open: 1,
    complete: 2,
  };
  const lineOf = (
    employeeId: string,
    a: EmployeeProgressAssignment,
  ): TrainingLine => {
    const state: TrainingState = a.isComplete
      ? "complete"
      : a.isOverdue
        ? "overdue"
        : "open";
    const at = a.isComplete ? (a.courseCompletedAt ?? a.dueDate) : a.dueDate;
    return {
      key: `${employeeId}-${a.courseId}`,
      course: courseTitle(a),
      href: `/${locale}/admin/training/progress/course/${a.courseId}`,
      state,
      label: lineLabel(state, at),
    };
  };
  const recordOf = (row: EmployeeProgressRow): TrainingLine[] =>
    (row.assignments ?? [])
      .sort((x, y) => order[stateOf(x)] - order[stateOf(y)] || due(x) - due(y))
      .map((a) => lineOf(row.employeeId, a));
  const stateOf = (a: EmployeeProgressAssignment): TrainingState =>
    a.isComplete ? "complete" : a.isOverdue ? "overdue" : "open";

  /** One person, once: the courses in the group on the row, every course in
   *  the drawer. Earliest deadline first, so the person left longest is on top. */
  const earliestDue = (
    row: EmployeeProgressRow,
    qualifies: (a: EmployeeProgressAssignment) => boolean,
  ): number => {
    const dues = (row.assignments ?? []).filter(qualifies).map(due);
    return dues.length ? Math.min(...dues) : Number.POSITIVE_INFINITY;
  };
  const byPerson = (
    list: EmployeeProgressRow[],
    qualifies: (a: EmployeeProgressAssignment) => boolean,
  ): TrainingPerson[] =>
    list
      .filter((row) => (row.assignments ?? []).some(qualifies))
      .sort((r1, r2) => earliestDue(r1, qualifies) - earliestDue(r2, qualifies))
      .map((row) => {
        const group = (row.assignments ?? []).filter(qualifies);
        return {
          key: row.employeeId,
          name: row.name,
          initials: initialsOf(row.name),
          courses: group.map(courseTitle),
          dueAt:
            group.slice().sort((x, y) => due(x) - due(y))[0]?.dueDate ??
            new Date().toISOString(),
          trainings: recordOf(row),
        };
      });

  const overdue = byPerson(rows, (a) => !a.isComplete && a.isOverdue);
  const overdueIds = new Set(overdue.map((p) => p.key));
  const dueThisWeek = byPerson(
    rows.filter((row) => !overdueIds.has(row.employeeId)),
    (a) => !a.isComplete && !a.isOverdue && due(a) >= now && due(a) <= weekOut,
  );

  return {
    complete: progress.summary.completed,
    total:
      progress.summary.completed +
      progress.summary.inProgress +
      progress.summary.overdue,
    overdueCount: progress.summary.overdue,
    overdue,
    dueThisWeek,
  };
}

export function recentProcedures(
  procedures: Procedure[],
  limit = 3,
): Procedure[] {
  return [...procedures]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, limit);
}
