'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { classifyVideoUrl } from '@/lib/procedure-media';
import { LuArrowDown, LuArrowUp, LuCamera, LuChevronDown, LuChevronUp, LuCircleAlert, LuCirclePlay, LuCloudUpload, LuCopy, LuFocus, LuGripVertical, LuHeading1, LuHeading2, LuHeading3, LuImage, LuImagePlus, LuLightbulb, LuLink, LuListChecks, LuListOrdered, LuPaperclip, LuPlus, LuRefreshCw, LuRotateCcw, LuTable, LuTrash2, LuTriangleAlert, LuType, LuUpload, LuUtensils, LuVideo, LuWorkflow, LuWrench, LuX } from 'react-icons/lu';
import { Icon } from '@/components/ui/icon';
import type { IconType } from 'react-icons';
import type { ProcedureBlock } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CustomSelect } from '@/components/ui/custom-select';
import { syncAmountsWithFactors } from '@/lib/procedure-blocks';
import { ALLERGEN_KEYS, type AllergenKey } from '@/lib/allergens';
import { StepsList } from './step-editors';

// Must stay in sync with the backend whitelist at lms-backend/src/services/uploads.ts.
// SVG is intentionally omitted — it can carry inline JS.
import { ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES, BilingualTabs, EditorProps, Field, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, NOTE_KINDS, UNITS, asLocalised, asOpt, emptyCriticalLimit, emptyIngredient, newMethodStep, setLocalised, setOpt, textareaCls } from './shared';

export function RecipeEditor({
  block,
  onChange,
}: EditorProps<Extract<ProcedureBlock, { kind: 'recipe' }>>): React.ReactElement {
  const tForm = useTranslations('admin.library.new.form');
  const tComp = useTranslations('admin.library.new.form.composer');
  const [lang, setLang] = React.useState<'en' | 'es'>('en');
  const factors = block.factors ?? [];
  const yields = block.yieldItems ?? [];
  const ingredients = block.ingredients ?? [];

  return (
    <div className="space-y-5">
      <Field label={tForm('audience')}>
        <textarea
          value={block.audience ?? ''}
          onChange={(e) => onChange({ ...block, audience: e.target.value })}
          rows={2}
          placeholder={tForm('audiencePlaceholder')}
          className={textareaCls}
        />
      </Field>

      <div className="space-y-3">
        <Label className="text-sm">{tForm('allergenTitle')}</Label>

        <fieldset className="space-y-2">
          <legend className="text-sm text-[var(--color-ink-3)]">
            {tForm('allergenPickerLabel')}
          </legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ALLERGEN_KEYS.map((key) => {
              const checked = block.allergen?.selectedAllergens?.includes(key) ?? false;
              const ensureAllergen = (mutate: (a: { summary: string; detail: string; selectedAllergens?: string[] }) => void) => {
                const current = block.allergen ?? { summary: '', detail: '' };
                const draft = {
                  summary: current.summary,
                  detail: current.detail,
                  selectedAllergens: current.selectedAllergens ? [...current.selectedAllergens] : [],
                };
                mutate(draft);
                onChange({ ...block, allergen: draft });
              };
              return (
                <label
                  key={key}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-2 text-sm transition-colors',
                    checked
                      ? 'border-[var(--color-warn)] bg-[var(--color-warn-tint)] text-[var(--color-ink)]'
                      : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:bg-[var(--color-wash)]',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) =>
                      ensureAllergen((a) => {
                        const set = new Set(a.selectedAllergens ?? []);
                        if (e.target.checked) set.add(key);
                        else set.delete(key);
                        a.selectedAllergens = set.size > 0 ? Array.from(set) : undefined;
                      })
                    }
                  />
                  {tForm(`allergens.${key}` as `allergens.${AllergenKey}`)}
                </label>
              );
            })}
          </div>

          {/* Custom Allergen Tags & Add Input */}
          {(() => {
            const currentSelected = block.allergen?.selectedAllergens ?? [];
            const standardSet = new Set<string>(ALLERGEN_KEYS);
            const customTags = currentSelected.filter((k) => !standardSet.has(k));

            const addCustom = (name: string) => {
              const trimmed = name.trim();
              if (!trimmed) return;
              if (!currentSelected.includes(trimmed)) {
                const next = [...currentSelected, trimmed];
                onChange({
                  ...block,
                  allergen: {
                    summary: block.allergen?.summary ?? '',
                    detail: block.allergen?.detail ?? '',
                    selectedAllergens: next,
                  },
                });
              }
            };

            const removeCustom = (tag: string) => {
              const next = currentSelected.filter((k) => k !== tag);
              onChange({
                ...block,
                allergen: {
                  summary: block.allergen?.summary ?? '',
                  detail: block.allergen?.detail ?? '',
                  selectedAllergens: next.length > 0 ? next : undefined,
                },
              });
            };

            return (
              <div className="pt-2 space-y-2">
                <span className="text-sm font-semibold text-[var(--color-ink-2)] block">
                  Custom Allergens:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {customTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-warn-tint)] px-3 py-1 text-sm font-semibold text-[var(--color-warn-ink)]"
                    >
                      <span>{tag}</span>
                      <button
                        aria-label={`Remove ${tag}`}
                        type="button"
                        onClick={() => removeCustom(tag)}
                        className="hover:text-[var(--color-bad)] font-semibold ml-0.5"
                        title={`Remove ${tag}`}
                      >
                        <LuX aria-hidden="true" />
                      </button>
                    </span>
                  ))}

                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="e.g. Mustard, Sulfites, Gluten..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = e.currentTarget.value;
                          addCustom(val);
                          e.currentTarget.value = '';
                        }
                      }}
                      className="h-8 text-sm w-field-md"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                        if (input && input.value) {
                          addCustom(input.value);
                          input.value = '';
                        }
                      }}
                      className="h-8 px-3 text-sm font-semibold"
                    >
                      + Add Allergen
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </fieldset>

        <Field label={tForm('allergenSummary')}>
          <Input
            value={block.allergen?.summary ?? ''}
            onChange={(e) =>
              onChange({
                ...block,
                allergen: {
                  summary: e.target.value,
                  detail: block.allergen?.detail ?? '',
                  selectedAllergens: block.allergen?.selectedAllergens,
                },
              })
            }
            maxLength={50}
            placeholder={tForm('allergenSummaryPlaceholder')}
          />
        </Field>
        <Field label={tForm('allergenDetail')}>
          <textarea
            value={block.allergen?.detail ?? ''}
            onChange={(e) =>
              onChange({
                ...block,
                allergen: {
                  summary: block.allergen?.summary ?? '',
                  detail: e.target.value,
                  selectedAllergens: block.allergen?.selectedAllergens,
                },
              })
            }
            rows={2}
            placeholder={tForm('allergenDetailPlaceholder')}
            className={textareaCls}
          />
        </Field>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-sm">{tForm('yieldTitle')}</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({
                ...block,
                yieldItems: [...yields, { label: '', value: '', unit: '' }],
              })
            }
          >
            + {tForm('add')}
          </Button>
        </div>
        <BilingualTabs active={lang} onChange={setLang} enLabel={tComp('tabs.en')} esLabel={tComp('tabs.es')} />
        {yields.map((y, i) => (
          <div key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1.5fr_1fr_0.75fr_auto]">
            <Input
              value={y.label}
              onChange={(e) =>
                onChange({
                  ...block,
                  yieldItems: yields.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                })
              }
              placeholder={tForm('yieldLabel')}
            />
            <Input
              value={y.value}
              onChange={(e) =>
                onChange({
                  ...block,
                  yieldItems: yields.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)),
                })
              }
              maxLength={50}
              placeholder={tForm('yieldValue')}
            />
            <Input
              value={y.unit ?? ''}
              onChange={(e) =>
                onChange({
                  ...block,
                  yieldItems: yields.map((x, j) => (j === i ? { ...x, unit: e.target.value } : x)),
                })
              }
              placeholder={tForm('yieldUnit')}
            />
            {yields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={tForm('remove')}
                onClick={() =>
                  onChange({ ...block, yieldItems: yields.filter((_, j) => j !== i) })
                }
              >
                <LuX aria-hidden="true" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label className="text-sm">{tForm('scalerTitle')}</Label>
        <div className="flex flex-wrap gap-2">
          {factors.map((f, i) => (
            <div key={i} className="flex items-center gap-1">
              <Input
                type="number"
                min={1}
                step={1}
                value={f}
                onChange={(e) => {
                  const next = Math.max(1, Math.floor(Number(e.target.value) || 1));
                  onChange({
                    ...block,
                    factors: factors.map((x, j) => (j === i ? next : x)),
                    ingredients: syncAmountsWithFactors(ingredients, factors.map((x, j) => (j === i ? next : x))),
                  });
                }}
                className="w-20"
              />
              <span className="text-sm text-[var(--color-ink-2)]">×</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={tForm('remove')}
                onClick={() => {
                  const nextFactors = factors.filter((_, j) => j !== i);
                  onChange({
                    ...block,
                    factors: nextFactors,
                    ingredients: syncAmountsWithFactors(ingredients, nextFactors),
                  });
                }}
              >
                <LuX aria-hidden="true" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              const nextVal = factors.length > 0 ? Math.max(factors[factors.length - 1] * 2, 1) : 1;
              const nextFactors = [...factors, nextVal];
              onChange({
                ...block,
                factors: nextFactors,
                ingredients: syncAmountsWithFactors(ingredients, nextFactors),
              });
            }}
          >
            + {tForm('addFactor')}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-sm">{tForm('ingredientsTitle')}</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({
                ...block,
                ingredients: [...ingredients, emptyIngredient(factors.length)],
              })
            }
          >
            + {tForm('addIngredient')}
          </Button>
        </div>
        {ingredients.length === 0 && (
          <p className="text-sm text-[var(--color-ink-3)]">{tForm('none')}</p>
        )}
        {ingredients.map((row, i) => (
          <div key={i} className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-line)] p-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
              <Field label={tForm('ingredientName')} required>
                <Input
                  value={row.name}
                  onChange={(e) =>
                    onChange({
                      ...block,
                      ingredients: ingredients.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                    })
                  }
                  placeholder={tForm('ingredientNamePlaceholder')}
                  maxLength={50}
                />
              </Field>
              <Field label={tForm('ingredientForm')}>
                <Input
                  value={row.form ?? ''}
                  onChange={(e) =>
                    onChange({
                      ...block,
                      ingredients: ingredients.map((x, j) => (j === i ? { ...x, form: e.target.value } : x)),
                    })
                  }
                  placeholder={tForm('ingredientFormPlaceholder')}
                />
              </Field>
              <Field label={tForm('ingredientUnit')}>
                <CustomSelect
                  size="sm"
                  value={row.unit ?? ''}
                  onChange={(val) =>
                    onChange({
                      ...block,
                      ingredients: ingredients.map((x, j) => (j === i ? { ...x, unit: val } : x)),
                    })
                  }
                  options={UNITS.map((u) => ({ value: u, label: u }))}
                />
              </Field>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={tForm('remove')}
                  onClick={() =>
                    onChange({
                      ...block,
                      ingredients: ingredients.filter((_, j) => j !== i),
                    })
                  }
                >
                  <LuX aria-hidden="true" />
                </Button>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-[var(--color-ink-2)]">
              <input
                type="checkbox"
                checked={!!row.allergen}
                onChange={(e) =>
                  onChange({
                    ...block,
                    ingredients: ingredients.map((x, j) =>
                      j === i ? { ...x, allergen: e.target.checked || undefined } : x,
                    ),
                  })
                }
              />
              {tForm('ingredientAllergen')}
            </label>
            <div className="space-y-1">
              <Label className="text-sm font-semibold text-[var(--color-ink-3)]">
                {tForm('ingredientQuantity')}
              </Label>
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${factors.length || 1}, minmax(0,1fr))` }}
              >
                {factors.map((f, j) => (
                  <div key={j} className="space-y-1">
                    <Label className="font-mono text-sm text-[var(--color-ink-3)]">
                      {f}×
                    </Label>
                    <Input
                      type="text"
                      value={row.amounts[j] ?? ''}
                      onChange={(e) =>
                        onChange({
                          ...block,
                          ingredients: ingredients.map((x, k) =>
                            k === i
                              ? {
                                  ...x,
                                  amounts: x.amounts.map((a, l) => (l === j ? e.target.value : a)),
                                }
                              : x,
                          ),
                        })
                      }
                      placeholder={tForm('ingredientAmountPlaceholder')}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-sm">{tForm('stepsTitle')}</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({ ...block, steps: [...block.steps, newMethodStep()] })
            }
          >
            + {tForm('addStep')}
          </Button>
        </div>
        <StepsList steps={block.steps} onChange={(steps) => onChange({ ...block, steps })} recipeAware />
      </div>
    </div>
  );
}

