"use client";

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type {
  CookModeIngredient,
  CookModeLabels,
} from "@/components/doc/cook-mode";
import type { ProcedureMethodStep } from "@/lib/types";
import {
  FACTORS,
  IMG,
  INGREDIENTS,
  STEPS,
  phaseOf,
  scale,
  type Media,
  type Qty,
  type RecipeStep,
} from "./recipe-data";
function renderText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  // renderToStaticMarkup → strip tags → unescape the entities it produces.
  // The cook-mode renders `step.body[locale]` as a React text child, so any
  // HTML in the string would show up as literal angle-brackets.
  return renderToStaticMarkup(<>{node}</>)
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

export function mediaWord(m: Media): string {
  if (m.kind === "compare") return "compare";
  if (m.kind === "clip") return "clip";
  return "photo";
}

function adaptStep(s: RecipeStep, q: Qty): ProcedureMethodStep {
  const en = renderText(s.text(q));
  // The cook-mode eyebrow renders `{n} {phase}` so the cook can tell which
  // section of the recipe they're in (e.g. "18 · MAKE"). The document view
  // can also surface the phase as a sub-heading later.
  const phaseName = phaseOf(s.n).name;
  const base: ProcedureMethodStep = {
    // Demo3 is English-only; mirror the English into `es` so the Localised
    // type stays satisfied. The cook-mode modal reads whichever locale the
    // page is set to.
    body: { en, es: en },
    critical: s.crit,
    timer: s.timer,
    discardAt: s.discardAt,
    discardAtHours: s.discardAt ? 48 : undefined,
    phase: { en: phaseName, es: phaseName },
  };
  if (s.warn) {
    const w = renderText(s.warn.body);
    base.note = {
      severity: s.warn.kind,
      body: { en: w, es: w },
    };
  }
  if (s.media) {
    if (s.media.kind === "compare") {
      base.images = [
        {
          src: `${IMG}/${s.media.ok.src}`,
          alt: { en: s.media.ok.alt, es: s.media.ok.alt },
        },
        {
          src: `${IMG}/${s.media.no.src}`,
          alt: { en: s.media.no.alt, es: s.media.no.alt },
        },
      ];
      base.compareImages = true;
    } else {
      // photo + clip both surface as a lead image; the cook-mode modal has no
      // clip source for demo3 (we'd need a real video file), so the lead image
      // doubles as the cook-mode poster.
      base.images = [
        {
          src: `${IMG}/${s.media.src}`,
          alt: { en: s.media.alt, es: s.media.alt },
          caption:
            s.media.kind === "photo" && s.media.caption
              ? { en: s.media.caption, es: s.media.caption }
              : undefined,
        },
      ];
    }
  }
  return base;
}

export function adaptSteps(): ProcedureMethodStep[] {
  // The q helper here is only used by `text(q)`; demo3's text embeds ingredient
  // amounts scaled to the *current* factor, but the cook-mode modal renders
  // amounts on its own weigh-out screen, so a fixed-scale render is fine.
  const q: Qty = (k) => (
    <b className="qty">
      {scale(INGREDIENTS.find((i) => i.key === k)!.base, 1)}
    </b>
  );
  return STEPS.map((s) => adaptStep(s, q));
}

export function adaptIngredients(): CookModeIngredient[] {
  return INGREDIENTS.map((i) => ({
    name: i.name,
    amounts: FACTORS.map((f) => scale(i.base, f)),
    allergen: i.allergen,
  }));
}

export const COOK_LABELS: CookModeLabels = {
  introSub: (n) =>
    `${n} steps. Tap "Done, next" as you finish each one, or swipe to look ahead.`,
  weighOut: "Weigh out",
  critical: "Critical step",
  upNext: (n) => `Coming up · step ${n}`,
  discard: (when) => `Labelled now, discard at ${when}`,
  phaseFallback: "Method",
  allergen: "Allergen",
  wakeHint: "Your screen stays on while this is open.",
  startBtn: (n) => (n > 0 ? `Continue at step ${n}` : "Start cooking"),
  done: {
    normal: "Done, next",
    critical: "Done: 4 °C or below",
    final: "Done, finish",
    next: "Next",
  },
  backToRecipe: "Back to the recipe",
  summaryHead: (done, total) => `${done} of ${total} steps done`,
  summaryLeftSub: "Not ticked yet. Tap one to go back to it:",
  summaryAllDoneSub: "All steps ticked. Probe the dish before service.",
  listBack: (where) => `Back to ${where}`,
  where: (v) => (typeof v === "string" ? v : `Step ${v.n} of ${v.total}`),
  modalAria: "Cook mode",
  closeAria: "Close cook mode",
  listToggle: {
    label: (open) => (open ? "Close the list of steps" : "All steps"),
    ariaAll: "All steps",
  },
  listNavAria: "All steps",
  stepTick: ({ n, done }) =>
    `Step ${n}: ${done ? "done, tap to undo" : "mark done"}`,
};

/* ── inline replacements for the deleted demo3/parts.tsx ──────────────────
 * The original `<Thumb>`, `<Warn>`, and `<CritLimit>` lived in `./parts` and
 * relied on demo3-specific styles. The CSS already lives in the canonical
 * lms.css (`.step-thumb`, `.note-block`, `.crit`), so we just inline the
 * markup here.
 */
