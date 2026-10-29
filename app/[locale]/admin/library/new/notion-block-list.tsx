"use client";

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

import * as React from "react";
import { createPortal } from "react-dom";
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
import {
  BLOCK_FACTORIES,
  duplicateBlock,
  nextBlockId,
} from "@/lib/procedure-blocks";
import { LinkProcedureModal } from "@/components/admin/link-procedure-modal";
import { classifyVideoUrl } from "@/lib/procedure-media";
import { Icon } from "@/components/ui/icon";
import type {
  Localised,
  LocalisedOptional,
  ProcedureBlock,
  ProcedureBlockKind,
  ProcedureMethodStep,
  ProcedureNoteKind,
} from "@/lib/types";
import { IconTile } from "@/components/ui/icon-tile";
import { IngredientsBlockBody } from "./ingredients-block-body";
import { BilingualInput } from "@/components/ui/bilingual-input";
import { LocalisedInput } from "@/components/ui/localised-input";
import { StepTimerEditor } from "./step-timer-editor";
import { BlockRow, InsertAfterButton } from "./notion-block-rows";
import {
  asLoc,
  asOpt,
  setLoc,
  setOpt,
  SLASH_BLOCK_OPTIONS,
} from "./notion-block-shared";

interface NotionBlockListProps {
  blocks: ProcedureBlock[];
  onChange: (next: ProcedureBlock[]) => void;
  errors?: Record<string, string>;
  allowLinkProcedure?: boolean;
}

// ---------------------------------------------------------------------------
// Block menu — delete / duplicate / move. The drag handle lives in the gutter.
// ---------------------------------------------------------------------------

function EmptyState({
  onAdd,
  allowLinkProcedure = false,
}: {
  onAdd: (kind: ProcedureBlockKind) => void;
  allowLinkProcedure?: boolean;
}): React.ReactElement {
  return (
    <div className="space-y-4 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)] p-4 sm:p-6 lg:p-8">
      <div className="flex items-start gap-3">
        <IconTile size="md" icon="ri-file-text-line" />
        <div className="min-w-0">
          <h3 className="font-[family-name:var(--font-ui)] text-md font-semibold text-[var(--color-ink)]">
            Start writing
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-[var(--color-ink-2)] leading-relaxed">
            Pick a starting block. You can move, copy or remove any block later
            from its menu.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
        {(
          [
            { kind: "text", label: "Text", icon: "ri-text", hint: "Paragraph" },
            {
              kind: "rich_text",
              label: "Rich text",
              icon: "ri-edit-line",
              hint: "Formatted editor",
            },
            {
              kind: "heading",
              label: "Heading",
              icon: "ri-h-1",
              hint: "Section title",
            },
            {
              kind: "method",
              label: "Steps",
              icon: "ri-list-ordered",
              hint: "Numbered list",
            },
            {
              kind: "checklist",
              label: "Checklist",
              icon: "ri-list-check",
              hint: "Tick-off items",
            },
            {
              kind: "table",
              label: "Table",
              icon: "ri-table-line",
              hint: "Rows + columns",
            },
            {
              kind: "warning",
              label: "Callout",
              icon: "ri-alert-line",
              hint: "Warn / tip / alt",
            },
            {
              kind: "image",
              label: "Image",
              icon: "ri-image-line",
              hint: "Photo + caption",
            },
            {
              kind: "video",
              label: "Video",
              icon: "ri-video-line",
              hint: "Upload or link",
            },
            {
              kind: "attachment",
              label: "Attachment",
              icon: "ri-attachment-line",
              hint: "Linked file",
            },
            {
              kind: "ingredients",
              label: "Ingredients",
              icon: "ri-restaurant-line",
              hint: "Items + amounts",
            },
            {
              kind: "linked_procedures",
              label: "Link procedure",
              icon: "ri-links-line",
              hint: "Connect procedure",
            },
          ] as {
            kind: ProcedureBlockKind;
            label: string;
            icon: string;
            hint: string;
          }[]
        )
          .filter(
            (opt) => opt.kind !== "linked_procedures" || allowLinkProcedure,
          )
          .map((opt) => (
            <button
              key={opt.kind}
              type="button"
              onClick={() => onAdd(opt.kind)}
              className="group flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-4 py-3 sm:px-5 sm:py-3 text-left transition-colors hover:border-[var(--color-line-3)] hover:bg-[var(--color-wash)] cursor-pointer"
            >
              <Icon
                icon={opt.icon}
                className="size-5 text-[var(--color-ink-2)] group-hover:text-[var(--color-ink)] shrink-0"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-xs sm:text-sm font-semibold text-[var(--color-ink)] truncate">
                  {opt.label}
                </span>
                <span className="block text-[11px] sm:text-xs text-[var(--color-ink-2)] mt-0.5 line-clamp-1 leading-tight">
                  {opt.hint}
                </span>
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

export function NotionBlockList({
  blocks,
  onChange,
  errors,
  allowLinkProcedure = false,
}: NotionBlockListProps): React.ReactElement {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
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
  function move(id: string, dir: "up" | "down"): void {
    const i = blocks.findIndex((b) => b.id === id);
    if (i === -1) return;
    const j = dir === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= blocks.length) return;
    onChange(arrayMove(blocks, i, j));
  }
  const [linkModalTarget, setLinkModalTarget] = React.useState<{
    afterId?: string;
  } | null>(null);

  function duplicate(id: string): void {
    const i = blocks.findIndex((b) => b.id === id);
    if (i < -1) return;
    onChange([
      ...blocks.slice(0, i + 1),
      duplicateBlock(blocks[i]),
      ...blocks.slice(i + 1),
    ]);
  }

  function addAtEnd(kind: ProcedureBlockKind): void {
    if (kind === "linked_procedures") {
      setLinkModalTarget({});
      return;
    }
    onChange([...blocks, BLOCK_FACTORIES[kind]()]);
  }

  function addAfter(id: string, kind: ProcedureBlockKind): void {
    if (kind === "linked_procedures") {
      setLinkModalTarget({ afterId: id });
      return;
    }
    const i = blocks.findIndex((b) => b.id === id);
    if (i === -1) {
      addAtEnd(kind);
      return;
    }
    const next = [...blocks];
    next.splice(i + 1, 0, BLOCK_FACTORIES[kind]());
    onChange(next);
  }

  function handleConfirmLinkProcedures(procedureIds: string[]) {
    const newBlock: ProcedureBlock = {
      id: nextBlockId(),
      kind: "linked_procedures",
      procedureIds,
    };
    if (linkModalTarget?.afterId) {
      const i = blocks.findIndex((b) => b.id === linkModalTarget.afterId);
      if (i === -1) {
        onChange([...blocks, newBlock]);
      } else {
        const next = [...blocks];
        next.splice(i + 1, 0, newBlock);
        onChange(next);
      }
    } else {
      onChange([...blocks, newBlock]);
    }
    setLinkModalTarget(null);
  }

  if (blocks.length === 0) {
    return (
      <>
        <EmptyState onAdd={addAtEnd} allowLinkProcedure={allowLinkProcedure} />
        <LinkProcedureModal
          open={Boolean(linkModalTarget)}
          onClose={() => setLinkModalTarget(null)}
          onConfirm={handleConfirmLinkProcedures}
        />
      </>
    );
  }

  return (
    // No gutter on a phone: the toolbar sits inside each row there, and the
    // 32px it kept cut the image toolbar's Remove button off the edge.
    <div className="space-y-6 sm:pl-10">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={blocks.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
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
      <EndAddButton onAdd={addAtEnd} allowLinkProcedure={allowLinkProcedure} />

      <LinkProcedureModal
        open={Boolean(linkModalTarget)}
        onClose={() => setLinkModalTarget(null)}
        onConfirm={handleConfirmLinkProcedures}
      />
    </div>
  );
}

function EndAddButton({
  onAdd,
  allowLinkProcedure = false,
}: {
  onAdd: (kind: ProcedureBlockKind) => void;
  allowLinkProcedure?: boolean;
}): React.ReactElement {
  return (
    <div className="pt-2">
      {/* Ghost affordance — visible on hover only so it doesn't compete with slash command */}
      <InsertAfterButton
        onInsert={onAdd}
        ghost
        allowLinkProcedure={allowLinkProcedure}
      />
    </div>
  );
}
