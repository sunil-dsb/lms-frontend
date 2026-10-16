"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ProcedureBlock, ProcedureBlockKind } from "@/lib/types";
import { ProcedureBlockEditor } from "./procedure-block-editor";
import {
  LuArrowDown,
  LuArrowUp,
  LuCopy,
  LuGripVertical,
  LuHeading1,
  LuImage,
  LuListChecks,
  LuListOrdered,
  LuPaperclip,
  LuTable,
  LuTriangleAlert,
  LuType,
  LuUtensils,
  LuVideo,
  LuX,
} from "react-icons/lu";
import { Icon } from "@/components/ui/icon";
import type { IconType } from "react-icons";

const KIND_ICON: Record<ProcedureBlockKind, IconType> = {
  text: LuType,
  heading: LuHeading1,
  method: LuListOrdered,
  ingredients: LuUtensils,
  recipe: LuUtensils,
  image: LuImage,
  video: LuVideo,
  warning: LuTriangleAlert,
  attachment: LuPaperclip,
  table: LuTable,
  checklist: LuListChecks,
};

interface BlockTheme {
  border: string; // 4px left accent border
  bgHeader: string; // Card header background
  badgeBg: string; // Badge background
  badgeText: string; // Badge text color
  badgeBorder: string; // Badge border color
  iconColor: string; // Icon color
  label: string; // Human readable display label
}

const BLOCK_THEMES: Record<ProcedureBlockKind, BlockTheme> = {
  text: {
    border: "border-l-[var(--color-line-2)]",
    bgHeader: "bg-[var(--color-bg-admin)]",
    badgeBg: "bg-[var(--color-panel)]",
    badgeText: "text-[var(--color-ink)]",
    badgeBorder: "border-[var(--color-line)]",
    iconColor: "text-[var(--color-ink-2)]",
    label: "Text Area",
  },
  table: {
    border: "border-l-[var(--color-line-2)]",
    bgHeader: "bg-[var(--color-bg-admin)]",
    badgeBg: "bg-[var(--color-panel)]",
    badgeText: "text-[var(--color-ink)]",
    badgeBorder: "border-[var(--color-line)]",
    iconColor: "text-[var(--color-ink-2)]",
    label: "Table",
  },
  method: {
    border: "border-l-[var(--color-line-2)]",
    bgHeader: "bg-[var(--color-bg-admin)]",
    badgeBg: "bg-[var(--color-panel)]",
    badgeText: "text-[var(--color-ink)]",
    badgeBorder: "border-[var(--color-line)]",
    iconColor: "text-[var(--color-ink-2)]",
    label: "Numbered Steps",
  },
  warning: {
    border: "border-l-[var(--color-line-2)]",
    bgHeader: "bg-[var(--color-bg-admin)]",
    badgeBg: "bg-[var(--color-panel)]",
    badgeText: "text-[var(--color-ink)]",
    badgeBorder: "border-[var(--color-line)]",
    iconColor: "text-[var(--color-ink-2)]",
    label: "Warning Callout",
  },
  heading: {
    border: "border-l-[var(--color-line-2)]",
    bgHeader: "bg-[var(--color-bg-admin)]",
    badgeBg: "bg-[var(--color-panel)]",
    badgeText: "text-[var(--color-ink)]",
    badgeBorder: "border-[var(--color-line)]",
    iconColor: "text-[var(--color-ink-2)]",
    label: "Section Heading",
  },
  image: {
    border: "border-l-[var(--color-line-2)]",
    bgHeader: "bg-[var(--color-bg-admin)]",
    badgeBg: "bg-[var(--color-panel)]",
    badgeText: "text-[var(--color-ink)]",
    badgeBorder: "border-[var(--color-line)]",
    iconColor: "text-[var(--color-ink-2)]",
    label: "Photograph",
  },
  video: {
    border: "border-l-[var(--color-line-2)]",
    bgHeader: "bg-[var(--color-bg-admin)]",
    badgeBg: "bg-[var(--color-panel)]",
    badgeText: "text-[var(--color-ink)]",
    badgeBorder: "border-[var(--color-line)]",
    iconColor: "text-[var(--color-ink-2)]",
    label: "Video",
  },
  attachment: {
    border: "border-l-[var(--color-line-2)]",
    bgHeader: "bg-[var(--color-bg-admin)]",
    badgeBg: "bg-[var(--color-panel)]",
    badgeText: "text-[var(--color-ink)]",
    badgeBorder: "border-[var(--color-line)]",
    iconColor: "text-[var(--color-ink-2)]",
    label: "Attachment",
  },
  ingredients: {
    border: "border-l-[var(--color-line-2)]",
    bgHeader: "bg-[var(--color-bg-admin)]",
    badgeBg: "bg-[var(--color-panel)]",
    badgeText: "text-[var(--color-ink)]",
    badgeBorder: "border-[var(--color-line)]",
    iconColor: "text-[var(--color-ink-2)]",
    label: "Ingredients",
  },
  recipe: {
    border: "border-l-[var(--color-line-2)]",
    bgHeader: "bg-[var(--color-bg-admin)]",
    badgeBg: "bg-[var(--color-panel)]",
    badgeText: "text-[var(--color-ink)]",
    badgeBorder: "border-[var(--color-line)]",
    iconColor: "text-[var(--color-ink-2)]",
    label: "Recipe",
  },
  checklist: {
    border: "border-l-[var(--color-ok)]",
    bgHeader: "bg-[var(--color-bg-admin)]",
    badgeBg: "bg-[var(--color-ok-tint)]",
    badgeText: "text-[var(--color-ok)]",
    badgeBorder: "border-[var(--color-ok)]/30",
    iconColor: "text-[var(--color-ok)]",
    label: "Checklist",
  },
};

export function ProcedureBlockCard({
  block,
  index,
  total,
  onChange,
  onRemove,
  onMove,
  onDuplicate,
}: {
  block: ProcedureBlock;
  index: number;
  total: number;
  onChange: (next: ProcedureBlock) => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
  onDuplicate: () => void;
}): React.ReactElement {
  const t = useTranslations("admin.library.new.form.composer");
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

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const theme = BLOCK_THEMES[block.kind] || BLOCK_THEMES.text;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] border-l-4 transition-all",
        theme.border,
        isDragging && "opacity-60 shadow-[var(--e-2)]",
      )}
    >
      {/* Visual Header Bar with Tinted Background & Distinct Badge */}
      <header
        className={cn(
          "flex items-center justify-between border-b border-[var(--color-line-2)] px-4 py-3",
          theme.bgHeader,
        )}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={t("actions.dragHandle")}
            className="inline-flex size-8 cursor-grab items-center justify-center rounded-md text-[var(--color-ink-3)] hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] active:cursor-grabbing transition-colors"
            {...attributes}
            {...listeners}
          >
            <LuGripVertical aria-hidden="true" className="text-base" />
          </button>

          {/* Color Badge Indicator for Block Type */}
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-sm font-semibold",
              theme.badgeBg,
              theme.badgeText,
              theme.badgeBorder,
            )}
          >
            <Icon
              icon={KIND_ICON[block.kind]}
              className={cn("text-base", theme.iconColor)}
            />
            <span>{theme.label}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("actions.moveUp")}
            disabled={index === 0}
            onClick={() => onMove("up")}
            className="size-8"
          >
            <LuArrowUp aria-hidden="true" className="text-sm" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("actions.moveDown")}
            disabled={index === total - 1}
            onClick={() => onMove("down")}
            className="size-8"
          >
            <LuArrowDown aria-hidden="true" className="text-sm" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("actions.duplicate")}
            onClick={onDuplicate}
            className="size-8"
          >
            <LuCopy aria-hidden="true" className="text-sm" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("actions.remove")}
            onClick={onRemove}
            className="size-8 text-[var(--color-ink-3)] hover:text-[var(--color-bad)] hover:bg-[var(--color-bad-tint)]"
          >
            <LuX aria-hidden="true" className="text-sm" />
          </Button>
        </div>
      </header>

      {/* Block Editor Content */}
      <div className="p-4">
        <ProcedureBlockEditor block={block} onChange={onChange} />
      </div>
    </div>
  );
}
