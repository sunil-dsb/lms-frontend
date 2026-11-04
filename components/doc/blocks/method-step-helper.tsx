"use client";

import * as React from "react";
import type {
  Localised,
  LocalisedOptional,
  ProcedureBlock,
  ProcedureMethodStep,
  ProcedureNoteKind,
} from "@/lib/types";
import {
  NoteBlock,
  Scaler,
  Section,
  Yield,
  IngredientsTable,
  type Ingredient,
  type MethodStep,
} from "../index";
import { Icon } from "@/components/ui/icon";

export const NOTE_KINDS: ProcedureNoteKind[] = [
  "warn",
  "tip",
  "alt",
  "equip",
  "allergen",
];

export const LABELS = {
  en: {
    yieldTitle: "Yield",
    method: "Method",
    steps: (n: number) => `${n} steps`,
    batch: "Batch",
    attachments: "Attachments",
    notes: {
      warn: "Warning",
      tip: "Tip",
      alt: "Alternative",
      equip: "Equipment",
      allergen: "Allergen",
    },
  },
  es: {
    yieldTitle: "Rendimiento",
    method: "Método",
    steps: (n: number) => `${n} pasos`,
    batch: "Lote",
    attachments: "Archivos adjuntos",
    notes: {
      warn: "Atención",
      tip: "Consejo",
      alt: "Alternativa",
      equip: "Equipo",
      allergen: "Alérgeno",
    },
  },
} as const;

export function pickText(value: Localised, locale: "en" | "es"): string {
  return value[locale];
}

export function pickOpt(
  value: LocalisedOptional | undefined,
  locale: "en" | "es",
): string | undefined {
  if (!value) return undefined;
  const v = value[locale];
  return v && v.length > 0 ? v : undefined;
}

export function toMethodStep(
  step: ProcedureMethodStep,
  locale: "en" | "es",
  noteLabels: Record<ProcedureNoteKind, string>,
): MethodStep {
  const noteNode = step.note
    ? (() => {
        const kind: ProcedureNoteKind = NOTE_KINDS.includes(
          step.note.severity as ProcedureNoteKind,
        )
          ? (step.note.severity as ProcedureNoteKind)
          : "warn";
        return (
          <NoteBlock key="note" kind={kind} label={noteLabels[kind]}>
            {pickText(step.note.body, locale)}
          </NoteBlock>
        );
      })()
    : null;

  const extras: React.ReactNode[] = [];
  if (step.timer) {
    extras.push(
      <span key="timer" className="step-time" data-kind="timer">
        <Icon icon="ri-time-line" className="i i-sm" aria-hidden="true" />
        {step.timer.label} ·{" "}
        {step.timer.seconds < 60
          ? `${step.timer.seconds} s`
          : `${Math.round(step.timer.seconds / 60)} min`}
      </span>,
    );
  }
  if (step.discardAt) {
    const hours = step.discardAtHours ?? 48;
    extras.push(
      <span key="discard" className="step-time" data-kind="discard">
        <Icon
          icon="ri-price-tag-3-line"
          className="i i-sm"
          aria-hidden="true"
        />
        {locale === "es"
          ? `Desechar a las ${hours} h`
          : `Discard after ${hours} h`}
      </span>,
    );
  }
  const extrasNode = extras.length ? (
    <div key="extras" className="step-extras">
      {extras}
    </div>
  ) : null;

  const extraNodes: React.ReactNode[] = [];
  if (noteNode) extraNodes.push(noteNode);

  const out: MethodStep = {
    body: (
      <>
        {pickText(step.body, locale)}
        {extrasNode}
      </>
    ),
    critical: step.critical,
    extra: extraNodes.length > 0 ? <>{extraNodes}</> : undefined,
  };

  if (step.videoSegment) {
    out.clip = step.videoSegment;
  }

  const shots: Array<{
    src: string;
    alt: string;
    caption?: string;
    compare?: "ok" | "no";
  }> = [];
  if (step.images) {
    for (const [idx, img] of step.images.entries()) {
      if (!img.src) continue;
      const compare =
        step.compareImages && step.images.length >= 2 && idx < 2
          ? idx === 0
            ? "ok"
            : "no"
          : undefined;
      const altText = pickText(img.alt ?? { en: "", es: "" }, locale) || "";
      shots.push({
        src: img.src,
        alt: altText,
        caption: altText || undefined,
        compare,
      });
    }
  }
  if (step.imageSrc) {
    const altText = pickText(step.imageAlt ?? { en: "", es: "" }, locale) || "";
    shots.push({
      src: step.imageSrc,
      alt: altText,
      caption: step.videoCaption || altText || undefined,
    });
  }
  if (shots.length > 0) {
    out.shots = shots;
  }
  if (step.videoSegment?.src || step.videoSrc) {
    out.video = {
      src: step.videoSegment?.src ?? step.videoSrc!,
      caption: step.videoCaption,
    };
  }

  // Populate mediaThumb with badge if video clip or images exist
  if (step.compareImages && step.images && step.images.length >= 2) {
    out.mediaThumb = {
      src: step.images[0].src,
      alt: pickText(step.images[0].alt ?? { en: "", es: "" }, locale) || "",
      compare: "ok",
      pairSrc: step.images[1].src,
      images: step.images.slice(0, 4).map((img) => ({
        src: img.src,
        alt: pickText(img.alt ?? { en: "", es: "" }, locale) || "",
      })),
    };
  } else if (step.videoSegment) {
    const dur = Math.max(
      0,
      step.videoSegment.endSec - step.videoSegment.startSec,
    );
    const s = Math.max(0, Math.floor(dur));
    const m = Math.floor(s / 60);
    const r = s % 60;
    const badge = dur > 0 ? `${m}:${String(r).padStart(2, "0")}` : undefined;
    const thumbSrc =
      step.images?.[0]?.src || step.imageSrc || step.videoSegment.src;
    out.mediaThumb = {
      src: thumbSrc,
      alt: pickText(step.images?.[0]?.alt ?? { en: "", es: "" }, locale) || "",
      badge,
    };
  } else if (step.images && step.images.length > 1) {
    out.mediaThumb = {
      src: step.images[0].src,
      alt: pickText(step.images[0].alt ?? { en: "", es: "" }, locale) || "",
      images: step.images.slice(0, 4).map((img) => ({
        src: img.src,
        alt: pickText(img.alt ?? { en: "", es: "" }, locale) || "",
      })),
    };
  } else if (step.images?.[0]?.src) {
    out.mediaThumb = {
      src: step.images[0].src,
      alt: pickText(step.images[0].alt ?? { en: "", es: "" }, locale) || "",
    };
  } else if (step.imageSrc) {
    out.mediaThumb = {
      src: step.imageSrc,
      alt: pickText(step.imageAlt ?? { en: "", es: "" }, locale) || "",
    };
  }

  // If mediaThumb was populated, clear inline shots so we render as right-side thumbnail (matching demo3)
  if (out.mediaThumb) {
    out.shots = undefined;
  }

  return out;
}

export function findAllergen(blocks: ProcedureBlock[]): {
  id: string;
  allergen: {
    summary: string;
    detail: string;
    selectedAllergens?: readonly string[];
  };
} | null {
  for (const [i, b] of blocks.entries()) {
    if ((b.kind === "recipe" || b.kind === "ingredients") && b.allergen)
      return { id: b.id ?? String(i), allergen: b.allergen };
  }
  return null;
}

export function IngredientsSection({
  factors,
  yieldItems,
  ingredients,
  batchLabel,
  yieldTitle,
}: {
  factors: number[];
  yieldItems: {
    label: string;
    value: string;
    unit?: string;
    scales?: boolean;
  }[];
  ingredients: Ingredient[];
  batchLabel: string;
  yieldTitle: string;
}): React.ReactElement {
  const [factor, setFactor] = React.useState(factors[0] ?? 1);
  const base = factors[0] ?? 1;

  const scaled = React.useMemo(
    () =>
      yieldItems
        .filter((y) => (y.value ?? "").trim() !== "")
        .map((y) => {
          if (!y.scales) return y;
          const n = parseFloat(y.value.replace(",", "."));
          if (!Number.isFinite(n)) return y;
          const value = String(Math.round(((n * factor) / base) * 100) / 100);
          return { ...y, value };
        }),
    [yieldItems, factor, base],
  );

  const showTable = ingredients.length > 0 && factors.length > 0;
  const hasYield = scaled.length > 0 || factors.length > 0 || showTable;

  if (!hasYield) return <></>;

  return (
    <Section title={yieldTitle}>
      {factors.length > 1 ? (
        <Scaler
          factors={factors}
          selected={factor}
          onSelect={setFactor}
          label={batchLabel}
        />
      ) : null}
      {scaled.length > 0 ? (
        <Yield
          items={scaled.map((y) => ({
            label: y.label,
            value: y.unit ? `${y.value} ${y.unit}` : y.value,
          }))}
        />
      ) : null}
      {showTable ? (
        <IngredientsTable
          ingredients={ingredients}
          factors={factors}
          selectedFactor={factor}
        />
      ) : null}
    </Section>
  );
}
