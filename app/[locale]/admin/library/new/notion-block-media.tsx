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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select";
import { RowActions } from "@/components/ui/row-actions";
import { Popover } from "@/components/ui/popover";
import {
  LuTriangleAlert,
  LuClock,
  LuFocus,
  LuImage,
  LuLightbulb,
  LuPlus,
  LuVideo,
  LuX,
} from "react-icons/lu";
import {
  BLOCK_FACTORIES,
  duplicateBlock,
  nextStepId,
} from "@/lib/procedure-blocks";
import { uploadMedia, deleteUpload } from "@/lib/api";
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
import {
  ALLOWED_VIDEO_TYPES,
  asLoc,
  asOpt,
  BodyProps,
  isAllowedImageFile,
  MAX_DOCUMENT_BYTES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  NOTE_KINDS,
  readFileAsDataUrl,
  setLoc,
  setOpt,
} from "./notion-block-shared";

export function ImageBody({
  block,
  onPatch,
}: BodyProps<Extract<ProcedureBlock, { kind: "image" }>>): React.ReactElement {
  const [upload, setUpload] = React.useState<{
    state: "idle" | "uploading" | "failed";
    error?: string;
  }>({ state: "idle" });
  const fileRef = React.useRef<HTMLInputElement>(null);

  const startUpload = async (file: File): Promise<void> => {
    if (!isAllowedImageFile(file)) {
      setUpload({ state: "failed", error: "Unsupported image type" });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setUpload({ state: "failed", error: "Image too large (max 10 MB)" });
      return;
    }
    setUpload({ state: "uploading" });
    try {
      const finalSrc = await uploadMedia(file);
      const filenameNoExt = file.name.replace(/\.[^.]+$/, "");
      onPatch({
        ...block,
        src: finalSrc,
        alt: {
          en: block.alt?.en?.trim() || filenameNoExt,
          es: block.alt?.es?.trim() || filenameNoExt,
        },
      });
      setUpload({ state: "idle" });
    } catch (err) {
      setUpload({
        state: "failed",
        error: err instanceof Error ? err.message : "Upload failed",
      });
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const f = e.target.files?.[0];
    e.target.value = "";
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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon="ri-upload-2-line"
                onClick={() => fileRef.current?.click()}
              >
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
                  onPatch({ ...block, src: "" });
                }}
                className="text-[var(--color-bad)] hover:bg-[var(--color-bad-tint)]"
              >
                <Icon icon="ri-delete-bin-line" className="mr-1" /> Remove
              </Button>
            </div>
          </div>
          <div className="flex max-h-list items-center justify-center p-3">
            <img
              src={block.src}
              alt={block.alt?.en ?? ""}
              className="max-h-list rounded object-contain"
            />
          </div>
        </div>
      ) : upload.state === "uploading" ? (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)] px-4 py-6 text-sm text-[var(--color-ink-2)]">
          <span className="spinner" aria-hidden="true" />
          Uploading…
        </div>
      ) : upload.state === "failed" ? (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-bad-tint)] bg-[var(--color-bad-tint)] px-4 py-3 text-sm text-[var(--color-bad)]">
          <Icon icon="ri-error-warning-line" /> {upload.error}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon="ri-upload-2-line"
            onClick={() => fileRef.current?.click()}
          >
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
          <Icon
            icon="ri-image-add-line"
            className="text-2xl text-[var(--color-ink-3)]"
          />
          <span className="font-medium">Drop image, or click to browse</span>
          <span className="text-sm text-[var(--color-ink-3)]">
            JPG · PNG · WebP · GIF · max 10 MB
          </span>
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif"
        onChange={handleFile}
        className="hidden"
      />
      {/* Caption — bilingual */}
      <BilingualInput
        value={{ en: block.caption?.en ?? "", es: block.caption?.es ?? "" }}
        maxLength={200}
        onChange={(val) => onPatch({ ...block, caption: val })}
        multiline
        size="compact"
        placeholder={{
          en: "Optional caption (English)…",
          es: "Pie de foto opcional (Español)…",
        }}
      />
    </div>
  );
}

// ---- Video ----

export function VideoBody({
  block,
  onPatch,
}: BodyProps<Extract<ProcedureBlock, { kind: "video" }>>): React.ReactElement {
  const [upload, setUpload] = React.useState<{
    state: "idle" | "uploading" | "failed";
    error?: string;
  }>({ state: "idle" });
  const fileRef = React.useRef<HTMLInputElement>(null);
  const videoClass = React.useMemo(
    () => classifyVideoUrl(block.src),
    [block.src],
  );

  const startUpload = async (file: File): Promise<void> => {
    if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
      setUpload({ state: "failed", error: "Unsupported video type" });
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setUpload({ state: "failed", error: "Video too large (max 100 MB)" });
      return;
    }
    setUpload({ state: "uploading" });
    try {
      const src = await uploadMedia(file);
      onPatch({ ...block, src });
      setUpload({ state: "idle" });
    } catch (err) {
      setUpload({
        state: "failed",
        error: err instanceof Error ? err.message : "Upload failed",
      });
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = "";
    void startUpload(f);
  };

  return (
    <div className="space-y-3 pt-1">
      {block.src ? (
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)]">
          <div className="flex items-center justify-between border-b border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-2">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-brand-700)]">
              <Icon
                icon={
                  videoClass.provider === "file" ? "ri-video-fill" : "ri-link"
                }
              />
              Video
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon="ri-upload-2-line"
                onClick={() => fileRef.current?.click()}
              >
                Replace
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (videoClass.provider === "file" && block.src) {
                    void deleteUpload({ url: block.src }).catch(() => {
                      /* ignore */
                    });
                  }
                  onPatch({ ...block, src: "" });
                }}
                className="text-[var(--color-bad)] hover:bg-[var(--color-bad-tint)]"
              >
                <Icon icon="ri-delete-bin-line" className="mr-1" /> Remove
              </Button>
            </div>
          </div>
          <div className="bg-[var(--color-ink)]">
            {videoClass.provider === "file" ? (
              <video
                controls
                src={block.src}
                className="max-h-list w-full object-contain"
              />
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
      ) : upload.state === "uploading" ? (
        <div className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)] px-4 py-6 text-sm text-[var(--color-ink-2)]">
          <span className="spinner" aria-hidden="true" />
          Uploading…
        </div>
      ) : upload.state === "failed" ? (
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
            <Icon
              icon="ri-video-add-line"
              className="text-2xl text-[var(--color-ink-3)]"
            />
            <span className="font-medium">Drop video, or click to upload</span>
            <span className="text-sm text-[var(--color-ink-3)]">
              MP4 · WebM · MOV · max 100 MB
            </span>
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
      <input
        ref={fileRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        onChange={handleFile}
        className="hidden"
      />
      <BilingualInput
        value={{ en: block.caption?.en ?? "", es: block.caption?.es ?? "" }}
        maxLength={200}
        onChange={(val) => onPatch({ ...block, caption: val })}
        multiline
        size="compact"
        placeholder={{
          en: "Optional caption (English)…",
          es: "Pie de foto opcional (Español)…",
        }}
      />
    </div>
  );
}

// ---- Warning / callout ----

export function WarningBody({
  block,
  onPatch,
}: BodyProps<
  Extract<ProcedureBlock, { kind: "warning" }>
>): React.ReactElement {
  const sevTone: Record<
    ProcedureNoteKind,
    { bg: string; text: string; icon: string }
  > = {
    warn: {
      bg: "border-[var(--color-warn)]/40 bg-[var(--color-warn-tint)]",
      text: "text-[var(--color-warn-ink)]",
      icon: "ri-alert-line",
    },
    tip: {
      bg: "border-[var(--color-ok-tint-2)] bg-[var(--color-ok-tint)]",
      text: "text-[var(--color-ok)]",
      icon: "ri-lightbulb-line",
    },
    alt: {
      bg: "border-[var(--color-line-2)] bg-[var(--color-wash)]",
      text: "text-[var(--color-ink-2)]",
      icon: "ri-loop-left-line",
    },
    equip: {
      bg: "border-[var(--color-line-2)] bg-[var(--color-wash)]",
      text: "text-[var(--color-ink-2)]",
      icon: "ri-tools-line",
    },
    allergen: {
      bg: "border-[var(--color-bad-tint)] bg-[var(--color-bad-tint)]",
      text: "text-[var(--color-bad)]",
      icon: "ri-error-warning-line",
    },
  };
  const tone = sevTone[block.severity];

  return (
    <div className={cn("rounded-[var(--radius-md)] border p-3", tone.bg)}>
      {/* Severity picker — compact, always accessible */}
      <div className="mb-2 flex items-center gap-2">
        <Icon
          icon={tone.icon}
          className={cn(tone.text, "text-base shrink-0")}
        />
        <div className="w-field-xs shrink-0">
          <CustomSelect
            size="sm"
            value={block.severity}
            onChange={(v) =>
              onPatch({ ...block, severity: v as ProcedureNoteKind })
            }
            options={NOTE_KINDS.map((k) => ({
              value: k,
              label: k,
              icon: sevTone[k].icon,
            }))}
          />
        </div>
      </div>
      <BilingualInput
        value={block.body}
        maxLength={500}
        onChange={(val) => onPatch({ ...block, body: val })}
        multiline
        placeholder={{
          en: "Write the note in English…",
          es: "Escribe la nota en español…",
        }}
      />
    </div>
  );
}

// ---- Attachment ----

function getAttachmentMeta(href: string): { icon: string; color: string } {
  const target = href.toLowerCase();
  if (target.endsWith(".pdf")) {
    return {
      icon: "ri-file-pdf-2-line",
      color: "text-rose-600 dark:text-rose-400",
    };
  }
  if (target.endsWith(".docx") || target.endsWith(".doc")) {
    return {
      icon: "ri-file-word-line",
      color: "text-blue-600 dark:text-blue-400",
    };
  }
  if (
    target.endsWith(".xlsx") ||
    target.endsWith(".xls") ||
    target.endsWith(".csv")
  ) {
    return {
      icon: "ri-file-excel-line",
      color: "text-emerald-600 dark:text-emerald-400",
    };
  }
  if (target.match(/\.(jpg|jpeg|png|webp|gif|svg)$/)) {
    return {
      icon: "ri-image-line",
      color: "text-amber-600 dark:text-amber-400",
    };
  }
  return { icon: "ri-file-text-line", color: "text-[var(--color-brand)]" };
}

function formatDocSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentBody({
  block,
  onPatch,
}: BodyProps<
  Extract<ProcedureBlock, { kind: "attachment" }>
>): React.ReactElement {
  const [upload, setUpload] = React.useState<{
    state: "idle" | "uploading" | "failed";
    error?: string;
  }>({ state: "idle" });
  const fileRef = React.useRef<HTMLInputElement>(null);

  const metaInfo = React.useMemo(
    () => getAttachmentMeta(block.href),
    [block.href],
  );

  const startUpload = async (file: File): Promise<void> => {
    if (file.size > MAX_DOCUMENT_BYTES) {
      setUpload({ state: "failed", error: "File too large (max 25 MB)" });
      return;
    }
    setUpload({ state: "uploading" });
    try {
      const uploadedUrl = await uploadMedia(file);
      const objectUrl =
        typeof window !== "undefined" ? URL.createObjectURL(file) : "";
      const finalUrl = uploadedUrl || objectUrl;

      const filenameNoExt = file.name
        .replace(/\.[^.]+$/, "")
        .replace(/[-_]/g, " ");
      const ext = file.name.split(".").pop()?.toUpperCase() ?? "FILE";
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
      setUpload({ state: "idle" });
    } catch (err) {
      setUpload({
        state: "failed",
        error: err instanceof Error ? err.message : "Upload failed",
      });
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = "";
    void startUpload(f);
  };

  return (
    <div className="space-y-2.5 pt-0.5">
      {/* URL input row with upload button outside */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) void startUpload(f);
          }}
          className="flex flex-1 items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)] px-3 py-2 min-h-9 focus-within:border-[var(--color-ring)] focus-within:bg-[var(--color-surface)] transition-all min-w-0"
        >
          <Icon
            icon={block.href ? metaInfo.icon : "ri-attachment-line"}
            className={cn(
              "text-base shrink-0",
              block.href ? metaInfo.color : "text-[var(--color-ink-3)]",
            )}
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
                  if (block.href && !block.href.startsWith("blob:")) {
                    void deleteUpload({ url: block.href }).catch(
                      () => undefined,
                    );
                  }
                  onPatch({ ...block, href: "", meta: undefined });
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
          disabled={upload.state === "uploading"}
          onClick={() => fileRef.current?.click()}
          className="h-9 shrink-0 gap-2 px-4 text-xs font-semibold whitespace-nowrap justify-center w-full sm:w-auto"
        >
          {upload.state === "uploading" ? (
            <>
              <span className="spinner mr-0.5" aria-hidden="true" />
              <span>Uploading…</span>
            </>
          ) : (
            <>
              <Icon icon="ri-upload-2-line" className="text-sm" />
              <span>{block.href ? "Replace file" : "Upload file"}</span>
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

      {upload.state === "failed" && (
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
          en: "e.g. HACCP checklist (English)",
          es: "e.g. Lista HACCP (Español)",
        }}
      />

      {/* Badge label input */}
      <div className="pt-1.5">
        <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)] px-3 py-2 min-h-9 focus-within:border-[var(--color-ring)] focus-within:bg-[var(--color-surface)] transition-all">
          <Icon
            icon="ri-price-tag-3-line"
            className="text-base text-[var(--color-ink-3)] shrink-0"
          />
          <input
            type="text"
            maxLength={60}
            value={block.meta ?? ""}
            onChange={(e) =>
              onPatch({ ...block, meta: e.target.value || undefined })
            }
            placeholder="Badge label (optional, e.g. PDF · 2.4 MB, Revision 3)…"
            className="flex-1 min-w-0 bg-transparent text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:outline-none"
          />
          <span className="font-mono text-[10px] text-[var(--color-ink-3)] pointer-events-none select-none shrink-0">
            {(block.meta ?? "").length} / 60
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
