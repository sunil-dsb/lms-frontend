"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Popover, PopoverGroup, PopoverItem } from "@/components/ui/popover";
import type { ProcedureBlockKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  LuBookOpen,
  LuChevronDown,
  LuHeading1,
  LuImage,
  LuListOrdered,
  LuListChecks,
  LuPaperclip,
  LuPlus,
  LuSearch,
  LuTable,
  LuTriangleAlert,
  LuType,
  LuUtensils,
  LuVideo,
} from "react-icons/lu";
import { Icon } from "@/components/ui/icon";
import type { IconType } from "react-icons";

interface ProcedureAddMenuProps {
  onAdd: (kind: ProcedureBlockKind) => void;
  /** When true, render a compact right-aligned button for use below the list. */
  variant?: "standalone" | "inline";
}

interface BlockMenuItem {
  kind: ProcedureBlockKind;
  label: string;
  description: string;
  icon: IconType;
  group: "basic" | "media" | "structured" | "safety";
}

export function ProcedureAddMenu({
  onAdd,
  variant = "standalone",
}: ProcedureAddMenuProps): React.ReactElement {
  const t = useTranslations("admin.library.new.form.composer");
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const close = React.useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);

  const add = React.useCallback(
    (kind: ProcedureBlockKind) => {
      onAdd(kind);
      close();
    },
    [onAdd, close],
  );

  const menuItems: BlockMenuItem[] = React.useMemo(
    () => [
      {
        kind: "text",
        label: "Text",
        description: "Add rich text with formatting options",
        icon: LuType,
        group: "basic",
      },
      {
        kind: "heading",
        label: "Heading",
        description: "Add a section heading",
        icon: LuHeading1,
        group: "basic",
      },
      {
        kind: "method",
        label: "Numbered steps",
        description: "Add sequential steps",
        icon: LuListOrdered,
        group: "basic",
      },
      {
        kind: "image",
        label: "Photograph",
        description: "Add an image with caption",
        icon: LuImage,
        group: "media",
      },
      {
        kind: "video",
        label: "Video",
        description: "Add a video with time markers",
        icon: LuVideo,
        group: "media",
      },
      {
        kind: "attachment",
        label: "Attachment",
        description: "Add a file (PDF, Word, etc.)",
        icon: LuPaperclip,
        group: "media",
      },
      {
        kind: "recipe",
        label: "Recipe",
        description: "Add recipe details (ingredients, yield, etc.)",
        icon: LuUtensils,
        group: "structured",
      },
      {
        kind: "table",
        label: "Table",
        description: "Add a table with custom columns",
        icon: LuTable,
        group: "structured",
      },
      {
        kind: "warning",
        label: "Warning callout",
        description: "Highlight important safety information",
        icon: LuTriangleAlert,
        group: "safety",
      },
      {
        kind: "checklist",
        label: "Checklist",
        description: "Add a list employees can tick off while working",
        icon: LuListChecks,
        group: "basic",
      },
    ],
    [],
  );

  const filteredItems = React.useMemo(() => {
    if (!search.trim()) return menuItems;
    const q = search.toLowerCase();
    return menuItems.filter(
      (it) =>
        it.label.toLowerCase().includes(q) ||
        it.description.toLowerCase().includes(q),
    );
  }, [menuItems, search]);

  const basicItems = filteredItems.filter((i) => i.group === "basic");
  const mediaItems = filteredItems.filter((i) => i.group === "media");
  const structuredItems = filteredItems.filter((i) => i.group === "structured");
  const safetyItems = filteredItems.filter((i) => i.group === "safety");

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        variant === "inline" ? "justify-between w-full" : "justify-start",
      )}
    >
      {/* Visible Block Type Quick Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-[var(--color-ink-3)] mr-1">
          Add block:
        </span>
        <button
          type="button"
          onClick={() => onAdd("text")}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-wash)] hover:border-[var(--color-line-3)] transition-colors"
        >
          <LuType
            aria-hidden="true"
            className="text-sm text-[var(--color-ink-2)]"
          />
          <span>Text</span>
        </button>
        <button
          type="button"
          onClick={() => onAdd("table")}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-wash)] hover:border-[var(--color-line-3)] transition-colors"
        >
          <LuTable
            aria-hidden="true"
            className="text-sm text-[var(--color-ink-2)]"
          />
          <span>Table</span>
        </button>
        <button
          type="button"
          onClick={() => onAdd("method")}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-wash)] hover:border-[var(--color-line-3)] transition-colors"
        >
          <LuListOrdered
            aria-hidden="true"
            className="text-sm text-[var(--color-ink-2)]"
          />
          <span>Steps</span>
        </button>
        <button
          type="button"
          onClick={() => onAdd("warning")}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-wash)] hover:border-[var(--color-line-3)] transition-colors"
        >
          <LuTriangleAlert
            aria-hidden="true"
            className="text-sm text-[var(--color-ink-2)]"
          />
          <span>Warning</span>
        </button>
        <button
          type="button"
          onClick={() => onAdd("heading")}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-wash)] hover:border-[var(--color-line-3)] transition-colors"
        >
          <LuHeading1
            aria-hidden="true"
            className="text-sm text-[var(--color-ink-2)]"
          />
          <span>Heading</span>
        </button>
        <button
          type="button"
          onClick={() => onAdd("image")}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-wash)] hover:border-[var(--color-line-3)] transition-colors"
        >
          <LuImage
            aria-hidden="true"
            className="text-sm text-[var(--color-ink-2)]"
          />
          <span>Image</span>
        </button>
      </div>

      {/* Dropdown Menu for All Blocks */}
      <div>
        <Button
          ref={triggerRef}
          type="button"
          variant="secondary"
          size="sm"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="gap-2 px-3 shadow-e1 text-sm"
        >
          <LuPlus aria-hidden="true" className="text-sm" />
          <span>More blocks</span>
          <LuChevronDown
            aria-hidden="true"
            className={cn(
              "text-sm transition-transform duration-[var(--dur)]",
              open && "rotate-180",
            )}
          />
        </Button>
      </div>

      <Popover
        open={open}
        onClose={close}
        triggerRef={triggerRef}
        align="end"
        width={360}
      >
        {/* Search input bar */}
        <div className="p-2 border-b border-[var(--color-line)]">
          <div className="relative">
            <LuSearch
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-[var(--color-ink-3)]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search content blocks..."
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-line-3)] bg-[var(--color-input)] py-2 pl-10 pr-3 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus-visible:border-[var(--color-ring)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
            />
          </div>
        </div>

        {/* Scrollable list of groups */}
        <div className="max-h-list overflow-y-auto p-1 space-y-1 divide-y divide-[var(--color-line)]">
          {filteredItems.length === 0 ? (
            <div className="p-6 text-center text-sm text-[var(--color-ink-3)]">
              No matching blocks found.
            </div>
          ) : (
            <>
              {basicItems.length > 0 && (
                <PopoverGroup label="BASIC">
                  {basicItems.map((item) => (
                    <PopoverItem
                      key={item.kind}
                      icon={item.icon}
                      label={item.label}
                      description={item.description}
                      onClick={() => add(item.kind)}
                    />
                  ))}
                </PopoverGroup>
              )}

              {mediaItems.length > 0 && (
                <PopoverGroup label="MEDIA">
                  {mediaItems.map((item) => (
                    <PopoverItem
                      key={item.kind}
                      icon={item.icon}
                      label={item.label}
                      description={item.description}
                      onClick={() => add(item.kind)}
                    />
                  ))}
                </PopoverGroup>
              )}

              {structuredItems.length > 0 && (
                <PopoverGroup label="STRUCTURED">
                  {structuredItems.map((item) => (
                    <PopoverItem
                      key={item.kind}
                      icon={item.icon}
                      label={item.label}
                      description={item.description}
                      onClick={() => add(item.kind)}
                    />
                  ))}
                </PopoverGroup>
              )}

              {safetyItems.length > 0 && (
                <PopoverGroup label="SAFETY">
                  {safetyItems.map((item) => (
                    <PopoverItem
                      key={item.kind}
                      icon={item.icon}
                      label={item.label}
                      description={item.description}
                      onClick={() => add(item.kind)}
                    />
                  ))}
                </PopoverGroup>
              )}
            </>
          )}
        </div>
      </Popover>
    </div>
  );
}
