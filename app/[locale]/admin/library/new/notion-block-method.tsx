'use client';

import * as React from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { nextStepId } from '@/lib/procedure-blocks';
import { BilingualInput } from '@/components/ui/bilingual-input';
import { Icon } from '@/components/ui/icon';
import { RowActions } from '@/components/ui/row-actions';
import type { ProcedureBlock, ProcedureMethodStep } from '@/lib/types';
import type { BodyProps } from './notion-block-shared';
import { MethodStepRow } from './notion-method-step-row';

export function MethodBody({
  block,
  onPatch,
}: BodyProps<Extract<ProcedureBlock, { kind: 'method' }>>): React.ReactElement {
  const update = (idx: number, next: ProcedureMethodStep): void => {
    onPatch({ ...block, steps: block.steps.map((s, i) => (i === idx ? next : s)) });
  };
  const remove = (idx: number): void => {
    onPatch({ ...block, steps: block.steps.filter((_, i) => i !== idx) });
  };
  const move = (idx: number, dir: 'up' | 'down'): void => {
    const j = dir === 'up' ? idx - 1 : idx + 1;
    if (j < 0 || j >= block.steps.length) return;
    const next = arrayMove(block.steps, idx, j);
    onPatch({ ...block, steps: next });
  };
  const add = (): void => {
    onPatch({ ...block, steps: [...block.steps, { id: nextStepId(), body: { en: '', es: '' } }] });
  };

  return (
    <div className="space-y-3">
      <BilingualInput
        value={block.title ?? { en: '', es: '' }}
        maxLength={100}
        onChange={(title) => onPatch({ ...block, title })}
        placeholder={{ en: 'Section title (English), e.g. Preparation…', es: 'Título de sección (Español), p. ej. Preparación…' }}
        className="bli--heading"
        inputClassName="text-base font-semibold"
      />
      <ol className="space-y-4">
        {block.steps.map((step, i) => (
          <MethodStepRow
            key={step.id ?? i}
            step={step}
            index={i}
            total={block.steps.length}
            onUpdate={(next) => update(i, next)}
            onRemove={() => remove(i)}
            onMove={(dir) => move(i, dir)}
          />
        ))}
      </ol>
      <button
        type="button"
        onClick={add}
        className="ml-10 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-[var(--color-ink-3)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)] cursor-pointer"
      >
        <Icon icon="ri-add-line" />
        Add step
      </button>
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
  onMove: (dir: 'up' | 'down') => void;
  onRemove: () => void;
}): React.ReactElement {
  const items = [
    ...(index > 0
      ? [{ label: 'Move up', icon: 'ri-arrow-up-line', onSelect: () => onMove('up') }]
      : []),
    ...(index < total - 1
      ? [{ label: 'Move down', icon: 'ri-arrow-down-line', onSelect: () => onMove('down') }]
      : []),
    { label: 'Delete step', icon: 'ri-close-line', destructive: true, onSelect: onRemove },
  ];
  return <RowActions triggerLabel="Step options" items={items} />;
}

// ---- Image ----

