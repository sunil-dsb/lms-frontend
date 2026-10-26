"use client";

import * as React from "react";
import {
  LuClock,
  LuFocus,
  LuImage,
  LuLightbulb,
  LuPlus,
  LuVideo,
  LuX,
} from "react-icons/lu";
import { Icon } from "@/components/ui/icon";
import { BilingualInput } from "@/components/ui/bilingual-input";
import { LocalisedInput } from "@/components/ui/localised-input";
import { RowActions } from "@/components/ui/row-actions";
import { StepTimerEditor } from "./step-timer-editor";
import { STEP_TONE_CONFIGS } from "./notion-method-config";
import {
  ALLOWED_VIDEO_TYPES,
  isAllowedImageFile,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  NOTE_KINDS,
} from "./notion-block-shared";
import { deleteUpload, uploadMedia } from "@/lib/api";
import { classifyVideoUrl } from "@/lib/procedure-media";
import { cn } from "@/lib/utils";
import type {
  Localised,
  ProcedureMethodStep,
  ProcedureNoteKind,
} from "@/lib/types";

export function MethodStepRow({
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
  onMove: (dir: "up" | "down") => void;
}): React.ReactElement {
  const legacyFirst = step.imageSrc
    ? [{ src: step.imageSrc, alt: step.imageAlt ?? { en: "", es: "" } }]
    : [];
  const images: Array<{ src: string; alt: Localised }> =
    step.images && step.images.length > 0 ? step.images : legacyFirst;

  const imageFileRef = React.useRef<HTMLInputElement>(null);
  const videoFileRef = React.useRef<HTMLInputElement>(null);
  const pendingImageIndex = React.useRef<number | null>(null);
  const [imageBusy, setImageBusy] = React.useState<{
    state: "uploading" | "failed";
    target: number | null;
    error?: string;
  } | null>(null);
  const [videoBusy, setVideoBusy] = React.useState<{
    state: "uploading" | "failed";
    error?: string;
  } | null>(null);

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
    if (removed?.src)
      void deleteUpload({ url: removed.src }).catch(() => undefined);
  };

  const updateImageAlt = (i: number, alt: Localised): void => {
    writeImages(
      latestImages.current.map((img, j) => (j === i ? { ...img, alt } : img)),
    );
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
        setImageBusy({
          state: "failed",
          target,
          error: "Unsupported image type — use JPG, PNG, WebP, GIF or AVIF",
        });
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setImageBusy({
          state: "failed",
          target,
          error: "Image too large (max 10 MB)",
        });
        return;
      }
      setImageBusy({ state: "uploading", target });
      try {
        const finalSrc = await uploadMedia(file);
        const filenameNoExt = file.name.replace(/\.[^.]+$/, "");
        const defaultAlt: Localised = { en: filenameNoExt, es: filenameNoExt };
        writeImages(
          latestImages.current.map((img, j) =>
            j === target
              ? {
                  src: finalSrc,
                  alt: img.alt.en || img.alt.es ? img.alt : defaultAlt,
                }
              : img,
          ),
        );
        setImageBusy(null);
      } catch (err) {
        setImageBusy({
          state: "failed",
          target,
          error: err instanceof Error ? err.message : "Upload failed",
        });
      }
      return;
    }

    // Adding new images (capped at MAX_STEP_IMAGES = 4)
    const available = Math.max(
      0,
      MAX_STEP_IMAGES - latestImages.current.length,
    );
    const toUpload = fileArray.slice(0, available);
    if (toUpload.length === 0) return;

    setImageBusy({ state: "uploading", target: null });
    const newItems: Array<{ src: string; alt: Localised }> = [];
    let lastError: string | undefined;

    for (const file of toUpload) {
      if (!isAllowedImageFile(file)) {
        lastError = "Unsupported image type — use JPG, PNG, WebP, GIF or AVIF";
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        lastError = "Image too large (max 10 MB)";
        continue;
      }
      try {
        const finalSrc = await uploadMedia(file);
        const filenameNoExt = file.name.replace(/\.[^.]+$/, "");
        newItems.push({
          src: finalSrc,
          alt: { en: filenameNoExt, es: filenameNoExt },
        });
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Upload failed";
      }
    }

    if (newItems.length > 0) {
      writeImages(
        [...latestImages.current, ...newItems].slice(0, MAX_STEP_IMAGES),
      );
    }

    if (lastError && newItems.length === 0) {
      setImageBusy({ state: "failed", target: null, error: lastError });
    } else {
      setImageBusy(null);
    }
  }

  async function uploadVideo(file: File): Promise<void> {
    if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
      setVideoBusy({ state: "failed", error: "Unsupported video type" });
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setVideoBusy({ state: "failed", error: "Video too large (max 100 MB)" });
      return;
    }
    setVideoBusy({ state: "uploading" });
    try {
      const src = await uploadMedia(file);
      onUpdate({ ...step, videoSrc: src });
      setVideoBusy(null);
    } catch (err) {
      setVideoBusy({
        state: "failed",
        error: err instanceof Error ? err.message : "Upload failed",
      });
    }
  }

  const uploadingIndex =
    imageBusy?.state === "uploading" ? imageBusy.target : null;
  const failedIndex = imageBusy?.state === "failed" ? imageBusy.target : null;

  return (
    <li className="flex gap-3 items-start">
      <span className="mt-2 inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-line-2)] bg-[var(--color-surface)] font-mono text-sm font-semibold text-[var(--color-ink)]">
        {String(index + 1).padStart(2, "0")}
      </span>

      <div className="flex-1 min-w-0 w-full space-y-3">
        {/* Step description input */}
        <BilingualInput
          value={step.body}
          maxLength={500}
          onChange={(val) => onUpdate({ ...step, body: val })}
          multiline
          placeholder={{
            en: "Describe this step in English…",
            es: "Describe este paso en español…",
          }}
        />

        {/* Step action chips toolbar — consistent min-height, generous pill padding and gap */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* Critical Step toggle */}
          <button
            type="button"
            aria-pressed={step.critical}
            onClick={() => onUpdate({ ...step, critical: !step.critical })}
            className={cn(
              "inline-flex min-h-[32px] sm:min-h-[34px] items-center gap-2 rounded-full px-4 sm:px-5 py-2 text-xs font-medium transition-all shadow-2xs cursor-pointer border",
              step.critical
                ? "border-[var(--color-bad)]/40 bg-[var(--color-bad-tint)] text-[var(--color-bad)] font-semibold"
                : "border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:border-[var(--color-line-3)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)]",
            )}
            title="Critical steps are highlighted with an alert badge to ensure compliance"
          >
            <LuFocus
              className={cn(
                "size-4 shrink-0 text-current",
                step.critical
                  ? "text-[var(--color-bad)]"
                  : "text-[var(--color-ink-3)]",
              )}
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
                onUpdate({
                  ...step,
                  note: { severity: "warn", body: { en: "", es: "" } },
                });
              }
            }}
            className={cn(
              "inline-flex min-h-[32px] sm:min-h-[34px] items-center gap-2 rounded-full px-4 sm:px-5 py-2 text-xs font-medium transition-all shadow-2xs cursor-pointer border",
              step.note
                ? "border-[var(--color-line-3)] bg-[var(--color-wash)] text-[var(--color-ink)] font-semibold ring-1 ring-[var(--color-line-3)]"
                : "border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:border-[var(--color-line-3)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)]",
            )}
            title={
              step.note ? "Hide callout note" : "Add tip or warning callout"
            }
          >
            <LuLightbulb
              className="size-4 shrink-0 text-[var(--color-ink-3)]"
              strokeWidth={1.75}
            />
            <span>Tip / Callout</span>
          </button>

          {/* Photo affordance */}
          <button
            type="button"
            disabled={images.length >= MAX_STEP_IMAGES}
            aria-pressed={images.length > 0}
            onClick={() => triggerImageUpload(null)}
            className={cn(
              "inline-flex min-h-[32px] sm:min-h-[34px] items-center gap-2 rounded-full px-4 sm:px-5 py-2 text-xs font-medium transition-all shadow-2xs border",
              images.length >= MAX_STEP_IMAGES
                ? "border-[var(--color-line-2)] bg-[var(--color-wash)] text-[var(--color-ink-3)] opacity-60 cursor-not-allowed"
                : images.length > 0
                  ? "border-[var(--color-line-3)] bg-[var(--color-wash)] text-[var(--color-ink)] font-semibold cursor-pointer"
                  : "border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:border-[var(--color-line-3)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)] cursor-pointer",
            )}
            title={
              images.length >= MAX_STEP_IMAGES
                ? `Maximum ${MAX_STEP_IMAGES} photos reached`
                : "Attach photos to this step (up to 4)"
            }
          >
            <LuImage
              className="size-4 shrink-0 text-[var(--color-ink-3)]"
              strokeWidth={1.75}
            />
            <span>
              Photo{" "}
              {images.length > 0 ? `(${images.length}/${MAX_STEP_IMAGES})` : ""}
            </span>
          </button>

          {/* Video affordance */}
          <button
            type="button"
            aria-pressed={hasVideo}
            onClick={() => videoFileRef.current?.click()}
            className={cn(
              "inline-flex min-h-[32px] sm:min-h-[34px] items-center gap-2 rounded-full px-4 sm:px-5 py-2 text-xs font-medium transition-all shadow-2xs cursor-pointer border",
              hasVideo
                ? "border-[var(--color-line-3)] bg-[var(--color-wash)] text-[var(--color-ink)] font-semibold"
                : "border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:border-[var(--color-line-3)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)]",
            )}
            title="Attach a video to this step"
          >
            <LuVideo
              className="size-4 shrink-0 text-[var(--color-ink-3)]"
              strokeWidth={1.75}
            />
            <span>Video</span>
          </button>

          {/* Timer affordance: disabled once timer exists */}
          <button
            type="button"
            disabled={Boolean(step.timer)}
            aria-pressed={Boolean(step.timer)}
            onClick={() => {
              onUpdate({ ...step, timer: { label: "", seconds: 60 } });
            }}
            className={cn(
              "inline-flex min-h-[32px] sm:min-h-[34px] items-center gap-2 rounded-full px-4 sm:px-5 py-2 text-xs font-medium transition-all shadow-2xs border",
              step.timer
                ? "border-[var(--color-line-2)] bg-[var(--color-wash)] text-[var(--color-ink-3)] opacity-60 cursor-not-allowed"
                : "border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:border-[var(--color-line-3)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)] cursor-pointer",
            )}
            title={
              step.timer ? "Timer already added to this step" : "Add timer"
            }
          >
            <LuClock
              className="size-4 shrink-0 text-[var(--color-ink-3)]"
              strokeWidth={1.75}
            />
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
              e.target.value = "";
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
              e.target.value = "";
              if (f) void uploadVideo(f);
            }}
          />
        </div>

        {step.timer ? (
          <StepTimerEditor
            timer={step.timer}
            onChange={(timer) => onUpdate({ ...step, timer })}
            onRemove={() => onUpdate({ ...step, timer: undefined })}
          />
        ) : null}

        {/* Inline Callout Note Editor (generous spacing below pills, clean hairline divider, vibrant tone buttons) */}
        {step.note &&
          (() => {
            const currentTone =
              STEP_TONE_CONFIGS[step.note.severity] ?? STEP_TONE_CONFIGS.warn;
            return (
              <div
                style={{ backgroundColor: currentTone.tintBg }}
                className="w-full min-w-0 rounded-[var(--radius-md)] p-3 sm:p-4 space-y-3 sm:space-y-4 text-xs transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 sm:pb-3 border-b border-[var(--color-line-2)]/50">
                  <div className="flex items-center justify-between w-full sm:w-auto">
                    <span className="font-semibold text-[var(--color-ink)] flex items-center gap-2 text-xs shrink-0 whitespace-nowrap">
                      <span
                        style={{ color: currentTone.iconColor }}
                        className="inline-flex"
                      >
                        <Icon icon={currentTone.icon} className="text-base" />
                      </span>
                      Callout tone:
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdate({ ...step, note: undefined })}
                      aria-label="Remove callout note"
                      title="Remove callout note"
                      className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-ink-3)] hover:bg-[var(--color-bad-tint)] hover:text-[var(--color-bad)] transition-colors cursor-pointer sm:hidden"
                    >
                      <LuX
                        className="size-4 shrink-0 text-current"
                        strokeWidth={1.75}
                      />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {(
                      [
                        "warn",
                        "tip",
                        "allergen",
                        "equip",
                      ] as ProcedureNoteKind[]
                    ).map((kind) => {
                      const active = step.note?.severity === kind;
                      const cfg = STEP_TONE_CONFIGS[kind];
                      return (
                        <button
                          key={kind}
                          type="button"
                          onClick={() =>
                            onUpdate({
                              ...step,
                              note: { ...step.note!, severity: kind },
                            })
                          }
                          style={
                            active
                              ? {
                                  backgroundColor: cfg.activeBg,
                                  color: cfg.activeColor,
                                }
                              : {
                                  backgroundColor: "var(--color-surface)",
                                  color: "var(--color-ink-2)",
                                }
                          }
                          className={cn(
                            "inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer shadow-2xs whitespace-nowrap shrink-0 border",
                            active
                              ? "border-transparent ring-1 ring-black/10"
                              : "border-[var(--color-line-2)]/60 hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)]",
                          )}
                        >
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => onUpdate({ ...step, note: undefined })}
                    aria-label="Remove callout note"
                    title="Remove callout note"
                    className="hidden sm:flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-ink-3)] hover:bg-[var(--color-bad-tint)] hover:text-[var(--color-bad)] transition-colors cursor-pointer"
                  >
                    <LuX
                      className="size-4 shrink-0 text-current"
                      strokeWidth={1.75}
                    />
                  </button>
                </div>

                <BilingualInput
                  value={step.note.body}
                  maxLength={300}
                  onChange={(body) =>
                    onUpdate({ ...step, note: { ...step.note!, body } })
                  }
                  multiline
                  size="compact"
                  placeholder={{
                    en:
                      step.note.severity === "warn"
                        ? "e.g. Halibut must be cooked using the third fryer only to prevent oil cross-contamination."
                        : step.note.severity === "tip"
                          ? "e.g. The halibut is ready when no fish sticks to the knife upon removal."
                          : step.note.severity === "allergen"
                            ? "e.g. Contains shellfish. Use designated allergen utensils."
                            : "e.g. Requires probe thermometer and parchment paper.",
                    es: "Instrucciones o advertencia en español…",
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
                    <Icon
                      icon="ri-image-line"
                      className="text-[var(--color-ink-3)]"
                    />
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
                      onChange={(e) =>
                        onUpdate({ ...step, compareImages: e.target.checked })
                      }
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
                        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-2.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2.5 sm:justify-start">
                          {}
                          <div className="relative size-12 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-line-2)] bg-[var(--color-panel)]">
                            <img
                              src={img.src}
                              alt={img.alt.en ?? ""}
                              className="size-full object-cover"
                            />
                            {step.compareImages && images.length === 2 && (
                              <span
                                className={cn(
                                  "absolute bottom-0 inset-x-0 text-center text-[9px] font-bold text-white py-0.5",
                                  idx === 0
                                    ? "bg-[var(--color-ok-fill)]"
                                    : "bg-[var(--color-bad-fill)]",
                                )}
                              >
                                {idx === 0 ? "OK" : "NO"}
                              </span>
                            )}
                            {isUploading && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                                <span
                                  className="spinner text-white"
                                  aria-hidden="true"
                                />
                              </div>
                            )}
                          </div>

                          <div className="flex sm:hidden shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => triggerImageUpload(idx)}
                              title="Replace photo"
                              aria-label="Replace photo"
                              className="inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-ink-2)] hover:bg-[var(--color-panel)] hover:text-[var(--color-ink)] transition-colors cursor-pointer"
                            >
                              <Icon
                                icon="ri-upload-2-line"
                                className="text-base"
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeImage(idx)}
                              title="Remove photo"
                              aria-label="Remove photo"
                              className="inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-bad)] hover:bg-[var(--color-bad-tint)] transition-colors cursor-pointer"
                            >
                              <Icon
                                icon="ri-delete-bin-line"
                                className="text-base"
                              />
                            </button>
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <BilingualInput
                            value={img.alt ?? { en: "", es: "" }}
                            maxLength={150}
                            onChange={(val) => updateImageAlt(idx, val)}
                            size="compact"
                            placeholder={{
                              en:
                                step.compareImages && images.length === 2
                                  ? idx === 0
                                    ? "Alt text (Correct/OK)…"
                                    : "Alt text (Wrong/NO)…"
                                  : `Alt text for photo ${idx + 1} (English)…`,
                              es:
                                step.compareImages && images.length === 2
                                  ? idx === 0
                                    ? "Texto alternativo (Correcto)…"
                                    : "Texto alternativo (Incorrecto)…"
                                  : `Texto alternativo para foto ${idx + 1} (Español)…`,
                            }}
                          />
                        </div>

                        <div className="hidden sm:flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => triggerImageUpload(idx)}
                            title="Replace photo"
                            aria-label="Replace photo"
                            className="inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-ink-2)] hover:bg-[var(--color-panel)] hover:text-[var(--color-ink)] transition-colors cursor-pointer"
                          >
                            <Icon
                              icon="ri-upload-2-line"
                              className="text-base"
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            title="Remove photo"
                            aria-label="Remove photo"
                            className="inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-bad)] hover:bg-[var(--color-bad-tint)] transition-colors cursor-pointer"
                          >
                            <Icon
                              icon="ri-delete-bin-line"
                              className="text-base"
                            />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {uploadingIndex === null &&
                  imageBusy?.state === "uploading" && (
                    <div className="flex items-center gap-2 text-xs text-[var(--color-ink-2)]">
                      <span className="spinner" aria-hidden="true" />
                      Uploading photo…
                    </div>
                  )}

                {imageBusy?.state === "failed" && (
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
            {(hasVideo ||
              videoBusy?.state === "uploading" ||
              videoBusy?.state === "failed") && (
              <div className="space-y-2 border-t border-[var(--color-line-2)] pt-2.5">
                <div className="flex items-center gap-2 font-semibold text-[var(--color-ink)]">
                  <Icon
                    icon="ri-video-line"
                    className="text-[var(--color-ink-3)]"
                  />
                  <span>Step Video</span>
                </div>
                {hasVideo && (
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="url"
                        value={step.videoSrc ?? ""}
                        onChange={(e) =>
                          onUpdate({ ...step, videoSrc: e.target.value })
                        }
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
                        onUpdate({
                          ...step,
                          videoSrc: "",
                          videoCaption: undefined,
                        });
                        if (
                          nextSrc &&
                          classifyVideoUrl(nextSrc).provider === "file"
                        ) {
                          void deleteUpload({ url: nextSrc }).catch(
                            () => undefined,
                          );
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
                    value={step.videoCaption ?? ""}
                    onChange={(e) =>
                      onUpdate({
                        ...step,
                        videoCaption: e.target.value || undefined,
                      })
                    }
                    placeholder="Video caption (optional)…"
                    aria-label="Video caption"
                    className="h-8 w-full rounded-[var(--radius-sm)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 text-xs text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-brand)] focus:outline-none"
                  />
                )}
                {videoBusy?.state === "uploading" && (
                  <div className="flex items-center gap-2 text-xs text-[var(--color-ink-2)]">
                    <span className="spinner" aria-hidden="true" />
                    Uploading video…
                  </div>
                )}
                {videoBusy?.state === "failed" && (
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
                  <Icon
                    icon="ri-image-add-line"
                    className="text-[var(--color-brand)]"
                  />
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

function StepRowMenu({
  index,
  total,
  onMove,
  onRemove,
}: {
  index: number;
  total: number;
  onMove: (dir: "up" | "down") => void;
  onRemove: () => void;
}): React.ReactElement {
  const items = [
    ...(index > 0
      ? [
          {
            label: "Move up",
            icon: "ri-arrow-up-line",
            onSelect: () => onMove("up"),
          },
        ]
      : []),
    ...(index < total - 1
      ? [
          {
            label: "Move down",
            icon: "ri-arrow-down-line",
            onSelect: () => onMove("down"),
          },
        ]
      : []),
    {
      label: "Delete step",
      icon: "ri-close-line",
      destructive: true,
      onSelect: onRemove,
    },
  ];
  return <RowActions triggerLabel="Step options" items={items} />;
}

// ---- Image ----
