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
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Field label={t("attachmentHref")} required>
            <Input
              value={block.href}
              onChange={(e) => onChange({ ...block, href: e.target.value })}
              placeholder="https://example.com/file.pdf"
            />
          </Field>
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="mb-0.5 shrink-0"
        >
          {uploading ? (
            <span className="spinner mr-1.5" />
          ) : (
            <LuUpload className="mr-1.5" />
          )}
          {uploading ? "Uploading…" : "Upload file"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md,image/jpeg,image/png,image/webp,image/avif"
          onChange={(e) => void handleUpload(e)}
          className="hidden"
        />
      </div>
      <BilingualTabs
        active={lang}
        onChange={setLang}
        enLabel={t("tabs.en")}
        esLabel={t("tabs.es")}
      />
      <Field label={t("attachmentTitle")} required>
        <Input
          value={asLocalised(block.title, lang)}
          onChange={(e) =>
            onChange({
              ...block,
              title: setLocalised(block.title, lang, e.target.value),
            })
          }
        />
      </Field>
      <Field label={t("attachmentMeta")}>
        <Input
          value={block.meta ?? ""}
          onChange={(e) => onChange({ ...block, meta: e.target.value })}
          placeholder="e.g. PDF · 2.4 MB"
        />
      </Field>
    </div>
  );
}
