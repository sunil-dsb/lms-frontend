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
import { asLoc, asOpt, type BodyProps, setLoc, setOpt } from './notion-block-shared';

const TABLE_LANGS: Array<'en' | 'es'> = ['en', 'es'];

export function TableBody({
  block,
  onPatch,
}: BodyProps<Extract<ProcedureBlock, { kind: 'table' }>>): React.ReactElement {
  const [activeLang, setActiveLang] = React.useState<'en' | 'es'>('en');

  function setHeader(j: number, lang: 'en' | 'es', value: string): void {
    onPatch({
      ...block,
      headers: block.headers.map((h, k) => (k === j ? { ...h, [lang]: value } : h)),
    });
  }

  function setCell(i: number, j: number, lang: 'en' | 'es', value: string): void {
    onPatch({
      ...block,
      rows: block.rows.map((row, k) =>
        k === i
          ? row.map((cell, m) => (m === j ? { ...cell, [lang]: value } : cell))
          : row,
      ),
    });
  }

  function addColumn(): void {
    const empty: Localised = { en: '', es: '' };
    onPatch({
      ...block,
      headers: [...block.headers, empty],
      rows: block.rows.map((row) => [...row, empty]),
    });
  }

  function removeColumn(j: number): void {
    if (block.headers.length <= 1) return;
    onPatch({
      ...block,
      headers: block.headers.filter((_, k) => k !== j),
      rows: block.rows.map((row) => row.filter((_, k) => k !== j)),
    });
  }

  function addRow(): void {
    const emptyRow: Localised[] = Array.from({ length: block.headers.length }, () => ({ en: '', es: '' }));
    onPatch({ ...block, rows: [...block.rows, emptyRow] });
  }

  function removeRow(i: number): void {
    if (block.rows.length <= 1) return;
    onPatch({ ...block, rows: block.rows.filter((_, k) => k !== i) });
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--color-ink-3)]">
          Table Columns & Rows
        </span>
      </div>

      <div className="space-y-2">
        {TABLE_LANGS.map((lang) => {
          const isActive = activeLang === lang;
          if (isActive) {
            return (
              <div
                key={lang}
                className="w-full rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-3 shadow-[var(--e-1)] transition-all duration-200 space-y-2.5"
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-[var(--color-ink)]">
                    {lang === 'en' ? 'English Table' : 'Spanish Table (Español)'}
                  </span>
                  <span translate="no" className="font-mono text-xs font-semibold text-[var(--color-ink-3)] uppercase tracking-wider notranslate">
                    {lang.toUpperCase()}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-[var(--color-line)] bg-[var(--color-wash)]">
                        {block.headers.map((_, j) => (
                          <th
                            key={j}
                            className="group relative min-w-[180px] border-r border-[var(--color-line)] p-2 text-left font-semibold text-[var(--color-ink)] last:border-r-0 align-top"
                          >
                            <div className="flex items-start gap-1">
                              <LocalisedInput
                                lang={lang}
                                maxLength={100}
                                showCount
                                value={block.headers[j] ?? { en: '', es: '' }}
                                onText={(nextLang, text) => setHeader(j, nextLang, text)}
                                type="text"
                                placeholder={`Header ${j + 1} (${lang.toUpperCase()})`}
                                className="w-full rounded px-2 py-1 text-sm font-semibold text-[var(--color-ink)] bg-transparent placeholder:text-[var(--color-ink-3)] border border-transparent hover:border-[var(--color-line-2)] focus:border-[var(--color-ring)] focus:bg-[var(--color-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)] transition-colors"
                              />
                              {block.headers.length > 1 && (
                                <button
                                  type="button"
                                  aria-label="Remove column"
                                  title="Remove column"
                                  onClick={() => removeColumn(j)}
                                  className="flex size-5 shrink-0 items-center justify-center rounded text-[var(--color-ink-3)] opacity-0 group-hover:opacity-100 hover:bg-[var(--color-bad-tint)] hover:text-[var(--color-bad)] transition-all mt-1"
                                >
                                  <Icon icon="ri-close-line" className="text-sm" />
                                </button>
                              )}
                            </div>
                          </th>
                        ))}
                        <th className="w-tap-admin border-b border-[var(--color-line)] bg-[var(--color-wash)] p-1 text-center align-middle">
                          <button
                            type="button"
                            aria-label="Add column"
                            title="Add column"
                            onClick={addColumn}
                            className="mx-auto flex size-8 items-center justify-center rounded text-[var(--color-ink-2)] hover:bg-[var(--color-panel)] hover:text-[var(--color-ink)] transition-colors"
                          >
                            <Icon icon="ri-add-line" className="text-base font-semibold" />
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-line)]">
                      {block.rows.map((row, i) => (
                        <tr key={i} className="group/row transition-colors hover:bg-[var(--color-wash)]/40">
                          {row.map((_, j) => (
                            <td
                              key={j}
                              className="min-w-[180px] border-r border-[var(--color-line)] p-2 align-top last:border-r-0"
                            >
                              <div className="flex items-start gap-1">
                                <LocalisedInput
                                  lang={lang}
                                  multiline
                                  rows={2}
                                  maxLength={500}
                                  showCount
                                  value={row[j] ?? { en: '', es: '' }}
                                  onText={(nextLang, text) => setCell(i, j, nextLang, text)}
                                  placeholder={`Cell (${lang.toUpperCase()})`}
                                  className="w-full resize-y rounded px-2 py-1 text-sm text-[var(--color-ink)] bg-transparent placeholder:text-[var(--color-ink-3)] border border-transparent hover:border-[var(--color-line-2)] focus:border-[var(--color-ring)] focus:bg-[var(--color-surface)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)] transition-colors min-h-[44px]"
                                />
                              </div>
                            </td>
                          ))}
                          <td className="w-tap-admin p-1 text-center align-middle">
                            {block.rows.length > 1 && (
                              <button
                                type="button"
                                aria-label="Remove row"
                                title="Remove row"
                                onClick={() => removeRow(i)}
                                className="mx-auto flex size-6 items-center justify-center rounded text-[var(--color-ink-3)] opacity-0 group-hover/row:opacity-100 hover:bg-[var(--color-bad-tint)] hover:text-[var(--color-bad)] transition-all"
                              >
                                <Icon icon="ri-close-line" className="text-sm" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-[var(--color-wash)]">
                        <td colSpan={block.headers.length} className="p-1">
                          <button
                            type="button"
                            onClick={addRow}
                            title="Add row"
                            className="inline-flex items-center gap-2 rounded px-2 py-1 text-sm font-semibold text-[var(--color-ink-2)] hover:bg-[var(--color-panel)] hover:text-[var(--color-ink)] transition-colors"
                          >
                            <Icon icon="ri-add-line" className="text-sm" />
                            <span>Add row</span>
                          </button>
                        </td>
                        <td className="w-tap-admin p-1 text-center align-middle border-t border-[var(--color-line)]">
                          <button
                            type="button"
                            aria-label="Add row"
                            title="Add row"
                            onClick={addRow}
                            className="mx-auto flex size-8 items-center justify-center rounded text-[var(--color-ink-2)] hover:bg-[var(--color-panel)] hover:text-[var(--color-ink)] transition-colors"
                          >
                            <Icon icon="ri-add-line" className="text-base font-semibold" />
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          }

          // Inactive language card: collapsed slim preview matching user sketch
          return (
            <div
              key={lang}
              role="button"
              tabIndex={0}
              onClick={() => setActiveLang(lang)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveLang(lang);
                }
              }}
              className="group relative w-[94%] max-w-full cursor-pointer rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-wash)] p-3 transition-all duration-200 hover:border-[var(--color-line-2)] hover:bg-[var(--color-panel)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-hidden text-sm">
                  <span className="shrink-0 text-xs font-semibold text-[var(--color-ink-2)]">
                    {lang === 'en' ? 'English Table' : 'Spanish Table (Español)'}
                  </span>
                  <span className="shrink-0 text-xs text-[var(--color-ink-3)]">·</span>
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    {block.headers.map((h, k) => (
                      <span
                        key={k}
                        className="truncate rounded border border-[var(--color-line-2)] bg-[var(--color-surface)] px-2 py-0.5 text-xs text-[var(--color-ink-2)] max-w-[140px]"
                      >
                        {h[lang]?.trim() || `Header ${k + 1}`}
                      </span>
                    ))}
                  </div>
                </div>
                <span translate="no" className="shrink-0 font-mono text-xs font-semibold text-[var(--color-ink-3)] uppercase tracking-wider notranslate">
                  {lang.toUpperCase()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Checklist ----

const CHECKLIST_LANGS: Array<'en' | 'es'> = ['en', 'es'];

export function ChecklistBody({
  block,
  onPatch,
}: BodyProps<Extract<ProcedureBlock, { kind: 'checklist' }>>): React.ReactElement {
  const items = block.items;
  const [activeLang, setActiveLang] = React.useState<'en' | 'es'>('en');

  function setTitleText(lang: 'en' | 'es', val: string): void {
    onPatch({
      ...block,
      title: {
        en: block.title?.en ?? '',
        es: block.title?.es ?? '',
        [lang]: val,
      },
    });
  }

  function setItemText(i: number, lang: 'en' | 'es', val: string): void {
    onPatch({
      ...block,
      items: items.map((it, j) =>
        j === i
          ? {
            ...it,
            text: {
              en: it.text?.en ?? '',
              es: it.text?.es ?? '',
              [lang]: val,
            },
          }
          : it,
      ),
    });
  }

  function addItem(): void {
    onPatch({
      ...block,
      items: [...items, { id: `ci-${Math.random().toString(36).slice(2, 8)}`, text: { en: '', es: '' } }],
    });
  }

  function removeItem(i: number): void {
    if (items.length <= 1) return;
    onPatch({ ...block, items: items.filter((_, j) => j !== i) });
  }

  function moveItem(i: number, dir: 'up' | 'down'): void {
    const j = dir === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onPatch({ ...block, items: next });
  }

  return (
    <div className="bli-card-group py-1">
      {CHECKLIST_LANGS.map((lang) => {
        const isActive = activeLang === lang;

        if (isActive) {
          return (
            <div key={lang} className="bli-card is-active">
              <header className="flex items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-wash)] px-4 py-2.5">
                <span className="text-xs font-semibold text-[var(--color-ink)]">
                  {lang === 'en' ? 'Checklist (English)' : 'Lista de verificación (Español)'}
                </span>
                <span translate="no" className="font-mono text-xs font-bold text-[var(--color-ink-2)] uppercase tracking-wider notranslate">
                  {lang.toUpperCase()}
                </span>
              </header>

              <div className="p-4 space-y-3">
                {/* Title */}
                <div>
                  <LocalisedInput
                    lang={lang}
                    maxLength={100}
                    showCount
                    value={{ en: block.title?.en ?? '', es: block.title?.es ?? '' }}
                    onText={(nextLang, text) => setTitleText(nextLang, text)}
                    showStatus
                    type="text"
                    placeholder={
                      lang === 'en'
                        ? 'Checklist title (English)…'
                        : 'Título de la lista (Español)…'
                    }
                    className="w-full rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)] placeholder:font-normal placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-ring)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)] transition-colors"
                  />
                </div>

                {/* Items */}
                <ol className="space-y-2">
                  {items.map((it, i) => (
                    <li
                      key={it.id}
                      className="group/item relative flex items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-[var(--color-wash)]"
                    >
                      {/* Reorder arrows — visible on item hover */}
                      <div className="flex items-center opacity-0 transition-opacity group-hover/item:opacity-100">
                        <button
                          type="button"
                          disabled={i === 0}
                          onClick={() => moveItem(i, 'up')}
                          className="p-0.5 text-[var(--color-ink-3)] hover:text-[var(--color-ink)] disabled:opacity-30"
                          aria-label="Move up"
                          title="Move up"
                        >
                          <Icon icon="ri-arrow-up-line" className="text-xs" />
                        </button>
                        <button
                          type="button"
                          disabled={i === items.length - 1}
                          onClick={() => moveItem(i, 'down')}
                          className="p-0.5 text-[var(--color-ink-3)] hover:text-[var(--color-ink)] disabled:opacity-30"
                          aria-label="Move down"
                          title="Move down"
                        >
                          <Icon icon="ri-arrow-down-line" className="text-xs" />
                        </button>
                      </div>

                      {/* Checkbox tile */}
                      <span
                        aria-hidden="true"
                        className="flex size-4 shrink-0 items-center justify-center rounded-[3px] border border-[var(--color-line-2)] bg-[var(--color-surface)]"
                      />

                      {/* Item number badge */}
                      <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-ok-tint)] font-mono text-[10px] font-bold text-[var(--color-ok)]">
                        {i + 1}
                      </span>

                      {/* Item text input in active language */}
                      <div className="flex-1">
                        <LocalisedInput
                          lang={lang}
                          maxLength={150}
                          showCount
                          value={{ en: it.text?.en ?? '', es: it.text?.es ?? '' }}
                          onText={(nextLang, text) => setItemText(i, nextLang, text)}
                          type="text"
                          placeholder={
                            lang === 'en'
                              ? `Item ${i + 1} (English)…`
                              : `Elemento ${i + 1} (Español)…`
                          }
                          className="w-full rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-ring)] focus:outline-none focus:ring-1 focus:ring-[var(--color-ring)] transition-colors"
                        />
                      </div>

                      {/* Remove item button — visible on item hover */}
                      {items.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeItem(i)}
                          aria-label="Remove item"
                          title="Remove item"
                          className="flex size-6 shrink-0 items-center justify-center rounded text-[var(--color-ink-3)] opacity-0 transition-opacity hover:bg-[var(--color-bad-tint)] hover:text-[var(--color-bad)] group-hover/item:opacity-100 focus:opacity-100"
                        >
                          <Icon icon="ri-close-line" className="text-base" />
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ol>

                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold text-[var(--color-brand-600)] hover:bg-[var(--color-panel)] hover:text-[var(--color-brand-700)] transition-colors mt-1"
                >
                  <Icon icon="ri-add-line" className="text-sm" />
                  <span>{lang === 'en' ? 'Add checklist item' : 'Agregar elemento'}</span>
                </button>
              </div>
            </div>
          );
        }

        // Inactive language card: collapsed slim preview matching quiz
        const preview =
          block.title?.[lang]?.trim() ||
          (lang === 'es' ? 'Lista de verificación (Español)' : 'Checklist (English)');
        const filled = items.filter((it) => Boolean(it.text?.[lang]?.trim())).length;

        return (
          <div
            key={lang}
            role="button"
            tabIndex={0}
            onClick={() => setActiveLang(lang)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActiveLang(lang);
              }
            }}
            className="bli-card is-inactive px-4"
            title={lang === 'es' ? 'Click to edit in Spanish' : 'Click to edit in English'}
          >
            <div className="flex w-full items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="truncate text-xs font-normal text-[var(--color-ink-2)]">
                  {preview}
                </span>
                <span className="text-[11px] text-[var(--color-ink-3)] shrink-0">
                  · {filled}/{items.length} {lang === 'es' ? 'completados' : 'items'}
                </span>
              </div>
              <span translate="no" className="shrink-0 font-mono text-xs font-bold text-[var(--color-ink-3)] uppercase tracking-wider notranslate">
                {lang.toUpperCase()}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const bodyTextareaCls =
  'flex w-full resize-none rounded-[var(--radius-md)] border border-transparent bg-transparent px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] transition-colors hover:border-[var(--color-line-2)] hover:bg-[var(--color-surface)] focus:border-[var(--color-ring)] focus:bg-[var(--color-surface)] focus:outline-none';


// ---------------------------------------------------------------------------
// Empty state — a clean "press / for blocks" surface. No 8-card grid.
// ---------------------------------------------------------------------------

