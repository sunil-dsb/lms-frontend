"use client";

import * as React from "react";
import { RichTextContent } from "@/components/editor/rich-text-editor";
import type {
  Localised,
  LocalisedOptional,
  Procedure,
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
  LuCheck,
  LuCircle,
  LuDownload,
  LuExternalLink,
  LuFileText,
} from "react-icons/lu";
import { Icon } from "@/components/ui/icon";
import { RecipeBody } from "./recipe-body";
import { CookModeLauncher } from "./cook-mode-launcher";
import { cn } from "@/lib/utils";
import { getSopById } from "@/lib/mock-training";
import {
  NOTE_KINDS,
  LABELS,
  pickText,
  pickOpt,
  toMethodStep,
  findAllergen,
  IngredientsSection,
} from "./blocks/method-step-helper";
import { ChecklistBlock } from "./blocks/checklist-block";
import { LinkedProceduresDocBlock } from "./blocks/linked-procedures-block";

export { findAllergen };

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

export function BlockRenderer({
  blocks,
  locale,
  hoistedAllergenId,
  consumedRecipeIds,
  trainingCourseId,
}: {
  blocks: ProcedureBlock[];
  locale: "en" | "es";
  /** The block whose allergen banner the page has already rendered at the head. */
  hoistedAllergenId?: string;
  /** Recipe block ids already rendered by a `<CookModeLauncher>` on the page.
     Those blocks' `<RecipeBody>` is rendered by the launcher (with `cookMode`
     wired to its modal). BlockRenderer skips them to avoid double-rendering. */
  consumedRecipeIds?: ReadonlySet<string>;
  /** Course context for procedures embedded in employee training. */
  trainingCourseId?: string;
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
          <div className="overflow-x-auto rounded-[var(--radius-lg)] my-2 border border-[var(--color-line)] -mx-1 sm:mx-0">
            <table className="dtable min-w-full !border-0 !rounded-none">
              <thead>
                <tr>
                  {block.headers.map((h, j) => {
                    const textVal = pickText(h, locale);
                    const isShort = textVal.length <= 4;
                    return (
                      <th
                        key={j}
                        scope="col"
                        className={cn(
                          "px-3 py-3 text-xs sm:text-sm font-semibold",
                          isShort ? "w-12 text-center" : "min-w-[100px]",
                        )}
                      >
                        {textVal}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, j) => {
                      const textVal = pickText(cell, locale);
                      const isShort = textVal.length <= 4;
                      return (
                        <td
                          key={j}
                          className={cn(
                            "align-top px-3 py-3 text-xs sm:text-sm",
                            isShort ? "w-12 text-center" : "min-w-[100px]",
                          )}
                        >
                          {textVal}
                        </td>
                      );
                    })}
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
            trainingCourseId={trainingCourseId}
            renderBlocks={(procBlocks, l) => (
              <BlockRenderer blocks={procBlocks} locale={l} />
            )}
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
