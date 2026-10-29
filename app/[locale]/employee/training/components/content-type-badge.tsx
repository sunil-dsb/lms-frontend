"use client";

import * as React from "react";
import {
  LuBookOpen,
  LuCircleCheck,
  LuListChecks,
  LuPaperclip,
  LuVideo,
} from "react-icons/lu";
import type { TrainingContentType } from "../lib/training-view-types";

interface ContentTypeBadgeProps {
  type: TrainingContentType;
  locale?: string;
}

const TYPE_CONFIG = {
  checklist: {
    icon: LuListChecks,
    labelEn: "Checklist",
    labelEs: "Lista",
  },
  quiz: {
    icon: LuCircleCheck,
    labelEn: "Quiz",
    labelEs: "Cuestionario",
  },
  procedure: {
    icon: LuBookOpen,
    labelEn: "Procedure",
    labelEs: "Procedimiento",
  },
  video: {
    icon: LuVideo,
    labelEn: "Video",
    labelEs: "Video",
  },
  file: {
    icon: LuPaperclip,
    labelEn: "File",
    labelEs: "Archivo",
  },
};

export function ContentTypeBadge({
  type,
  locale = "en",
}: ContentTypeBadgeProps): React.ReactElement | null {
  const isEs = locale === "es";
  const cfg = TYPE_CONFIG[type];
  if (!cfg) return null;

  const IconComp = cfg.icon;
  const label = isEs ? cfg.labelEs : cfg.labelEn;

  return (
    <span
      className="inline-flex items-center rounded-full border border-[var(--color-line-2)] bg-[var(--color-wash)] text-[var(--color-ink)] select-none shadow-2xs"
      style={{
        paddingLeft: "12px",
        paddingRight: "12px",
        paddingTop: "5px",
        paddingBottom: "5px",
        fontSize: "12px",
        lineHeight: "1.2",
        fontWeight: "500",
        gap: "6px",
      }}
    >
      <IconComp
        className="w-3.5 h-3.5 text-[var(--color-ink-2)] shrink-0"
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  );
}

interface ContentTypesListProps {
  types?: TrainingContentType[];
  locale?: string;
  className?: string;
}

export function ContentTypesList({
  types,
  locale = "en",
  className = "",
}: ContentTypesListProps): React.ReactElement | null {
  if (!types || types.length === 0) return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-2 sm:gap-2.5 ${className}`}
    >
      {types.map((t) => (
        <ContentTypeBadge key={t} type={t} locale={locale} />
      ))}
    </div>
  );
}
