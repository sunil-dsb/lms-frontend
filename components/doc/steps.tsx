"use client";

import * as React from "react";
import { ALLERGEN_LABELS, type AllergenKey } from "@/lib/allergens";
import {
  LuArrowLeft,
  LuArrowLeftRight,
  LuBadgeCheck,
  LuCheck,
  LuChevronDown,
  LuChevronRight,
  LuCircleAlert,
  LuDownload,
  LuFocus,
  LuImage,
  LuLightbulb,
  LuLock,
  LuPlay,
  LuTestTube,
  LuTriangleAlert,
  LuUtensils,
  LuWrench,
  LuX,
} from "react-icons/lu";
import { Icon, iconByName } from "@/components/ui/icon";
import { classifyVideoUrl } from "@/lib/procedure-media";
import type { IconType } from "react-icons";
import { Shot } from "./recipe";

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
  parts.filter(Boolean).join(" ");
export type NoteKind = "warn" | "tip" | "alt" | "equip" | "allergen";

const NOTE_META: Record<NoteKind, { icon: IconType; label: string }> = {
  warn: { icon: LuTriangleAlert, label: "Warning" },
  tip: { icon: LuLightbulb, label: "Tip" },
  alt: { icon: LuArrowLeftRight, label: "Alternative" },
  equip: { icon: LuWrench, label: "Equipment" },
  allergen: { icon: LuCircleAlert, label: "Allergen" },
};

export function NoteBlock({
  kind,
  children,
  label,
}: {
  kind: NoteKind;
  children: React.ReactNode;
  /** Optional override of the kind's default label. */
  label?: string;
}) {
  // A kind this build does not know about is still a note with something to say.
  const meta = NOTE_META[kind] ?? NOTE_META.warn;
  return (
    <div className={cn("note-block", `n-${kind}`)}>
      <span className="ico">
        <Icon icon={meta.icon} className="i" />
      </span>
      <div>
        <span className="label">{label ?? meta.label}</span>
        <p>{children}</p>
      </div>
    </div>
  );
}

export type MethodStep = {
  /** Body — the instruction itself. May include a `.shot` or a `.note-block`. */
  body: React.ReactNode;
  /** Critical control point. Marks the disc red and adds the badge. */
  critical?: boolean;
  /** Watch timestamp chip, e.g. "0:12". */
  watchAt?: string;
  /** Pinned video clip with start/end timestamps. Renders as a watch chip
   *  linking to the source in a new tab. */
  clip?: { src: string; startSec: number; endSec: number };
  /** Photos attached to this step (a picture of what the grill marks should
   *  look like, etc). Anchored here, not as top-level image blocks, because
   *  the step is the only place they make sense. Multiple photos per step
   *  are common — "before / after" plating, "wrong cut / right cut". A
   *  `compare: 'ok' | 'no'` paints a green/red bottom border so the pair
   *  reads as a "right vs wrong" comparison (mirrors demo3's cook-mode
   *  compare panel). */
  shots?: Array<{
    src: string;
    alt: string;
    caption?: string;
    compare?: "ok" | "no";
  }>;
  /** Video attached to this step. Same idea as `shots` — direct on the step
   *  rather than floating in the procedure. */
  video?: { src: string; caption?: string };
  /** Right-side thumbnail for the step. When set, the row gets demo3's
   *  "step-thumb" treatment: the photo sits at the right margin of the
   *  row, the body wraps around it, and clicking the thumb fires
   *  `onThumbOpen` (so recipe blocks can use it as the cook-mode entry
   *  for that step). Method blocks leave this unset and render full-width
   *  shots inside the body. The presence of a thumb also marks the row
   *  with `has-media`, matching demo3's spacing. */
  mediaThumb?: {
    src: string;
    alt: string;
    /** "compare" pairs two thumbs in an `is-pair` block with green/red
     *  bottom borders. */
    compare?: "ok" | "no";
    /** A second photo for the compare pair. Only used when `compare` is
     *  "ok" (the "no" half is the second photo). */
    pairSrc?: string;
    /** Multiple photos rendered as a mini grid inside the thumb (up to 4). */
    images?: Array<{ src: string; alt: string }>;
    /** Optional duration badge, e.g. "0:08" for video clips. */
    badge?: string;
  };
  /** Additional full-width callouts attached to the step (warning note, critical limit card). */
  extra?: React.ReactNode;
  /** Label for the side-thumb's `aria-label`. Falls back to the step body. */
  thumbLabel?: string;
  /** Fired when the cook taps the side-thumb. Recipe blocks wire this to
   *  the cook-mode launcher so the modal opens at the tapped step. */
  onThumbOpen?: () => void;
};

export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function MethodSteps({
  steps,
  nowIndex,
  done = [],
  onToggleStep,
  startIndex = 1,
}: {
  steps: MethodStep[];
  nowIndex?: number;
  done?: boolean[];
  onToggleStep?: (index: number) => void;
  startIndex?: number;
}) {
  return (
    <ol
      className="steps compact"
      start={startIndex}
      style={
        startIndex > 1 ? { counterReset: `step ${startIndex - 1}` } : undefined
      }
    >
      {steps.map((s, i) => {
        const actualNum = startIndex + i;
        const isDone = Boolean(done[i]);
        // When a side thumbnail (single, compare pair, or grid) is provided, render as side media layout
        const showSideThumb = Boolean(s.mediaThumb);
        const classes = cn(
          "step",
          s.critical && "is-crit",
          isDone && "is-done",
          nowIndex === i && "is-now",
          showSideThumb && "has-media",
        );
        return (
          <li key={i} id={`step-${actualNum}`} className={classes || undefined}>
            {onToggleStep ? (
              <button
                type="button"
                className="step-num step-check"
                aria-pressed={isDone}
                aria-label={`Step ${actualNum}${s.critical ? ", critical" : ""}: ${isDone ? "done, tap to undo" : "mark done"}`}
                onClick={() => onToggleStep(i)}
              />
            ) : (
              <div className="step-num" />
            )}
            <div className="step-body">
              {s.critical && (
                <span className="step-flag">
                  <LuFocus aria-hidden="true" className="i i-sm" /> Critical
                  step
                </span>
              )}
              {/* A caller can hand over either a plain sentence or its own markup. */}
              {typeof s.body === "string" ? (
                <p className="step-line">{s.body}</p>
              ) : (
                <div className="step-line">{s.body}</div>
              )}
              {!showSideThumb && s.watchAt && (
                <button
                  type="button"
                  className="step-time"
                  onClick={s.onThumbOpen}
                >
                  <LuPlay aria-hidden="true" className="i i-sm" />
                  <span>{s.watchAt}</span>
                </button>
              )}
              {!showSideThumb && s.clip && (
                <a
                  className="step-time"
                  href={s.clip.src}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={
                    s.onThumbOpen
                      ? (e) => {
                          e.preventDefault();
                          s.onThumbOpen?.();
                        }
                      : undefined
                  }
                >
                  <LuPlay aria-hidden="true" className="i i-sm" />
                  <span>
                    {fmtClock(s.clip.startSec)}–{fmtClock(s.clip.endSec)}
                  </span>
                </a>
              )}
              {/* Photographs: when multiple photos are attached and not rendered as side thumb */}
              {!showSideThumb && s.shots && s.shots.length > 1 ? (
                <div
                  className={cn(
                    "grid gap-3 mt-3 items-stretch",
                    s.shots.length === 2
                      ? "grid-cols-2 max-w-2xl"
                      : s.shots.length === 3
                        ? "grid-cols-2 sm:grid-cols-3 max-w-3xl"
                        : "grid-cols-2 sm:grid-cols-4 max-w-4xl",
                  )}
                >
                  {s.shots.slice(0, 4).map((sh, j) => (
                    <Shot
                      key={`shot-${j}`}
                      src={sh.src}
                      alt={sh.alt}
                      caption={sh.caption}
                      compare={sh.compare}
                      aspectRatio="aspect-[4/3]"
                      className="h-full"
                    />
                  ))}
                </div>
              ) : !showSideThumb && s.shots && s.shots.length === 1 ? (
                <div className="mt-3 max-w-xl">
                  <Shot
                    src={s.shots[0].src}
                    alt={s.shots[0].alt}
                    caption={s.shots[0].caption}
                    compare={s.shots[0].compare}
                  />
                </div>
              ) : null}

              {/* In-step Video: always visible when present */}
              {s.video && (
                <div className="mt-3 max-w-xl">
                  <StepVideo src={s.video.src} caption={s.video.caption} />
                </div>
              )}
            </div>
            {/* Right-side thumb: rendered only when no inline body photos */}
            {showSideThumb && s.mediaThumb ? (
              s.mediaThumb.compare === "ok" && s.mediaThumb.pairSrc ? (
                <button
                  type="button"
                  className="step-thumb is-pair"
                  aria-label={s.thumbLabel ?? "Open this step in cook mode"}
                  onClick={s.onThumbOpen}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.mediaThumb.src} alt="" className="ok" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.mediaThumb.pairSrc} alt="" className="no" />
                </button>
              ) : s.mediaThumb.images && s.mediaThumb.images.length > 1 ? (
                <button
                  type="button"
                  className={cn(
                    "step-thumb is-grid",
                    s.mediaThumb.images.length === 2 && "is-grid-2",
                    s.mediaThumb.images.length === 3 && "is-grid-3",
                    s.mediaThumb.images.length >= 4 && "is-grid-4",
                  )}
                  aria-label={s.thumbLabel ?? "Open this step in cook mode"}
                  onClick={s.onThumbOpen}
                >
                  {s.mediaThumb.images.slice(0, 4).map((img, idx) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={idx} src={img.src} alt={img.alt || ""} />
                  ))}
                  {s.mediaThumb.badge ? (
                    <span className="badge">
                      <LuPlay aria-hidden="true" className="i i-sm" />
                      {s.mediaThumb.badge}
                    </span>
                  ) : null}
                </button>
              ) : (
                <button
                  type="button"
                  className="step-thumb"
                  aria-label={s.thumbLabel ?? "Open this step in cook mode"}
                  onClick={s.onThumbOpen}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.mediaThumb.src} alt={s.mediaThumb.alt} />
                  {s.mediaThumb.badge ? (
                    <span className="badge">
                      <LuPlay aria-hidden="true" className="i i-sm" />
                      {s.mediaThumb.badge}
                    </span>
                  ) : null}
                </button>
              )
            ) : null}
            {s.extra ? <div className="step-extra">{s.extra}</div> : null}
          </li>
        );
      })}
    </ol>
  );
}

/** In-step video. Reuses the same upload/embed detection as the top-level
 *  video block; keeps the same `.shot` chrome so the document looks like one
 *  thing, not two. Local to this module — no caller outside the doc needs it. */
function StepVideo({ src, caption }: { src: string; caption?: string }) {
  const videoClass = classifyVideoUrl(src);
  return (
    <figure className="shot">
      {videoClass.provider === "file" ? (
        <video controls src={src} />
      ) : videoClass.embedUrl ? (
        <iframe
          src={videoClass.embedUrl}
          title={caption ?? "video"}
          className="aspect-video w-full rounded-[var(--radius-md)]"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="no-referrer"
        />
      ) : null}
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

export type PrepStep = { id: string; label: React.ReactNode; done?: boolean };

export function PrepSteps({ steps }: { steps: PrepStep[] }) {
  return (
    <ul className="steps prep">
      {steps.map((s) => (
        <li key={s.id} className="step">
          <input
            type="checkbox"
            className="tick"
            id={s.id}
            defaultChecked={s.done}
          />
          <div className="step-body">
            <label htmlFor={s.id}>{s.label}</label>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CriticalLimit({
  icon,
  label = "Critical limit",
  value,
  subtitle,
  howToCheck,
  breach,
}: {
  icon?: string;
  label?: string;
  /** The number, in ink. e.g. "200 ppm, for at least 30 seconds" */
  value: React.ReactNode;
  /** The sentence below it. e.g. "Confirm against the bottle label" */
  subtitle?: React.ReactNode;
  /** "Dip a test strip…", "Probe the centre…" */
  howToCheck: React.ReactNode;
  /** "If it reads below 200 ppm", "If it is above 4 °C" */
  breach: React.ReactNode;
}) {
  return (
    <div className="crit">
      <h3 className="crit-h">
        <Icon icon={iconByName(icon)} className="i i-sm" /> {label}
      </h3>
      <div className="crit-b">
        <p className="crit-num">{value}</p>
        {subtitle && <p className="crit-sub">{subtitle}</p>}
        <dl className="crit-parts">
          <div className="crit-part">
            <dt className="crit-lbl">How to check</dt>
            <dd>{howToCheck}</dd>
          </div>
          <div className="crit-part breach">
            <dt className="crit-lbl">
              <LuCircleAlert aria-hidden="true" className="i i-sm" />
              {breach}
            </dt>
            <dd>
              {/* content is rendered by parent via a custom breach block */}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

/** CriticalLimit with full breach body. */
export function CriticalLimitFull({
  icon,
  label,
  value,
  subtitle,
  howToCheck,
  breachLabel,
  breachResponse,
}: {
  icon?: string;
  label?: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  howToCheck: React.ReactNode;
  breachLabel: React.ReactNode;
  breachResponse: React.ReactNode;
}) {
  return (
    <div className="crit">
      <h3 className="crit-h">
        <Icon icon={iconByName(icon)} className="i i-sm" />{" "}
        {label ?? "Critical limit"}
      </h3>
      <div className="crit-b">
        <p className="crit-num">{value}</p>
        {subtitle && <p className="crit-sub">{subtitle}</p>}
        <dl className="crit-parts">
          <div className="crit-part">
            <dt className="crit-lbl">How to check</dt>
            <dd>{howToCheck}</dd>
          </div>
          <div className="crit-part breach">
            <dt className="crit-lbl">
              <LuCircleAlert aria-hidden="true" className="i i-sm" />
              {breachLabel}
            </dt>
            <dd>{breachResponse}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
