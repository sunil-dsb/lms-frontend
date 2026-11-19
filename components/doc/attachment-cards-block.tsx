"use client";

import * as React from "react";
import {
  LuDownload,
  LuExternalLink,
  LuFileSpreadsheet,
  LuFileText,
  LuImage,
} from "react-icons/lu";
import { useTranslations } from "next-intl";
import { buttonClassName } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AttachmentItem {
  id?: string;
  title: string;
  href: string;
  meta?: React.ReactNode;
}

export function isPdfUrl(href?: string, meta?: React.ReactNode): boolean {
  if (!href) return false;
  const clean = href.split("?")[0].split("#")[0].toLowerCase();
  const metaString = typeof meta === "string" ? meta.toLowerCase() : "";
  return clean.endsWith(".pdf") || Boolean(metaString.includes("pdf"));
}

export function getFileCategory(
  href?: string,
  meta?: React.ReactNode,
): {
  type: "pdf" | "image" | "spreadsheet" | "document" | "other";
  badge: string;
  isViewable: boolean;
} {
  if (!href) return { type: "other", badge: "FILE", isViewable: false };
  const clean = href.split("?")[0].split("#")[0].toLowerCase();

  if (isPdfUrl(href, meta)) {
    return { type: "pdf", badge: "PDF", isViewable: true };
  }
  if (clean.match(/\.(jpg|jpeg|png|webp|gif|svg|avif)$/)) {
    return { type: "image", badge: "IMAGE", isViewable: true };
  }
  if (
    clean.endsWith(".xlsx") ||
    clean.endsWith(".xls") ||
    clean.endsWith(".csv")
  ) {
    return { type: "spreadsheet", badge: "SHEET", isViewable: false };
  }
  if (clean.endsWith(".docx") || clean.endsWith(".doc")) {
    return { type: "document", badge: "DOC", isViewable: false };
  }

  const ext = clean.split(".").pop()?.toUpperCase() ?? "FILE";
  return { type: "other", badge: ext.slice(0, 5), isViewable: false };
}

export interface AttachmentCardProps {
  item: AttachmentItem;
  onView: () => void;
  className?: string;
}

export function AttachmentCard({
  item,
  onView,
  className,
}: AttachmentCardProps): React.ReactElement {
  const t = useTranslations("attachments");
  const fileCategory = getFileCategory(item.href, item.meta);
  const isPdf = fileCategory.type === "pdf";

  // Icon chips follow the status-pill convention: a tint background with the
  // semantic ink on it, so the colour flips with the theme's tokens.
  const renderIcon = () => {
    switch (fileCategory.type) {
      case "pdf":
        return (
          <span className="flex items-center justify-center size-8 rounded-lg bg-bad-tint text-bad shrink-0">
            <LuFileText className="size-4" aria-hidden="true" />
          </span>
        );
      case "image":
        return (
          <span className="flex items-center justify-center size-8 rounded-lg bg-warn-tint text-warn-ink shrink-0">
            <LuImage className="size-4" aria-hidden="true" />
          </span>
        );
      case "spreadsheet":
        return (
          <span className="flex items-center justify-center size-8 rounded-lg bg-ok-tint text-ok shrink-0">
            <LuFileSpreadsheet className="size-4" aria-hidden="true" />
          </span>
        );
      default:
        return (
          <span className="flex items-center justify-center size-8 rounded-lg bg-brand-tint text-brand shrink-0">
            <LuFileText className="size-4" aria-hidden="true" />
          </span>
        );
    }
  };

  // The whole card is the View action for a PDF — the separate View
  // button was redundant, and its Download lives inside the viewer, so
  // PDF cards carry no buttons at all. role/tabIndex/keydown keep the
  // card reachable from the keyboard; the global :focus-visible outline
  // draws the ring.
  return (
    <div
      className={cn(
        "group relative flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-line-2 bg-surface hover:bg-panel/40 hover:border-line-3 transition-colors duration-[var(--dur)] min-w-0 w-full",
        isPdf ? "cursor-pointer" : "",
        className,
      )}
      onClick={isPdf ? onView : undefined}
      onKeyDown={
        isPdf
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onView();
              }
            }
          : undefined
      }
      role={isPdf ? "button" : undefined}
      tabIndex={isPdf ? 0 : undefined}
      aria-label={
        isPdf ? `${t("view")} — ${item.title || t("untitled")}` : undefined
      }
    >
      {/* File info */}
      <div className="flex items-center gap-3 min-w-[150px] max-w-full flex-1">
        {renderIcon()}
        <div className="min-w-0 flex-1">
          <p
            title={item.title}
            className={cn(
              "font-semibold text-xs sm:text-sm text-ink truncate transition-colors",
              isPdf ? "group-hover:text-brand" : "",
            )}
          >
            {item.title || t("untitled")}
          </p>
          {item.meta ? (
            <div className="font-ui text-xs text-ink-2 truncate">
              {item.meta}
            </div>
          ) : null}
        </div>
      </div>

      {/* Actions: a PDF's whole card IS its View action (see above) and
          its Download lives inside the viewer, so PDF cards carry no
          buttons at all. Non-PDF files can't be viewed in the reader, so
          they keep Open here; `ml-auto` keeps them aligned right when the
          row wraps below the file info on narrow cards. */}
      {isPdf ? null : (
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClassName({
              variant: "secondary",
              size: "sm",
              className: "min-h-10",
            })}
          >
            <LuExternalLink aria-hidden="true" />
            {t("open")}
          </a>
        </div>
      )}
    </div>
  );
}

export interface AttachmentCardsBlockProps {
  items: AttachmentItem[];
  onViewPdf: (item: AttachmentItem) => void;
}

export function AttachmentCardsBlock({
  items,
  onViewPdf,
}: AttachmentCardsBlockProps): React.ReactElement | null {
  if (!items || items.length === 0) return null;

  // One bordered container holding a flex row of cards: each card has a
  // 260px basis and grows, so a single PDF fills the row on its own, two
  // share it, and more wrap to the next line — no fixed column counts to
  // break in the narrow preview panel or on a phone. Flex (not a grid)
  // gives that "one card = full row" shape; this theme also switches its
  // container scale off (`--container-*: initial`), so container-query
  // variants compile to nothing and were never an option here anyway.
  return (
    <div className="my-3 rounded-lg border border-line-2 bg-wash p-3">
      <div className="flex flex-wrap gap-3">
        {items.map((item, idx) => (
          <AttachmentCard
            key={item.id ?? idx}
            item={item}
            onView={() => onViewPdf(item)}
            className="grow basis-[260px]"
          />
        ))}
      </div>
    </div>
  );
}
