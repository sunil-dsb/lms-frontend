"use client";

/**
 * Inline editor for an `ingredients` block, embedded inside a single
 * NotionBlockList row.
 *
 * Provides dedicated editing for recipe ingredients, batch factors and
 * yield. Steps are authored independently using numbered Steps (method)
 * blocks.
 */

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/ui/icon";
import { RecipeYieldSection } from "./recipe-block-body";
import type {
  ProcedureBlock,
  ProcedureIngredient,
  ProcedureYieldItem,
} from "@/lib/types";

type IngredientsBlock = Extract<ProcedureBlock, { kind: "ingredients" }>;

interface IngredientsBlockBodyProps {
  block: IngredientsBlock;
  onPatch: (next: IngredientsBlock) => void;
  lang?: "en" | "es";
}

const COMMON_UNITS = [
  "pcs",
  "each",
  "g",
  "kg",
  "ml",
  "l",
  "oz",
  "lb",
  "cup",
  "tbsp",
  "tsp",
  "pinch",
  "handful",
  "spoonfuls",
  "tortillas",
  "wedge",
  "coat",
  "drizzle",
] as const;

function emptyIngredient(factorsCount = 1): ProcedureIngredient {
  return {
    name: "",
    form: "",
    allergen: false,
    unit: "",
    amounts: Array.from({ length: Math.max(1, factorsCount) }, () => ""),
  };
}

export function IngredientsBlockBody({
  block,
  onPatch,
}: IngredientsBlockBodyProps): React.ReactElement {
  const ingredients = block.ingredients ?? [];
  const factors =
    block.factors && block.factors.length > 0 ? block.factors : [1];
  const yieldItems = block.yieldItems ?? [];

  function setFactors(nextFactors: number[]): void {
    const updatedIngredients = ingredients.map((ing) => {
      const nextAmounts = nextFactors.map(
        (_, idx) => ing.amounts[idx] ?? ing.amounts[0] ?? "",
      );
      return { ...ing, amounts: nextAmounts };
    });
    onPatch({
      ...block,
      factors: nextFactors,
      ingredients: updatedIngredients,
    });
  }

  function updateIngredient(
    idx: number,
    patch: Partial<ProcedureIngredient>,
  ): void {
    onPatch({
      ...block,
      factors: [1],
      ingredients: ingredients.map((x, j) =>
        j === idx ? { ...x, ...patch } : x,
      ),
    });
  }

  function setAmount(ingIdx: number, factorIdx: number, value: string): void {
    onPatch({
      ...block,
      factors: [1],
      ingredients: ingredients.map((x, j) => {
        if (j !== ingIdx) return x;
        const nextAmounts = [...x.amounts];
        while (nextAmounts.length <= factorIdx) nextAmounts.push("");
        nextAmounts[factorIdx] = value;
        return { ...x, amounts: nextAmounts };
      }),
    });
  }

  function addIngredient(): void {
    onPatch({
      ...block,
      factors: [1],
      ingredients: [...ingredients, emptyIngredient(factors.length)],
    });
  }

  function removeIngredient(idx: number): void {
    onPatch({
      ...block,
      factors: [1],
      ingredients: ingredients.filter((_, j) => j !== idx),
    });
  }

  function addYieldItem(): void {
    const newItem: ProcedureYieldItem = {
      label: "Batch yield",
      value: "",
      unit: "",
      scales: true,
    };
    onPatch({ ...block, yieldItems: [...yieldItems, newItem] });
  }

  function updateYieldItem(
    idx: number,
    patch: Partial<ProcedureYieldItem>,
  ): void {
    onPatch({
      ...block,
      yieldItems: yieldItems.map((item, j) =>
        j === idx ? { ...item, ...patch } : item,
      ),
    });
  }

  function removeYieldItem(idx: number): void {
    onPatch({
      ...block,
      yieldItems: yieldItems.filter((_, j) => j !== idx),
    });
  }

  return (
    <div className="space-y-4 pt-1">
      {/* Yield & Batch Metrics */}
      <RecipeYieldSection
        yieldItems={yieldItems}
        onChange={(nextYield) => onPatch({ ...block, yieldItems: nextYield })}
      />

      {/* Streamlined Ingredients table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-sm font-semibold text-[var(--color-ink)]">
            Ingredients ({ingredients.length})
          </Label>
        </div>

        {ingredients.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-2)] p-4 text-center text-sm text-[var(--color-ink-3)]">
            No ingredients added yet.{" "}
            <button
              type="button"
              onClick={addIngredient}
              className="font-medium text-[var(--color-brand)] underline hover:no-underline"
            >
              Add the first ingredient
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--color-line-2)] bg-[var(--color-wash)]/60 text-[var(--color-ink-2)]">
                  <th className="p-2 font-semibold">Ingredient name</th>
                  <th className="w-56 p-2 font-semibold">Amount / Qty</th>
                  <th
                    className="w-20 p-2 font-semibold text-center"
                    title="Mark as allergen"
                  >
                    Allergen
                  </th>
                  <th className="w-8 p-2 text-center" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line-2)]">
                {ingredients.map((row, i) => {
                  const displayAmount =
                    row.amounts[0] ?? (row.unit ? `${row.unit}` : "");
                  return (
                    <tr
                      key={i}
                      className="hover:bg-[var(--color-wash)]/30 transition-colors"
                    >
                      <td className="p-1.5">
                        <Input
                          value={row.name}
                          maxLength={100}
                          onChange={(e) =>
                            updateIngredient(i, { name: e.target.value })
                          }
                          placeholder="e.g. Halibut, Beer batter, Taco tortillas..."
                          className="h-8 text-xs font-medium"
                        />
                      </td>
                      <td className="p-1.5">
                        <Input
                          value={displayAmount}
                          maxLength={50}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateIngredient(i, { amounts: [val] });
                          }}
                          placeholder="e.g. 2 pieces, 1 pinch, to taste..."
                          className="h-8 text-xs"
                        />
                      </td>
                      <td className="p-1.5 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={Boolean(row.allergen)}
                          onChange={(e) =>
                            updateIngredient(i, { allergen: e.target.checked })
                          }
                          className="size-4 cursor-pointer accent-[var(--color-warn)]"
                          title="Contains allergen"
                        />
                      </td>
                      <td className="p-1.5 text-center align-middle">
                        <button
                          type="button"
                          onClick={() => removeIngredient(i)}
                          className="flex size-7 items-center justify-center rounded text-[var(--color-ink-3)] hover:bg-[var(--color-bad-tint)] hover:text-[var(--color-bad)] transition-colors"
                          title="Remove ingredient"
                        >
                          <Icon icon="ri-delete-bin-line" className="text-sm" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {ingredients.length > 0 && (
          <button
            type="button"
            onClick={addIngredient}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-[var(--color-ink-3)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)] cursor-pointer transition-colors"
          >
            <Icon icon="ri-add-line" />
            Add ingredient
          </button>
        )}
      </div>
    </div>
  );
}
