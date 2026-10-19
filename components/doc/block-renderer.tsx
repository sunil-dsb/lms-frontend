"use client";

import * as React from "react";
import { RichTextContent } from "@/components/editor/rich-text-editor";
import type {
  Localised,
  LocalisedOptional,
  ProcedureBlock,
  ProcedureMethodStep,
  ProcedureNoteKind,
} from "@/lib/types";
import { classifyVideoUrl } from "@/lib/procedure-media";
import {
  Allergen,
  CriticalLimitFull,
  IngredientsTable,
  MethodSteps,
  NoteBlock,
  Scaler,
  Section,
  Shot,
  Triggers,
  Yield,
  type Ingredient,
  type MethodStep,
  type ChapterRow,
} from "./index";
import {
  LuBookOpen,
  LuCheck,
  LuCircle,
  LuDownload,
  LuExternalLink,
  LuFileText,
} from "react-icons/lu";
import { Icon } from "@/components/ui/icon";
import { RecipeBody } from "./recipe-body";
import { cn } from "@/lib/utils";
import { getSopById } from "@/lib/mock-training";

/**
 * The block stream, laid out as the templates in /sop-template.html and
 * /sop-recipe-format.html lay a document out.
 *
 * Those templates are not a wall of blocks: they are a run of
 * `<section class="doc-sec">`, each with one h2 and the paragraphs, lists, photos
 * and notes that belong under it. The API sends a flat list, so this groups it —
 * a heading opens a section, everything after it falls inside — which is what
 * gives the page its left margin, its section rhythm, and callouts that sit
 * inside the text column instead of running the full width of the sheet.
 *
 * Everything below uses the document's own classes (.triggers, .shot, .ing,
 * .note-block). No Tailwind is added here: a change to the template's CSS has to
 * land on this page too, and it cannot if the page has restyled it.
 */

const NOTE_KINDS: ProcedureNoteKind[] = [
  "warn",
  "tip",
  "alt",
  "equip",
  "allergen",
];

const LABELS = {
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
    // The note label was always English, so a Spanish page said "Warning".
    notes: {
      warn: "Atención",
      tip: "Consejo",
      alt: "Alternativa",
      equip: "Equipo",
      allergen: "Alérgeno",
    },
  },
} as const;

function pickText(value: Localised, locale: "en" | "es"): string {
  return value[locale];
}
function pickOpt(
  value: LocalisedOptional | undefined,
  locale: "en" | "es",
): string | undefined {
  if (!value) return undefined;
  const v = value[locale];
  return v && v.length > 0 ? v : undefined;
}

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

/** The allergen banner belongs under the title, above the purpose — see the
 *  recipe template. The page renders the first one there; the id comes back with
 *  it so only that block's banner is skipped below. A document with a sauce and
 *  its base has two recipe blocks and two sets of allergens, and the second one
 *  is not less dangerous for being second. */
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

function IngredientsSection({
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

export function BlockRenderer({
  blocks,
  locale,
  hoistedAllergenId,
  consumedRecipeIds,
}: {
  blocks: ProcedureBlock[];
  locale: "en" | "es";
  /** The block whose allergen banner the page has already rendered at the head. */
  hoistedAllergenId?: string;
  /** Recipe block ids already rendered by a `<CookModeLauncher>` on the page.
     Those blocks' `<RecipeBody>` is rendered by the launcher (with `cookMode`
     wired to its modal). BlockRenderer skips them to avoid double-rendering. */
  consumedRecipeIds?: ReadonlySet<string>;
}): React.ReactElement {
  const t = LABELS[locale];
  const attachmentRows: ChapterRow[] = [];
  const out: React.ReactNode[] = [];
  const [doneMap, setDoneMap] = React.useState<Record<number, boolean>>({});

  // Pre-count total method blocks so we can render "Part X of Y" when there are multiple parts
  const methodBlockCount = blocks.filter((b) => b.kind === "method").length;
  let currentMethodIndex = 0;
  let runningStepOffset = 0;

  // The section being filled. A heading opens one; a method or a recipe closes it,
  // because those bring their own heading with them.
  let open: { key: string; title?: string; nodes: React.ReactNode[] } | null =
    null;

  const flush = (): void => {
    if (!open) return;
    if (open.title || open.nodes.length > 0) {
      out.push(
        <Section key={open.key} title={open.title}>
          {open.nodes}
        </Section>,
      );
    }
    open = null;
  };
  const add = (key: string, node: React.ReactNode): void => {
    if (!open) open = { key: `sec-${key}`, nodes: [] };
    open.nodes.push(<React.Fragment key={key}>{node}</React.Fragment>);
  };

  blocks.forEach((block, i) => {
    const key = block.id ?? String(i);
    switch (block.kind) {
      case "heading": {
        const text = pickText(block.text, locale);
        // h1 and h2 are the document's sections; anything deeper is a subheading
        // inside the section that is already open. Deeper-but-first opens a
        // section anyway: an h3 with no h2 above it is a hole in the outline, and
        // the fix belongs here rather than in every document that has one.
        if (block.level >= 3 && open && open.title) {
          add(key, <h3>{text}</h3>);
          return;
        }
        flush();
        open = { key: `sec-${key}`, title: text, nodes: [] };
        return;
      }
      case "text": {
        // A body written as one line per item is a list — the template's
        // .triggers, a row of dot-marked lines, not a paragraph of sentences.
        const body = pickText(block.body, locale);
        const lines = body
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        add(key, lines.length > 1 ? <Triggers items={lines} /> : <p>{body}</p>);
        return;
      }
      case "rich_text": {
        add(
          key,
          <RichTextContent value={block.body[locale === "es" ? "es" : "en"]} />,
        );
        return;
      }
      case "warning": {
        // A severity this build does not know about still has something to say,
        // so it is shown as a warning rather than thrown at the reader as a 500.
        const kind: ProcedureNoteKind = NOTE_KINDS.includes(
          block.severity as ProcedureNoteKind,
        )
          ? (block.severity as ProcedureNoteKind)
          : "warn";
        add(
          key,
          <NoteBlock kind={kind} label={t.notes[kind as keyof typeof t.notes]}>
            {pickText(block.body, locale)}
          </NoteBlock>,
        );
        return;
      }
      case "image": {
        add(
          key,
          <Shot
            src={block.src}
            alt={pickText(block.alt, locale)}
            caption={pickOpt(block.caption, locale)}
          />,
        );
        return;
      }
      case "video": {
        const caption = pickOpt(block.caption, locale);
        const videoClass = classifyVideoUrl(block.src);
        add(
          key,
          <figure className="shot">
            {videoClass.provider === "file" ? (
              <video controls src={block.src} />
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
          </figure>,
        );
        return;
      }
      case "table": {
        // The recipe's ingredient table frame, with prose cells: same document,
        // same table, but these cells are sentences rather than quantities.
        add(
          key,
          <div className="overflow-x-auto rounded-[var(--radius-lg)] my-2 border border-[var(--color-line)]">
            <table className="dtable min-w-full !border-0 !rounded-none">
              <thead>
                <tr>
                  {block.headers.map((h, j) => (
                    <th key={j} scope="col" className="min-w-[140px]">
                      {pickText(h, locale)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, j) => (
                      <td key={j} className="align-top min-w-[140px]">
                        {pickText(cell, locale)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
        return;
      }
      case "attachment": {
        attachmentRows.push({
          icon: LuFileText,
          title: pickText(block.title, locale),
          meta: block.meta,
          href: block.href,
          kind: "attachment",
        });
        return;
      }
      case "method": {
        const sectionTitle =
          block.title?.[locale]?.trim() || open?.title || t.method;
        const sectionKey = open?.key ?? key;
        const extraNodes = open?.nodes ?? [];
        open = null;
        currentMethodIndex++;
        const startIndex = runningStepOffset + 1;
        runningStepOffset += block.steps.length;
        const partLabel =
          methodBlockCount > 1
            ? locale === "es"
              ? `Parte ${currentMethodIndex} de ${methodBlockCount}`
              : `Part ${currentMethodIndex} of ${methodBlockCount}`
            : undefined;

        const steps = block.steps.map((s, idx) => {
          const stepNum = startIndex + idx;
          const ms = toMethodStep(s, locale, t.notes);
          return {
            ...ms,
            thumbLabel:
              ms.thumbLabel ??
              (locale === "es"
                ? `Paso ${stepNum}: abrir en modo cocina`
                : `Step ${stepNum}: open in cook mode`),
            onThumbOpen: () => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("cook-mode:open", {
                    detail: { at: stepNum },
                  }),
                );
              }
            },
          };
        });

        const doneForBlock = block.steps.map((_, si) =>
          Boolean(doneMap[startIndex + si]),
        );
        const doneInPart = doneForBlock.filter(Boolean).length;
        const allDoneInPart =
          doneInPart === block.steps.length && block.steps.length > 0;
        const partCount = allDoneInPart
          ? locale === "es"
            ? "todos listos"
            : "all done"
          : doneInPart > 0
            ? locale === "es"
              ? `${doneInPart} de ${block.steps.length} listos`
              : `${doneInPart} of ${block.steps.length} done`
            : t.steps(steps.length);

        out.push(
          <Section
            key={sectionKey}
            title={sectionTitle}
            part={partLabel}
            count={partCount}
          >
            {extraNodes}
            <MethodSteps
              steps={steps}
              startIndex={startIndex}
              done={doneForBlock}
              onToggleStep={(si) => {
                const stepNo = startIndex + si;
                setDoneMap((prev) => ({ ...prev, [stepNo]: !prev[stepNo] }));
              }}
            />
          </Section>,
        );
        return;
      }
      case "ingredients": {
        flush();
        const factorList =
          block.factors && block.factors.length > 0 ? block.factors : [1];
        out.push(
          <React.Fragment key={key}>
            {block.allergen && key !== hoistedAllergenId ? (
              <Allergen
                summary={block.allergen.summary}
                detail={block.allergen.detail}
                selectedAllergens={block.allergen.selectedAllergens}
                locale={locale}
              />
            ) : null}
            <IngredientsSection
              factors={factorList}
              yieldItems={block.yieldItems ?? []}
              ingredients={(block.ingredients ?? []).map((ing) => ({
                name: ing.name,
                form: ing.form,
                allergen: ing.allergen,
                amounts: ing.amounts,
              }))}
              batchLabel={t.batch}
              yieldTitle={t.yieldTitle}
            />
          </React.Fragment>,
        );
        return;
      }
      case "recipe": {
        flush();
        // A `<CookModeLauncher>` mounted by the page owns this block's cook-mode
        // flow (Yield-section CTA, side thumbs, modal). When the launcher has
        // already claimed it, the launcher renders `<RecipeBody>` itself with
        // `cookMode` wired up — we just skip it here so the body doesn't render
        // twice. The launcher's render order is "before BlockRenderer" in
        // `procedure-article-body.tsx`, so the launcher's CTA appears above the
        // body and the body's steps appear once, owned by the launcher.
        if (consumedRecipeIds?.has(block.id ?? key)) return;
        const steps = block.steps.map((s) => toMethodStep(s, locale, t.notes));
        out.push(
          <React.Fragment key={key}>
            {block.allergen && key !== hoistedAllergenId ? (
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
            />
          </React.Fragment>,
        );
        return;
      }
      case "checklist": {
        const heading = pickOpt(block.title, locale);
        add(
          key,
          <ChecklistBlock
            blockId={block.id}
            title={heading}
            items={block.items}
            locale={locale}
          />,
        );
        return;
      }
      case "linked_procedures": {
        add(
          key,
          <LinkedProceduresDocBlock
            procedureIds={block.procedureIds}
            locale={locale}
          />,
        );
        return;
      }
    }
  });
  flush();

  return (
    <>
      {out}
      {attachmentRows.length > 0 && (
        <Section title={t.attachments}>
          <div className="chapters">
            {attachmentRows.map((r, i) => (
              <a
                key={i}
                className="chapter"
                href={r.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="idx">
                  <Icon icon={r.icon} className="i i-sm" />
                </span>
                <div>
                  <div className="title">{r.title}</div>
                  {r.meta && <div className="meta">{r.meta}</div>}
                </div>
                <span className="tail">
                  <LuDownload aria-hidden="true" className="i" />
                </span>
              </a>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

/** Interactive checklist rendered on the procedure detail page.
 *  Employees tap to tick items off as they work; the box fills with ok-green
 *  and the label strikes through. State is per-block so two checklists on
 *  the same page don't bleed into each other. */
function ChecklistBlock({
  blockId,
  title,
  items,
  locale,
}: {
  blockId: string;
  title: string | undefined;
  items: { id: string; text: Localised }[];
  locale: "en" | "es";
}): React.ReactElement {
  const [picked, setPicked] = React.useState<Record<string, boolean>>({});

  const toggle = (itemId: string): void => {
    setPicked((p) => ({ ...p, [itemId]: !p[itemId] }));
  };

  const done = items.reduce((n, it) => (picked[it.id] ? n + 1 : n), 0);
  const displayTitle =
    title?.trim() || (locale === "es" ? "Lista de verificación" : "Checklist");

  return (
    <div className="checklist-block space-y-3 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4 shadow-e1">
      <div className="flex items-center justify-between">
        <h3 className="checklist-title text-base font-bold text-[var(--color-ink)]">
          {displayTitle}
        </h3>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--color-wash)] text-[var(--color-ink-2)]">
          {done}/{items.length}
        </span>
      </div>
      <ul className="checklist space-y-2" role="list">
        {items.map((it, i) => {
          const checked = !!picked[it.id];
          const label = it.text[locale] || it.text.en || it.text.es;
          return (
            <li key={it.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => toggle(it.id)}
                className={cn(
                  "checklist-row group flex w-full items-center gap-3 text-left transition-colors",
                  checked
                    ? "checklist-row--done bg-[var(--color-ok-tint)]"
                    : "hover:bg-[var(--color-wash)]",
                )}
                style={{
                  padding: "12px 16px",
                  borderRadius: 0,
                }}
              >
                <span
                  className={cn(
                    "checklist-box flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
                    checked
                      ? "checklist-box--on border-[var(--color-ok-fill)] bg-[var(--color-ok-fill)] text-white"
                      : "checklist-box--off border-[var(--color-line-2)] bg-[var(--color-surface)] text-transparent group-hover:border-[var(--color-ink-3)]",
                  )}
                  aria-hidden="true"
                >
                  <LuCheck className="size-3.5 stroke-[3]" />
                </span>
                <span
                  className="checklist-num text-xs font-mono text-[var(--color-ink-3)]"
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <span
                  className={cn(
                    "checklist-text flex-1 text-sm font-medium transition-colors",
                    checked
                      ? "text-[var(--color-ink-3)] line-through"
                      : "text-[var(--color-ink)]",
                  )}
                >
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="checklist-progress text-xs text-[var(--color-ink-3)] font-medium pt-1">
        {locale === "es"
          ? "Marca cada elemento al completarlo."
          : "Check each item as you complete it."}
      </p>
    </div>
  );
}

function LinkedProceduresDocBlock({
  procedureIds,
  locale,
}: {
  procedureIds: string[];
  locale: "en" | "es";
}): React.ReactElement | null {
  if (!procedureIds || procedureIds.length === 0) return null;
  const isEs = locale === "es";

  return (
    <div className="my-4 rounded-2xl border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4 shadow-xs">
      <div className="flex items-center gap-2 mb-3">
        <LuBookOpen className="w-4 h-4 text-[var(--color-brand-600)]" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink)]">
          {isEs ? "Procedimientos vinculados" : "Linked procedures"}
        </h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {procedureIds.map((id) => {
          const sop = getSopById(id);
          if (!sop) return null;
          const title = isEs
            ? sop.titleEs || sop.titleEn
            : sop.titleEn || sop.titleEs;
          const purpose = isEs
            ? sop.purposeEs || sop.purposeEn
            : sop.purposeEn || sop.purposeEs;

          return (
            <a
              key={id}
              href={`/${locale}/admin/library/${sop.slug || sop.id}`}
              className="group flex flex-col justify-between rounded-xl border border-[var(--color-line-2)] bg-[var(--color-wash)]/40 p-3 hover:border-[var(--color-brand-300)] hover:bg-[var(--color-wash)] transition-all"
            >
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--color-brand-600)] bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-950)] px-2 py-0.5 rounded-full border border-[var(--color-brand-200)] dark:border-[var(--color-brand-800)] mb-1.5">
                  <LuBookOpen className="w-3 h-3" />
                  SOP
                </span>
                <h5 className="text-xs sm:text-sm font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-brand-600)] transition-colors line-clamp-1">
                  {title}
                </h5>
                {purpose && (
                  <p className="mt-1 text-[11px] text-[var(--color-ink-2)] line-clamp-2">
                    {purpose}
                  </p>
                )}
              </div>
              <div className="mt-2.5 pt-2 border-t border-[var(--color-line-2)]/60 flex items-center justify-between text-[10px] text-[var(--color-ink-3)]">
                <span className="font-medium text-[var(--color-brand-600)]">
                  {isEs ? "Ver procedimiento" : "View procedure"}
                </span>
                <LuExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
