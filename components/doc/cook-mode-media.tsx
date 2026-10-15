'use client';

import * as React from 'react';
import { RiCheckLine, RiCloseLine, RiErrorWarningFill, RiPlayFill, RiTempColdLine } from 'react-icons/ri';
import type { ProcedureMethodStep } from '@/lib/types';
import { scaleAmount } from './index';
import { cn } from '@/lib/utils';
import type { CookModeIngredient } from './cook-mode';

export function amountFor(ing: CookModeIngredient, factorIdx: number, factors?: number[]): string {
  const explicit = ing.amounts[factorIdx];
  if (explicit && explicit.trim() !== '') return explicit;
  const base = ing.amounts[0] ?? '';
  if (factors && factors.length > factorIdx && factorIdx >= 0) {
    const baseFactor = factors[0] || 1;
    const currentFactor = factors[factorIdx] || 1;
    return scaleAmount(base, currentFactor / baseFactor);
  }
  return base;
}

/** Per-step media used by the modal. We re-shape ProcedureMethodStep's
 *  images / video / videoSegment / compareImages into one discriminated union
 *  so the cook-mode screens stay declarative. */
export type StepMedia =
  | { kind: 'photo'; src: string; alt: string; caption?: string }
  | { kind: 'compare'; ok: { src: string; alt: string }; no: { src: string; alt: string } }
  | { kind: 'gallery'; photos: Array<{ src: string; alt: string; caption?: string }> }
  | { kind: 'clip'; src: string; startSec: number; endSec: number; poster?: string; alt?: string };

export function mediaFor(step: ProcedureMethodStep, locale: 'en' | 'es'): StepMedia | null {
  const altOf = (a: { en: string; es: string } | undefined): string => (a ? a[locale] : '');
  const captionOf = (c: { en: string; es: string } | undefined): string | undefined =>
    c ? c[locale] || c.en || c.es || undefined : undefined;
  // compareImages pairs images[0] (ok) and images[1] (no).
  if (step.compareImages && step.images && step.images.length >= 2) {
    return {
      kind: 'compare',
      ok: { src: step.images[0]!.src, alt: altOf(step.images[0]!.alt) },
      no: { src: step.images[1]!.src, alt: altOf(step.images[1]!.alt) },
    };
  }
  if (step.videoSegment) {
    const poster =
      step.images?.[0]?.src ||
      step.imageSrc ||
      step.videoSegment.src;
    return {
      kind: 'clip',
      src: step.videoSegment.src,
      startSec: step.videoSegment.startSec,
      endSec: step.videoSegment.endSec,
      poster,
      alt: altOf(step.images?.[0]?.alt) || altOf(step.imageAlt) || '',
    };
  }
  // Multiple images with no compare flag -> gallery grid (up to 4 images)
  if (step.images && step.images.length > 1) {
    return {
      kind: 'gallery',
      photos: step.images.slice(0, 4).map((img) => ({
        src: img.src,
        alt: altOf(img.alt),
        caption: captionOf(img.caption),
      })),
    };
  }
  if (step.images && step.images.length === 1) {
    const first = step.images[0]!;
    return {
      kind: 'photo',
      src: first.src,
      alt: altOf(first.alt),
      caption: captionOf(first.caption),
    };
  }
  if (step.imageSrc) {
    return {
      kind: 'photo',
      src: step.imageSrc,
      alt: altOf(step.imageAlt),
      caption: step.videoCaption,
    };
  }
  if (step.videoSrc) {
    return { kind: 'photo', src: step.videoSrc, alt: step.videoCaption ?? '' };
  }
  return null;
}

export function BigMedia({ media }: { media: StepMedia }): React.ReactElement {
  if (media.kind === 'compare') {
    return (
      <div className="cook-media cook-pair">
        {(['ok', 'no'] as const).map((k) => (
          <figure key={k} className={k}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={media[k].src} alt={media[k].alt} width={800} height={600} />
            <figcaption>
              {k === 'ok' ? <RiCheckLine className="i i-sm" aria-hidden="true" /> : <RiCloseLine className="i i-sm" aria-hidden="true" />}
              {k === 'ok' ? 'Correct' : 'Wrong'}
            </figcaption>
          </figure>
        ))}
      </div>
    );
  }
  if (media.kind === 'gallery') {
    const count = Math.min(4, media.photos.length);
    return (
      <div className={cn('cook-media cook-gallery', `cook-gallery-${count}`)}>
        {media.photos.slice(0, 4).map((p, idx) => (
          <figure key={idx} className="cook-gallery-item">
            <div className="cook-gallery-frame">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={p.alt} width={800} height={600} />
            </div>
            {p.caption ? <figcaption>{p.caption}</figcaption> : null}
          </figure>
        ))}
      </div>
    );
  }
  if (media.kind === 'clip') {
    const dur = `${Math.max(1, Math.round(media.endSec - media.startSec))} s`;
    const posterSrc = media.poster || media.src;
    return (
      <figure className="cook-media">
        <div className="frame">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={posterSrc} alt={media.alt ?? ''} width={1200} height={900} />
          <button className="play" type="button" aria-label={`Play this step's clip, ${dur}`}>
            <RiPlayFill className="i i-lg" aria-hidden="true" />
          </button>
          <span className="dur">{dur}</span>
        </div>
      </figure>
    );
  }
  return (
    <figure className="cook-media">
      <div className="frame">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={media.src} alt={media.alt} width={1200} height={900} />
      </div>
      {media.caption ? <figcaption>{media.caption}</figcaption> : null}
    </figure>
  );
}

/** Critical-limit block shown on any step whose ProcedureMethodStep carries
 *  `critical: true`. Demo3 hard-codes "4 °C or below"; production reads the
 *  criticalLimit field when the author provided one. */
export function CritLimitBlock({ value }: { value?: { value: string; subtitle?: string; howToCheck?: string; breachResponse?: string } }): React.ReactElement {
  return (
    <div className="crit">
      <h3 className="crit-h">
        <RiTempColdLine className="i i-sm" aria-hidden="true" />
        Critical limit
      </h3>
      <div className="crit-b">
        <p className="crit-num">{value?.value ?? '4 °C or below'}</p>
        {value?.subtitle ? <p className="crit-sub">{value.subtitle}</p> : null}
        {(value?.howToCheck || value?.breachResponse) ? (
          <dl className="crit-parts">
            {value?.howToCheck ? (
              <div className="crit-part">
                <dt className="crit-lbl">How to check</dt>
                <dd>{value.howToCheck}</dd>
              </div>
            ) : null}
            {value?.breachResponse ? (
              <div className="crit-part breach">
                <dt className="crit-lbl">
                  <RiErrorWarningFill className="i i-sm" aria-hidden="true" />
                  If the limit is breached
                </dt>
                <dd>{value.breachResponse}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </div>
    </div>
  );
}

