"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProcedureBlockCard } from "./procedure-block-card";
import { ProcedureAddMenu } from "./procedure-add-menu";
import { BLOCK_FACTORIES, duplicateBlock } from "@/lib/procedure-blocks";
import type { ProcedureBlock, ProcedureBlockKind } from "@/lib/types";
import {
  LuHeading1,
  LuImage,
  LuListOrdered,
  LuPaperclip,
  LuTable,
  LuTriangleAlert,
  LuType,
  LuVideo,
} from "react-icons/lu";
import { Icon } from "@/components/ui/icon";

function arrayMoveById<T extends { id: string }>(
  arr: T[],
  fromId: string,
  toId: string,
): T[] {
  const from = arr.findIndex((x) => x.id === fromId);
  const to = arr.findIndex((x) => x.id === toId);
  if (from === -1 || to === -1 || from === to) return arr;
  return arrayMove(arr, from, to);
}

export function ProcedureBlockList({
  blocks,
  onChange,
}: {
  blocks: ProcedureBlock[];
  onChange: (next: ProcedureBlock[]) => void;
}): React.ReactElement {
  const t = useTranslations("admin.library.new.form.composer");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(e: DragEndEvent): void {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    onChange(arrayMoveById(blocks, String(active.id), String(over.id)));
  }

  function updateBlock(id: string, next: ProcedureBlock): void {
    onChange(blocks.map((b) => (b.id === id ? next : b)));
  }
  function removeBlock(id: string): void {
    onChange(blocks.filter((b) => b.id !== id));
  }
  function moveBlock(id: string, direction: "up" | "down"): void {
    const i = blocks.findIndex((b) => b.id === id);
    if (i === -1) return;
    const j = direction === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= blocks.length) return;
    onChange(arrayMove(blocks, i, j));
  }
  function duplicateById(id: string): void {
    const i = blocks.findIndex((b) => b.id === id);
    if (i < 0) return;
    const clone = duplicateBlock(blocks[i]);
    onChange([...blocks.slice(0, i + 1), clone, ...blocks.slice(i + 1)]);
  }
  function addBlock(kind: ProcedureBlockKind): void {
    onChange([...blocks, BLOCK_FACTORIES[kind]()]);
  }

  if (blocks.length === 0) {
    return (
      <div className="space-y-5">
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)] p-6 space-y-4">
          <div className="text-center">
            <h3 className="font-[family-name:var(--font-ui)] text-md font-semibold text-[var(--color-ink)]">
              Choose a content block to add
            </h3>
            <p className="mt-0.5 text-sm text-[var(--color-ink-2)]">
              Click any block below to start adding instructions, tables,
              warnings, or media.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                kind: "text",
                label: "Text Area",
                icon: LuType,
                color:
                  "text-[var(--color-ink-2)] bg-[var(--color-panel)] border-[var(--color-line)]",
              },
              {
                kind: "table",
                label: "Table",
                icon: LuTable,
                color:
                  "text-[var(--color-ink-2)] bg-[var(--color-panel)] border-[var(--color-line)]",
              },
              {
                kind: "method",
                label: "Numbered Steps",
                icon: LuListOrdered,
                color:
                  "text-[var(--color-ink-2)] bg-[var(--color-panel)] border-[var(--color-line)]",
              },
              {
                kind: "warning",
                label: "Warning Callout",
                icon: LuTriangleAlert,
                color:
                  "text-[var(--color-ink-2)] bg-[var(--color-panel)] border-[var(--color-line)]",
              },
              {
                kind: "heading",
                label: "Heading",
                icon: LuHeading1,
                color:
                  "text-[var(--color-ink-2)] bg-[var(--color-panel)] border-[var(--color-line)]",
              },
              {
                kind: "image",
                label: "Photograph",
                icon: LuImage,
                color:
                  "text-[var(--color-ink-2)] bg-[var(--color-panel)] border-[var(--color-line)]",
              },
              {
                kind: "video",
                label: "Video",
                icon: LuVideo,
                color:
                  "text-[var(--color-ink-2)] bg-[var(--color-panel)] border-[var(--color-line)]",
              },
              {
                kind: "attachment",
                label: "Attachment",
                icon: LuPaperclip,
                color:
                  "text-[var(--color-ink-2)] bg-[var(--color-panel)] border-[var(--color-line)]",
              },
            ].map((item) => (
              <button
                key={item.kind}
                type="button"
                onClick={() => addBlock(item.kind as ProcedureBlockKind)}
                className="group flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4 text-center transition-all duration-[var(--dur)] hover:bg-[var(--color-wash)] hover:border-[var(--color-line-3)] active:scale-95"
              >
                <div
                  className={cn(
                    "mb-2 flex size-tap-admin items-center justify-center rounded-lg border text-lg transition-transform",
                    item.color,
                  )}
                >
                  <Icon icon={item.icon} />
                </div>
                <span className="font-semibold text-sm text-[var(--color-ink)]">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <ProcedureAddMenu onAdd={addBlock} variant="inline" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={blocks.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {blocks.map((block, i) => (
              <ProcedureBlockCard
                key={block.id}
                block={block}
                index={i}
                total={blocks.length}
                onChange={(next) => updateBlock(block.id, next)}
                onRemove={() => removeBlock(block.id)}
                onMove={(dir) => moveBlock(block.id, dir)}
                onDuplicate={() => duplicateById(block.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <ProcedureAddMenu onAdd={addBlock} variant="inline" />
    </div>
  );
}
