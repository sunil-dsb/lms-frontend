'use client';

import * as React from 'react';
import { ALLERGEN_LABELS, type AllergenKey } from '@/lib/allergens';
import { LuArrowLeft, LuArrowLeftRight, LuBadgeCheck, LuCheck, LuChevronDown, LuChevronRight, LuCircleAlert, LuDownload, LuFocus, LuImage, LuLightbulb, LuLock, LuPlay, LuTestTube, LuTriangleAlert, LuUtensils, LuWrench, LuX } from 'react-icons/lu';
import { Icon, iconByName } from '@/components/ui/icon';
import { classifyVideoUrl } from '@/lib/procedure-media';
import type { IconType } from 'react-icons';

/**
 * The vocabulary of an SOP / recipe / training chapter page.
 *
 * Every component in this file maps 1:1 to a CSS class in /lms.css and a
 * pattern in /design-system.html. The lms.css class names are used directly
 * (via `clsx`-style merging) so that a static HTML SOP and a React SOP render
 * to the same pixels.
 *
 * Authoritative reference: /DESIGN.md at the repo root.
 */

const cn = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ');
export type ChapterRow = {
  icon: IconType;        // remix icon class
  title: string;
  meta?: React.ReactNode;
  href: string;
  /** "download" for attachments, "chevron" for related procedures. */
  kind: 'attachment' | 'related';
};

export function Chapters({ rows }: { rows: ChapterRow[] }) {
  return (
    <div className="chapters">
      {rows.map((r, i) => (
        <a key={i} className="chapter" href={r.href}>
          <span className="idx">
            <Icon icon={r.icon} className="i i-sm" />
          </span>
          <div>
            <div className="title">{r.title}</div>
            {r.meta && <div className="meta">{r.meta}</div>}
          </div>
          <span className="tail">
            <Icon icon={r.kind === 'attachment' ? LuDownload : LuChevronRight} className="i" />
          </span>
        </a>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------
   Foot of every document
   ---------------------------------------------------------------- */

/** The Print with QR code action was removed: stations print from the wall
 *  display, not from a procedure-detail page, and the footer now carries
 *  a single low-prominence "Report a problem" surface. The neutral panel
 *  background (rather than ghost) gives it just enough weight to be a
 *  recognised target on employee phones without competing with the
 *  surrounding doc chrome. */
export type DocControlEntry = { label: string; value: React.ReactNode };

/** Document control <details>. Ships open by default — survives without JS. */
export function DocControl({ entries, defaultOpen = true }: { entries: DocControlEntry[]; defaultOpen?: boolean }) {
  return (
    <details className="doc-ctl" open={defaultOpen}>
      <summary>
        Document control <LuChevronDown aria-hidden="true" className="i" />
      </summary>
      <dl>
        {entries.map((e, i) => (
          <React.Fragment key={i}>
            <dt>{e.label}</dt>
            <dd suppressHydrationWarning>{e.value}</dd>
          </React.Fragment>
        ))}
      </dl>
    </details>
  );
}

/* ----------------------------------------------------------------
   Status badges
   ---------------------------------------------------------------- */

const PILL_META = {
  complete:  { icon: LuCheck, useDot: false },
  verified:  { icon: LuBadgeCheck, useDot: false },
  progress:  { icon: null, useDot: true },
  due:       { icon: null, useDot: true },
  overdue:   { icon: null, useDot: true },
  notstart:  { icon: null, useDot: true },
  locked:    { icon: LuLock, useDot: false },
} as const;

export type PillKind = keyof typeof PILL_META;

export function Pill({ kind, children }: { kind: PillKind; children: React.ReactNode }) {
  const meta = PILL_META[kind];
  return (
    <span className={cn('pill', `pill-${kind}`)}>
      {meta.useDot ? (
        <i className="dot" aria-hidden="true" />
      ) : (
        <Icon icon={meta.icon!} className="i i-sm" />
      )}
      {children}
    </span>
  );
}
