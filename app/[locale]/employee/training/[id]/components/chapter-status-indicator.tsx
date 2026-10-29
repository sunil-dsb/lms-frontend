"use client";

import * as React from "react";
import type { IconType } from "react-icons";
import {
  LuBookOpen,
  LuCheck,
  LuCircleCheck,
  LuListChecks,
  LuLock,
  LuPaperclip,
  LuVideo,
} from "react-icons/lu";
import type { TrainingContentType } from "../../lib/training-view-types";

export interface ChapterStatusIndicatorProps {
  status: "complete" | "active" | "locked";
  contentType?: TrainingContentType | "procedure";
  subtitle: string;
  className?: string;
}

const CONTENT_TYPE_ICONS: Record<string, IconType> = {
  checklist: LuListChecks,
  quiz: LuCircleCheck,
  procedure: LuBookOpen,
  video: LuVideo,
  file: LuPaperclip,
};

/**
 * Reusable component to render chapter completion status, icon, and colors.
 * Directly consumes the backend response fields (status, contentType, subtitle).
 */
export function ChapterStatusIndicator({
  status,
  contentType,
  subtitle,
  className = "",
}: ChapterStatusIndicatorProps): React.ReactElement {
  const isComplete = status === "complete";
  const isLocked = status === "locked";

  // 1. Resolve Icon
  let IconComp: IconType = LuCheck;

  if (isLocked) {
    IconComp = LuLock;
  } else if (contentType && CONTENT_TYPE_ICONS[contentType]) {
    IconComp = CONTENT_TYPE_ICONS[contentType];
  } else {
    // Fallback based on subtitle keywords if contentType isn't explicitly provided
    const lower = subtitle.toLowerCase();
    if (lower.includes("checklist")) IconComp = LuListChecks;
    else if (lower.includes("quiz")) IconComp = LuCircleCheck;
    else if (lower.includes("procedure")) IconComp = LuBookOpen;
    else if (lower.includes("video")) IconComp = LuVideo;
    else if (lower.includes("file")) IconComp = LuPaperclip;
  }

  // 2. Resolve Tone/Color
  const textColorClass = isComplete
    ? "text-[#16A34A]"
    : isLocked
      ? "text-[var(--color-ink-3)]"
      : "text-[var(--color-ink-2)]";

  return (
    <div
      className={`flex items-center gap-1.5 text-xs font-medium ${textColorClass} ${className}`}
    >
      <IconComp className="w-3.5 h-3.5 shrink-0 mr-1" aria-hidden="true" />
      <span>{subtitle}</span>
    </div>
  );
}
