"use client";

import * as React from "react";
import type { Localised, ProcedureBlock } from "@/lib/types";
import { BlockRenderer, findAllergen } from "@/components/doc/block-renderer";
import {
  CookMode,
  type CookModeLabels,
  type CookModeRecipe,
} from "./cook-mode";
import {
  Allergen,
  NoteBlock,
  CriticalLimitFull,
  fmtClock,
  type MethodStep,
} from "./index";
import { RecipeBody, type RecipeCookModeTrigger } from "./recipe-body";
import { readCookProgress, writeCookProgress } from "./procedure-timers";
import { Icon } from "@/components/ui/icon";
import { classifyVideoUrl } from "@/lib/procedure-media";
import { Section } from "./index";
import type { ProcedureMethodStep, ProcedureNoteKind } from "@/lib/types";
import { LuPlay } from "react-icons/lu";

/**
 * Per-recipe-block owner of the cook-mode flow. Renders the recipe's allergen
 * banner (when not hoisted to the page head), the full `<RecipeBody>` with the
 * Yield-section CTA and right-side step thumbnails wired to the modal, plus
 * the modal itself.
 *
 * Why this owns the body: the launcher's state (done/factor/timers) lives in
 * localStorage, and `<RecipeBody>` needs to read `done` to compute
 * "Continue at step N" + to know which step the cook was on. Lifting that into
 * the launcher keeps a single source of truth and avoids a parent prop-drill.
 *
 * State persists in localStorage under `lms-cook-${procedureId}-${recipeBlockId}`
 * so the cook can leave the modal and come back to the same step.
 */

const COOK_LABELS_EN: CookModeLabels = {
  introSub: (n) =>
    `${n} steps. Tap "Done, next" as you finish each one, or swipe to look ahead.`,
  weighOut: "Weigh out",
  critical: "Critical step",
  upNext: (n) => `Coming up · step ${n}`,
  discard: (when) =>
    (
      <>
        Labelled now, discard at <b>{when}</b>
      </>
    ) as unknown as string,
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

const COOK_LABELS_ES: CookModeLabels = {
  ...COOK_LABELS_EN,
  introSub: (n) =>
    `${n} pasos. Toca "Listo, siguiente" al terminar cada uno, o desliza para ver el siguiente.`,
  weighOut: "Pesar",
  critical: "Paso crítico",
  upNext: (n) => `A continuación · paso ${n}`,
  discard: (when) =>
    (
      <>
        Etiquetado ahora, desechar a las <b>{when}</b>
      </>
    ) as unknown as string,
  allergen: "Alérgeno",
  wakeHint: "Tu pantalla se quedará encendida mientras esté abierto.",
  startBtn: (n) => (n > 0 ? `Continuar en el paso ${n}` : "Empezar a cocinar"),
  done: {
    normal: "Listo, siguiente",
    critical: "Listo: 4 °C o menos",
    final: "Listo, terminar",
    next: "Siguiente",
  },
  backToRecipe: "Volver a la receta",
  summaryHead: (done, total) => `${done} de ${total} pasos listos`,
  summaryLeftSub: "Sin marcar. Toca uno para volver a él:",
  summaryAllDoneSub:
    "Todos los pasos listos. Comprueba el plato antes del servicio.",
  listBack: (where) => `Volver a ${where}`,
  where: (v) => (typeof v === "string" ? v : `Paso ${v.n} de ${v.total}`),
  listNavAria: "Todos los pasos",
};

const LABELS = {
  en: {
    yieldTitle: "Yield",
    method: "Method",
    steps: (n: number) => `${n} steps`,
    batch: "Batch",
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
    notes: {
      warn: "Atención",
      tip: "Consejo",
      alt: "Alternativa",
      equip: "Equipo",
      allergen: "Alérgeno",
    },
  },
} as const;

const NOTE_KINDS: ProcedureNoteKind[] = [
  "warn",
  "tip",
  "alt",
  "equip",
  "allergen",
];

function localisedFactor(ing: {
  name: string;
  form?: string;
  allergen?: boolean;
  amounts: string[];
}): {
  name: string;
  amounts: string[];
  allergen?: boolean;
} {
  return { name: ing.name, amounts: ing.amounts, allergen: ing.allergen };
}

/** Convert the block's `ProcedureMethodStep[]` into the `MethodStep[]` shape
 *  `<MethodSteps>` expects. Mirrors `toMethodStep` in `block-renderer.tsx`
 *  because the launcher renders its own copy of the body (the regular renderer
 *  skips recipe blocks already owned by a launcher — see `consumedRecipeIds`). */
function toMethodStep(
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
            {step.note.body[locale]}
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
        {step.body[locale]}
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
      shots.push({
        src: img.src,
        alt: img.alt?.[locale] || img.alt?.en || img.alt?.es || "",
        compare,
      });
    }
  }
  if (step.imageSrc) {
    shots.push({
      src: step.imageSrc,
      alt:
        step.imageAlt?.[locale] || step.imageAlt?.en || step.imageAlt?.es || "",
      caption: step.videoCaption,
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
      alt: step.images[0].alt?.[locale] || step.images[0].alt?.en || "",
      compare: "ok",
      pairSrc: step.images[1].src,
      images: step.images.slice(0, 4).map((img) => ({
        src: img.src,
        alt: img.alt?.[locale] || img.alt?.en || "",
      })),
    };
  } else if (step.videoSegment) {
    const dur = Math.max(
      0,
      step.videoSegment.endSec - step.videoSegment.startSec,
    );
    const badge = dur > 0 ? fmtClock(dur) : undefined;
    const thumbSrc =
      step.images?.[0]?.src || step.imageSrc || step.videoSegment.src;
    out.mediaThumb = {
      src: thumbSrc,
      alt: step.images?.[0]?.alt?.[locale] || step.images?.[0]?.alt?.en || "",
      badge,
    };
  } else if (step.images && step.images.length > 1) {
    out.mediaThumb = {
      src: step.images[0].src,
      alt: step.images[0].alt?.[locale] || step.images[0].alt?.en || "",
      images: step.images.slice(0, 4).map((img) => ({
        src: img.src,
        alt: img.alt?.[locale] || img.alt?.en || "",
      })),
    };
  } else if (step.images?.[0]?.src) {
    out.mediaThumb = {
      src: step.images[0].src,
      alt: step.images[0].alt?.[locale] || step.images[0].alt?.en || "",
    };
  } else if (step.imageSrc) {
    out.mediaThumb = {
      src: step.imageSrc,
      alt: step.imageAlt?.[locale] || step.imageAlt?.en || "",
    };
  }

  return out;
}

export type CookModeBlockInput = {
  id?: string;
  kind?: string;
  factors?: number[];
  yieldItems?: Array<{
    label: string;
    value: string;
    unit?: string;
    scales?: boolean;
  }>;
  ingredients?: Array<{
    name: string;
    form?: string;
    allergen?: boolean;
    amounts: string[];
  }>;
  steps: ProcedureMethodStep[];
  allergen?: {
    summary: string;
    detail: string;
    selectedAllergens?: readonly string[];
  };
};

export function CookModeLauncher({
  block,
  procedureId,
  procedureTitle,
  locale,
  skipAllergen,
  modalOnly = false,
}: {
  block: CookModeBlockInput;
  procedureId: string;
  procedureTitle: string;
  locale: "en" | "es";
  skipAllergen?: boolean;
  modalOnly?: boolean;
}): React.ReactElement | null {
  const recipeBlockId = block.id ?? `recipe-${block.factors?.length ?? 0}`;
  const labels = locale === "es" ? COOK_LABELS_ES : COOK_LABELS_EN;
  const t = LABELS[locale];
  const [open, setOpen] = React.useState(false);
  const [start, setStart] = React.useState(1);
  const [progress, setProgress] = React.useState(() =>
    readCookProgress(procedureId, recipeBlockId),
  );

  // Local mirror of CookMode's `done` so the trigger reads from the same slot
  // the modal writes to. The modal also re-reads from localStorage on mount, so
  // a refresh re-hydrates both sides.
  const done = progress?.done ?? [];
  const timers = progress?.timers ?? [];
  const factor = progress?.factor ?? block.factors?.[0] ?? 1;

  // The launcher's modal can be opened two ways:
  //  - internally (the side thumb on a step fires `onThumbOpen`);
  //  - externally, when the doc-bar header CTA dispatches a `cook-mode:open`
  //    CustomEvent. Listening here lets the header CTA live in the page chrome
  //    without owning the modal — the launcher is the single owner.
  React.useEffect(() => {
    const onOpenEvent = (e: Event): void => {
      const detail = (
        e as CustomEvent<{
          procedureId: string;
          recipeBlockId: string;
          at: number;
        }>
      ).detail;
      if (!detail) return;
      if (
        detail.procedureId !== procedureId ||
        detail.recipeBlockId !== recipeBlockId
      )
        return;
      setStart(detail.at);
      setOpen(true);
    };
    window.addEventListener("cook-mode:open", onOpenEvent);
    return () => {
      window.removeEventListener("cook-mode:open", onOpenEvent);
    };
  }, [procedureId, recipeBlockId]);

  const persist = React.useCallback(
    (next: {
      done?: boolean[];
      timers?: typeof timers;
      factor?: number;
      at?: number;
    }) => {
      const cur = readCookProgress(procedureId, recipeBlockId) ?? {
        done: [],
        at: 0,
        timers: [],
        factor,
      };
      const merged = {
        done: next.done ?? cur.done,
        at: next.at ?? cur.at,
        timers: next.timers ?? cur.timers,
        factor: next.factor ?? cur.factor,
      };
      writeCookProgress(procedureId, recipeBlockId, merged);
      setProgress(merged);
      // Tell the doc-bar CTA to re-read its label. The CTA reads on mount and
      // on this event — events are cheaper than context for one consumer.
      window.dispatchEvent(
        new CustomEvent("cook-mode:progress", {
          detail: { procedureId, recipeBlockId },
        }),
      );
    },
    [procedureId, recipeBlockId, factor],
  );

  const handleToggleStep = React.useCallback(
    (n: number, value: boolean) => {
      const next = [
        ...(progress?.done ?? Array(block.steps.length).fill(false)),
      ];
      while (next.length < block.steps.length) next.push(false);
      next[n - 1] = value;
      persist({ done: next });
    },
    [progress, block.steps.length, persist],
  );

  const handleReset = React.useCallback(() => {
    persist({ done: Array(block.steps.length).fill(false), at: 1 });
  }, [block.steps.length, persist]);

  React.useEffect(() => {
    const onResetEvent = (e: Event): void => {
      const detail = (
        e as CustomEvent<{ procedureId: string; recipeBlockId: string }>
      ).detail;
      if (!detail) return;
      if (
        detail.procedureId !== procedureId ||
        detail.recipeBlockId !== recipeBlockId
      )
        return;
      handleReset();
    };
    window.addEventListener("cook-mode:reset", onResetEvent);
    return () => {
      window.removeEventListener("cook-mode:reset", onResetEvent);
    };
  }, [procedureId, recipeBlockId, handleReset]);

  const handleOpen = React.useCallback((at: number) => {
    setStart(at);
    setOpen(true);
  }, []);

  const recipe: CookModeRecipe = React.useMemo(
    () => ({
      title: procedureTitle,
      factors: block.factors ?? [],
      ingredients: (block.ingredients ?? []).map(localisedFactor),
      steps: block.steps,
      recipeBlockId,
    }),
    [procedureTitle, block, recipeBlockId],
  );

  if (!block.steps.length) return null;

  const steps = block.steps.map((s) => toMethodStep(s, locale, t.notes));
  const cookMode: RecipeCookModeTrigger = {
    onOpen: handleOpen,
    labels: { start: labels.startBtn(0), continueAt: labels.startBtn },
    done,
    onToggleStep: handleToggleStep,
    onReset: handleReset,
  };

  return (
    <>
      {!modalOnly && (
        <>
          {!skipAllergen && block.allergen ? (
            <Allergen
              summary={block.allergen.summary}
              detail={block.allergen.detail}
              selectedAllergens={block.allergen.selectedAllergens}
              locale={locale}
            />
          ) : null}
          <RecipeBody
            factors={block.factors ?? []}
            yieldItems={block.yieldItems ?? []}
            ingredients={(block.ingredients ?? []).map((ing) => ({
              name: ing.name,
              form: ing.form,
              allergen: ing.allergen,
              amounts: ing.amounts,
            }))}
            steps={steps}
            batchLabel={t.batch}
            yieldTitle={t.yieldTitle}
            methodTitle={t.method}
            stepsCount={t.steps(steps.length)}
            cookMode={cookMode}
          />
        </>
      )}
      <CookMode
        open={open}
        start={start}
        factor={factor}
        onFactor={(f) => persist({ factor: f })}
        done={done}
        onDone={(n, value) => {
          const next = [...done];
          next[n - 1] = value;
          persist({ done: next });
        }}
        timers={timers}
        onTimer={(n) => {
          const step = block.steps[n - 1];
          if (!step?.timer) return;
          const next = [
            ...timers.filter((t) => t.step !== n),
            {
              step: n,
              label: step.timer.label,
              endsAt: Date.now() + step.timer.seconds * 1000,
            },
          ];
          persist({ timers: next });
        }}
        onClearTimer={(n) =>
          persist({ timers: timers.filter((t) => t.step !== n) })
        }
        recipe={recipe}
        locale={locale}
        labels={labels}
        onClose={(at) => {
          persist({ at });
          setOpen(false);
        }}
      />
    </>
  );
}
