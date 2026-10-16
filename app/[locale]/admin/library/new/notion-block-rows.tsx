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
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover } from "@/components/ui/popover";
import { RowActions } from "@/components/ui/row-actions";
import { LuTriangleAlert } from "react-icons/lu";
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
import { BlockBody } from "./notion-block-body";
import {
  asLoc,
  asOpt,
  isAllowedImageFile,
  readFileAsDataUrl,
  setLoc,
  setOpt,
} from "./notion-block-shared";

interface BlockMenuProps {
  block: ProcedureBlock;
  index: number;
  total: number;
  onChange: (next: ProcedureBlock[]) => void;
  onDuplicate: () => void;
  onRemove?: () => void;
  onMove: (direction: "up" | "down") => void;
}

function getBlockDeleteInfo(block: ProcedureBlock): {
  title: string;
  name: string;
  label: string;
  description: string;
} {
  switch (block.kind) {
    case "method": {
      const stepCount = block.steps?.length ?? 0;
      const stepText = stepCount === 1 ? "1 step" : `${stepCount} steps`;
      return {
        title: "Delete this section?",
        name: "Numbered steps",
        label: "Delete section",
        description: `"Numbered steps" and its ${stepText}, photos, and timers will be permanently removed. This can't be undone.`,
      };
    }
    case "recipe": {
      const stepCount = block.steps?.length ?? 0;
      const stepText = stepCount === 1 ? "1 step" : `${stepCount} steps`;
      return {
        title: "Delete this section?",
        name: "Recipe",
        label: "Delete section",
        description: `"Recipe" and its ingredients, ${stepText}, and metrics will be permanently removed. This can't be undone.`,
      };
    }
    case "ingredients": {
      const ingCount = block.ingredients?.length ?? 0;
      return {
        title: "Delete this section?",
        name: "Ingredients",
        label: "Delete section",
        description: `"Ingredients" and its ${ingCount} items will be permanently removed. This can't be undone.`,
      };
    }
    case "table": {
      const rowCount = block.rows?.length ?? 0;
      const colCount = block.headers?.length ?? 0;
      return {
        title: "Delete this section?",
        name: "Table",
        label: "Delete section",
        description: `"Table" and its ${colCount} columns and ${rowCount} rows will be permanently removed. This can't be undone.`,
      };
    }
    case "checklist": {
      const itemCount = block.items?.length ?? 0;
      return {
        title: "Delete this section?",
        name: "Checklist",
        label: "Delete section",
        description: `"Checklist" and its ${itemCount} items will be permanently removed. This can't be undone.`,
      };
    }
    case "warning":
      return {
        title: "Delete this section?",
        name: "Callout",
        label: "Delete section",
        description: `"Callout" and its notice text will be permanently removed. This can't be undone.`,
      };
    case "image":
      return {
        title: "Delete this section?",
        name: "Image",
        label: "Delete section",
        description: `"Image" and its media content will be permanently removed. This can't be undone.`,
      };
    case "video":
      return {
        title: "Delete this section?",
        name: "Video",
        label: "Delete section",
        description: `"Video" and its media content will be permanently removed. This can't be undone.`,
      };
    case "attachment":
      return {
        title: "Delete this section?",
        name: "Attachment",
        label: "Delete section",
        description: `"Attachment" and its file link will be permanently removed. This can't be undone.`,
      };
    case "heading":
      return {
        title: "Delete this section?",
        name: `Heading H${block.level}`,
        label: "Delete section",
        description: `"Heading H${block.level}" will be permanently removed. This can't be undone.`,
      };
    case "text":
      return {
        title: "Delete this section?",
        name: "Text",
        label: "Delete section",
        description: `"Text" and its paragraph content will be permanently removed. This can't be undone.`,
      };
    default:
      return {
        title: "Delete this section?",
        name: "Block",
        label: "Delete section",
        description: `This block and its contents will be permanently removed. This can't be undone.`,
      };
  }
}

interface BlockDeleteButtonProps {
  block: ProcedureBlock;
  onRemove: () => void;
}

function BlockDeleteButton({
  block,
  onRemove,
}: BlockDeleteButtonProps): React.ReactElement {
  const tAdmin = useTranslations("admin");
  const deleteInfo = React.useMemo(() => getBlockDeleteInfo(block), [block]);
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{
    top: number;
    right: number;
    origin: string;
  } | null>(null);

  const anchor = React.useCallback((): void => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const r = trigger.getBoundingClientRect();
    const height = popoverRef.current?.offsetHeight ?? 180;
    const width = 340;
    const below = window.innerHeight - r.bottom;
    const flipped = below < height + 16 && r.top > height + 16;
    const top = flipped ? r.top - height - 6 : r.bottom + 6;
    let right = window.innerWidth - r.right;
    if (r.right - width < 16) {
      right = Math.max(16, window.innerWidth - (r.left + width));
    }
    setPos({
      top: Math.max(12, Math.min(window.innerHeight - height - 12, top)),
      right: Math.max(12, right),
      origin: flipped ? "bottom right" : "top right",
    });
  }, []);

  React.useLayoutEffect(() => {
    if (!open) return;
    anchor();
    window.addEventListener("scroll", anchor, true);
    window.addEventListener("resize", anchor);
    return () => {
      window.removeEventListener("scroll", anchor, true);
      window.removeEventListener("resize", anchor);
    };
  }, [open, anchor]);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent): void => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      className={cn(
        "relative inline-flex rounded-full bg-[var(--color-surface)] border border-[var(--color-line-2)] shadow-e1 transition-colors",
        "hover:border-[var(--color-bad)]/40 hover:bg-[var(--color-bad-tint)]",
        open && "border-[var(--color-bad)]/40 bg-[var(--color-bad-tint)]",
      )}
    >
      <Button
        ref={triggerRef}
        type="button"
        size="icon"
        variant="ghost"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={deleteInfo.label}
        title={deleteInfo.label}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "text-[var(--color-ink-3)] hover:text-[var(--color-bad)] hover:bg-transparent",
          open && "text-[var(--color-bad)]",
        )}
      >
        <Icon icon="ri-delete-bin-line" className="text-base" />
      </Button>

      {open
        ? createPortal(
            <div
              ref={popoverRef}
              role="dialog"
              aria-modal="true"
              aria-label={deleteInfo.title}
              style={{
                top: pos?.top ?? -9999,
                right: pos?.right ?? 0,
                ["--pop-origin" as string]: pos?.origin ?? "top right",
              }}
              className="pop-in fixed z-dropdown w-[340px] max-w-[calc(100vw-32px)] rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-5 shadow-[var(--e-3)] text-left"
            >
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-bad-tint)] text-[var(--color-bad)]">
                    <LuTriangleAlert aria-hidden="true" className="size-4.5" />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <h3 className="text-base font-semibold text-[var(--color-ink)] tracking-tight">
                      {deleteInfo.title}
                    </h3>
                    <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-[var(--color-ink-2)]">
                      {deleteInfo.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2.5 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="neutral"
                    onClick={() => setOpen(false)}
                  >
                    {tAdmin("confirmNo")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setOpen(false);
                      onRemove();
                    }}
                    className="bg-[var(--color-bad)] hover:bg-[var(--color-bad-hover)] text-white! shadow-xs"
                  >
                    {deleteInfo.label}
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function BlockMenu({
  index,
  total,
  onDuplicate,
  onMove,
}: BlockMenuProps): React.ReactElement {
  const t = useTranslations("admin.library.new.form");
  // Items that don't apply at the current boundary are filtered out entirely
  // (move-up at the first row, move-down at the last row). Hiding them is
  // honest about what the user can do and avoids a `disabled` prop on the
  // shared RowActionItem type.
  const items = [
    ...(index > 0
      ? [
          {
            label: t("blockActions.moveUp"),
            icon: "ri-arrow-up-line",
            onSelect: () => onMove("up"),
          },
        ]
      : []),
    ...(index < total - 1
      ? [
          {
            label: t("blockActions.moveDown"),
            icon: "ri-arrow-down-line",
            onSelect: () => onMove("down"),
          },
        ]
      : []),
    {
      label: t("blockActions.duplicate"),
      icon: "ri-file-copy-line",
      onSelect: onDuplicate,
    },
  ];
  return (
    <RowActions
      triggerLabel="Block actions"
      items={items}
      className="rounded-full bg-[var(--color-surface)] border border-[var(--color-line-2)] shadow-e1"
    />
  );
}

// ---------------------------------------------------------------------------
// Block-row wrapper. Owns the hover gutter (drag + add-below + menu) and a
// subtle hover background. The body is the per-kind editor.
// ---------------------------------------------------------------------------

interface BlockRowProps {
  block: ProcedureBlock;
  index: number;
  total: number;
  error?: string;
  onPatch: (next: ProcedureBlock) => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
  onDuplicate: () => void;
  onInsertAfter: (kind: ProcedureBlockKind) => void;
}

export function BlockRow({
  block,
  index,
  total,
  error,
  onPatch,
  onRemove,
  onMove,
  onDuplicate,
  onInsertAfter,
}: BlockRowProps): React.ReactElement {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: block.id,
  });
  const [isHover, setIsHover] = React.useState(false);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const showToolbar = isHover || isDragging;

  return (
    <div
      id={`block-${block.id}`}
      ref={setNodeRef}
      style={style}
      tabIndex={-1}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      className={cn(
        "group rounded-[var(--radius-lg)] border bg-[var(--color-surface)] p-4 transition-all duration-200 outline-none",
        error
          ? "border-[var(--color-warn)]/60"
          : "border-[var(--color-line-2)] hover:border-[var(--color-line-3)] hover:bg-[var(--color-wash)]/50 focus-within:border-[var(--color-line-3)] focus-within:bg-[var(--color-wash)] focus-within:shadow-sm",
        isHover && !error && "border-[var(--color-line-3)]",
        isDragging &&
          "opacity-60 z-dropdown bg-[var(--color-wash)] border-[var(--color-line-3)] shadow-e2",
      )}
    >
      {/* Inline block error text when validation fails */}
      {error ? (
        <p
          role="alert"
          className="mb-2.5 flex items-center gap-1.5 text-xs font-normal text-[var(--color-warn-ink)] animate-in fade-in"
        >
          <LuTriangleAlert className="size-[13px] shrink-0 text-[var(--color-warn)]" />
          <span>{error}</span>
        </p>
      ) : null}
      {/* Header bar: drag handle, block type badge, and options menu */}
      <div className="mb-3 flex items-center gap-2">
        {/* Drag handle */}
        <button
          type="button"
          aria-label="Drag to reorder"
          title="Drag to reorder"
          className="flex size-7 cursor-grab items-center justify-center rounded-md text-[var(--color-ink-3)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink-2)] active:cursor-grabbing transition-colors"
          {...attributes}
          {...listeners}
        >
          <Icon icon="ri-drag-move-2-line" className="text-base" />
        </button>

        {/* Block kind indicator badge */}
        <span className="inline-flex items-center rounded bg-[var(--color-wash)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-3)] group-focus-within:bg-[var(--color-surface)] group-focus-within:text-[var(--color-ink)] group-focus-within:shadow-e1 transition-all">
          {block.kind === "text"
            ? "Text"
            : block.kind === "heading"
              ? `Heading H${block.level}`
              : block.kind === "method"
                ? "Numbered steps"
                : block.kind === "checklist"
                  ? "Checklist"
                  : block.kind === "warning"
                    ? "Callout"
                    : block.kind === "ingredients"
                      ? "Ingredients"
                      : block.kind === "recipe"
                        ? "Recipe"
                        : block.kind === "image"
                          ? "Image"
                          : block.kind === "video"
                            ? "Video"
                            : block.kind === "attachment"
                              ? "Attachment"
                              : "Table"}
        </span>

        {/* Spacer pushes actions to the right */}
        <span className="flex-1" />

        {/* Block options: delete icon at front, then 3-dots kebab menu */}
        <div className="flex items-center gap-2">
          <BlockDeleteButton block={block} onRemove={onRemove} />
          <BlockMenu
            block={block}
            index={index}
            total={total}
            onChange={() => {
              /* actions route through their own callbacks */
            }}
            onDuplicate={onDuplicate}
            onMove={onMove}
          />
        </div>
      </div>

      {/* Block body */}
      <BlockBody
        block={block}
        onPatch={onPatch}
        onInsertAfter={onInsertAfter}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add-below button. Opens a small inline menu of block kinds — the same
// options the empty-state menu shows, but inline.
// ---------------------------------------------------------------------------

export function InsertAfterButton({
  onInsert,
  ghost = false,
}: {
  onInsert: (kind: ProcedureBlockKind) => void;
  /** When true, renders as a low-profile ghost affordance rather than a full button. */
  ghost?: boolean;
}): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Insert block below"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex size-8 items-center justify-center rounded-md transition-all",
          ghost
            ? "text-[var(--color-ink-3)] opacity-30 hover:opacity-100 hover:bg-[var(--color-wash)] hover:text-[var(--color-ink-2)]"
            : "bg-[var(--color-surface)] text-[var(--color-ink-2)] ring-1 ring-[var(--color-line-2)] shadow-e1 hover:bg-[var(--color-panel)] hover:text-[var(--color-ink)] hover:ring-[var(--color-line-3)]",
        )}
      >
        <Icon icon="ri-add-line" className="text-lg" />
      </button>
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={triggerRef}
        align="start"
        width={220}
      >
        <div className="p-1 space-y-0.5">
          {(
            [
              { kind: "text", label: "Text", icon: "ri-text" },
              { kind: "heading", label: "Heading", icon: "ri-h-1" },
              {
                kind: "method",
                label: "Numbered steps",
                icon: "ri-list-ordered",
              },
              { kind: "checklist", label: "Checklist", icon: "ri-list-check" },
              { kind: "table", label: "Table", icon: "ri-table-line" },
              { kind: "warning", label: "Callout", icon: "ri-alert-line" },
              { kind: "image", label: "Photograph", icon: "ri-image-line" },
              { kind: "video", label: "Video", icon: "ri-video-line" },
              {
                kind: "attachment",
                label: "Attachment",
                icon: "ri-attachment-line",
              },
              {
                kind: "ingredients",
                label: "Ingredients",
                icon: "ri-restaurant-line",
              },
            ] as { kind: ProcedureBlockKind; label: string; icon: string }[]
          ).map((opt) => (
            <button
              key={opt.kind}
              type="button"
              onClick={() => {
                onInsert(opt.kind);
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--color-ink)] hover:bg-[var(--color-wash)] transition-colors"
            >
              <Icon
                icon={opt.icon}
                className="text-base text-[var(--color-ink-2)]"
              />
              <span className="font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      </Popover>
    </>
  );
}

// ---------------------------------------------------------------------------
// Per-kind bodies. Each one renders the block in its actual shape — a table
// block shows a table, a steps block shows numbered rows, an image block
// shows a drop zone. No chrome, no badges, no per-block header.
// ---------------------------------------------------------------------------
