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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomSelect } from '@/components/ui/custom-select';
import { RowActions } from '@/components/ui/row-actions';
import { Popover } from '@/components/ui/popover';
import {
  LuTriangleAlert,
  LuClock,
  LuFocus,
  LuImage,
  LuLightbulb,
  LuPlus,
  LuVideo,
  LuX,
} from 'react-icons/lu';
import {
  BLOCK_FACTORIES,
  duplicateBlock,
  nextStepId,
} from '@/lib/procedure-blocks';
import {
  requestImageUpload,
  requestVideoUpload,
  requestDocumentUpload,
  uploadToR2,
  uploadMedia,
  deleteUpload,
} from '@/lib/api';
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

// ---------------------------------------------------------------------------
// Localised helpers (kept local — this file is self-contained).
// ---------------------------------------------------------------------------

function asLoc(v: Localised | undefined, lang: 'en' | 'es'): string {
  return v?.[lang] ?? '';
}
function setLoc(v: Localised | undefined, lang: 'en' | 'es', value: string): Localised {
  return { en: v?.en ?? '', es: v?.es ?? '', [lang]: value };
}
function asOpt(v: LocalisedOptional | undefined, lang: 'en' | 'es'): string {
  return v?.[lang] ?? '';
}
function setOpt(v: LocalisedOptional | undefined, lang: 'en' | 'es', value: string): LocalisedOptional {
  return { en: v?.en, es: v?.es, [lang]: value };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/jfif',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/svg+xml',
  'image/bmp',
]);

const ALLOWED_IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|gif|avif|svg|bmp|jfif|pjpeg)$/i;

function isAllowedImageFile(file: File): boolean {
  if (!file) return false;
  if (file.type && (file.type.startsWith('image/') || ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase()))) {
    return true;
  }
  return ALLOWED_IMAGE_EXTENSIONS.test(file.name);
}

const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

const NOTE_KINDS: ProcedureNoteKind[] = ['warn', 'tip', 'alt', 'equip', 'allergen'];

interface NotionBlockListProps {
  blocks: ProcedureBlock[];
  onChange: (next: ProcedureBlock[]) => void;
  errors?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Block menu — delete / duplicate / move. The drag handle lives in the gutter.
// ---------------------------------------------------------------------------

interface BlockMenuProps {
  block: ProcedureBlock;
  index: number;
  total: number;
  onChange: (next: ProcedureBlock[]) => void;
  onDuplicate: () => void;
  onRemove?: () => void;
  onMove: (direction: 'up' | 'down') => void;
}

function getBlockDeleteInfo(block: ProcedureBlock): {
  title: string;
  name: string;
  label: string;
  description: string;
} {
  switch (block.kind) {
    case 'method': {
      const stepCount = block.steps?.length ?? 0;
      const stepText = stepCount === 1 ? '1 step' : `${stepCount} steps`;
      return {
        title: 'Delete this section?',
        name: 'Numbered steps',
        label: 'Delete section',
        description: `"Numbered steps" and its ${stepText}, photos, and timers will be permanently removed. This can't be undone.`,
      };
    }
    case 'recipe': {
      const stepCount = block.steps?.length ?? 0;
      const stepText = stepCount === 1 ? '1 step' : `${stepCount} steps`;
      return {
        title: 'Delete this section?',
        name: 'Recipe',
        label: 'Delete section',
        description: `"Recipe" and its ingredients, ${stepText}, and metrics will be permanently removed. This can't be undone.`,
      };
    }
    case 'ingredients': {
      const ingCount = block.ingredients?.length ?? 0;
      return {
        title: 'Delete this section?',
        name: 'Ingredients',
        label: 'Delete section',
        description: `"Ingredients" and its ${ingCount} items will be permanently removed. This can't be undone.`,
      };
    }
    case 'table': {
      const rowCount = block.rows?.length ?? 0;
      const colCount = block.headers?.length ?? 0;
      return {
        title: 'Delete this section?',
        name: 'Table',
        label: 'Delete section',
        description: `"Table" and its ${colCount} columns and ${rowCount} rows will be permanently removed. This can't be undone.`,
      };
    }
    case 'checklist': {
      const itemCount = block.items?.length ?? 0;
      return {
        title: 'Delete this section?',
        name: 'Checklist',
        label: 'Delete section',
        description: `"Checklist" and its ${itemCount} items will be permanently removed. This can't be undone.`,
      };
    }
    case 'warning':
      return {
        title: 'Delete this section?',
        name: 'Callout',
        label: 'Delete section',
        description: `"Callout" and its notice text will be permanently removed. This can't be undone.`,
      };
    case 'image':
      return {
        title: 'Delete this section?',
        name: 'Image',
        label: 'Delete section',
        description: `"Image" and its media content will be permanently removed. This can't be undone.`,
      };
    case 'video':
      return {
        title: 'Delete this section?',
        name: 'Video',
        label: 'Delete section',
        description: `"Video" and its media content will be permanently removed. This can't be undone.`,
      };
    case 'attachment':
      return {
        title: 'Delete this section?',
        name: 'Attachment',
        label: 'Delete section',
        description: `"Attachment" and its file link will be permanently removed. This can't be undone.`,
      };
    case 'heading':
      return {
        title: 'Delete this section?',
        name: `Heading H${block.level}`,
        label: 'Delete section',
        description: `"Heading H${block.level}" will be permanently removed. This can't be undone.`,
      };
    case 'text':
      return {
        title: 'Delete this section?',
        name: 'Text',
        label: 'Delete section',
        description: `"Text" and its paragraph content will be permanently removed. This can't be undone.`,
      };
    default:
      return {
        title: 'Delete this section?',
        name: 'Block',
        label: 'Delete section',
        description: `This block and its contents will be permanently removed. This can't be undone.`,
      };
  }
}

interface BlockDeleteButtonProps {
  block: ProcedureBlock;
  onRemove: () => void;
}

function BlockDeleteButton({ block, onRemove }: BlockDeleteButtonProps): React.ReactElement {
  const tAdmin = useTranslations('admin');
  const deleteInfo = React.useMemo(() => getBlockDeleteInfo(block), [block]);
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ top: number; right: number; origin: string } | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

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
      origin: flipped ? 'bottom right' : 'top right',
    });
  }, []);

  React.useLayoutEffect(() => {
    if (!open) return;
    anchor();
    window.addEventListener('scroll', anchor, true);
    window.addEventListener('resize', anchor);
    return () => {
      window.removeEventListener('scroll', anchor, true);
      window.removeEventListener('resize', anchor);
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
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div
      className={cn(
        'relative inline-flex rounded-full bg-[var(--color-surface)] border border-[var(--color-line-2)] shadow-e1 transition-colors',
        'hover:border-[var(--color-bad)]/40 hover:bg-[var(--color-bad-tint)]',
        open && 'border-[var(--color-bad)]/40 bg-[var(--color-bad-tint)]',
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
          'text-[var(--color-ink-3)] hover:text-[var(--color-bad)] hover:bg-transparent',
          open && 'text-[var(--color-bad)]',
        )}
      >
        <Icon icon="ri-delete-bin-line" className="text-base" />
      </Button>

      {open && mounted
        ? createPortal(
            <div
              ref={popoverRef}
              role="dialog"
              aria-modal="true"
              aria-label={deleteInfo.title}
              style={{
                top: pos?.top ?? -9999,
                right: pos?.right ?? 0,
                ['--pop-origin' as string]: pos?.origin ?? 'top right',
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
                    {tAdmin('confirmNo')}
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

function BlockMenu({ index, total, onDuplicate, onMove }: BlockMenuProps): React.ReactElement {
  const t = useTranslations('admin.library.new.form');
  // Items that don't apply at the current boundary are filtered out entirely
  // (move-up at the first row, move-down at the last row). Hiding them is
  // honest about what the user can do and avoids a `disabled` prop on the
  // shared RowActionItem type.
  const items = [
    ...(index > 0
      ? [{ label: t('blockActions.moveUp'), icon: 'ri-arrow-up-line', onSelect: () => onMove('up') }]
      : []),
    ...(index < total - 1
      ? [{ label: t('blockActions.moveDown'), icon: 'ri-arrow-down-line', onSelect: () => onMove('down') }]
      : []),
    { label: t('blockActions.duplicate'), icon: 'ri-file-copy-line', onSelect: onDuplicate },
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
  onMove: (direction: 'up' | 'down') => void;
  onDuplicate: () => void;
  onInsertAfter: (kind: ProcedureBlockKind) => void;
}

function BlockRow({
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
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
        'group rounded-[var(--radius-lg)] border bg-[var(--color-surface)] p-4 transition-all duration-200 outline-none',
        error
          ? 'border-[var(--color-warn)]/60'
          : 'border-[var(--color-line-2)] hover:border-[var(--color-line-3)] hover:bg-[var(--color-wash)]/50 focus-within:border-[var(--color-line-3)] focus-within:bg-[var(--color-wash)] focus-within:shadow-sm',
        isHover && !error && 'border-[var(--color-line-3)]',
        isDragging && 'opacity-60 z-dropdown bg-[var(--color-wash)] border-[var(--color-line-3)] shadow-e2',
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
          {block.kind === 'text'
            ? 'Text'
            : block.kind === 'heading'
              ? `Heading H${block.level}`
              : block.kind === 'method'
                ? 'Numbered steps'
                : block.kind === 'checklist'
                  ? 'Checklist'
                  : block.kind === 'warning'
                    ? 'Callout'
                    : block.kind === 'ingredients'
                      ? 'Ingredients'
                      : block.kind === 'recipe'
                        ? 'Recipe'
                        : block.kind === 'image'
                          ? 'Image'
                          : block.kind === 'video'
                            ? 'Video'
                            : block.kind === 'attachment'
                              ? 'Attachment'
                              : 'Table'}
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
            onChange={() => { /* actions route through their own callbacks */ }}
            onDuplicate={onDuplicate}
            onMove={onMove}
          />
        </div>
      </div>

      {/* Block body */}
      <BlockBody block={block} onPatch={onPatch} onInsertAfter={onInsertAfter} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add-below button. Opens a small inline menu of block kinds — the same
// options the empty-state menu shows, but inline.
// ---------------------------------------------------------------------------

function InsertAfterButton({
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
          'flex size-8 items-center justify-center rounded-md transition-all',
          ghost
            ? 'text-[var(--color-ink-3)] opacity-30 hover:opacity-100 hover:bg-[var(--color-wash)] hover:text-[var(--color-ink-2)]'
            : 'bg-[var(--color-surface)] text-[var(--color-ink-2)] ring-1 ring-[var(--color-line-2)] shadow-e1 hover:bg-[var(--color-panel)] hover:text-[var(--color-ink)] hover:ring-[var(--color-line-3)]',
        )}
      >
        <Icon icon="ri-add-line" className="text-lg" />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} triggerRef={triggerRef} align="start" width={220}>
        <div className="p-1 space-y-0.5">
          {([
            { kind: 'text', label: 'Text', icon: 'ri-text' },
            { kind: 'heading', label: 'Heading', icon: 'ri-h-1' },
            { kind: 'method', label: 'Numbered steps', icon: 'ri-list-ordered' },
            { kind: 'checklist', label: 'Checklist', icon: 'ri-list-check' },
            { kind: 'table', label: 'Table', icon: 'ri-table-line' },
            { kind: 'warning', label: 'Callout', icon: 'ri-alert-line' },
            { kind: 'image', label: 'Photograph', icon: 'ri-image-line' },
            { kind: 'video', label: 'Video', icon: 'ri-video-line' },
            { kind: 'attachment', label: 'Attachment', icon: 'ri-attachment-line' },
            { kind: 'ingredients', label: 'Ingredients', icon: 'ri-restaurant-line' },
          ] as { kind: ProcedureBlockKind; label: string; icon: string }[]).map((opt) => (
            <button
              key={opt.kind}
              type="button"
              onClick={() => {
                onInsert(opt.kind);
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-[var(--color-ink)] hover:bg-[var(--color-wash)] transition-colors"
            >
              <Icon icon={opt.icon} className="text-base text-[var(--color-ink-2)]" />
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

type BodyProps<T extends ProcedureBlock> = {
  block: T;
  onPatch: (next: T) => void;
};

function BlockBody({
  block,
  onPatch,
  onInsertAfter,
}: {
  block: ProcedureBlock;
  onPatch: (next: ProcedureBlock) => void;
  onInsertAfter?: (kind: ProcedureBlockKind) => void;
}): React.ReactElement {
  switch (block.kind) {
    case 'text':
      return <TextBody block={block} onPatch={onPatch} onInsertAfter={onInsertAfter} />;
    case 'heading':
      return <HeadingBody block={block} onPatch={onPatch} />;
    case 'method':
      return <MethodBody block={block} onPatch={onPatch} />;
    case 'ingredients':
      return <IngredientsBlockBody block={block} onPatch={onPatch} />;
    case 'recipe':
      return <MethodBody block={{ ...block, kind: 'method', steps: block.steps }} onPatch={onPatch as any} />;
    case 'image':
      return <ImageBody block={block} onPatch={onPatch} />;
    case 'video':
      return <VideoBody block={block} onPatch={onPatch} />;
    case 'warning':
      return <WarningBody block={block} onPatch={onPatch} />;
    case 'attachment':
      return <AttachmentBody block={block} onPatch={onPatch} />;
    case 'table':
      return <TableBody block={block} onPatch={onPatch} />;
    case 'checklist':
      return <ChecklistBody block={block} onPatch={onPatch} />;
    default:
      return <></>;
  }
}

// ---- Text ----

/** Block type options for the slash command picker — same list as InsertAfterButton. */
const SLASH_BLOCK_OPTIONS: { kind: ProcedureBlockKind; label: string; icon: string }[] = [
  { kind: 'text', label: 'Text', icon: 'ri-text' },
  { kind: 'heading', label: 'Heading', icon: 'ri-h-1' },
  { kind: 'method', label: 'Numbered steps', icon: 'ri-list-ordered' },
  { kind: 'checklist', label: 'Checklist', icon: 'ri-list-check' },
  { kind: 'table', label: 'Table', icon: 'ri-table-line' },
  { kind: 'warning', label: 'Callout', icon: 'ri-alert-line' },
  { kind: 'image', label: 'Photograph', icon: 'ri-image-line' },
  { kind: 'video', label: 'Video', icon: 'ri-video-line' },
  { kind: 'attachment', label: 'Attachment', icon: 'ri-attachment-line' },
  { kind: 'ingredients', label: 'Ingredients', icon: 'ri-restaurant-line' },
];

function TextBody({
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

function HeadingBody({
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

const STEP_TONE_CONFIGS: Record<
  ProcedureNoteKind,
  {
    label: string;
    icon: string;
    activeBg: string;
    activeColor: string;
    tintBg: string;
    iconColor: string;
  }
> = {
  warn: {
    label: 'Warning',
    icon: 'ri-alert-line',
    activeBg: '#d97706',
    activeColor: '#ffffff',
    tintBg: 'var(--color-warn-tint)',
    iconColor: '#d97706',
  },
  tip: {
    label: 'Tip',
    icon: 'ri-lightbulb-line',
    activeBg: '#166534',
    activeColor: '#ffffff',
    tintBg: 'var(--color-ok-tint)',
    iconColor: '#166534',
  },
  allergen: {
    label: 'Allergen',
    icon: 'ri-error-warning-line',
    activeBg: '#b91c1c',
    activeColor: '#ffffff',
    tintBg: 'var(--color-bad-tint)',
    iconColor: '#b91c1c',
  },
  equip: {
    label: 'Equipment',
    icon: 'ri-tools-line',
    activeBg: '#2563eb',
    activeColor: '#ffffff',
    tintBg: 'var(--color-wash)',
    iconColor: '#2563eb',
  },
  alt: {
    label: 'Alternative',
    icon: 'ri-information-line',
    activeBg: '#475569',
    activeColor: '#ffffff',
    tintBg: 'var(--color-wash)',
    iconColor: '#475569',
  },
};

const STEP_TIMER_PRESETS = [
  { label: '30s', sec: 30, unit: 'sec' as const },
  { label: '1m', sec: 60, unit: 'min' as const },
  { label: '2m', sec: 120, unit: 'min' as const },
  { label: '5m', sec: 300, unit: 'min' as const },
  { label: '10m', sec: 600, unit: 'min' as const },
  { label: '15m', sec: 900, unit: 'min' as const },
  { label: '30m', sec: 1800, unit: 'min' as const },
  { label: '1h', sec: 3600, unit: 'hrs' as const },
  { label: '2h', sec: 7200, unit: 'hrs' as const },
];

function MethodStepRow({
  step,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
}: {
  step: ProcedureMethodStep;
  index: number;
  total: number;
  onUpdate: (next: ProcedureMethodStep) => void;
  onRemove: () => void;
  onMove: (dir: 'up' | 'down') => void;
}): React.ReactElement {
  const legacyFirst = step.imageSrc
    ? [{ src: step.imageSrc, alt: step.imageAlt ?? { en: '', es: '' } }]
    : [];
  const images: Array<{ src: string; alt: Localised }> =
    step.images && step.images.length > 0 ? step.images : legacyFirst;

  const imageFileRef = React.useRef<HTMLInputElement>(null);
  const videoFileRef = React.useRef<HTMLInputElement>(null);
  const pendingImageIndex = React.useRef<number | null>(null);
  const [imageBusy, setImageBusy] = React.useState<
    { state: 'uploading' | 'failed'; target: number | null; error?: string } | null
  >(null);
  const [videoBusy, setVideoBusy] = React.useState<
    { state: 'uploading' | 'failed'; error?: string } | null
  >(null);

  const initialTimerUnit = React.useMemo<'sec' | 'min' | 'hrs'>(() => {
    const s = step.timer?.seconds ?? 60;
    if (s >= 3600 && s % 3600 === 0) return 'hrs';
    if (s >= 60) return 'min';
    return 'sec';
  }, [step.timer?.seconds]);

  const [timerUnit, setTimerUnit] = React.useState<'sec' | 'min' | 'hrs'>(initialTimerUnit);

  const displayTimerValue = React.useMemo(() => {
    const s = step.timer?.seconds ?? 60;
    if (timerUnit === 'hrs') {
      return String(Math.max(1, Math.round(s / 3600)));
    }
    if (timerUnit === 'min') {
      return String(Math.max(1, Math.round(s / 60)));
    }
    return String(Math.max(1, Math.round(s)));
  }, [step.timer?.seconds, timerUnit]);

  const handleTimerValueChange = (valStr: string) => {
    if (valStr === '') {
      onUpdate({ ...step, timer: { ...step.timer!, seconds: 1 } });
      return;
    }
    const raw = parseInt(valStr, 10);
    if (Number.isNaN(raw) || raw < 1) return;
    let sec = raw;
    if (timerUnit === 'hrs') sec = raw * 3600;
    else if (timerUnit === 'min') sec = raw * 60;
    else sec = raw;
    onUpdate({ ...step, timer: { ...step.timer!, seconds: sec } });
  };

  const hasVideo = Boolean(step.videoSrc);
  const hasAnyMedia = images.length > 0 || hasVideo || imageBusy || videoBusy;

  const latestStep = React.useRef(step);
  latestStep.current = step;
  const latestImages = React.useRef(images);
  latestImages.current = images;

  const triggerImageUpload = (target: number | null): void => {
    pendingImageIndex.current = target;
    imageFileRef.current?.click();
  };

  const writeImages = (next: Array<{ src: string; alt: Localised }>): void => {
    onUpdate({
      ...latestStep.current,
      images: next,
      imageSrc: undefined,
      imageAlt: undefined,
    });
  };

  const removeImage = (i: number): void => {
    const removed = latestImages.current[i];
    writeImages(latestImages.current.filter((_, j) => j !== i));
    if (removed?.src) void deleteUpload({ url: removed.src }).catch(() => undefined);
  };

  const updateImageAlt = (i: number, alt: Localised): void => {
    writeImages(latestImages.current.map((img, j) => (j === i ? { ...img, alt } : img)));
  };

  const MAX_STEP_IMAGES = 4;

  async function uploadImages(files: FileList | File[]): Promise<void> {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const target = pendingImageIndex.current;
    if (target !== null) {
      // Single replacement
      const file = fileArray[0];
      if (!isAllowedImageFile(file)) {
        setImageBusy({ state: 'failed', target, error: 'Unsupported image type — use JPG, PNG, WebP, GIF or AVIF' });
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setImageBusy({ state: 'failed', target, error: 'Image too large (max 10 MB)' });
        return;
      }
      setImageBusy({ state: 'uploading', target });
      try {
        const finalSrc = (await uploadMedia(file, 'image')) || (await readFileAsDataUrl(file));
        const filenameNoExt = file.name.replace(/\.[^.]+$/, '');
        const defaultAlt: Localised = { en: filenameNoExt, es: filenameNoExt };
        writeImages(
          latestImages.current.map((img, j) =>
            j === target
              ? { src: finalSrc, alt: img.alt.en || img.alt.es ? img.alt : defaultAlt }
              : img,
          ),
        );
        setImageBusy(null);
      } catch (err) {
        setImageBusy({
          state: 'failed',
          target,
          error: err instanceof Error ? err.message : 'Upload failed',
        });
      }
      return;
    }

    // Adding new images (capped at MAX_STEP_IMAGES = 4)
    const available = Math.max(0, MAX_STEP_IMAGES - latestImages.current.length);
    const toUpload = fileArray.slice(0, available);
    if (toUpload.length === 0) return;

    setImageBusy({ state: 'uploading', target: null });
    const newItems: Array<{ src: string; alt: Localised }> = [];
    let lastError: string | undefined;

    for (const file of toUpload) {
      if (!isAllowedImageFile(file)) {
        lastError = 'Unsupported image type — use JPG, PNG, WebP, GIF or AVIF';
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        lastError = 'Image too large (max 10 MB)';
        continue;
      }
      try {
        const finalSrc = (await uploadMedia(file, 'image')) || (await readFileAsDataUrl(file));
        const filenameNoExt = file.name.replace(/\.[^.]+$/, '');
        newItems.push({
          src: finalSrc,
          alt: { en: filenameNoExt, es: filenameNoExt },
        });
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Upload failed';
      }
    }

    if (newItems.length > 0) {
      writeImages([...latestImages.current, ...newItems].slice(0, MAX_STEP_IMAGES));
    }

    if (lastError && newItems.length === 0) {
      setImageBusy({ state: 'failed', target: null, error: lastError });
    } else {
      setImageBusy(null);
    }
  }

  async function uploadVideo(file: File): Promise<void> {
    if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
      setVideoBusy({ state: 'failed', error: 'Unsupported video type' });
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setVideoBusy({ state: 'failed', error: 'Video too large (max 100 MB)' });
      return;
    }
    setVideoBusy({ state: 'uploading' });
    try {
      const src = await uploadMedia(file, 'video');
      onUpdate({ ...step, videoSrc: src });
      setVideoBusy(null);
    } catch (err) {
      setVideoBusy({ state: 'failed', error: err instanceof Error ? err.message : 'Upload failed' });
    }
  }

  const uploadingIndex = imageBusy?.state === 'uploading' ? imageBusy.target : null;
  const failedIndex = imageBusy?.state === 'failed' ? imageBusy.target : null;

  return (
    <li className="flex gap-3 items-start">
      <span className="mt-2 inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-line-2)] bg-[var(--color-surface)] font-mono text-sm font-semibold text-[var(--color-ink)]">
        {String(index + 1).padStart(2, '0')}
      </span>

      <div className="flex-1 space-y-3">
        {/* Step description input */}
        <BilingualInput
          value={step.body}
          maxLength={500}
          onChange={(val) => onUpdate({ ...step, body: val })}
          multiline
          placeholder={{
            en: 'Describe this step in English…',
            es: 'Describe este paso en español…',
          }}
        />

        {/* Step action chips toolbar — consistent 32-36px height, 8px gap between chips, px-4 padding and gap-2 icon spacing */}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {/* Critical Step toggle */}
          <button
            type="button"
            aria-pressed={step.critical}
            onClick={() => onUpdate({ ...step, critical: !step.critical })}
            className={cn(
              'inline-flex h-8 sm:h-9 items-center gap-2 rounded-full px-4 text-xs font-medium transition-all shadow-2xs cursor-pointer border',
              step.critical
                ? 'border-[var(--color-bad)]/40 bg-[var(--color-bad-tint)] text-[var(--color-bad)] font-semibold'
                : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:border-[var(--color-line-3)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)]',
            )}
            title="Critical steps are highlighted with an alert badge to ensure compliance"
          >
            <LuFocus
              className={cn('size-4 shrink-0 text-current', step.critical ? 'text-[var(--color-bad)]' : 'text-[var(--color-ink-3)]')}
              strokeWidth={1.75}
            />
            <span>Critical</span>
          </button>

          {/* Tip / Callout toggle */}
          <button
            type="button"
            aria-pressed={Boolean(step.note)}
            onClick={() => {
              if (step.note) {
                onUpdate({ ...step, note: undefined });
              } else {
                onUpdate({ ...step, note: { severity: 'warn', body: { en: '', es: '' } } });
              }
            }}
            className={cn(
              'inline-flex h-8 sm:h-9 items-center gap-2 rounded-full px-4 text-xs font-medium transition-all shadow-2xs cursor-pointer border',
              step.note
                ? 'border-[var(--color-line-3)] bg-[var(--color-wash)] text-[var(--color-ink)] font-semibold ring-1 ring-[var(--color-line-3)]'
                : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:border-[var(--color-line-3)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)]',
            )}
            title={step.note ? 'Hide callout note' : 'Add tip or warning callout'}
          >
            <LuLightbulb className="size-4 shrink-0 text-[var(--color-ink-3)]" strokeWidth={1.75} />
            <span>Tip / Callout</span>
          </button>

          {/* Photo affordance */}
          <button
            type="button"
            disabled={images.length >= MAX_STEP_IMAGES}
            aria-pressed={images.length > 0}
            onClick={() => triggerImageUpload(null)}
            className={cn(
              'inline-flex h-8 sm:h-9 items-center gap-2 rounded-full px-4 text-xs font-medium transition-all shadow-2xs border',
              images.length >= MAX_STEP_IMAGES
                ? 'border-[var(--color-line-2)] bg-[var(--color-wash)] text-[var(--color-ink-3)] opacity-60 cursor-not-allowed'
                : images.length > 0
                  ? 'border-[var(--color-line-3)] bg-[var(--color-wash)] text-[var(--color-ink)] font-semibold cursor-pointer'
                  : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:border-[var(--color-line-3)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)] cursor-pointer',
            )}
            title={
              images.length >= MAX_STEP_IMAGES
                ? `Maximum ${MAX_STEP_IMAGES} photos reached`
                : 'Attach photos to this step (up to 4)'
            }
          >
            <LuImage className="size-4 shrink-0 text-[var(--color-ink-3)]" strokeWidth={1.75} />
            <span>Photo {images.length > 0 ? `(${images.length}/${MAX_STEP_IMAGES})` : ''}</span>
          </button>

          {/* Video affordance */}
          <button
            type="button"
            aria-pressed={hasVideo}
            onClick={() => videoFileRef.current?.click()}
            className={cn(
              'inline-flex h-8 sm:h-9 items-center gap-2 rounded-full px-4 text-xs font-medium transition-all shadow-2xs cursor-pointer border',
              hasVideo
                ? 'border-[var(--color-line-3)] bg-[var(--color-wash)] text-[var(--color-ink)] font-semibold'
                : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:border-[var(--color-line-3)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)]',
            )}
            title="Attach a video to this step"
          >
            <LuVideo className="size-4 shrink-0 text-[var(--color-ink-3)]" strokeWidth={1.75} />
            <span>Video</span>
          </button>

          {/* Timer affordance: disabled once timer exists */}
          <button
            type="button"
            disabled={Boolean(step.timer)}
            aria-pressed={Boolean(step.timer)}
            onClick={() => {
              setTimerUnit('min');
              onUpdate({ ...step, timer: { label: '', seconds: 60 } });
            }}
            className={cn(
              'inline-flex h-8 sm:h-9 items-center gap-2 rounded-full px-4 text-xs font-medium transition-all shadow-2xs border',
              step.timer
                ? 'border-[var(--color-line-2)] bg-[var(--color-wash)] text-[var(--color-ink-3)] opacity-60 cursor-not-allowed'
                : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:border-[var(--color-line-3)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)] cursor-pointer',
            )}
            title={step.timer ? 'Timer already added to this step' : 'Add timer'}
          >
            <LuClock className="size-4 shrink-0 text-[var(--color-ink-3)]" strokeWidth={1.75} />
            <span>Timer</span>
          </button>

          {/* Hidden file inputs */}
          <input
            ref={imageFileRef}
            type="file"
            multiple
            accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif"
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              e.target.value = '';
              if (files.length > 0) void uploadImages(files);
            }}
          />
          <input
            ref={videoFileRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void uploadVideo(f);
            }}
          />
        </div>

        {/* Inline Timer Editor (clean clock icon, optional label placeholder, 64px input, equal segmented control, 4h warning, pill presets) */}
        {step.timer && (
          <div className="flex flex-col gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)]/70 p-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <LuClock className="size-4 shrink-0 text-[var(--color-ink-3)]" strokeWidth={1.75} />
              <div className="relative flex-1 sm:max-w-[220px]">
                <input
                  type="text"
                  maxLength={50}
                  value={step.timer.label ?? ''}
                  onChange={(e) => onUpdate({ ...step, timer: { ...step.timer!, label: e.target.value } })}
                  placeholder="Label (optional), e.g. Simmer sauce"
                  className="h-8 sm:h-9 w-full rounded-[var(--radius-sm)] border border-[var(--color-line-2)] bg-[var(--color-surface)] pl-3 pr-14 text-xs font-medium text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)]/60 focus:border-[var(--color-ink)] focus:outline-none"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] text-[var(--color-ink-3)] pointer-events-none select-none">
                  {(step.timer.label ?? '').length} / 50
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={displayTimerValue}
                  onChange={(e) => handleTimerValueChange(e.target.value)}
                  className="h-8 sm:h-9 w-[64px] min-w-[64px] rounded-[var(--radius-sm)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-2 text-center text-xs font-mono font-bold text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:outline-none"
                />
                <div className="inline-flex h-8 sm:h-9 items-stretch rounded-[var(--radius-sm)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-0.5 shadow-2xs">
                  {(['sec', 'min', 'hrs'] as const).map((u) => {
                    const isSelected = timerUnit === u;
                    return (
                      <button
                        key={u}
                        type="button"
                        onClick={() => {
                          setTimerUnit(u);
                          const curVal = parseInt(displayTimerValue, 10) || 1;
                          let sec = curVal;
                          if (u === 'hrs') sec = curVal * 3600;
                          else if (u === 'min') sec = curVal * 60;
                          onUpdate({ ...step, timer: { ...step.timer!, seconds: sec } });
                        }}
                        className={cn(
                          'w-11 sm:w-12 flex items-center justify-center rounded-[var(--radius-xs)] text-xs font-semibold transition-all cursor-pointer',
                          isSelected
                            ? 'bg-[var(--color-ink)] text-[var(--color-surface)] shadow-2xs'
                            : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)] hover:bg-[var(--color-wash)]',
                        )}
                      >
                        {u}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onUpdate({ ...step, timer: undefined })}
                aria-label="Remove timer"
                title="Remove timer"
                className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-ink-3)] hover:bg-[var(--color-bad-tint)] hover:text-[var(--color-bad)] transition-colors cursor-pointer"
              >
                <LuX className="size-4 shrink-0 text-current" strokeWidth={1.75} />
              </button>
            </div>

            {/* Inline warning if total duration exceeds 4 hours (14,400s) */}
            {step.timer.seconds > 14400 && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-bad)]">
                <LuTriangleAlert className="size-4 shrink-0 text-current" strokeWidth={1.75} />
                <span>Timer duration exceeds 4 hours</span>
              </div>
            )}

            {/* Presets row: pill buttons with wrap, subtle active tint and border, sets number & unit */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[var(--color-line-2)]/60">
              <span className="text-xs font-semibold text-[var(--color-ink-3)] mr-1 shrink-0">
                Presets:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {STEP_TIMER_PRESETS.map((p) => {
                  const isMatch = timerUnit === p.unit && step.timer?.seconds === p.sec;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      aria-pressed={isMatch}
                      onClick={() => {
                        setTimerUnit(p.unit);
                        onUpdate({ ...step, timer: { ...step.timer!, seconds: p.sec } });
                      }}
                      className={cn(
                        'inline-flex min-h-[32px] items-center justify-center rounded-full px-3 text-xs font-medium transition-all cursor-pointer border',
                        isMatch
                          ? 'border-[var(--color-ink)] bg-[var(--color-wash)] text-[var(--color-ink)] font-semibold shadow-2xs ring-1 ring-[var(--color-ink)]/20'
                          : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:border-[var(--color-line-3)] hover:text-[var(--color-ink)] hover:bg-[var(--color-wash)]',
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Inline Callout Note Editor (generous spacing below pills, clean hairline divider, vibrant tone buttons) */}
        {step.note && (() => {
          const currentTone = STEP_TONE_CONFIGS[step.note.severity] ?? STEP_TONE_CONFIGS.warn;
          return (
            <div
              style={{ backgroundColor: currentTone.tintBg }}
              className="rounded-[var(--radius-md)] p-4 space-y-4 text-xs transition-colors"
            >
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--color-line-2)]/50">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-semibold text-[var(--color-ink)] flex items-center gap-1.5 text-xs">
                    <span style={{ color: currentTone.iconColor }} className="inline-flex">
                      <Icon icon={currentTone.icon} className="text-base" />
                    </span>
                    Callout tone:
                  </span>
                  <div className="flex items-center gap-2">
                    {(['warn', 'tip', 'allergen', 'equip'] as ProcedureNoteKind[]).map((kind) => {
                      const active = step.note?.severity === kind;
                      const cfg = STEP_TONE_CONFIGS[kind];
                      return (
                        <button
                          key={kind}
                          type="button"
                          onClick={() => onUpdate({ ...step, note: { ...step.note!, severity: kind } })}
                          style={
                            active
                              ? { backgroundColor: cfg.activeBg, color: cfg.activeColor }
                              : { backgroundColor: 'var(--color-surface)', color: 'var(--color-ink-2)' }
                          }
                          className={cn(
                            'inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer shadow-2xs',
                            active
                              ? 'ring-1 ring-black/10'
                              : 'hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)]',
                          )}
                        >
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdate({ ...step, note: undefined })}
                  aria-label="Remove callout note"
                  title="Remove callout note"
                  className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-ink-3)] hover:bg-[var(--color-bad-tint)] hover:text-[var(--color-bad)] transition-colors cursor-pointer"
                >
                  <LuX className="size-4 shrink-0 text-current" strokeWidth={1.75} />
                </button>
              </div>

              <BilingualInput
                value={step.note.body}
                maxLength={300}
                onChange={(body) => onUpdate({ ...step, note: { ...step.note!, body } })}
                multiline
                size="compact"
                placeholder={{
                  en:
                    step.note.severity === 'warn'
                      ? 'e.g. Halibut must be cooked using the third fryer only to prevent oil cross-contamination.'
                      : step.note.severity === 'tip'
                        ? 'e.g. The halibut is ready when no fish sticks to the knife upon removal.'
                        : step.note.severity === 'allergen'
                          ? 'e.g. Contains shellfish. Use designated allergen utensils.'
                          : 'e.g. Requires probe thermometer and parchment paper.',
                  es: 'Instrucciones o advertencia en español…',
                }}
              />
            </div>
          );
        })()}

        {/* Attached Media Previews (photos & video) */}
        {hasAnyMedia && (
          <div className="space-y-3 rounded-[var(--radius-md)] bg-[var(--color-wash)]/60 p-3 text-xs">
            {(images.length > 0 || (imageBusy && uploadingIndex === null)) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-semibold text-[var(--color-ink)]">
                    <Icon icon="ri-image-line" className="text-[var(--color-ink-3)]" />
                    <span>Step Photos</span>
                    <span className="rounded-full bg-[var(--color-surface)] border border-[var(--color-line-2)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-ink-2)]">
                      {images.length}/{MAX_STEP_IMAGES}
                    </span>
                  </span>
                  {images.length < MAX_STEP_IMAGES && (
                    <button
                      type="button"
                      onClick={() => triggerImageUpload(null)}
                      className="inline-flex items-center gap-1 font-semibold text-[var(--color-ink-2)] hover:text-[var(--color-ink)] cursor-pointer text-xs"
                    >
                      <LuPlus className="size-3.5" />
                      <span>Add photo</span>
                    </button>
                  )}
                </div>

                {images.length === 2 && (
                  <label className="flex items-center gap-2 text-[11px] text-[var(--color-ink-2)] cursor-pointer bg-[var(--color-surface)] p-2 rounded-[var(--radius-sm)] border border-[var(--color-line-2)]">
                    <input
                      type="checkbox"
                      checked={Boolean(step.compareImages)}
                      onChange={(e) => onUpdate({ ...step, compareImages: e.target.checked })}
                      className="rounded border-[var(--color-line-3)]"
                    />
                    <span className="font-medium text-[var(--color-ink)]">
                      Compare mode (Photo 1 = Correct, Photo 2 = Wrong)
                    </span>
                  </label>
                )}

                <div className="space-y-2">
                  {images.map((img, idx) => {
                    const isUploading = uploadingIndex === idx;
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-2.5 shadow-2xs"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-line-2)] bg-[var(--color-panel)]">
                          <img
                            src={img.src}
                            alt={img.alt.en ?? ''}
                            className="size-full object-cover"
                          />
                          {step.compareImages && images.length === 2 && (
                            <span
                              className={cn(
                                'absolute bottom-0 inset-x-0 text-center text-[9px] font-bold text-white py-0.5',
                                idx === 0 ? 'bg-[var(--color-ok-fill)]' : 'bg-[var(--color-bad-fill)]',
                              )}
                            >
                              {idx === 0 ? 'OK' : 'NO'}
                            </span>
                          )}
                          {isUploading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                              <span className="spinner text-white" aria-hidden="true" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <BilingualInput
                            value={img.alt ?? { en: '', es: '' }}
                            maxLength={150}
                            onChange={(val) => updateImageAlt(idx, val)}
                            size="compact"
                            placeholder={{
                              en: step.compareImages && images.length === 2
                                ? (idx === 0 ? 'Alt text (Correct/OK)…' : 'Alt text (Wrong/NO)…')
                                : `Alt text for photo ${idx + 1} (English)…`,
                              es: step.compareImages && images.length === 2
                                ? (idx === 0 ? 'Texto alternativo (Correcto)…' : 'Texto alternativo (Incorrecto)…')
                                : `Texto alternativo para foto ${idx + 1} (Español)…`,
                            }}
                          />
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => triggerImageUpload(idx)}
                            title="Replace photo"
                            aria-label="Replace photo"
                            className="inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-ink-2)] hover:bg-[var(--color-panel)] hover:text-[var(--color-ink)] transition-colors cursor-pointer"
                          >
                            <Icon icon="ri-upload-2-line" className="text-base" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            title="Remove photo"
                            aria-label="Remove photo"
                            className="inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-bad)] hover:bg-[var(--color-bad-tint)] transition-colors cursor-pointer"
                          >
                            <Icon icon="ri-delete-bin-line" className="text-base" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {uploadingIndex === null && imageBusy?.state === 'uploading' && (
                  <div className="flex items-center gap-2 text-xs text-[var(--color-ink-2)]">
                    <span className="spinner" aria-hidden="true" />
                    Uploading photo…
                  </div>
                )}

                {imageBusy?.state === 'failed' && (
                  <div className="flex items-center gap-2 text-xs text-[var(--color-bad)]">
                    <Icon icon="ri-error-warning-line" />
                    <span>{imageBusy.error}</span>
                    <button
                      type="button"
                      onClick={() => triggerImageUpload(failedIndex)}
                      className="underline font-semibold hover:no-underline ml-1 cursor-pointer"
                    >
                      Try again
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Video preview / input — also open while the first upload
                is in flight (videoSrc only exists once it completes). */}
            {(hasVideo || videoBusy?.state === 'uploading' || videoBusy?.state === 'failed') && (
              <div className="space-y-2 border-t border-[var(--color-line-2)] pt-2.5">
                <div className="flex items-center gap-2 font-semibold text-[var(--color-ink)]">
                  <Icon icon="ri-video-line" className="text-[var(--color-ink-3)]" />
                  <span>Step Video</span>
                </div>
                {hasVideo && (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      value={step.videoSrc ?? ''}
                      onChange={(e) => onUpdate({ ...step, videoSrc: e.target.value })}
                      placeholder="Paste a YouTube, Vimeo, or video URL…"
                      aria-label="Video URL"
                      className="h-8 w-full rounded-[var(--radius-sm)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 text-xs text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-brand)] focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => videoFileRef.current?.click()}
                    title="Replace video"
                    aria-label="Replace video"
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:bg-[var(--color-panel)] hover:text-[var(--color-ink)] transition-colors cursor-pointer"
                  >
                    <Icon icon="ri-upload-2-line" className="text-base" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextSrc = step.videoSrc;
                      onUpdate({ ...step, videoSrc: '', videoCaption: undefined });
                      if (nextSrc && classifyVideoUrl(nextSrc).provider === 'file') {
                        void deleteUpload({ url: nextSrc }).catch(() => undefined);
                      }
                    }}
                    title="Remove video"
                    aria-label="Remove video"
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-bad)] hover:bg-[var(--color-bad-tint)] transition-colors cursor-pointer"
                  >
                    <Icon icon="ri-delete-bin-line" className="text-base" />
                  </button>
                </div>
                )}
                {hasVideo && (
                <input
                  type="text"
                  value={step.videoCaption ?? ''}
                  onChange={(e) => onUpdate({ ...step, videoCaption: e.target.value || undefined })}
                  placeholder="Video caption (optional)…"
                  aria-label="Video caption"
                  className="h-8 w-full rounded-[var(--radius-sm)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 text-xs text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-brand)] focus:outline-none"
                />
                )}
                {videoBusy?.state === 'uploading' && (
                  <div className="flex items-center gap-2 text-xs text-[var(--color-ink-2)]">
                    <span className="spinner" aria-hidden="true" />
                    Uploading video…
                  </div>
                )}
                {videoBusy?.state === 'failed' && (
                  <div className="flex items-center gap-2 text-xs text-[var(--color-bad)]">
                    <Icon icon="ri-error-warning-line" />
                    <span>{videoBusy.error}</span>
                    <button
                      type="button"
                      onClick={() => videoFileRef.current?.click()}
                      className="underline font-semibold hover:no-underline ml-1 cursor-pointer"
                    >
                      Try again
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Additional Photo button inside media tray */}
            {images.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => triggerImageUpload(null)}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line-2)] bg-[var(--color-surface)] px-4 py-1 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-panel)] transition-colors cursor-pointer"
                >
                  <Icon icon="ri-image-add-line" className="text-[var(--color-brand)]" />
                  <span>Add another photo</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <StepRowMenu
        index={index}
        total={total}
        onMove={onMove}
        onRemove={onRemove}
      />
    </li>
  );
}

function MethodBody({
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

function ImageBody({ block, onPatch }: BodyProps<Extract<ProcedureBlock, { kind: 'image' }>>): React.ReactElement {
  const [upload, setUpload] = React.useState<{ state: 'idle' | 'uploading' | 'failed'; error?: string }>({ state: 'idle' });
  const fileRef = React.useRef<HTMLInputElement>(null);

  const startUpload = async (file: File): Promise<void> => {
    if (!isAllowedImageFile(file)) {
      setUpload({ state: 'failed', error: 'Unsupported image type' });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setUpload({ state: 'failed', error: 'Image too large (max 10 MB)' });
      return;
    }
    setUpload({ state: 'uploading' });
    try {
      const dataUrl = await readFileAsDataUrl(file);
      let finalSrc = (await uploadMedia(file, 'image')) || dataUrl;
      const filenameNoExt = file.name.replace(/\.[^.]+$/, '');
      onPatch({
        ...block,
        src: finalSrc,
        alt: {
          en: block.alt?.en?.trim() || filenameNoExt,
          es: block.alt?.es?.trim() || filenameNoExt,
        },
      });
      setUpload({ state: 'idle' });
    } catch (err) {
      setUpload({ state: 'failed', error: err instanceof Error ? err.message : 'Upload failed' });
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    void startUpload(f);
  };

  return (
    <div className="space-y-3 pt-1">
      {block.src ? (
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)]">
          <div className="flex items-center justify-between border-b border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-2">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-brand-700)]">
              <Icon icon="ri-image-fill" /> Photo / Cover Banner
            </span>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="sm" icon="ri-upload-2-line" onClick={() => fileRef.current?.click()}>
                Replace
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (block.src) {
                    void deleteUpload({ url: block.src }).catch(() => {
                      /* ignore — non-R2 URLs return 404 */
                    });
                  }
                  onPatch({ ...block, src: '' });
                }}
                className="text-[var(--color-bad)] hover:bg-[var(--color-bad-tint)]"
              >
                <Icon icon="ri-delete-bin-line" className="mr-1" /> Remove
              </Button>
            </div>
          </div>
          <div className="flex max-h-list items-center justify-center p-3">
            <img src={block.src} alt={block.alt?.en ?? ''} className="max-h-list rounded object-contain" />
          </div>
        </div>
      ) : upload.state === 'uploading' ? (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)] px-4 py-6 text-sm text-[var(--color-ink-2)]">
          <span className="spinner" aria-hidden="true" />
          Uploading…
        </div>
      ) : upload.state === 'failed' ? (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-bad-tint)] bg-[var(--color-bad-tint)] px-4 py-3 text-sm text-[var(--color-bad)]">
          <Icon icon="ri-error-warning-line" /> {upload.error}
          <Button type="button" variant="ghost" size="sm" icon="ri-upload-2-line" onClick={() => fileRef.current?.click()}>
            Try again
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) void startUpload(f);
          }}
          className="flex w-full flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-3)] bg-[var(--color-wash)] px-4 py-6 text-sm text-[var(--color-ink-2)] hover:bg-[var(--color-panel)]"
        >
          <Icon icon="ri-image-add-line" className="text-2xl text-[var(--color-ink-3)]" />
          <span className="font-medium">Drop image, or click to browse</span>
          <span className="text-sm text-[var(--color-ink-3)]">JPG · PNG · WebP · GIF · max 10 MB</span>
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif" onChange={handleFile} className="hidden" />
      {/* Caption — bilingual */}
      <BilingualInput
        value={{ en: block.caption?.en ?? '', es: block.caption?.es ?? '' }}
        maxLength={200}
        onChange={(val) => onPatch({ ...block, caption: val })}
        multiline
        size="compact"
        placeholder={{
          en: 'Optional caption (English)…',
          es: 'Pie de foto opcional (Español)…',
        }}
      />
    </div>
  );
}

// ---- Video ----

function VideoBody({ block, onPatch }: BodyProps<Extract<ProcedureBlock, { kind: 'video' }>>): React.ReactElement {
  const [upload, setUpload] = React.useState<{ state: 'idle' | 'uploading' | 'failed'; error?: string }>({ state: 'idle' });
  const fileRef = React.useRef<HTMLInputElement>(null);
  const videoClass = React.useMemo(() => classifyVideoUrl(block.src), [block.src]);

  const startUpload = async (file: File): Promise<void> => {
    if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
      setUpload({ state: 'failed', error: 'Unsupported video type' });
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setUpload({ state: 'failed', error: 'Video too large (max 100 MB)' });
      return;
    }
    setUpload({ state: 'uploading' });
    try {
      const src = await uploadMedia(file, 'video');
      onPatch({ ...block, src });
      setUpload({ state: 'idle' });
    } catch (err) {
      setUpload({ state: 'failed', error: err instanceof Error ? err.message : 'Upload failed' });
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';
    void startUpload(f);
  };

  return (
    <div className="space-y-3 pt-1">
      {block.src ? (
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)]">
          <div className="flex items-center justify-between border-b border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-2">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-brand-700)]">
              <Icon icon={videoClass.provider === 'file' ? 'ri-video-fill' : 'ri-link'} />
              Video
            </span>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="sm" icon="ri-upload-2-line" onClick={() => fileRef.current?.click()}>
                Replace
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (videoClass.provider === 'file' && block.src) {
                    void deleteUpload({ url: block.src }).catch(() => {
                      /* ignore */
                    });
                  }
                  onPatch({ ...block, src: '' });
                }}
                className="text-[var(--color-bad)] hover:bg-[var(--color-bad-tint)]"
              >
                <Icon icon="ri-delete-bin-line" className="mr-1" /> Remove
              </Button>
            </div>
          </div>
          <div className="bg-[var(--color-ink)]">
            {videoClass.provider === 'file' ? (
              <video controls src={block.src} className="max-h-list w-full object-contain" />
            ) : videoClass.embedUrl ? (
              <iframe
                src={videoClass.embedUrl}
                title="Video preview"
                className="aspect-video w-full"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="no-referrer"
              />
            ) : null}
          </div>
        </div>
      ) : upload.state === 'uploading' ? (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)] px-4 py-6 text-sm text-[var(--color-ink-2)]">
          <span className="spinner" aria-hidden="true" />
          Uploading…
        </div>
      ) : upload.state === 'failed' ? (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-bad-tint)] bg-[var(--color-bad-tint)] px-4 py-3 text-sm text-[var(--color-bad)]">
          <Icon icon="ri-error-warning-line" /> {upload.error}
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) void startUpload(f);
            }}
            className="flex w-full flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-3)] bg-[var(--color-wash)] px-4 py-5 text-sm text-[var(--color-ink-2)] hover:bg-[var(--color-panel)]"
          >
            <Icon icon="ri-video-add-line" className="text-2xl text-[var(--color-ink-3)]" />
            <span className="font-medium">Drop video, or click to upload</span>
            <span className="text-sm text-[var(--color-ink-3)]">MP4 · WebM · MOV · max 100 MB</span>
          </button>
          <Input
            type="url"
            value={block.src}
            onChange={(e) => onPatch({ ...block, src: e.target.value })}
            placeholder="…or paste a YouTube / Vimeo URL"
            className="text-sm"
          />
        </div>
      )}
      <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleFile} className="hidden" />
      <BilingualInput
        value={{ en: block.caption?.en ?? '', es: block.caption?.es ?? '' }}
        maxLength={200}
        onChange={(val) => onPatch({ ...block, caption: val })}
        multiline
        size="compact"
        placeholder={{
          en: 'Optional caption (English)…',
          es: 'Pie de foto opcional (Español)…',
        }}
      />
    </div>
  );
}

// ---- Warning / callout ----

function WarningBody({
  block,
  onPatch,
}: BodyProps<Extract<ProcedureBlock, { kind: 'warning' }>>): React.ReactElement {
  const sevTone: Record<ProcedureNoteKind, { bg: string; text: string; icon: string }> = {
    warn: { bg: 'border-[var(--color-warn)]/40 bg-[var(--color-warn-tint)]', text: 'text-[var(--color-warn-ink)]', icon: 'ri-alert-line' },
    tip: { bg: 'border-[var(--color-ok-tint-2)] bg-[var(--color-ok-tint)]', text: 'text-[var(--color-ok)]', icon: 'ri-lightbulb-line' },
    alt: { bg: 'border-[var(--color-line-2)] bg-[var(--color-wash)]', text: 'text-[var(--color-ink-2)]', icon: 'ri-loop-left-line' },
    equip: { bg: 'border-[var(--color-line-2)] bg-[var(--color-wash)]', text: 'text-[var(--color-ink-2)]', icon: 'ri-tools-line' },
    allergen: { bg: 'border-[var(--color-bad-tint)] bg-[var(--color-bad-tint)]', text: 'text-[var(--color-bad)]', icon: 'ri-error-warning-line' },
  };
  const tone = sevTone[block.severity];

  return (
    <div className={cn('rounded-[var(--radius-md)] border p-3', tone.bg)}>
      {/* Severity picker — compact, always accessible */}
      <div className="mb-2 flex items-center gap-2">
        <Icon icon={tone.icon} className={cn(tone.text, 'text-base shrink-0')} />
        <div className="w-field-xs shrink-0">
          <CustomSelect
            size="sm"
            value={block.severity}
            onChange={(v) => onPatch({ ...block, severity: v as ProcedureNoteKind })}
            options={NOTE_KINDS.map((k) => ({ value: k, label: k, icon: sevTone[k].icon }))}
          />
        </div>
      </div>
      <BilingualInput
        value={block.body}
        maxLength={500}
        onChange={(val) => onPatch({ ...block, body: val })}
        multiline
        placeholder={{
          en: 'Write the note in English…',
          es: 'Escribe la nota en español…',
        }}
      />
    </div>
  );
}

// ---- Attachment ----

function getAttachmentMeta(href: string): { icon: string; color: string } {
  const target = href.toLowerCase();
  if (target.endsWith('.pdf')) {
    return { icon: 'ri-file-pdf-2-line', color: 'text-rose-600 dark:text-rose-400' };
  }
  if (target.endsWith('.docx') || target.endsWith('.doc')) {
    return { icon: 'ri-file-word-line', color: 'text-blue-600 dark:text-blue-400' };
  }
  if (target.endsWith('.xlsx') || target.endsWith('.xls') || target.endsWith('.csv')) {
    return { icon: 'ri-file-excel-line', color: 'text-emerald-600 dark:text-emerald-400' };
  }
  if (target.match(/\.(jpg|jpeg|png|webp|gif|svg)$/)) {
    return { icon: 'ri-image-line', color: 'text-amber-600 dark:text-amber-400' };
  }
  return { icon: 'ri-file-text-line', color: 'text-[var(--color-brand)]' };
}

function formatDocSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentBody({ block, onPatch }: BodyProps<Extract<ProcedureBlock, { kind: 'attachment' }>>): React.ReactElement {
  const [upload, setUpload] = React.useState<{ state: 'idle' | 'uploading' | 'failed'; error?: string }>({ state: 'idle' });
  const fileRef = React.useRef<HTMLInputElement>(null);

  const metaInfo = React.useMemo(() => getAttachmentMeta(block.href), [block.href]);

  const startUpload = async (file: File): Promise<void> => {
    if (file.size > MAX_DOCUMENT_BYTES) {
      setUpload({ state: 'failed', error: 'File too large (max 25 MB)' });
      return;
    }
    setUpload({ state: 'uploading' });
    try {
      const uploadedUrl = await uploadMedia(file, 'document');
      const objectUrl = typeof window !== 'undefined' ? URL.createObjectURL(file) : '';
      const finalUrl = uploadedUrl || objectUrl;

      const filenameNoExt = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
      const ext = file.name.split('.').pop()?.toUpperCase() ?? 'FILE';
      const formattedBadge = `${ext} · ${formatDocSize(file.size)}`;

      onPatch({
        ...block,
        href: finalUrl,
        meta: block.meta?.trim() ? block.meta : formattedBadge,
        title: {
          en: block.title?.en?.trim() ? block.title.en : filenameNoExt,
          es: block.title?.es?.trim() ? block.title.es : filenameNoExt,
        },
      });
      setUpload({ state: 'idle' });
    } catch (err) {
      setUpload({ state: 'failed', error: err instanceof Error ? err.message : 'Upload failed' });
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = '';
    void startUpload(f);
  };

  return (
    <div className="space-y-2.5 pt-0.5">
      {/* URL input row with upload button outside */}
      <div className="flex items-center gap-2">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) void startUpload(f);
          }}
          className="flex flex-1 items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)] px-3 py-2 min-h-9 focus-within:border-[var(--color-ring)] focus-within:bg-[var(--color-surface)] transition-all"
        >
          <Icon
            icon={block.href ? metaInfo.icon : 'ri-attachment-line'}
            className={cn('text-base shrink-0', block.href ? metaInfo.color : 'text-[var(--color-ink-3)]')}
          />
          <input
            type="url"
            value={block.href}
            onChange={(e) => onPatch({ ...block, href: e.target.value })}
            placeholder="https://example.com/file.pdf"
            className="flex-1 min-w-0 bg-transparent text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:outline-none"
          />

          {block.href ? (
            <div className="flex items-center gap-1 shrink-0">
              <a
                href={block.href}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-[var(--color-ink-3)] hover:text-[var(--color-brand)] transition-colors"
                title="Open file"
              >
                <Icon icon="ri-external-link-line" className="text-sm" />
              </a>
              <button
                type="button"
                onClick={() => {
                  if (block.href && !block.href.startsWith('blob:')) {
                    void deleteUpload({ url: block.href }).catch(() => undefined);
                  }
                  onPatch({ ...block, href: '', meta: undefined });
                }}
                className="p-1 text-[var(--color-ink-3)] hover:text-[var(--color-bad)] transition-colors cursor-pointer"
                title="Clear"
              >
                <Icon icon="ri-close-line" className="text-sm" />
              </button>
            </div>
          ) : null}
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={upload.state === 'uploading'}
          onClick={() => fileRef.current?.click()}
          className="h-9 shrink-0 gap-2 px-5 text-xs font-semibold whitespace-nowrap"
        >
          {upload.state === 'uploading' ? (
            <>
              <span className="spinner mr-0.5" aria-hidden="true" />
              <span>Uploading…</span>
            </>
          ) : (
            <>
              <Icon icon="ri-upload-2-line" className="text-sm" />
              <span>{block.href ? 'Replace file' : 'Upload file'}</span>
            </>
          )}
        </Button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md,image/jpeg,image/png,image/webp,image/avif"
        onChange={handleFile}
        className="hidden"
      />

      {upload.state === 'failed' && (
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-bad)] px-1">
          <Icon icon="ri-error-warning-line" />
          <span>{upload.error}</span>
        </div>
      )}

      {/* Bilingual title input */}
      <BilingualInput
        value={block.title}
        maxLength={120}
        onChange={(val) => onPatch({ ...block, title: val })}
        size="compact"
        placeholder={{
          en: 'e.g. HACCP checklist (English)',
          es: 'e.g. Lista HACCP (Español)',
        }}
      />

      {/* Badge label input */}
      <div className="pt-1.5">
        <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)] px-3 py-2 min-h-9 focus-within:border-[var(--color-ring)] focus-within:bg-[var(--color-surface)] transition-all">
          <Icon icon="ri-price-tag-3-line" className="text-base text-[var(--color-ink-3)] shrink-0" />
          <input
            type="text"
            maxLength={60}
            value={block.meta ?? ''}
            onChange={(e) => onPatch({ ...block, meta: e.target.value || undefined })}
            placeholder="Badge label (optional, e.g. PDF · 2.4 MB, Revision 3)…"
            className="flex-1 min-w-0 bg-transparent text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:outline-none"
          />
          <span className="font-mono text-[10px] text-[var(--color-ink-3)] pointer-events-none select-none shrink-0">
            {(block.meta ?? '').length} / 60
          </span>
          {block.meta ? (
            <button
              type="button"
              onClick={() => onPatch({ ...block, meta: undefined })}
              className="p-1 text-[var(--color-ink-3)] hover:text-[var(--color-bad)] transition-colors cursor-pointer"
              title="Clear badge"
            >
              <Icon icon="ri-close-line" className="text-sm" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ---- Table — real table ----

const TABLE_LANGS: Array<'en' | 'es'> = ['en', 'es'];

function TableBody({
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

function ChecklistBody({
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
