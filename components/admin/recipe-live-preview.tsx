"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import type { RecipeIngredientItem } from "./recipe-ingredients-editor";
import type { ProcedureBlock, ProcedureMethodStep } from "@/lib/types";
import { LuChefHat, LuEye } from "react-icons/lu";

interface RecipeLivePreviewProps {
  title: string;
  purpose: string;
  categoryLabel: string;
  ingredients: RecipeIngredientItem[];
  selectedFactor: number;
  blocks: ProcedureBlock[];
}

export function RecipeLivePreview({
  title,
  purpose,
  categoryLabel,
  ingredients,
  selectedFactor,
  blocks,
}: RecipeLivePreviewProps): React.ReactElement {
  const t = useTranslations("admin.library.new.recipe");

  // Extract method steps from method blocks if any exist
  const methodSteps = blocks
    .filter(
      (b): b is Extract<ProcedureBlock, { kind: "method" }> =>
        b.kind === "method",
    )
    .flatMap((b) => b.steps);

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[var(--color-ink)] font-semibold text-sm">
          <LuEye aria-hidden="true" className="text-[var(--color-ink-2)]" />
          <span>{t("previewTitle")}</span>
        </div>
        <button
          type="button"
          onClick={() =>
            alert("Full Preview: Shows exact employee view full screen.")
          }
          className="text-sm font-medium text-[var(--color-brand-700)] hover:underline"
        >
          {t("viewFullPreview")}
        </button>
      </div>

      {/* Live Preview Card Content */}
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] space-y-3 p-4">
        {/* Mock Food / Recipe Image Banner */}
        <div className="relative h-tile w-full overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-panel)] flex items-center justify-center text-[var(--color-ink-3)]">
          <LuChefHat aria-hidden="true" className="text-2xl opacity-80" />
        </div>

        {/* Title & Category Badge */}
        <div>
          <h4 className="font-[family-name:var(--font-ui)] text-md font-semibold text-[var(--color-ink)]">
            {title.trim() || t("previewTitlePlaceholder")}
          </h4>
          <span className="mt-1 inline-block rounded-[var(--radius-sm)] bg-[var(--color-panel)] px-3 py-0.5 text-sm font-semibold text-[var(--color-ink-2)]">
            {categoryLabel}
          </span>
        </div>

        {/* Purpose */}
        {purpose.trim() && (
          <div className="space-y-1">
            <h5 className="text-sm font-semibold text-[var(--color-ink-3)]">
              Purpose
            </h5>
            <p className="text-sm text-[var(--color-ink-2)] line-clamp-3">
              {purpose}
            </p>
          </div>
        )}

        {/* Ingredients List */}
        {ingredients.length > 0 && (
          <div className="space-y-2 border-t border-[var(--color-line)] pt-2">
            <h5 className="text-sm font-semibold text-[var(--color-ink-3)]">
              {t("previewIngredientsHeader", { factor: `${selectedFactor}×` })}
            </h5>
            <ul className="space-y-1 text-sm">
              {ingredients.map((ing) => {
                if (!ing.name.trim()) return null;
                const qtyNum = parseFloat(ing.quantity);
                const scaledQty = isNaN(qtyNum)
                  ? ing.quantity
                  : `${(qtyNum * selectedFactor).toFixed(0)}`;
                return (
                  <li
                    key={ing.id}
                    className="flex items-center justify-between text-[var(--color-ink)]"
                  >
                    <span className="font-medium">{ing.name}</span>
                    <span className="font-mono text-[var(--color-ink-2)]">
                      {scaledQty} {ing.unit}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Method Steps List */}
        {methodSteps.length > 0 && (
          <div className="space-y-2 border-t border-[var(--color-line)] pt-2">
            <h5 className="text-sm font-semibold text-[var(--color-ink-3)]">
              Method
            </h5>
            <div className="space-y-2 text-sm">
              {methodSteps.map((step, idx) => {
                const bodyText = step.body.en || step.body.es || "";
                return (
                  <div
                    key={`${step.id || "step"}-${idx}`}
                    className="flex items-start gap-2"
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-panel)] font-mono text-sm font-bold text-[var(--color-ink)]">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-medium text-[var(--color-ink)] line-clamp-2">
                        {bodyText || `Step ${idx + 1}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
