"use client";

/**
 * Inline editor for a `kind: 'recipe'` block, embedded inside a single
 * NotionBlockList row.
 *
 * Intentionally simple: ingredients (name + unit + one amount) and method
 * steps, with an optional allergen chip picker collapsed at the bottom. The
 * richer fields (audience copy, yield rows, multi-factor scaler pills) live
 * only in the wizard's standalone recipe editor — they were deemed too much
 * for an inline block by the manager mid-flow.
 *
 * State is held entirely by the parent — every edit is funnelled through
 * `onPatch({ ...block, ...patch })`. The bilingual `lang` prop comes from the
 * surrounding `BlockRow`'s `LangToggle`, matching `MethodBody` /
 * `ChecklistBody`.
 *
 * Scaler factor count is hardcoded to `[1]` so the cook reader shows one
 * amount column. The legacy `factors` value on the block is preserved on save
 * (still `[1]`), keeping the data shape round-trippable with the wizard.
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import { LuX } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select";
import { Icon } from "@/components/ui/icon";
import { RowActions } from "@/components/ui/row-actions";
import { BilingualInput } from "@/components/ui/bilingual-input";
import { cn } from "@/lib/utils";
import { ALLERGEN_KEYS, type AllergenKey } from "@/lib/allergens";
import { nextStepId } from "@/lib/procedure-blocks";
import type {
  Localised,
  ProcedureAllergen,
  ProcedureBlock,
  ProcedureIngredient,
  ProcedureMethodStep,
  ProcedureYieldItem,
} from "@/lib/types";

type RecipeBlock = Extract<ProcedureBlock, { kind: "recipe" }>;

interface RecipeBlockBodyProps {
  block: RecipeBlock;
  onPatch: (next: RecipeBlock) => void;
  lang?: "en" | "es";
}

// ---------------------------------------------------------------------------
// Localised helpers (mirrored from notion-block-list.tsx).
// ---------------------------------------------------------------------------

function asLoc(v: Localised | undefined, lang: "en" | "es"): string {
  return v?.[lang] ?? "";
}
function setLoc(
  v: Localised | undefined,
  lang: "en" | "es",
  value: string,
): Localised {
  return { en: v?.en ?? "", es: v?.es ?? "", [lang]: value };
}

const bodyTextareaCls =
  "flex w-full resize-none rounded-[var(--radius-md)] border border-transparent bg-transparent px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] transition-colors hover:border-[var(--color-line-2)] hover:bg-[var(--color-surface)] focus:border-[var(--color-ring)] focus:bg-[var(--color-surface)] focus:outline-none";

// Same unit list as the wizard's standalone recipe editor. Local duplication
// keeps this file self-contained — both editors treat the list as a fixed
// vocabulary of unit suffixes, not a registry.
const UNITS = [
  "g",
  "kg",
  "ml",
  "l",
  "oz",
  "lb",
  "cup",
  "tbsp",
  "tsp",
  "pcs",
  "each",
] as const;

/** One amount input per ingredient. `factors` is always `[1]` here so the
 *  parallel-array requirement (amounts.length === factors.length) collapses
 *  to a single string. */
function emptyIngredient(): ProcedureIngredient {
  return { name: "", form: "", allergen: false, unit: "", amounts: [""] };
}

// ---------------------------------------------------------------------------
// Top-level body. Owns the section layout; each section is its own small
// inline component below.
// ---------------------------------------------------------------------------

export function RecipeBlockBody({
  block,
  onPatch,
  lang,
}: RecipeBlockBodyProps): React.ReactElement {
  const tForm = useTranslations("admin.library.new.form");
  const ingredients = block.ingredients ?? [];
  const yieldItems = block.yieldItems ?? [];

  return (
    <div className="space-y-4 pt-1">
      <RecipeYieldSection
        yieldItems={yieldItems}
        onChange={(nextYield) => onPatch({ ...block, yieldItems: nextYield })}
      />

      <RecipeIngredients
        ingredients={ingredients}
        onChange={(next) =>
          onPatch({ ...block, factors: [1], ingredients: next })
        }
        labels={{
          title: tForm("ingredientsTitle"),
          add: tForm("addIngredient"),
          none: tForm("none"),
          name: tForm("ingredientName"),
          namePlaceholder: tForm("ingredientNamePlaceholder"),
          unit: tForm("ingredientUnit"),
          amount: tForm("ingredientAmount"),
          amountPlaceholder: tForm("ingredientAmountPlaceholder"),
          remove: tForm("remove"),
        }}
      />

      <RecipeStepList
        steps={block.steps}
        onChange={(steps) => onPatch({ ...block, steps })}
        lang={lang}
        labels={{
          title: tForm("stepsTitle"),
          add: tForm("addStep"),
        }}
      />

      <RecipeAllergens
        allergen={block.allergen}
        onChange={(allergen) => onPatch({ ...block, allergen })}
        labels={{
          title: tForm("allergenTitle"),
          picker: tForm("allergenPickerLabel"),
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Yield & Batch Metrics (e.g. Total Batch Weight, Portion Count, Portion Size)
// ---------------------------------------------------------------------------

export function RecipeYieldSection({
  yieldItems,
  onChange,
}: {
  yieldItems: ProcedureYieldItem[];
  onChange: (next: ProcedureYieldItem[]) => void;
}): React.ReactElement {
  const PRESETS = [
    { label: "Total Batch Weight", value: "2.5", unit: "kg", scales: true },
    { label: "Portion Count", value: "20", unit: "tacos", scales: true },
    { label: "Portion Size", value: "125", unit: "g", scales: false },
    { label: "Total Cooking Time", value: "3.5", unit: "hrs", scales: false },
  ];

  function addPreset(p: (typeof PRESETS)[0]): void {
    onChange([
      ...yieldItems,
      { label: p.label, value: p.value, unit: p.unit, scales: p.scales },
    ]);
  }

  function addEmpty(): void {
    onChange([...yieldItems, { label: "", value: "", unit: "", scales: true }]);
  }

  function updateItem(idx: number, patch: Partial<ProcedureYieldItem>): void {
    onChange(
      yieldItems.map((item, j) => (j === idx ? { ...item, ...patch } : item)),
    );
  }

  function removeItem(idx: number): void {
    onChange(yieldItems.filter((_, j) => j !== idx));
  }

  return (
    <div className="space-y-2.5 pt-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-semibold text-[var(--color-ink)] flex items-center gap-1.5">
          <Icon
            icon="ri-scales-3-line"
            className="text-base text-[var(--color-brand)]"
          />
          Yield &amp; Batch Metrics
          {yieldItems.length > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-[var(--color-wash)] border border-[var(--color-line-2)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-ink-2)]">
              {yieldItems.length}
            </span>
          )}
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addEmpty}
          className="h-7 text-xs font-medium"
        >
          <Icon icon="ri-add-line" className="mr-1" />
          Add metric
        </Button>
      </div>

      {/* Quick preset chips / pills with distinct spacing & states */}
      <div className="flex flex-wrap items-center gap-2 py-0.5">
        <span className="text-[11px] font-semibold text-[var(--color-ink-3)] uppercase tracking-wider">
          Presets:
        </span>
        {PRESETS.map((p) => {
          const exists = yieldItems.some(
            (y) => y.label.toLowerCase() === p.label.toLowerCase(),
          );
          return (
            <button
              key={p.label}
              type="button"
              disabled={exists}
              onClick={() => addPreset(p)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all border",
                exists
                  ? "border-[var(--color-line-2)]/80 bg-[var(--color-wash)]/60 text-[var(--color-ink-3)] cursor-default select-none"
                  : "border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand)] hover:bg-[var(--color-brand)]/5 active:scale-95 cursor-pointer shadow-2xs",
              )}
            >
              {exists ? (
                <Icon
                  icon="ri-check-line"
                  className="text-xs text-[var(--color-ink-3)]"
                />
              ) : (
                <Icon
                  icon="ri-add-line"
                  className="text-xs text-[var(--color-brand)]"
                />
              )}
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>

      {yieldItems.length === 0 ? (
        <p className="text-[11px] text-[var(--color-ink-3)] italic py-1">
          Optional: Click a preset above (e.g. Total Batch Weight, Portion
          Count) to show batch yield metrics in the recipe header.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-line-2)] bg-[var(--color-wash)]/60 text-[var(--color-ink-2)]">
                <th className="px-3.5 py-2.5 font-semibold">Metric Name</th>
                <th className="w-28 px-3 py-2.5 font-semibold text-center">
                  Value
                </th>
                <th className="w-28 px-3 py-2.5 font-semibold">Unit</th>
                <th
                  className="w-20 px-2 py-2.5 font-semibold text-center"
                  title="Scales when multiplying batch (1×, 2×, 4×)"
                >
                  Scales?
                </th>
                <th className="w-12 px-2 py-2.5 text-center">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line-2)]">
              {yieldItems.map((item, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-[var(--color-wash)]/30 transition-colors"
                >
                  <td className="p-2.5 pl-3.5">
                    <Input
                      value={item.label}
                      onChange={(e) =>
                        updateItem(idx, { label: e.target.value })
                      }
                      placeholder="e.g. Total Batch Weight"
                      className="h-8 text-xs font-medium placeholder:font-normal placeholder:text-[var(--color-ink-3)]/50"
                    />
                  </td>
                  <td className="w-28 p-2.5">
                    <Input
                      value={item.value}
                      onChange={(e) =>
                        updateItem(idx, { value: e.target.value })
                      }
                      placeholder="e.g. 2.5"
                      className="h-8 text-xs text-center font-semibold placeholder:font-normal placeholder:text-[var(--color-ink-3)]/40"
                    />
                  </td>
                  <td className="w-28 p-2.5">
                    <Input
                      value={item.unit ?? ""}
                      onChange={(e) =>
                        updateItem(idx, { unit: e.target.value })
                      }
                      placeholder="e.g. kg"
                      className="h-8 text-xs font-medium placeholder:font-normal placeholder:text-[var(--color-ink-3)]/50"
                    />
                  </td>
                  <td className="w-20 p-2.5 text-center">
                    <label
                      className="inline-flex items-center justify-center cursor-pointer p-1 rounded hover:bg-[var(--color-wash)] transition-colors"
                      title="Scales with batch factor"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(item.scales)}
                        onChange={(e) =>
                          updateItem(idx, { scales: e.target.checked })
                        }
                        className="size-4 rounded accent-[var(--color-brand)] cursor-pointer"
                      />
                    </label>
                  </td>
                  <td className="w-12 p-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="inline-flex size-7 items-center justify-center rounded-md text-[var(--color-ink-3)] hover:text-[var(--color-bad)] hover:bg-[var(--color-bad-tint)] transition-colors cursor-pointer"
                      title="Remove metric"
                    >
                      <Icon icon="ri-delete-bin-line" className="text-sm" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ingredients — name + unit + one amount per ingredient.
// ---------------------------------------------------------------------------

function RecipeIngredients({
  ingredients,
  onChange,
  labels,
}: {
  ingredients: ProcedureIngredient[];
  onChange: (next: ProcedureIngredient[]) => void;
  labels: {
    title: string;
    add: string;
    none: string;
    name: string;
    namePlaceholder: string;
    unit: string;
    amount: string;
    amountPlaceholder: string;
    remove: string;
  };
}): React.ReactElement {
  function updateIngredient(
    idx: number,
    patch: Partial<ProcedureIngredient>,
  ): void {
    onChange(ingredients.map((x, j) => (j === idx ? { ...x, ...patch } : x)));
  }
  function setAmount(idx: number, value: string): void {
    onChange(
      ingredients.map((x, j) => (j === idx ? { ...x, amounts: [value] } : x)),
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-semibold">{labels.title}</Label>
      </div>
      {ingredients.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-3)]">{labels.none}</p>
      ) : (
        <ul role="list" className="space-y-2">
          {ingredients.map((row, i) => (
            <li
              key={i}
              className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_5rem_5rem_auto] sm:items-center"
            >
              <Input
                value={row.name}
                onChange={(e) => updateIngredient(i, { name: e.target.value })}
                placeholder={labels.namePlaceholder}
                aria-label={labels.name}
              />
              <CustomSelect
                size="sm"
                value={row.unit ?? ""}
                onChange={(val) => updateIngredient(i, { unit: val })}
                options={UNITS.map((u) => ({ value: u, label: u }))}
                aria-label={labels.unit}
              />
              <Input
                type="text"
                value={row.amounts[0] ?? ""}
                onChange={(e) => setAmount(i, e.target.value)}
                placeholder={labels.amountPlaceholder}
                aria-label={labels.amount}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={labels.remove}
                onClick={() => onChange(ingredients.filter((_, j) => j !== i))}
              >
                <LuX aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {ingredients.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([...ingredients, emptyIngredient()])}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-[var(--color-ink-3)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)] cursor-pointer transition-colors"
        >
          <Icon icon="ri-add-line" />
          {labels.add}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Method steps — mirrors `MethodBody`'s row shape (numbered circles, bilingual
// textarea, kebab menu). Backend requires ≥1 step so the remove button is
// disabled when only one remains.
// ---------------------------------------------------------------------------

function RecipeStepList({
  steps,
  onChange,
  labels,
}: {
  steps: ProcedureMethodStep[];
  onChange: (next: ProcedureMethodStep[]) => void;
  lang?: "en" | "es";
  labels: { title: string; add: string };
}): React.ReactElement {
  const update = (idx: number, next: ProcedureMethodStep): void => {
    onChange(steps.map((s, i) => (i === idx ? next : s)));
  };
  const remove = (idx: number): void => {
    onChange(steps.filter((_, i) => i !== idx));
  };
  const move = (idx: number, dir: "up" | "down"): void => {
    const j = dir === "up" ? idx - 1 : idx + 1;
    if (j < 0 || j >= steps.length) return;
    onChange([
      ...steps.slice(0, idx),
      steps[j],
      steps[idx],
      ...steps.slice(idx + 1),
    ]);
  };
  const add = (): void => {
    onChange([...steps, { id: nextStepId(), body: { en: "", es: "" } }]);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm">{labels.title}</Label>
        <Button type="button" variant="ghost" size="sm" onClick={add}>
          + {labels.add}
        </Button>
      </div>
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={step.id ?? i} className="flex gap-3 items-start">
            <span className="mt-2 inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-line-2)] bg-[var(--color-surface)] font-mono text-sm font-semibold text-[var(--color-ink)]">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="flex-1 space-y-1">
              <BilingualInput
                value={step.body}
                onChange={(val) => update(i, { ...step, body: val })}
                multiline
                placeholder={{
                  en: "Describe this step in English…",
                  es: "Describe este paso en español…",
                }}
              />
              {step.critical ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-warn-tint)] px-2 py-0.5 text-xs font-semibold uppercase text-[var(--color-warn-ink)]">
                  <Icon icon="ri-focus-3-line" />
                  Critical
                </span>
              ) : null}
            </div>
            <StepRowMenu
              index={i}
              total={steps.length}
              onMove={(dir) => move(i, dir)}
              onRemove={() => remove(i)}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}

function StepRowMenu({
  index,
  total,
  onMove,
  onRemove,
}: {
  index: number;
  total: number;
  onMove: (dir: "up" | "down") => void;
  onRemove: () => void;
}): React.ReactElement {
  const canRemove = total > 1;
  const items = [
    ...(index > 0
      ? [
          {
            label: "Move up",
            icon: "ri-arrow-up-line",
            onSelect: () => onMove("up"),
          },
        ]
      : []),
    ...(index < total - 1
      ? [
          {
            label: "Move down",
            icon: "ri-arrow-down-line",
            onSelect: () => onMove("down"),
          },
        ]
      : []),
    {
      label: "Delete step",
      icon: "ri-close-line",
      destructive: true,
      confirmTitle: "Delete this step?",
      confirmLabel: "Delete step",
      confirmDescription:
        "This step and its instructions will be permanently removed. This can't be undone.",
      disabled: !canRemove,
      onSelect: () => {
        if (canRemove) onRemove();
      },
    },
  ];
  return <RowActions triggerLabel="Step actions" items={items} />;
}

// ---------------------------------------------------------------------------
// Allergens — collapsed disclosure with a chip picker. `block.allergen` stays
// `undefined` until the user picks at least one chip, so empty recipes don't
// carry a useless empty object on save. Summary/detail fields are intentionally
// absent here — the cook reader renders just the chips and skips empty
// `<b>` / `<p>` elements.
// ---------------------------------------------------------------------------

function RecipeAllergens({
  allergen,
  onChange,
  labels,
}: {
  allergen: ProcedureAllergen | undefined;
  onChange: (next: ProcedureAllergen | undefined) => void;
  labels: { title: string; picker: string };
}): React.ReactElement {
  const tForm = useTranslations("admin.library.new.form");
  const selected = allergen?.selectedAllergens ?? [];
  const [customInput, setCustomInput] = React.useState("");

  const standardSet = new Set<string>(ALLERGEN_KEYS);
  const customTags = selected.filter((k) => !standardSet.has(k));

  function toggle(key: AllergenKey, on: boolean): void {
    const set = new Set(selected);
    if (on) set.add(key);
    else set.delete(key);
    const nextSelected = Array.from(set);
    if (nextSelected.length === 0) {
      onChange(undefined);
    } else {
      onChange({
        summary: allergen?.summary?.trim() || "Contains allergens",
        detail:
          allergen?.detail?.trim() ||
          "Please check ingredients list for allergen details",
        selectedAllergens: nextSelected,
      });
    }
  }

  function addCustom(): void {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (!selected.includes(trimmed as AllergenKey)) {
      const next = [...selected, trimmed as AllergenKey];
      onChange({
        summary: allergen?.summary?.trim() || "Contains allergens",
        detail:
          allergen?.detail?.trim() ||
          "Please check ingredients list for allergen details",
        selectedAllergens: next,
      });
    }
    setCustomInput("");
  }

  function removeCustom(tag: string): void {
    const next = selected.filter((k) => k !== tag);
    if (next.length === 0) {
      onChange(undefined);
    } else {
      onChange({
        summary: allergen?.summary?.trim() || "Contains allergens",
        detail:
          allergen?.detail?.trim() ||
          "Please check ingredients list for allergen details",
        selectedAllergens: next,
      });
    }
  }

  return (
    <details className="rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-2">
      <summary className="cursor-pointer text-sm font-semibold text-[var(--color-ink)] flex items-center justify-between">
        <span className="flex items-center gap-2">
          {labels.title}
          {selected.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-[var(--color-warn-tint)] px-2 py-0.5 text-xs font-semibold text-[var(--color-warn-ink)]">
              {selected.length}
            </span>
          )}
        </span>
      </summary>
      <div className="mt-3 space-y-3">
        <p className="text-sm text-[var(--color-ink-3)]">{labels.picker}</p>
        <fieldset className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ALLERGEN_KEYS.map((key) => {
            const checked = selected.includes(key);
            return (
              <label
                key={key}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-2 text-sm transition-colors",
                  checked
                    ? "border-[var(--color-warn)] bg-[var(--color-warn-tint)] text-[var(--color-ink)]"
                    : "border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:bg-[var(--color-wash)]",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => toggle(key, e.target.checked)}
                />
                {tForm(`allergens.${key}` as `allergens.${AllergenKey}`)}
              </label>
            );
          })}
        </fieldset>

        {/* Custom allergen chips & small inline add input */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {customTags.length > 0 && (
            <span className="text-xs font-semibold text-[var(--color-ink-3)]">
              Custom:
            </span>
          )}
          {customTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-warn)] bg-[var(--color-warn-tint)] px-3 py-1 text-xs font-medium text-[var(--color-warn-ink)] shadow-[var(--e-1)]"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => removeCustom(tag)}
                className="flex size-4 items-center justify-center rounded-full hover:bg-[var(--color-warn)]/25 text-[var(--color-warn-ink)] transition-colors"
                aria-label={`Remove ${tag}`}
              >
                <Icon icon="ri-close-line" className="text-xs" />
              </button>
            </span>
          ))}

          {/* Small compact input with + icon */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line-2)] bg-[var(--color-surface)] pl-3 pr-2 py-1 text-xs shadow-[var(--e-1)] focus-within:border-[var(--color-ring)] focus-within:ring-1 focus-within:ring-[var(--color-ring)] transition-all ml-1">
            <button
              type="button"
              onClick={addCustom}
              disabled={!customInput.trim()}
              title="Add allergen"
              className="flex size-5 items-center justify-center rounded-full text-[var(--color-brand-600)] hover:bg-[var(--color-brand-tint)] disabled:text-[var(--color-ink-3)] disabled:opacity-40 transition-colors"
            >
              <Icon icon="ri-add-line" className="text-sm font-bold" />
            </button>
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
              placeholder="Add other..."
              className="w-32 bg-transparent text-xs text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:outline-none"
            />
          </div>
        </div>
      </div>
    </details>
  );
}
