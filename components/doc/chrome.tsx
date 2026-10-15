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

/* ----------------------------------------------------------------
   Page chrome
   ---------------------------------------------------------------- */

/** Persistent bar: back, where, more. Sticks to the top. */
export function DocBar({
  backHref,
  backLabel,
  title,
  category,
  onBack,
  action,
  children,
  rightSlot,
}: {
  /** When omitted (along with `onBack`), the bar skips its left slot and
   *  starts straight at the title — the caller already renders the back
   *  control in its own chrome (e.g. the procedure page's top bar). */
  backHref?: string;
  backLabel?: string;
  title: string;
  category: string;
  /** When provided, the back control calls this instead of following
   *  `backHref`. Used to wire `router.back()` so deep-linked procedures
   *  (e.g. opened from a category detail page) return to the previous
   *  page rather than a hard-coded landing. */
  onBack?: () => void;
  /** The one thing to do with the page, on the bar's right: printing it for
   *  the station. It replaced a "More options" button that opened nothing. */
  action?: { label: string; icon: IconType; onClick: () => void };
  children?: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  const showBack = Boolean(onBack ?? backHref);
  return (
    <div className="doc-bar" id="bar">
      {showBack && onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel ?? 'Back'}
          className="btn btn-ghost btn-icon btn-lg"
        >
          <LuArrowLeft aria-hidden="true" className="i" />
        </button>
      ) : showBack && backHref ? (
        <a
          className="btn btn-ghost btn-icon btn-lg"
          href={backHref}
          aria-label={backLabel ?? 'Back'}
        >
          <LuArrowLeft aria-hidden="true" className="i" />
        </a>
      ) : null}
      <div className="where">
        <b>{title}</b>
        <span>{category}</span>
      </div>
      {rightSlot}
      {children}
      {action ? (
        <button type="button" className="btn btn-ghost btn-lg" onClick={action.onClick}>
          <action.icon aria-hidden="true" className="i" />
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------------
   Header
   ---------------------------------------------------------------- */

/** 168 px banner above the page, 16:9 cropped. No text on the image. */
export function Cover({ src, alt }: { src?: string; alt?: string }) {
  if (!src) {
    return (
      <div className="cover is-empty">
        <div>
          <LuImage aria-hidden="true" className="i" />
          <div>No cover image</div>
        </div>
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <div className="cover"><img src={src} alt={alt ?? ''} width={1600} height={900} /></div>;
}

/** Page icon (straddles the cover) + crumb + title. */
export function DocHead({
  icon,
  iconImageUrl,
  category,
  title,
  withCover = true,
}: {
  icon?: string;
  iconImageUrl?: string | null;
  category: string;
  title: React.ReactNode;
  withCover?: boolean;
}) {
  const [imgError, setImgError] = React.useState(false);
  const showImg = Boolean(iconImageUrl && !imgError);

  return (
    <header className={icon || showImg ? 'doc-head' : 'doc-head pt-6'}>
      {showImg ? (
        <div className="doc-icon is-img">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={iconImageUrl!} alt="" onError={() => setImgError(true)} />
        </div>
      ) : icon ? (
        <div className="doc-icon">
          <Icon icon={iconByName(icon)} className="i" />
        </div>
      ) : null}
      <div className="doc-crumb" suppressHydrationWarning>{category}</div>
      <h1 className="doc-title display">{title}</h1>
      {!withCover && <div className="qr print-only"><span className="code">QR</span></div>}
    </header>
  );
}

/** Recipes only. Sits above everything — must not be scrolled past. */
export function Allergen({
  summary,
  detail,
  selectedAllergens,
  locale,
}: {
  summary: string;
  detail: React.ReactNode;
  /** Structured FDA Big-9 list — rendered as chips above the summary when
   *  present. `detail`/`summary` stay as supplementary free-form copy. */
  selectedAllergens?: readonly string[];
  locale: 'en' | 'es';
}) {
  return (
    <div className="allergen" role="note">
      <LuCircleAlert aria-hidden="true" className="i i-lg" />
      <div className="allergen-body">
        {selectedAllergens && selectedAllergens.length > 0 && (
          <ul className="allergen-chips" aria-label="Contains allergens">
            {selectedAllergens.map((key) => {
              const entry = ALLERGEN_LABELS[key as AllergenKey];
              return (
                <li key={key} className="allergen-chip">
                  {entry ? entry[locale] : key}
                </li>
              );
            })}
          </ul>
        )}
        {summary ? <b>{summary}</b> : null}
        {detail ? <p>{detail}</p> : null}
      </div>
    </div>
  );
}

/** One sentence: why this document exists. */
export function DocPurpose({ children }: { children: React.ReactNode }) {
  return <p className="doc-purpose">{children}</p>;
}

/* ----------------------------------------------------------------
   Readouts: facts + yield
   ---------------------------------------------------------------- */

export type FactKind = 'default' | 'ok';
export type Fact = {
  /** Icon name, not the component: this crosses the server/client boundary. */
  icon: string;
  label: string;
  value: React.ReactNode;
  kind?: FactKind;
};

/** Where / who / whether current. 2 cols on phone, 4 on >=600px. */
export function Facts({ items }: { items: Fact[] }) {
  return (
    <dl className="facts">
      {items.map((f, i) => (
        <div key={i} className={f.kind === 'ok' ? 'ok' : undefined}>
          <dt>
            <Icon icon={iconByName(f.icon)} className="i i-sm" />
            {f.label}
          </dt>
          <dd>{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export type YieldItem = { label: string; value: React.ReactNode };

/** Same component, larger numbers because one holds figures. Dynamically sizes columns to fill width. */
export function Yield({ items }: { items: YieldItem[] }) {
  const count = Math.max(1, items.length);
  return (
    <dl
      className="yield"
      data-count={count}
      style={{
        gridTemplateColumns:
          count <= 3 ? `repeat(${count}, minmax(0, 1fr))` : undefined,
      }}
    >
      {items.map((y, i) => (
        <div key={i}>
          <dt>{y.label}</dt>
          <dd>{y.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ----------------------------------------------------------------
   Section
   ---------------------------------------------------------------- */

export function Section({
  title,
  count,
  id,
  part,
  className,
  children,
}: {
  /** Omitted for a run of blocks that arrived before the document's first
   *  heading: the section still supplies the page's left margin. */
  title?: string;
  /** Optional count, e.g. "· 11 steps". */
  count?: React.ReactNode;
  /** Optional DOM id (used for in-page anchors like #related). */
  id?: string;
  /** Optional part label, e.g. "PART 1 OF 4". Renders with demo3's .phase-part styling. */
  part?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn('doc-sec', part && 'phase', className)} id={id}>
      {part ? <p className="phase-part">{part}</p> : null}
      {title ? (
        <h2>
          {title}
          {count && <span className="count">{' · '}{count}</span>}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

/* ----------------------------------------------------------------
   Triggers + Equipment + Records (prose blocks)
   ---------------------------------------------------------------- */

export function Triggers({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="triggers">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

export function FixList({
  items,
}: {
  items: { failure: React.ReactNode; response: React.ReactNode }[];
}) {
  return (
    <dl className="fix">
      {items.map((it, i) => (
        <div key={i}>
          <dt>
            <LuCircleAlert aria-hidden="true" className="i" />
            {it.failure}
          </dt>
          <dd>{it.response}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ----------------------------------------------------------------
   Typed step notes
   ---------------------------------------------------------------- */

