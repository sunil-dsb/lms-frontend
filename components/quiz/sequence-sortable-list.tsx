"use client";

import * as React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  LuGripVertical,
  LuChevronUp,
  LuChevronDown,
  LuCheck,
  LuX,
} from "react-icons/lu";
import type { Localised } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface SequenceItemData {
  id: string;
  label: Localised | string;
}

interface SequenceSortableListProps {
  items: SequenceItemData[];
  orderedIds: string[];
  onChange?: (newOrderedIds: string[]) => void;
  locale: "en" | "es" | string;
  disabled?: boolean;
  isReview?: boolean;
  correctIds?: string[];
}

function resolveLabel(label: Localised | string, locale: string): string {
  if (typeof label === "string") return label;
  if (!label) return "";
  const isEs = locale === "es";
  return isEs ? label.es || label.en || "" : label.en || label.es || "";
}

function SortableItem({
  id,
  index,
  total,
  label,
  disabled,
  isReview,
  isAllCorrect,
  onMoveUp,
  onMoveDown,
}: {
  id: string;
  index: number;
  total: number;
  label: string;
  disabled?: boolean;
  isReview?: boolean;
  isAllCorrect?: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-3 rounded-xl border p-3.5 sm:p-4 transition-all select-none",
        isDragging
          ? "z-50 bg-[var(--color-surface)] border-[var(--color-brand)] shadow-lg scale-[1.01] opacity-95"
          : isReview && isAllCorrect
            ? "bg-[var(--color-good-tint)]/25 border-[var(--color-good)]/40 text-[var(--color-ink)]"
            : "bg-[var(--color-surface)] border-[var(--color-line-2)] hover:border-[var(--color-line)] shadow-xs",
        disabled && !isReview && "opacity-80",
      )}
    >
      {/* Drag handle or position badge */}
      {!disabled ? (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="flex size-7 items-center justify-center rounded-lg text-[var(--color-ink-3)] hover:text-[var(--color-ink)] hover:bg-[var(--color-wash)] active:cursor-grabbing cursor-grab shrink-0 transition-colors touch-none"
          style={{ touchAction: "none" }}
        >
          <LuGripVertical className="size-4" />
        </button>
      ) : null}

      {/* Step number badge - clean neutral badge; keeps steps clean without primary color overload */}
      <span
        className={cn(
          "flex size-6 items-center justify-center rounded-full text-xs font-semibold shrink-0 select-none",
          isReview && isAllCorrect
            ? "bg-[var(--color-good)] text-white"
            : "bg-[var(--color-wash)] text-[var(--color-ink-2)] border border-[var(--color-line-2)]",
        )}
      >
        {index + 1}
      </span>

      {/* Item label */}
      <div className="flex-1 min-w-0 text-sm font-medium text-[var(--color-ink)] leading-snug">
        {label}
      </div>

      {/* Up / Down navigation buttons for mobile & accessible tap sorting */}
      {!disabled ? (
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={index === 0}
            title="Move up"
            aria-label="Move step up"
            className="flex size-7 items-center justify-center rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:text-[var(--color-ink)] hover:bg-[var(--color-wash)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <LuChevronUp className="size-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={index === total - 1}
            title="Move down"
            aria-label="Move step down"
            className="flex size-7 items-center justify-center rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:text-[var(--color-ink)] hover:bg-[var(--color-wash)] disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <LuChevronDown className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function SequenceSortableList({
  items,
  orderedIds,
  onChange,
  locale,
  disabled = false,
  isReview = false,
  correctIds,
}: SequenceSortableListProps): React.ReactElement {
  const itemMap = React.useMemo(() => {
    const map = new Map<string, SequenceItemData>();
    items.forEach((item) => map.set(item.id, item));
    return map;
  }, [items]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent): void => {
    if (disabled || !onChange) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = orderedIds.indexOf(String(active.id));
      const newIndex = orderedIds.indexOf(String(over.id));
      if (oldIndex !== -1 && newIndex !== -1) {
        onChange(arrayMove(orderedIds, oldIndex, newIndex));
      }
    }
  };

  const handleMove = (fromIndex: number, toIndex: number): void => {
    if (disabled || !onChange) return;
    if (toIndex >= 0 && toIndex < orderedIds.length) {
      onChange(arrayMove(orderedIds, fromIndex, toIndex));
    }
  };

  const isAllCorrect =
    correctIds && correctIds.length === orderedIds.length
      ? orderedIds.every((id, idx) => id === correctIds[idx])
      : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={orderedIds}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2.5">
          {orderedIds.map((id, index) => {
            const item = itemMap.get(id);
            if (!item) return null;
            const labelText = resolveLabel(item.label, locale);

            return (
              <SortableItem
                key={id}
                id={id}
                index={index}
                total={orderedIds.length}
                label={labelText}
                disabled={disabled}
                isReview={isReview}
                isAllCorrect={isAllCorrect}
                onMoveUp={() => handleMove(index, index - 1)}
                onMoveDown={() => handleMove(index, index + 1)}
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}

/**
 * Utility to shuffle items ensuring the result is NOT the same as the original correct sequence.
 */
export function shuffleSequence<T extends { id: string }>(
  items: T[],
): string[] {
  if (items.length <= 1) return items.map((i) => i.id);

  const originalIds = items.map((i) => i.id);
  const shuffled = [...originalIds];

  // Fisher-Yates shuffle
  for (let attempt = 0; attempt < 10; attempt++) {
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Check if it matches original
    const isIdentical = shuffled.every((id, idx) => id === originalIds[idx]);
    if (!isIdentical) {
      return shuffled;
    }
  }

  // Fallback: simply swap first and second items so it's guaranteed not identical
  if (shuffled.length >= 2) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }
  return shuffled;
}
