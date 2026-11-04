"use client";

import * as React from "react";
import type { Procedure, ProcedureBlock } from "@/lib/types";
import { getSopById } from "@/lib/mock-training";
import { CookModeLauncher } from "../cook-mode-launcher";

interface LinkedProceduresDocBlockProps {
  procedureIds: string[];
  locale: "en" | "es";
  trainingCourseId?: string;
  renderBlocks?: (
    blocks: ProcedureBlock[],
    locale: "en" | "es",
  ) => React.ReactNode;
}

function LinkedProcedureDocItem({
  id,
  locale,
  trainingCourseId,
  renderBlocks,
}: {
  id: string;
  locale: "en" | "es";
  trainingCourseId?: string;
  renderBlocks?: (
    blocks: ProcedureBlock[],
    locale: "en" | "es",
  ) => React.ReactNode;
}): React.ReactElement | null {
  const isEs = locale === "es";
  const [sop, setSop] = React.useState<Procedure | null>(
    () => getSopById(id) ?? null,
  );
  const [loading, setLoading] = React.useState(!sop);

  React.useEffect(() => {
    if (!sop && id) {
      setLoading(true);
      import("@/services/library/api")
        .then(({ fetchProcedureById }) =>
          fetchProcedureById(id, false, undefined, trainingCourseId),
        )
        .then((p) => {
          if (p) setSop(p);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [id, sop, trainingCourseId]);

  if (loading && !sop) {
    return (
      <div className="rounded-2xl border border-[var(--color-line-2)] bg-[var(--color-surface)] p-6 animate-pulse space-y-4">
        <div className="h-4 bg-[var(--color-panel-2)] rounded w-1/4" />
        <div className="h-6 bg-[var(--color-panel-2)] rounded w-1/2" />
        <div className="h-4 bg-[var(--color-panel-2)] rounded w-3/4" />
      </div>
    );
  }

  if (!sop) return null;

  const title = isEs ? sop.titleEs || sop.titleEn : sop.titleEn || sop.titleEs;
  const purpose = isEs
    ? sop.purposeEs || sop.purposeEn
    : sop.purposeEn || sop.purposeEs;

  const rawBlocks =
    (isEs ? sop.bodyEs?.blocks : sop.bodyEn?.blocks) ||
    sop.bodyEn?.blocks ||
    [];

  // Filter out any nested linked_procedures to avoid recursion, and any heading level 1 matching title
  const procBlocks = rawBlocks.filter((b, bIdx) => {
    if (b.kind === "linked_procedures") return false;
    if (bIdx === 0 && b.kind === "heading" && b.level === 1) return false;
    return true;
  });

  // This card's own cook-mode surface: recipes / method steps in the linked
  // procedure merge into one synthetic steps block, so every card carries its
  // own "Start cooking" (and its own CookMode modal) — a chapter with steps of
  // its own plus linked procedures gets one button per section, not one global
  // button that would open every modal on the page at once.
  const ingBlock = procBlocks.find(
    (b): b is Extract<ProcedureBlock, { kind: "ingredients" }> =>
      b.kind === "ingredients",
  );
  const stepBlocks = procBlocks.filter(
    (b): b is Extract<ProcedureBlock, { kind: "recipe" | "method" }> =>
      b.kind === "recipe" || b.kind === "method",
  );
  const stepsBlock =
    stepBlocks.length === 0
      ? null
      : {
          id: `steps-${sop.id}`,
          factors: ingBlock?.factors ?? [1],
          yieldItems: ingBlock?.yieldItems ?? [],
          ingredients: ingBlock?.ingredients ?? [],
          steps: stepBlocks.flatMap((b) => b.steps ?? []),
          allergen: ingBlock?.allergen,
        };
  const openCookMode = (): void => {
    window.dispatchEvent(
      new CustomEvent("cook-mode:open", {
        detail: {
          procedureId: sop.id,
          recipeBlockId: `steps-${sop.id}`,
          at: 1,
        },
      }),
    );
  };

  return (
    <div
      key={id}
      id={`linked-proc-${sop.id}`}
      className="rounded-2xl border border-[var(--color-line-2)] bg-[var(--color-surface)] p-5 sm:p-8 shadow-xs space-y-4 sm:space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 border-b border-[var(--color-line-2)]/60 pb-4">
        <div className="min-w-0 space-y-2">
          <h3 className="text-lg sm:text-xl font-bold text-[var(--color-ink)]">
            {title}
          </h3>
          {purpose && (
            <p className="text-sm text-[var(--color-ink-2)] leading-relaxed">
              {purpose}
            </p>
          )}
        </div>
        {stepsBlock ? (
          <button
            type="button"
            onClick={openCookMode}
            className="inline-flex shrink-0 min-h-[40px] items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-600)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--color-brand-700)] active:scale-95 transition-all self-start sm:self-auto cursor-pointer"
          >
            <span aria-hidden="true">▶</span>
            <span>{isEs ? "Empezar a cocinar" : "Start cooking"}</span>
          </button>
        ) : null}
      </div>

      {procBlocks.length > 0 ? (
        renderBlocks ? (
          renderBlocks(procBlocks, locale)
        ) : null
      ) : (
        <p className="py-2 text-xs text-[var(--color-ink-3)]">
          {isEs ? "Sin contenido de procedimiento." : "No procedure content."}
        </p>
      )}

      {stepsBlock ? (
        <CookModeLauncher
          block={stepsBlock}
          procedureId={sop.id}
          procedureTitle={title}
          locale={locale}
          modalOnly
        />
      ) : null}
    </div>
  );
}

export function LinkedProceduresDocBlock({
  procedureIds,
  locale,
  trainingCourseId,
  renderBlocks,
}: LinkedProceduresDocBlockProps): React.ReactElement | null {
  if (!procedureIds || procedureIds.length === 0) return null;

  return (
    <div className="my-6 space-y-6">
      {procedureIds.map((id) => (
        <LinkedProcedureDocItem
          key={id}
          id={id}
          locale={locale}
          trainingCourseId={trainingCourseId}
          renderBlocks={renderBlocks}
        />
      ))}
    </div>
  );
}
