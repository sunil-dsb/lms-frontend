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

export function VideoEditor({
  block,
  onChange,
}: EditorProps<
  Extract<ProcedureBlock, { kind: "video" }>
>): React.ReactElement {
  const t = useTranslations("admin.library.new.form.composer");
  const [lang, setLang] = React.useState<"en" | "es">("en");
  const [sourceMode, setSourceMode] = React.useState<"upload" | "url">(
    "upload",
  );
  // What produced the *current* block.src: a successful R2 upload, or a URL
  // the user pasted. Drives the pill copy and the player so a pasted YouTube
  // link never claims to have been "uploaded" and never tries to play via
  // <video src=…> (which can't render a watch page).
  const [source, setSource] = React.useState<"upload" | "url">("upload");
  const [upload, setUpload] = React.useState<{
    state: "idle" | "uploading" | "failed";
    fileName?: string;
    error?: string;
  }>({ state: "idle" });
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const videoClass = React.useMemo(
    () => classifyVideoUrl(block.src),
    [block.src],
  );

  const startUpload = async (file: File): Promise<void> => {
    if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
      setUpload({
        state: "failed",
        fileName: file.name,
        error: t("video.uploadUnsupported"),
      });
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setUpload({
        state: "failed",
        fileName: file.name,
        error: t("video.uploadTooBig"),
      });
      return;
    }

    setUpload({ state: "uploading", fileName: file.name });
    try {
      const src = await uploadMedia(file);
      setSource("upload");
      onChange({ ...block, src });
      setUpload({ state: "idle" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("video.uploadFailed");
      setUpload({ state: "failed", fileName: file.name, error: message });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    void startUpload(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    void startUpload(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold text-[var(--color-ink)]">
          Procedure Video{" "}
          <span aria-hidden="true" className="text-[var(--color-bad)]">
            *
          </span>
        </Label>
        <SegmentedControl
          label={t("video.sourceLabel")}
          value={sourceMode}
          onChange={(mode) => setSourceMode(mode as "upload" | "url")}
          segments={[
            {
              value: "upload",
              label: t("video.uploadMode"),
              icon: LuCloudUpload,
            },
            { value: "url", label: t("video.urlMode"), icon: LuLink },
          ]}
        />
      </div>

      {block.src ? (
        <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-line)] pb-3">
            <div className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-ok-tint)] px-3 py-1 text-sm font-semibold text-[var(--color-ok)]">
              <Icon icon={source === "upload" ? LuVideo : LuLink} />
              <span>
                {source === "upload"
                  ? t("video.uploadDone")
                  : t("video.uploadLinked")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2 text-sm font-semibold text-[var(--color-ink-2)]"
              >
                <LuUpload aria-hidden="true" className="text-sm" />
                {t("video.uploadChange")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Same shape as the image Remove handler: best-effort delete
                  // of the underlying R2 object. Source-state gating means a
                  // pasted YouTube/Vimeo link never triggers an API call —
                  // there's no R2 object to delete.
                  if (source === "upload" && block.src) {
                    void deleteUpload({ url: block.src }).catch(
                      () => undefined,
                    );
                  }
                  onChange({ ...block, src: "" });
                }}
                className="gap-2 text-sm font-semibold text-[var(--color-bad)] hover:bg-[var(--color-bad-tint)]"
              >
                <LuTrash2 aria-hidden="true" className="text-sm" />
                {t("video.uploadRemove")}
              </Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-ink)]">
            {videoClass.provider === "file" ? (
              <video
                controls
                src={block.src}
                className="max-h-media w-full object-contain"
              />
            ) : videoClass.embedUrl ? (
              <iframe
                src={videoClass.embedUrl}
                title={
                  source === "upload"
                    ? t("video.uploadDone")
                    : t("video.uploadLinked")
                }
                className="aspect-video w-full"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="no-referrer"
              />
            ) : null}
          </div>
        </div>
      ) : upload.state === "uploading" ? (
        <div className="upload">
          <span className="pill-progress">
            <span className="spinner" aria-hidden="true" />
            {t("video.uploading")}
            {upload.fileName ? ` · ${upload.fileName}` : ""}
          </span>
        </div>
      ) : upload.state === "failed" ? (
        <div className="upload">
          <span className="err" role="alert">
            <LuCircleAlert aria-hidden="true" />
            {upload.error}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-1 text-sm"
          >
            <LuRefreshCw aria-hidden="true" />
            {t("video.uploadChange")}
          </Button>
        </div>
      ) : sourceMode === "upload" ? (
        <div
          role="button"
          tabIndex={0}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className="dropzone"
        >
          <LuVideo aria-hidden="true" />
          <p>{t("video.uploadClick")}</p>
          <span>{t("video.uploadHint")}</span>
        </div>
      ) : (
        <Field label={t("videoSrc")}>
          <Input
            type="url"
            value={block.src}
            onChange={(e) => {
              setSource("url");
              onChange({ ...block, src: e.target.value });
            }}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </Field>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        onChange={handleFileChange}
        className="hidden"
      />

      <BilingualTabs
        active={lang}
        onChange={setLang}
        enLabel={t("tabs.en")}
        esLabel={t("tabs.es")}
      />
      <Field label={t("videoCaption")}>
        <Input
          value={asOpt(block.caption, lang)}
          onChange={(e) =>
            onChange({
              ...block,
              caption: setOpt(block.caption, lang, e.target.value),
            })
          }
          maxLength={50}
          placeholder="e.g. Demonstration of sanitizing prep table step-by-step"
        />
      </Field>
    </div>
  );
}
