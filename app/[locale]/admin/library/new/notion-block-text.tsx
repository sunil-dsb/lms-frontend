'use client';

/**
 * Notion-style composer for procedure blocks.
 *
 * Replaces the previous "colored-card" look with a clean, content-first
 * surface: each block renders in its actual shape (table looks like a table,
 * steps look like a numbered list), hover reveals a left gutter with a drag
 * handle, an add-row button, and a per-block menu (delete / duplicate / move).
 *
 * Stays in its own file so the wizard can swap to this without touching any
 * existing composer code — the only required change in the wizard is one
 * import + a `<NotionBlockList />` render.
 */

import * as React from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { CustomSelect } from '@/components/ui/custom-select';
import { classifyVideoUrl } from '@/lib/procedure-media';
import { Icon } from '@/components/ui/icon';
import type {
  Localised,
  LocalisedOptional,
  ProcedureBlock,
  ProcedureBlockKind,
  ProcedureMethodStep,
  ProcedureNoteKind,
} from '@/lib/types';
import { IconTile } from '@/components/ui/icon-tile';
import { IngredientsBlockBody } from './ingredients-block-body';
import { BilingualInput } from '@/components/ui/bilingual-input';
import { LocalisedInput } from '@/components/ui/localised-input';
import { StepTimerEditor } from './step-timer-editor';
import { asLoc, setLoc, SLASH_BLOCK_OPTIONS, type BodyProps } from './notion-block-shared';

export function TextBody({
  block,
  onPatch,
  onInsertAfter,
}: BodyProps<Extract<ProcedureBlock, { kind: 'text' }>> & {
  onInsertAfter?: (kind: ProcedureBlockKind) => void;
}): React.ReactElement {
  const [slashOpen, setSlashOpen] = React.useState(false);

  function handleSlashSelect(kind: ProcedureBlockKind): void {
    setSlashOpen(false);
    onInsertAfter?.(kind);
  }

  function handleInputKeyDown(
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    _lang: 'en' | 'es',
  ): void {
    if (e.key === '/' && !e.currentTarget.value) {
      e.preventDefault();
      setSlashOpen(true);
    }
  }

  return (
    <div className="relative">
      <BilingualInput
        value={block.body}
        maxLength={1000}
        onChange={(val) => {
          if (val.en === '/' && !block.body?.en) {
            setSlashOpen(true);
            return;
          }
          if (val.es === '/' && !block.body?.es) {
            setSlashOpen(true);
            return;
          }
          onPatch({ ...block, body: val });
        }}
        multiline
        placeholder={{
          en: 'Type something… (or / for blocks)',
          es: 'Escribe algo… (o / para bloques)',
        }}
        onInputKeyDown={handleInputKeyDown}
      />
      {slashOpen && (
        <div
          className="absolute left-0 top-full z-dropdown mt-1 w-field-md rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-[var(--e-3)]"
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="p-1 space-y-0.5">
            {SLASH_BLOCK_OPTIONS.map((opt) => (
              <button
                key={opt.kind}
                type="button"
                onClick={() => handleSlashSelect(opt.kind)}
                className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--color-ink)] hover:bg-[var(--color-wash)] transition-colors"
              >
                <Icon icon={opt.icon} className="text-base text-[var(--color-ink-2)]" />
                <span className="font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-[var(--color-line)] px-3 py-2">
            <button
              type="button"
              onClick={() => setSlashOpen(false)}
              className="text-sm text-[var(--color-ink-3)] hover:text-[var(--color-ink-2)]"
            >
              Esc to dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Heading ----

export function HeadingBody({
  block,
  onPatch,
}: BodyProps<Extract<ProcedureBlock, { kind: 'heading' }>>): React.ReactElement {
  return (
    <div className="flex items-start gap-2">
      {/* Heading level selector — always visible, compact */}
      <div className="w-16 shrink-0 pt-1">
        <CustomSelect
          size="sm"
          value={String(block.level)}
          onChange={(v) => onPatch({ ...block, level: Number(v) as 1 | 2 | 3 })}
          options={[
            { value: '1', label: 'H1', icon: 'ri-h-1' },
            { value: '2', label: 'H2', icon: 'ri-h-2' },
            { value: '3', label: 'H3', icon: 'ri-h-3' },
          ]}
        />
      </div>
      <div className="flex-1">
        <BilingualInput
          value={block.text}
          maxLength={100}
          onChange={(val) => onPatch({ ...block, text: val })}
          placeholder={{
            en: 'Section title (English)…',
            es: 'Título de la sección (Español)…',
          }}
          className="bli--heading"
          inputClassName={headingCls(block.level)}
        />
      </div>
    </div>
  );
}

function headingCls(level: 1 | 2 | 3): string {
  // Phone first: at 390px the desktop sizes ran the title past the field.
  if (level === 1) return 'text-lg font-semibold tracking-tight sm:font-[family-name:var(--font-display)] sm:text-2xl';
  if (level === 2) return 'text-md font-semibold tracking-tight sm:font-[family-name:var(--font-display)] sm:text-xl';
  return 'text-base font-semibold tracking-tight sm:text-lg';
}

// ---- Method (numbered steps) ----

