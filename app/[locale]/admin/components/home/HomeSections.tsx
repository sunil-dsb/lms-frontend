import * as React from "react";
import Link from "next/link";
import { getCategoryIcon } from "@/lib/category-icons";
import type { Procedure } from "@/lib/types";
import {
  categoryName,
  coverOf,
  titleOf,
  type AttentionGroup,
  type AttentionItem,
  type TrainingPerson,
  type TrainingSummary,
} from "./home-data";
import {
  LuArrowRight,
  LuArrowUp,
  LuCalendar,
  LuCheck,
  LuChevronRight,
  LuFileText,
  LuPencil,
} from "react-icons/lu";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { Meter } from "@/components/ui/meter";
import { CountBadge, StatusPill } from "@/components/ui/status-pill";
import { Button, buttonClassName } from "@/components/ui/button";
import { PersonTrainingRow } from "./PersonTrainingRow";
import type { IconType } from "react-icons";

/*
 * One column. White surfaces sit on the admin ground where there is something
 * to read or act on; nothing is boxed twice, and nothing moves on hover except
 * the controls themselves.
 */

/* ---------------------------------------------------------------- header -- */

export function HomeHeader({
  place,
  headline,
  actions,
}: {
  place: string;
  headline: string;
  actions: { href: string; label: string; icon: IconType; primary?: boolean }[];
}): React.ReactElement {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink-2)]">
          <LuCalendar aria-hidden="true" />
          {place}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold leading-display tracking-tight text-[var(--color-ink)] sm:text-2xl">
          {headline}
        </h1>
      </div>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className={buttonClassName({
              variant: a.primary ? "primary" : "surface",
            })}
          >
            {a.label}
            <Icon icon={a.icon} className="text-base" />
          </Link>
        ))}
      </div>
    </header>
  );
}

/* ----------------------------------------------------------------- stats -- */

export interface Stat {
  label: string;
  icon: IconType;
  value: string;
  note: string;
  /** Both halves must be real. A tile with nothing to measure gets no ring. */
  meter?: { value: number; total: number; tone?: "ok" | "warn" };
  /** up: something was added. caution: something is waiting on the manager.
   *  bad: something is late. muted: nothing to count yet. */
  tone?: "up" | "caution" | "bad" | "muted";
  /** The page the number is about: a card is the way to it. */
  href: string;
}

/** Four numbers the owner acts on, each on its own card: how trained the team
 *  is, who is late, who has not joined, and what the library is missing. Each
 *  card opens the page its number is about. */
export function StatStrip({ stats }: { stats: Stat[] }): React.ReactElement {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {stats.map((s) => (
        <li key={s.label} className="min-w-0">
          <Link
            href={s.href}
            className="flex h-full min-w-0 flex-col gap-2 rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-4 py-3 shadow-e1 transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:border-[var(--color-line-hover)] sm:px-5 sm:py-4"
          >
            {/* The icon sits on the label, not in a grey tile of its own: four cards
              each carrying an identical rounded tile is the shape that makes a
              dashboard read as generated rather than designed. */}
            <span className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink-2)]">
              <Icon
                icon={s.icon}
                className="text-base text-[var(--color-ink-3)]"
              />
              {s.label}
              {/* How full, as a mark on the label's line. Beside the figure it took
                the room the note needed and pushed it onto a second line, so this
                card came out taller than the three beside it. */}
              {s.meter ? (
                <span className="ml-auto">
                  <Meter
                    value={s.meter.value}
                    total={s.meter.total}
                    tone={s.meter.tone}
                    size={20}
                    stroke={3}
                  />
                </span>
              ) : null}
            </span>
            {/* One shape for all four. The share used to be a 64px ring with the
              figure inside it, and the grid stretched the other three cards to
              that ring's height, so every card carried a band of empty white. A
              share is now a figure like the counts, with a small ring on the label
              line saying how full -- the same height as its neighbours.
              Number and note share a baseline, so a card reads as one sentence
              ("5, none added this week"); the note drops under the number only
              when the card is too narrow to hold both. */}
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-1">
                {/* A tile with nothing to count says so in words. An em dash standing
                  where the number goes reads as a value that failed to load, and
                  beside the note it reads as a strikethrough. */}
                {s.value ? (
                  <span
                    className={`font-[family-name:var(--font-display)] text-xl font-bold leading-display tracking-tight ${
                      s.tone === "muted"
                        ? "text-[var(--color-ink-3)]"
                        : "text-[var(--color-ink)]"
                    }`}
                  >
                    {s.value}
                  </span>
                ) : null}
                <span
                  className={`flex min-w-0 items-baseline gap-1 leading-meta ${s.value ? "text-sm" : "text-md"} ${
                    s.tone === "bad"
                      ? "font-semibold text-[var(--color-bad)]"
                      : s.tone === "caution"
                        ? "font-semibold text-[var(--color-warn-ink)]"
                        : s.tone === "up"
                          ? "font-semibold text-[var(--color-ink)]"
                          : "text-[var(--color-ink-2)]"
                  }`}
                >
                  {s.tone === "caution" ? (
                    <span
                      aria-hidden="true"
                      className="mr-1 size-2 shrink-0 -translate-y-0.5 rounded-full bg-[var(--color-warn)]"
                    />
                  ) : null}
                  {s.tone === "up" ? (
                    <LuArrowUp aria-hidden="true" className="shrink-0" />
                  ) : null}
                  {s.note}
                </span>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------- training -- */

/**
 * The team's training, first on the page. The owner's question is not how
 * much content exists but whether people are trained and who to chase today,
 * so this replaced the four count cards (procedures, drafts, people, and a
 * training figure that was a hard-coded sample).
 *
 * Two groups in the same shape as "Needs attention" -- a dot, a title, a count
 * -- so the page has one way of saying "these need you". The group carries the
 * status; the rows are people, once each, with the date in plain text. A pill
 * on every row made seven red and yellow badges that all shouted at once.
 */
export function TeamTraining({
  summary,
  heading,
  progress,
  seeAll,
  groups,
  dueLabel,
  more,
  remind,
  person,
  empty,
}: {
  summary: TrainingSummary;
  heading: string;
  progress: string;
  seeAll: { href: string; label: string };
  groups: { overdue: string; dueThisWeek: string };
  dueLabel: (person: TrainingPerson, overdue: boolean) => string;
  more: (count: number) => string;
  remind: { label: string; sent: string };
  person: { open: string; close: string };
  empty: { title: string; body: string };
}): React.ReactElement {
  const sections = [
    {
      key: "overdue",
      title: groups.overdue,
      people: summary.overdue,
      overdue: true,
    },
    {
      key: "week",
      title: groups.dueThisWeek,
      people: summary.dueThisWeek,
      overdue: false,
    },
  ].filter((s) => s.people.length > 0);
  // Two a group on the home; the count says how many there are, and the rest
  // are one link away. Every name made the card the length of the page.
  const SHOWN = 2;

  return (
    <section
      aria-labelledby="training-h"
      className="rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-4 py-5 shadow-e1 sm:px-6 sm:py-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="training-h"
          className="text-lg font-semibold leading-heading tracking-snug text-[var(--color-ink)]"
        >
          {heading}
        </h2>
        <Link
          href={seeAll.href}
          className="inline-flex min-h-tap-admin shrink-0 items-center gap-1 text-sm font-semibold text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
        >
          {seeAll.label}
          <LuChevronRight aria-hidden="true" />
        </Link>
      </div>
      {/* Under the heading row, not inside it: beside the link it had a third
          of a phone's width and broke over three lines. */}
      {summary.total ? (
        <p className="mt-1 flex items-center gap-2 text-sm text-[var(--color-ink-2)]">
          <Meter
            value={summary.complete}
            total={summary.total}
            size={16}
            stroke={3}
          />
          {progress}
        </p>
      ) : null}

      {sections.length === 0 ? (
        <p className="mt-5 flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-ok-tint)] text-[var(--color-ok)]"
          >
            <LuCheck />
          </span>
          <span>
            <span className="block font-semibold text-[var(--color-ink)]">
              {empty.title}
            </span>
            <span className="block text-[var(--color-ink-2)]">
              {empty.body}
            </span>
          </span>
        </p>
      ) : (
        sections.map((s, i) => (
          <div
            key={s.key}
            className={
              i === 0 ? "mt-5" : "mt-2 border-t border-[var(--color-line)] pt-5"
            }
          >
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink-2)]">
              <span
                aria-hidden="true"
                className={`size-2 rounded-full ${s.overdue ? TONE_DOT.bad : TONE_DOT.warn}`}
              />
              {s.title}
              <CountBadge tone={s.overdue ? "bad" : "warn"}>
                {s.people.length}
              </CountBadge>
            </h3>
            <ul className="mt-1">
              {s.people.slice(0, SHOWN).map((p) => (
                <PersonTrainingRow
                  key={p.key}
                  name={p.name}
                  initials={p.initials}
                  courses={p.courses.join(" · ")}
                  due={dueLabel(p, s.overdue)}
                  overdue={s.overdue}
                  trainings={p.trainings.map((l) => ({
                    key: l.key,
                    course: l.course,
                    href: l.href,
                    label: l.label,
                    tone:
                      l.state === "overdue"
                        ? "bad"
                        : l.state === "complete"
                          ? "ok"
                          : "neutral",
                  }))}
                  labels={{
                    open: person.open,
                    close: person.close,
                    remind: remind.label,
                    reminded: remind.sent,
                  }}
                />
              ))}
            </ul>
            {s.people.length > SHOWN ? (
              <Link
                href={seeAll.href}
                className="mt-1 inline-flex min-h-tap-admin items-center gap-1 text-sm font-semibold text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
              >
                {more(s.people.length - SHOWN)}
                <LuChevronRight aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        ))
      )}
    </section>
  );
}

function Thumb({
  src,
  icon,
  initials,
  small,
}: {
  src?: string;
  icon?: IconType;
  initials?: string;
  tint?: boolean;
  small?: boolean;
}): React.ReactElement {
  if (src) {
    // Covers are posters: a title across the top and a light margin round the
    // edge. At 48px the whole poster read as a small picture in a pale frame, so
    // the thumbnail crops in on the middle of it, where the subject is.
    return (
      <span
        className={`${small ? "size-10" : "size-12"} shrink-0 overflow-hidden rounded-[var(--radius-md)]`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="size-full origin-[50%_60%] scale-[1.6] object-cover"
        />
      </span>
    );
  }
  if (initials)
    return <Avatar initials={initials} size={small ? "sm" : "md"} />;
  return (
    <span
      aria-hidden="true"
      className={`flex ${small ? "size-10" : "size-12"} shrink-0 items-center justify-center rounded-[var(--radius-md)] ${"bg-[var(--color-panel)] text-[var(--color-ink-2)]"}`}
    >
      <Icon icon={icon ?? LuFileText} className="text-lg" />
    </span>
  );
}

/* ------------------------------------------------------------- attention -- */

export interface GroupCopy {
  title: string;
  action: string;
  tone: "warn" | "bad" | "ink";
}

const TONE_DOT: Record<GroupCopy["tone"], string> = {
  warn: "bg-[var(--color-warn)]",
  bad: "bg-[var(--color-bad-fill)]",
  ink: "bg-[var(--color-ink-3)]",
};

/**
 * A row's action is neutral, always — including the drafts group, which used to
 * take the peach secondary.
 *
 * Peach said "this one matters more", but the row is not what matters: the group
 * is, and the group already says so with its dot, its heading and its place in
 * the order. Five peach pills down a card are five claims of "most important" on
 * one screen, and the screen has exactly one of those — Continue, on the resume
 * line. Same reason the library's row actions are neutral.
 */
function AttentionRow({
  item,
  action,
}: {
  item: AttentionItem;
  action: string;
}): React.ReactElement {
  return (
    // The same row as Team training's: 40px mark, 16px name, one meta line.
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--color-line)] py-3 last:border-b-0">
      <Thumb
        src={item.image?.src}
        icon={item.icon}
        initials={item.initials}
        small
      />
      <div className="min-w-0 flex-1 basis-[var(--field-md)]">
        <p className="font-semibold text-[var(--color-ink)]">{item.title}</p>
        <p className="text-sm leading-meta text-[var(--color-ink-2)]">
          {item.meta.join(" · ")}
        </p>
      </div>
      <Link href={item.href} className="ml-14 sm:ml-0">
        <Button type="button" variant="neutral" size="sm">
          {action}
          <span className="sr-only">: {item.title}</span>
        </Button>
      </Link>
    </li>
  );
}

export function AttentionList({
  heading,
  groups,
  copy,
  empty,
}: {
  heading: string;
  groups: AttentionGroup[];
  copy: Record<AttentionGroup["kind"], GroupCopy>;
  empty: { title: string; body: string };
}): React.ReactElement {
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  return (
    <section
      aria-labelledby="attn-h"
      className="rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-4 py-5 shadow-e1 sm:px-6 sm:py-6"
    >
      <div className="flex items-center gap-3">
        <h2
          id="attn-h"
          className="text-lg font-semibold leading-heading tracking-snug text-[var(--color-ink)]"
        >
          {heading}
        </h2>
        {total > 0 ? <CountBadge tone="warn">{total}</CountBadge> : null}
      </div>

      {groups.length === 0 ? (
        <p className="mt-4 flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-ok-tint)] text-[var(--color-ok)]"
          >
            <LuCheck />
          </span>
          <span>
            <span className="block font-semibold text-[var(--color-ink)]">
              {empty.title}
            </span>
            <span className="block text-[var(--color-ink-2)]">
              {empty.body}
            </span>
          </span>
        </p>
      ) : (
        groups.map((g, i) => {
          const c = copy[g.kind];
          return (
            <div
              key={g.kind}
              className={
                i === 0
                  ? "mt-5"
                  : "mt-2 border-t border-[var(--color-line)] pt-5"
              }
            >
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink-2)]">
                <span
                  aria-hidden="true"
                  className={`size-2 rounded-full ${TONE_DOT[c.tone]}`}
                />
                {c.title}
                <CountBadge
                  tone={
                    c.tone === "bad"
                      ? "bad"
                      : c.tone === "warn"
                        ? "warn"
                        : "info"
                  }
                >
                  {g.items.length}
                </CountBadge>
              </h3>
              <ul className="mt-1">
                {g.items.map((it) => (
                  <AttentionRow key={it.key} item={it} action={c.action} />
                ))}
              </ul>
            </div>
          );
        })
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- recent -- */

/**
 * The library at a glance, with its photographs: the one part of the home that
 * shows the restaurant rather than a to-do list. Last on the page, because
 * nothing in it asks anything of the manager.
 */
export function RecentProcedures({
  locale,
  heading,
  seeAll,
  procedures,
  metaFor,
  statusLabel,
}: {
  locale: string;
  heading: string;
  seeAll: string;
  procedures: Procedure[];
  metaFor: (p: Procedure) => string;
  statusLabel: (p: Procedure) => string;
}): React.ReactElement | null {
  if (procedures.length === 0) return null;
  return (
    <section aria-labelledby="recent-h">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="recent-h"
          className="text-lg font-semibold leading-heading tracking-snug text-[var(--color-ink)]"
        >
          {heading}
        </h2>
        <Link
          href={`/${locale}/admin/library`}
          className="inline-flex min-h-tap-admin shrink-0 items-center gap-1 text-sm font-semibold text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
        >
          {seeAll}
          <LuChevronRight aria-hidden="true" />
        </Link>
      </div>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {procedures.map((p) => {
          const cover = coverOf(p, locale);
          return (
            <li key={p.id}>
              <Link
                href={`/${locale}/procedures/${p.slug}`}
                className="flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-e1"
              >
                <span className="relative flex aspect-video items-center justify-center overflow-hidden bg-[var(--color-panel)]">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    // Fills the card, anchored to the top: these covers carry their
                    // own title across the top, so what gets cropped is the floor,
                    // not the heading.
                    <img
                      src={cover.src}
                      alt=""
                      className="size-full object-cover object-top"
                    />
                  ) : (
                    <Icon
                      icon={
                        p.category ? getCategoryIcon(p.category) : LuFileText
                      }
                      className="text-3xl text-[var(--color-ink-3)]"
                    />
                  )}
                  <StatusPill
                    tone={p.status === "published" ? "ok" : "neutral"}
                    withDot
                    className="absolute left-3 top-3 font-semibold shadow-e1"
                  >
                    {statusLabel(p)}
                  </StatusPill>
                </span>
                <span className="flex flex-1 flex-col p-4">
                  {/* On a card the category stands alone above the title, so it is
                      a badge and wears the badge shape. In a list row it sits in a
                      meta sentence — "Station Procedures · EN/ES · Updated Sep 4" —
                      where a badge would be a box around one word of a line. */}
                  {p.category ? (
                    <StatusPill tone="info" className="self-start gap-2">
                      <Icon
                        icon={getCategoryIcon(p.category)}
                        className="text-base"
                      />
                      {categoryName(p.category, locale)}
                    </StatusPill>
                  ) : null}
                  <span className="mt-3 block text-md font-semibold leading-heading text-[var(--color-ink)]">
                    {titleOf(p, locale)}
                  </span>
                  <span className="mt-auto block pt-2 text-sm text-[var(--color-ink-2)]">
                    {metaFor(p)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
