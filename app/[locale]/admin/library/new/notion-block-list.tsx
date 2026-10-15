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
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { BLOCK_FACTORIES, duplicateBlock } from '@/lib/procedure-blocks';
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
import { BlockRow, InsertAfterButton } from './notion-block-rows';
import { asLoc, asOpt, setLoc, setOpt, SLASH_BLOCK_OPTIONS } from './notion-block-shared';

interface NotionBlockListProps {
  blocks: ProcedureBlock[];
  onChange: (next: ProcedureBlock[]) => void;
  errors?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Block menu — delete / duplicate / move. The drag handle lives in the gutter.
// ---------------------------------------------------------------------------

function EmptyState({ onAdd }: { onAdd: (kind: ProcedureBlockKind) => void }): React.ReactElement {
  return (
    <div className="space-y-4 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)] p-8">
      <div className="flex items-start gap-3">
        <IconTile size="md" icon="ri-file-text-line" />
        <div>
          <h3 className="font-[family-name:var(--font-ui)] text-md font-semibold text-[var(--color-ink)]">
            Start writing
          </h3>
          <p className="mt-0.5 text-sm text-[var(--color-ink-2)]">
            Pick a starting block. You can move, copy or remove any block later
            from its menu.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {([
          { kind: 'text', label: 'Text', icon: 'ri-text', hint: 'Paragraph' },
          { kind: 'heading', label: 'Heading', icon: 'ri-h-1', hint: 'Section title' },
          { kind: 'method', label: 'Steps', icon: 'ri-list-ordered', hint: 'Numbered list' },
          { kind: 'checklist', label: 'Checklist', icon: 'ri-list-check', hint: 'Tick-off items' },
          { kind: 'table', label: 'Table', icon: 'ri-table-line', hint: 'Rows + columns' },
          { kind: 'warning', label: 'Callout', icon: 'ri-alert-line', hint: 'Warn / tip / alt' },
          { kind: 'image', label: 'Image', icon: 'ri-image-line', hint: 'Photo + caption' },
          { kind: 'video', label: 'Video', icon: 'ri-video-line', hint: 'Upload or link' },
          { kind: 'attachment', label: 'Attachment', icon: 'ri-attachment-line', hint: 'Linked file' },
          { kind: 'ingredients', label: 'Ingredients', icon: 'ri-restaurant-line', hint: 'Items + amounts' },
        ] as { kind: ProcedureBlockKind; label: string; icon: string; hint: string }[]).map((opt) => (
          <button
            key={opt.kind}
            type="button"
            onClick={() => onAdd(opt.kind)}
            className="group flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-3 text-left transition-colors hover:border-[var(--color-line-3)] hover:bg-[var(--color-wash)]"
          >
            <Icon icon={opt.icon} className="mt-0.5 text-lg text-[var(--color-ink-2)] group-hover:text-[var(--color-ink)]" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-[var(--color-ink)]">{opt.label}</span>
              <span className="block text-sm text-[var(--color-ink-2)]">{opt.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top-level list. Owns the dnd-kit context, the empty state, and the
// final "+ Add block" affordance.
// ---------------------------------------------------------------------------

export function NotionBlockList({ blocks, onChange, errors }: NotionBlockListProps): React.ReactElement {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(e: DragEndEvent): void {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = blocks.findIndex((b) => b.id === active.id);
    const to = blocks.findIndex((b) => b.id === over.id);
    if (from === -1 || to === -1 || from === to) return;
    onChange(arrayMove(blocks, from, to));
  }

  function patch(id: string, next: ProcedureBlock): void {
    onChange(blocks.map((b) => (b.id === id ? next : b)));
  }
  function remove(id: string): void {
    onChange(blocks.filter((b) => b.id !== id));
  }
  function move(id: string, dir: 'up' | 'down'): void {
    const i = blocks.findIndex((b) => b.id === id);
    if (i === -1) return;
    const j = dir === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= blocks.length) return;
    onChange(arrayMove(blocks, i, j));
  }
  function duplicate(id: string): void {
    const i = blocks.findIndex((b) => b.id === id);
    if (i < -1) return;
    onChange([...blocks.slice(0, i + 1), duplicateBlock(blocks[i]), ...blocks.slice(i + 1)]);
  }
  function addAtEnd(kind: ProcedureBlockKind): void {
    onChange([...blocks, BLOCK_FACTORIES[kind]()]);
  }
  function addAfter(id: string, kind: ProcedureBlockKind): void {
    const i = blocks.findIndex((b) => b.id === id);
    if (i === -1) {
      addAtEnd(kind);
      return;
    }
    const next = [...blocks];
    next.splice(i + 1, 0, BLOCK_FACTORIES[kind]());
    onChange(next);
  }

  if (blocks.length === 0) {
    return <EmptyState onAdd={addAtEnd} />;
  }

  return (
    // No gutter on a phone: the toolbar sits inside each row there, and the
    // 32px it kept cut the image toolbar's Remove button off the edge.
    <div className="space-y-6 sm:pl-10">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          {blocks.map((block, i) => (
            <BlockRow
              key={block.id}
              block={block}
              index={i}
              total={blocks.length}
              error={errors?.[block.id]}
              onPatch={(next) => patch(block.id, next)}
              onRemove={() => remove(block.id)}
              onMove={(dir) => move(block.id, dir)}
              onDuplicate={() => duplicate(block.id)}
              onInsertAfter={(kind) => addAfter(block.id, kind)}
            />
          ))}
        </SortableContext>
      </DndContext>
      <EndAddButton onAdd={addAtEnd} />
    </div>
  );
}

function EndAddButton({ onAdd }: { onAdd: (kind: ProcedureBlockKind) => void }): React.ReactElement {
  return (
    <div className="pt-2">
      {/* Ghost affordance — visible on hover only so it doesn't compete with slash command */}
      <InsertAfterButton onInsert={onAdd} ghost />
    </div>
  );
}
