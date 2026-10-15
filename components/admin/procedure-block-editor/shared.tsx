'use client';

import * as React from 'react';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Label } from '@/components/ui/label';
import type {
  CriticalLimit,
  Localised,
  LocalisedOptional,
  ProcedureBlock,
  ProcedureIngredient,
  ProcedureMethodStep,
  ProcedureNoteKind,
} from '@/lib/types';

export const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);
export const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const UNITS = ['g', 'kg', 'ml', 'l', 'oz', 'lb', 'cup', 'tbsp', 'tsp', 'pcs', 'each'] as const;

export interface EditorProps<T extends ProcedureBlock> {
  block: T;
  onChange: (next: T) => void;
}

export function asLocalised(v: Localised | undefined, lang: 'en' | 'es'): string {
  return v?.[lang] ?? '';
}

export function setLocalised(v: Localised | undefined, lang: 'en' | 'es', value: string): Localised {
  return { en: v?.en ?? '', es: v?.es ?? '', [lang]: value };
}

export function asOpt(v: LocalisedOptional | undefined, lang: 'en' | 'es'): string {
  return v?.[lang] ?? '';
}

export function setOpt(v: LocalisedOptional | undefined, lang: 'en' | 'es', value: string): LocalisedOptional {
  return { en: v?.en, es: v?.es, [lang]: value };
}

export function BilingualTabs({
  active,
  onChange,
  enLabel,
  esLabel,
}: {
  active: 'en' | 'es';
  onChange: (next: 'en' | 'es') => void;
  enLabel: string;
  esLabel: string;
}): React.ReactElement {
  return (
    <SegmentedControl
      label="Language"
      value={active}
      onChange={(lang) => onChange(lang as 'en' | 'es')}
      segments={[
        { value: 'en', label: enLabel },
        { value: 'es', label: esLabel },
      ]}
    />
  );
}

export function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="space-y-1">
      <Label className="text-sm">
        {label}
        {required && <span aria-hidden="true" className="ml-1 text-[var(--color-bad)]">*</span>}
      </Label>
      {children}
      {hint && <p className="text-sm text-[var(--color-ink-2)]">{hint}</p>}
    </div>
  );
}

export const textareaCls =
  'flex w-full rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] transition-all duration-[var(--dur)] font-[family-name:var(--font-ui)] hover:border-[var(--color-line-3)] focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:border-[var(--color-ring)] focus-visible:border-[var(--color-ring)]';

export function emptyCriticalLimit(): CriticalLimit {
  return { value: '', howToCheck: '', breachLabel: '', breachResponse: '' };
}

export const newMethodStep = (): ProcedureMethodStep => ({
  id: `s-${Math.random().toString(36).slice(2, 8)}`,
  body: { en: '', es: '' },
  critical: false,
});

export function emptyIngredient(factorCount: number): ProcedureIngredient {
  return {
    name: '',
    form: '',
    allergen: false,
    amounts: Array.from({ length: factorCount }, () => ''),
  };
}

export const NOTE_KINDS: ProcedureNoteKind[] = ['warn', 'tip', 'alt', 'equip', 'allergen'];
