"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom-select";
import { cn } from "@/lib/utils";
import {
  LuGripVertical,
  LuLayers,
  LuPlus,
  LuScale,
  LuTrash2,
  LuUtensils,
} from "react-icons/lu";
import { IconTile } from "@/components/ui/icon-tile";

export interface RecipeIngredientItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  notes: string;
}

const UNITS = [
  "kg",
  "g",
  "l",
  "ml",
  "oz",
  "lb",
  "cup",
  "tbsp",
  "tsp",
  "pcs",
  "ea",
] as const;

export function newIngredientItem(): RecipeIngredientItem {
  return {
    id: `ing-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    quantity: "",
    unit: "kg",
    notes: "",
  };
}

interface YieldItemShape {
  label: string;
  value: string;
  unit?: string;
}

interface RecipeIngredientsEditorProps {
  ingredients: RecipeIngredientItem[];
  onChange: (next: RecipeIngredientItem[]) => void;
  selectedFactor: number;
  onSelectFactor: (factor: number) => void;
  /** Captured yield facts (total yield, portions, portion size, total time).
   *  Manager may leave any field's value/unit blank; empty rows are dropped
   *  on save. Editor only matches by `label` so renaming a label persists as
   *  a removal of the old entry. */
  yieldItems: YieldItemShape[];
  onChangeYield: (next: YieldItemShape[]) => void;
}

export function RecipeIngredientsEditor({
  ingredients,
  onChange,
  selectedFactor,
  onSelectFactor,
  yieldItems,
  onChangeYield,
}: RecipeIngredientsEditorProps): React.ReactElement {
  const t = useTranslations("admin.library.new.recipe");

  function patchYield(label: string, patch: Partial<YieldItemShape>): void {
    onChangeYield(
      yieldItems.map((row) =>
        row.label === label ? { ...row, ...patch } : row,
      ),
    );
  }

  function updateItem(id: string, patch: Partial<RecipeIngredientItem>): void {
    onChange(
      ingredients.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    );
  }

  function removeItem(id: string): void {
    if (ingredients.length <= 1) return;
    onChange(ingredients.filter((item) => item.id !== id));
  }

  function addItem(): void {
    onChange([...ingredients, newIngredientItem()]);
  }

  // Calculate total base weight estimate for scaling display (e.g. 2 kg)
  const totalBaseWeight = ingredients.reduce((sum, item) => {
    const val = parseFloat(item.quantity);
    return isNaN(val) ? sum : sum + val;
  }, 0);

  return (
    <section
      id="proc-ingredients"
      className="scroll-mt-6 space-y-5 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6"
    >
      <header className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
        <div className="flex items-center gap-3">
          <IconTile size="md" icon={LuUtensils} />
          <div>
            <h2 className="font-[family-name:var(--font-ui)] text-md font-semibold text-[var(--color-ink)]">
              {t("ingredientsTitle")}
            </h2>
            <p className="mt-0.5 text-sm text-[var(--color-ink-2)]">
              {t("ingredientsSubtitle")}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={addItem}
          className="gap-1 text-sm"
        >
          <LuPlus aria-hidden="true" />
          {t("addIngredient")}
        </Button>
      </header>

      {/* Ingredients Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-line-2)] text-sm font-semibold text-[var(--color-ink-3)]">
              <th scope="col" className="w-8 py-2 text-center"></th>
              <th scope="col" className="py-2 pl-2">
                {t("colIngredient")}
              </th>
              <th scope="col" className="w-field-xs py-2 px-2">
                {t("colQuantity")}
              </th>
              <th scope="col" className="w-field-xs py-2 px-2">
                {t("colUnit")}
              </th>
              <th scope="col" className="py-2 px-2">
                {t("colNotes")}
              </th>
              <th scope="col" className="w-10 py-2 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-line)]">
            {ingredients.map((item) => (
              <tr
                key={item.id}
                className="group transition-colors hover:bg-[var(--color-wash)]"
              >
                <td className="py-2 text-center text-[var(--color-ink-3)] cursor-grab">
                  <LuGripVertical aria-hidden="true" />
                </td>
                <td className="py-2 pl-2">
                  <Input
                    value={item.name}
                    onChange={(e) =>
                      updateItem(item.id, { name: e.target.value })
                    }
                    placeholder={t("ingredientPlaceholder")}
                  />
                </td>
                <td className="py-2 px-2">
                  <Input
                    type="number"
                    step="any"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.id, { quantity: e.target.value })
                    }
                    placeholder="0"
                  />
                </td>
                <td className="py-2 px-2">
                  <CustomSelect
                    size="sm"
                    value={item.unit}
                    onChange={(val) => updateItem(item.id, { unit: val })}
                    options={UNITS.map((u) => ({ value: u, label: u }))}
                  />
                </td>
                <td className="py-2 px-2">
                  <Input
                    value={item.notes}
                    onChange={(e) =>
                      updateItem(item.id, { notes: e.target.value })
                    }
                    placeholder={t("notesPlaceholder")}
                  />
                </td>
                <td className="py-2 text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={ingredients.length <= 1}
                    onClick={() => removeItem(item.id)}
                    aria-label={t("removeIngredient")}
                    className="size-8 text-[var(--color-ink-3)] hover:text-[var(--color-bad)]"
                  >
                    <LuTrash2 aria-hidden="true" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Yield capture (total yield, portions, portion size, total time) */}
      <div className="rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)] p-4 space-y-3">
        <div className="flex items-center gap-2 text-[var(--color-ink-2)]">
          <LuScale aria-hidden="true" className="text-lg" />
          <h3 className="font-[family-name:var(--font-ui)] text-sm font-semibold">
            {t("yieldTitle")}
          </h3>
        </div>
        <p className="text-sm text-[var(--color-ink-2)]">
          {t("yieldSubtitle")}
        </p>

        <ul className="space-y-2">
          {yieldItems.map((row) => (
            <li
              key={row.label}
              className="grid grid-cols-[minmax(0,1fr)_var(--field-xs)_var(--field-xs)] items-center gap-3"
            >
              <label className="text-sm font-semibold text-[var(--color-ink-2)]">
                {row.label}
              </label>
              <Input
                value={row.value}
                onChange={(e) =>
                  patchYield(row.label, { value: e.target.value })
                }
                inputMode="decimal"
                placeholder={t("yieldValuePlaceholder")}
                aria-label={`${row.label} value`}
              />
              <Input
                value={row.unit ?? ""}
                onChange={(e) =>
                  patchYield(row.label, { unit: e.target.value })
                }
                placeholder={t("yieldUnitPlaceholder")}
                aria-label={`${row.label} unit`}
              />
            </li>
          ))}
        </ul>
      </div>

      {/* Batch size section */}
      <div className="rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)] p-4 space-y-3">
        <div className="flex items-center gap-2 text-[var(--color-ink-2)]">
          <LuLayers aria-hidden="true" className="text-lg" />
          <h3 className="font-[family-name:var(--font-ui)] text-sm font-semibold">
            {t("batchSizeTitle")}
          </h3>
        </div>
        <p className="text-sm text-[var(--color-ink-2)]">
          {t("batchSizeSubtitle")}
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {[1, 2, 4].map((factor) => {
            const isSelected = selectedFactor === factor;
            const scaledDisplay =
              totalBaseWeight > 0
                ? `${(totalBaseWeight * factor).toFixed(0)} kg`
                : "";
            const batchWord =
              factor === 1 ? t("batchSizeSingular") : t("batchSizePlural");
            return (
              <button
                key={factor}
                type="button"
                onClick={() => onSelectFactor(factor)}
                aria-pressed={isSelected}
                aria-label={`${factor} ${batchWord}`}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all",
                  isSelected
                    ? "border-[var(--color-ring)] bg-[var(--color-brand-600)] text-white"
                    : "border-[var(--color-line-3)] bg-[var(--color-surface)] text-[var(--color-ink-2)]",
                )}
              >
                <span>
                  {factor} {batchWord}
                </span>
                {scaledDisplay && (
                  <span className="font-normal text-[var(--color-ink-3)]">
                    {scaledDisplay}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
