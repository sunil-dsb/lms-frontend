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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select";
import { RowActions } from "@/components/ui/row-actions";
import type {
  CriticalLimit,
  Localised,
  LocalisedOptional,
  ProcedureBlock,
  ProcedureBlockKind,
  ProcedureImageHint,
  ProcedureIngredient,
  ProcedureMethodStep,
  ProcedureNoteKind,
  ProcedureYieldItem,
} from "@/lib/types";
import { syncAmountsWithFactors } from "@/lib/procedure-blocks";
import { ALLERGEN_KEYS, type AllergenKey } from "@/lib/allergens";
import { uploadMedia, deleteUpload } from "@/lib/api";
import { classifyVideoUrl } from "@/lib/procedure-media";
import {
  LuArrowDown,
  LuArrowUp,
  LuCamera,
  LuChevronDown,
  LuChevronUp,
  LuCircleAlert,
  LuCirclePlay,
  LuCloudUpload,
  LuCopy,
  LuEye,
  LuFileText,
  LuFocus,
  LuGripVertical,
  LuHeading1,
  LuHeading2,
  LuHeading3,
  LuImage,
  LuImagePlus,
  LuLightbulb,
  LuLink,
  LuListChecks,
  LuListOrdered,
  LuPaperclip,
  LuPlus,
  LuRefreshCw,
  LuRotateCcw,
  LuTable,
  LuTrash2,
  LuTriangleAlert,
  LuType,
  LuUpload,
  LuUtensils,
  LuVideo,
  LuWorkflow,
  LuWrench,
  LuX,
} from "react-icons/lu";
import { Icon } from "@/components/ui/icon";
import type { IconType } from "react-icons";
import dynamic from "next/dynamic";
import {
  isPdfUrl,
  AttachmentCard,
} from "@/components/doc/attachment-cards-block";

// Must stay in sync with the backend whitelist at lms-backend/src/services/uploads.ts.
// SVG is intentionally omitted — it can carry inline JS.
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  BilingualTabs,
  EditorProps,
  Field,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  NOTE_KINDS,
  UNITS,
  asLocalised,
  asOpt,
  emptyCriticalLimit,
  emptyIngredient,
  newMethodStep,
  setLocalised,
  setOpt,
  textareaCls,
} from "./shared";

// react-pdf reads `document` at module scope, so it must never be
// server-rendered (react-pdf README → skip SSR; Next 16: `ssr: false` only
// inside client components, which this file is).
const PdfViewerModal = dynamic(
  () =>
    import("@/components/doc/pdf-viewer-modal").then((m) => ({
      default: m.PdfViewerModal,
    })),
  { ssr: false },
);

export function WarningEditor({
  block,
  onChange,
}: EditorProps<
  Extract<ProcedureBlock, { kind: "warning" }>
>): React.ReactElement {
  const t = useTranslations("admin.library.new.form.composer");
  const [lang, setLang] = React.useState<"en" | "es">("en");
  return (
    <div className="space-y-3">
      <Field label={t("warningSeverity.label")}>
        <CustomSelect
          value={block.severity}
          onChange={(val) =>
            onChange({ ...block, severity: val as ProcedureNoteKind })
          }
          options={[
            {
              value: "warn",
              label: t("warningSeverity.warn"),
              icon: LuCircleAlert,
            },
            {
              value: "tip",
              label: t("warningSeverity.tip"),
              icon: LuLightbulb,
            },
            {
              value: "alt",
              label: t("warningSeverity.alt"),
              icon: LuRotateCcw,
            },
            {
              value: "equip",
              label: t("warningSeverity.equip"),
              icon: LuWrench,
            },
            {
              value: "allergen",
              label: t("warningSeverity.allergen"),
              icon: LuTriangleAlert,
            },
          ]}
        />
      </Field>
      <BilingualTabs
        active={lang}
        onChange={setLang}
        enLabel={t("tabs.en")}
        esLabel={t("tabs.es")}
      />
      <textarea
        value={asLocalised(block.body, lang)}
        onChange={(e) =>
          onChange({
            ...block,
            body: setLocalised(block.body, lang, e.target.value),
          })
        }
        rows={3}
        maxLength={50}
        className={textareaCls}
      />
      <span className="text-xs text-[var(--color-ink-2)] ml-1">
        max {50} chars
      </span>
    </div>
  );
}

export function AttachmentEditor({
  block,
  onChange,
}: EditorProps<
  Extract<ProcedureBlock, { kind: "attachment" }>
>): React.ReactElement {
  const t = useTranslations("admin.library.new.form.composer");
  const [lang, setLang] = React.useState<"en" | "es">("en");
  const [uploading, setUploading] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    try {
      const uploadedUrl = await uploadMedia(file);
      const objectUrl =
        typeof window !== "undefined" ? URL.createObjectURL(file) : "";
      const finalUrl = uploadedUrl || objectUrl;
      const filenameNoExt = file.name
        .replace(/\.[^.]+$/, "")
        .replace(/[-_]/g, " ");
      const ext = file.name.split(".").pop()?.toUpperCase() ?? "FILE";
      const sizeKb = Math.round(file.size / 1024);
      const metaStr =
        sizeKb > 1024
          ? `${ext} · ${(sizeKb / 1024).toFixed(1)} MB`
          : `${ext} · ${sizeKb} KB`;

      onChange({
        ...block,
        href: finalUrl,
        meta: block.meta?.trim() ? block.meta : metaStr,
        title: {
          en: block.title?.en?.trim() ? block.title.en : filenameNoExt,
          es: block.title?.es?.trim() ? block.title.es : filenameNoExt,
        },
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="pt-0.5">
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md,image/jpeg,image/png,image/webp,image/avif"
        onChange={(e) => void handleUpload(e)}
        className="hidden"
      />

      {!block.href ? (
        /* Empty State: Clean, minimal single-row dropzone */
        <div
          onClick={() => fileRef.current?.click()}
          className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-[var(--radius-md)] border border-dashed border-[var(--color-line-2)] hover:border-[var(--color-brand)] bg-[var(--color-wash)]/60 hover:bg-[var(--color-panel)]/40 transition-all cursor-pointer min-h-[44px]"
        >
          <div className="flex items-center gap-2.5 text-xs text-[var(--color-ink-2)] min-w-0">
            <span className="flex items-center justify-center size-7 rounded-md bg-[var(--color-surface)] border border-[var(--color-line-2)] text-[var(--color-brand)] shrink-0">
              <LuPaperclip className="size-3.5" />
            </span>
            <span className="truncate">
              {uploading
                ? "Uploading document…"
                : "Click to upload PDF or document"}
            </span>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={uploading}
            className="h-7.5 px-3 text-xs shrink-0 pointer-events-none gap-1.5"
          >
            {uploading ? (
              <span className="spinner mr-1" />
            ) : (
              <LuUpload className="size-3.5" />
            )}
            Upload file
          </Button>
        </div>
      ) : (
        /* Attached State: Single compact document card */
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="flex items-center justify-center size-8 sm:size-9 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 shrink-0">
                <LuFileText className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-xs sm:text-sm text-[var(--color-ink)] truncate leading-tight">
                  {asLocalised(block.title, lang) || "Attachment"}
                </p>
                {block.meta ? (
                  <span className="text-2xs text-[var(--color-ink-2)] truncate block mt-0.5">
                    {block.meta}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPreviewOpen(true)}
                className="h-7.5 px-2.5 text-xs font-semibold gap-1 text-[var(--color-ink)] hover:text-[var(--color-brand)] border border-[var(--color-line-2)] hover:bg-[var(--color-panel)]"
              >
                <LuEye className="size-3.5" />
                <span>View</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="h-7.5 px-2 text-xs text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
                title="Replace file"
              >
                <LuUpload className="size-3.5" />
              </Button>

              <button
                type="button"
                onClick={() =>
                  onChange({ ...block, href: "", meta: undefined })
                }
                className="p-1 rounded text-[var(--color-ink-3)] hover:text-[var(--color-bad)] transition-colors cursor-pointer"
                title="Remove attachment"
              >
                <LuX className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {previewOpen && block.href ? (
        <PdfViewerModal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          title={asLocalised(block.title, lang) || "PDF Document"}
          url={block.href}
          meta={block.meta}
        />
      ) : null}
    </div>
  );
}
