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
import { nextStepId } from "@/lib/procedure-blocks";
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

function SortableStepRow({
  step,
  index,
  total,
  onChange,
  onRemove,
  onMove,
  onDuplicate,
  recipeAware,
}: {
  step: ProcedureMethodStep;
  index: number;
  total: number;
  onChange: (next: ProcedureMethodStep) => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
  onDuplicate: () => void;
  /** True inside a `recipe` block — gates the cook-mode-only fields. */
  recipeAware?: boolean;
}): React.ReactElement {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: step.id ?? `step-${index}`,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "opacity-60")}
    >
      <StepRow
        step={step}
        index={index}
        total={total}
        onChange={onChange}
        onRemove={onRemove}
        onMove={onMove}
        onDuplicate={onDuplicate}
        recipeAware={recipeAware}
        dragHandle={
          <button
            type="button"
            aria-label="Drag to reorder step"
            className="inline-flex size-tap-admin cursor-grab items-center justify-center rounded-md text-[var(--color-ink-3)] hover:bg-[var(--color-panel)] active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <LuGripVertical aria-hidden="true" />
          </button>
        }
      />
    </div>
  );
}

function StepRow({
  step,
  index,
  total,
  onChange,
  onRemove,
  onMove,
  onDuplicate,
  dragHandle,
  recipeAware,
}: {
  step: ProcedureMethodStep;
  index: number;
  total: number;
  onChange: (next: ProcedureMethodStep) => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
  onDuplicate: () => void;
  dragHandle: React.ReactNode;
  /** True inside a `recipe` block — gates the cook-mode-only fields
   *  (timer / discard / compare-images) so `method` blocks stay simple. */
  recipeAware?: boolean;
}): React.ReactElement {
  const t = useTranslations("admin.library.new.form");
  const tComp = useTranslations("admin.library.new.form.composer");
  const [lang, setLang] = React.useState<"en" | "es">("en");
  const [critOpen, setCritOpen] = React.useState(false);
  const [videoOpen, setVideoOpen] = React.useState(!!step.videoSegment);
  const [upload, setUpload] = React.useState<{
    state: "idle" | "uploading" | "failed";
    fileName?: string;
    error?: string;
  }>({ state: "idle" });
  const videoFileRef = React.useRef<HTMLInputElement>(null);
  const limit = step.criticalLimit;
  const seg = step.videoSegment;
  // Differentiates an R2 upload (which the remove button must clean up) from
  // a pasted YouTube/Vimeo link (which has no R2 object to delete).
  const videoClass = React.useMemo(
    () => classifyVideoUrl(seg?.src ?? ""),
    [seg?.src],
  );
  const isR2Upload = videoClass.provider === "file";

  function patchLimit(patch: Partial<CriticalLimit>): void {
    onChange({
      ...step,
      criticalLimit: { ...(limit ?? emptyCriticalLimit()), ...patch },
    });
  }
  function patchSegment(
    patch: Partial<NonNullable<ProcedureMethodStep["videoSegment"]>>,
  ): void {
    const base = seg ?? { src: "", startSec: 0, endSec: 0 };
    onChange({ ...step, videoSegment: { ...base, ...patch } });
  }

  async function startVideoUpload(file: File): Promise<void> {
    if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
      setUpload({
        state: "failed",
        fileName: file.name,
        error: tComp("video.uploadUnsupported"),
      });
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setUpload({
        state: "failed",
        fileName: file.name,
        error: tComp("video.uploadTooBig"),
      });
      return;
    }
    setUpload({ state: "uploading", fileName: file.name });
    try {
      const src = await uploadMedia(file);
      patchSegment({ src });
      setUpload({ state: "idle" });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : tComp("video.uploadFailed");
      setUpload({ state: "failed", fileName: file.name, error: message });
    }
  }

  function handleVideoFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    void startVideoUpload(file);
  }

  return (
    <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      {/* Header: drag handle · step number · kebab menu */}
      <div className="flex items-center gap-2">
        {dragHandle}
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-panel)] font-mono text-sm font-semibold text-[var(--color-ink)]">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="text-sm font-semibold text-[var(--color-ink-3)]">
          Step
        </span>
        <div className="ml-auto">
          <RowActions
            triggerLabel="Step actions"
            items={[
              {
                label: t("stepActions.moveUp"),
                icon: LuArrowUp,
                onSelect: () => onMove("up"),
              },
              {
                label: t("stepActions.moveDown"),
                icon: LuArrowDown,
                onSelect: () => onMove("down"),
              },
              {
                label: t("stepActions.duplicate"),
                icon: LuCopy,
                onSelect: onDuplicate,
              },
              {
                label: t("stepActions.delete"),
                icon: LuX,
                destructive: true,
                onSelect: onRemove,
              },
            ]}
          />
        </div>
      </div>

      {/* Instructions — bilingual */}
      <div className="space-y-2">
        <BilingualTabs
          active={lang}
          onChange={setLang}
          enLabel={tComp("tabs.en")}
          esLabel={tComp("tabs.es")}
        />
        <Field label={t("instructions")} required>
          <textarea
            value={asLocalised(step.body, lang)}
            onChange={(e) =>
              onChange({
                ...step,
                body: setLocalised(step.body, lang, e.target.value),
              })
            }
            rows={3}
            maxLength={500}
            placeholder={t("instructionsPlaceholder")}
            className={textareaCls}
          />
        </Field>
      </div>

      {/* Critical control — value row inline, chevron to expand the rest */}
      <div>
        <label className="flex items-center gap-2 text-sm text-[var(--color-ink-2)]">
          <input
            type="checkbox"
            checked={!!step.critical}
            onChange={(e) =>
              onChange({
                ...step,
                critical: e.target.checked,
                criticalLimit: e.target.checked
                  ? (limit ?? emptyCriticalLimit())
                  : undefined,
              })
            }
          />
          {t("criticalControl")}
        </label>
        {step.critical && (
          <div className="mt-2 space-y-2 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-warn-tint)] p-3">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 text-left"
              onClick={() => setCritOpen((v) => !v)}
              aria-expanded={critOpen}
              aria-controls={`crit-${step.id ?? index}`}
            >
              <span className="text-sm font-semibold uppercase tracking-caps text-[var(--color-ink-2)]">
                <LuFocus aria-hidden="true" className="mr-1" />
                {t("criticalLimit")}
              </span>
              <span className="font-mono text-md font-semibold text-[var(--color-ink)]">
                {limit?.value || (
                  <em className="not-italic text-sm font-normal text-[var(--color-ink-3)]">
                    {t("notSet")}
                  </em>
                )}
              </span>
              <Icon
                icon={critOpen ? LuChevronUp : LuChevronDown}
                className="text-md text-[var(--color-ink-2)]"
              />
            </button>
            {critOpen && (
              <div id={`crit-${step.id ?? index}`} className="space-y-2 pt-1">
                <Field label={t("limitValue")} required>
                  <Input
                    value={limit?.value ?? ""}
                    onChange={(e) => patchLimit({ value: e.target.value })}
                    placeholder="≥ 165°F"
                  />
                </Field>
                <Field
                  label={t("limitDescription")}
                  hint={t("limitDescriptionHint")}
                >
                  <Input
                    value={limit?.subtitle ?? ""}
                    onChange={(e) => patchLimit({ subtitle: e.target.value })}
                    placeholder={t("limitDescriptionPlaceholder")}
                  />
                </Field>
                <Field label={t("limitHowToCheck")} required>
                  <Input
                    value={limit?.howToCheck ?? ""}
                    onChange={(e) => patchLimit({ howToCheck: e.target.value })}
                    placeholder={t("limitHowToCheckPlaceholder")}
                  />
                </Field>
                <Field label={t("correctiveAction")} required>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Input
                      value={limit?.breachLabel ?? ""}
                      onChange={(e) =>
                        patchLimit({ breachLabel: e.target.value })
                      }
                      placeholder={t("correctiveActionConditionPlaceholder")}
                    />
                    <Input
                      value={limit?.breachResponse ?? ""}
                      onChange={(e) =>
                        patchLimit({ breachResponse: e.target.value })
                      }
                      placeholder={t("correctiveActionResponsePlaceholder")}
                    />
                  </div>
                </Field>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Video segment — inline editor */}
      <div>
        {!videoOpen && !seg && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setVideoOpen(true)}
          >
            <LuVideo aria-hidden="true" className="mr-1" />
            {t("addVideo")}
          </Button>
        )}
        {(videoOpen || seg) && (
          <div className="space-y-2 rounded-[var(--radius-md)] border border-[var(--color-line-2)] p-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t("videoSegment")}</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Only delete the underlying R2 object when the segment
                  // was actually uploaded here — pasted links have nothing
                  // to clean up and deleteUpload would 404 on them.
                  if (isR2Upload && seg?.src) {
                    void deleteUpload({ url: seg.src }).catch(() => undefined);
                  }
                  setUpload({ state: "idle" });
                  setVideoOpen(false);
                  onChange({ ...step, videoSegment: undefined });
                }}
              >
                <LuX aria-hidden="true" className="mr-1" />
                {t("removeVideo")}
              </Button>
            </div>
            <Field label={t("videoSrc")}>
              <div className="flex items-center gap-2">
                <Input
                  type="url"
                  value={seg?.src ?? ""}
                  onChange={(e) => patchSegment({ src: e.target.value })}
                  placeholder="https://…"
                  className="flex-1"
                  aria-label={t("videoSrc")}
                />
                <input
                  ref={videoFileRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={handleVideoFileChange}
                  className="hidden"
                  aria-hidden="true"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={upload.state === "uploading"}
                  onClick={() => videoFileRef.current?.click()}
                  className="gap-1 text-sm"
                >
                  <LuCloudUpload aria-hidden="true" />
                  {upload.state === "uploading"
                    ? tComp("video.uploading")
                    : tComp("video.uploadChange")}
                </Button>
              </div>
            </Field>
            {upload.state === "uploading" && (
              <p className="flex items-center gap-2 text-sm text-[var(--color-ink-2)]">
                <span className="spinner" aria-hidden="true" />
                {tComp("video.uploading")}
                {upload.fileName ? ` · ${upload.fileName}` : ""}
              </p>
            )}
            {upload.state === "failed" && upload.error && (
              <p
                role="alert"
                className="flex items-center gap-2 text-sm text-[var(--color-bad)]"
              >
                <LuCircleAlert aria-hidden="true" />
                {upload.error}
              </p>
            )}
            {seg?.src && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-panel)] px-3 py-0.5 text-sm font-semibold text-[var(--color-ink-2)]">
                  <Icon icon={isR2Upload ? LuVideo : LuLink} />
                  {isR2Upload
                    ? tComp("video.uploadDone")
                    : tComp("video.uploadLinked")}
                </span>
                <a
                  href={seg.src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-brand-700)] underline-offset-4 hover:underline"
                >
                  <LuCirclePlay aria-hidden="true" />
                  {t("previewClip")}
                </a>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Field label={t("videoStart")}>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={seg?.startSec ?? 0}
                  onChange={(e) =>
                    patchSegment({
                      startSec: Math.max(
                        0,
                        Math.floor(Number(e.target.value) || 0),
                      ),
                    })
                  }
                />
              </Field>
              <Field label={t("videoEnd")}>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={seg?.endSec ?? 0}
                  onChange={(e) =>
                    patchSegment({
                      endSec: Math.max(
                        0,
                        Math.floor(Number(e.target.value) || 0),
                      ),
                    })
                  }
                />
              </Field>
            </div>
          </div>
        )}
      </div>

      {/* Cook-mode extras — only shown inside a recipe block. The fields below
       *  drive the document view's per-step hints and the cook-mode modal's
       *  timer chip + discard-time line + compare pair. They stay silent on
       *  a `method` block, where cook mode is not mounted. */}
      {recipeAware ? <CookModeFields step={step} onChange={onChange} /> : null}
    </div>
  );
}

/** Per-step editor for cook-mode-only fields. Three small controls:
 *  a timer (seconds + label), a discard-at flag (with optional hours), and a
 *  compare-images flag that pairs images[0] (ok) and images[1] (no).
 *  Density matches the rest of the admin step row: tight stack, small inputs,
 *  36 px touch targets via the project's `<Input>` component. */
function CookModeFields({
  step,
  onChange,
}: {
  step: ProcedureMethodStep;
  onChange: (next: ProcedureMethodStep) => void;
}): React.ReactElement {
  const t = useTranslations("admin.library.new.form");
  const hasTimer = !!step.timer;
  const hasDiscard = !!step.discardAt;
  const hasCompare = !!step.compareImages;
  return (
    <div className="space-y-2 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)] p-3">
      <div className="text-sm font-semibold uppercase tracking-caps text-[var(--color-ink-2)]">
        {t("cookMode")}
      </div>

      <label className="flex items-center gap-2 text-sm text-[var(--color-ink-2)]">
        <input
          type="checkbox"
          checked={hasTimer}
          onChange={(e) =>
            onChange({
              ...step,
              timer: e.target.checked
                ? {
                    seconds: step.timer?.seconds ?? 60,
                    label: step.timer?.label ?? "",
                  }
                : undefined,
            })
          }
        />
        {t("addTimer")}
      </label>
      {hasTimer ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px]">
          <Field label={t("timerLabel")} hint={t("timerLabelHint")}>
            <Input
              value={step.timer?.label ?? ""}
              onChange={(e) =>
                onChange({
                  ...step,
                  timer: {
                    seconds: step.timer?.seconds ?? 60,
                    label: e.target.value,
                  },
                })
              }
              placeholder="Hand wash"
            />
          </Field>
          <Field label={t("timerSeconds")}>
            <Input
              type="number"
              min={1}
              value={step.timer?.seconds ?? 60}
              onChange={(e) =>
                onChange({
                  ...step,
                  timer: {
                    seconds: Math.max(
                      1,
                      Math.floor(Number(e.target.value) || 1),
                    ),
                    label: step.timer?.label ?? "",
                  },
                })
              }
            />
          </Field>
        </div>
      ) : null}

      <label className="flex items-center gap-2 text-sm text-[var(--color-ink-2)]">
        <input
          type="checkbox"
          checked={hasDiscard}
          onChange={(e) =>
            onChange({
              ...step,
              discardAt: e.target.checked ? true : undefined,
              discardAtHours: e.target.checked
                ? (step.discardAtHours ?? 48)
                : undefined,
            })
          }
        />
        {t("addDiscard")}
      </label>
      {hasDiscard ? (
        <Field label={t("discardHours")}>
          <Input
            type="number"
            min={1}
            value={step.discardAtHours ?? 48}
            onChange={(e) =>
              onChange({
                ...step,
                discardAt: true,
                discardAtHours: Math.max(
                  1,
                  Math.floor(Number(e.target.value) || 48),
                ),
              })
            }
          />
        </Field>
      ) : null}

      <label className="flex items-center gap-2 text-sm text-[var(--color-ink-2)]">
        <input
          type="checkbox"
          checked={hasCompare}
          onChange={(e) =>
            onChange({
              ...step,
              compareImages: e.target.checked ? true : undefined,
            })
          }
        />
        {t("compareImages")}
      </label>
      {hasCompare && (!step.images || step.images.length < 2) ? (
        <p className="text-xs text-[var(--color-warn-ink)]">
          {t("compareImagesHint")}
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Steps list with nested @dnd-kit drag context.
// ---------------------------------------------------------------------------

export function StepsList({
  steps,
  onChange,
  recipeAware,
}: {
  steps: ProcedureMethodStep[];
  onChange: (next: ProcedureMethodStep[]) => void;
  /** True inside a `recipe` block — gates the cook-mode-only fields
   *  (timer / discard / compare-images) so `method` blocks stay simple. */
  recipeAware?: boolean;
}): React.ReactElement {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(e: DragEndEvent): void {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = steps.findIndex(
      (s) => (s.id ?? `step-${steps.indexOf(s)}`) === active.id,
    );
    const to = steps.findIndex(
      (s) => (s.id ?? `step-${steps.indexOf(s)}`) === over.id,
    );
    if (from === -1 || to === -1 || from === to) return;
    onChange(arrayMove(steps, from, to));
  }

  function moveStep(i: number, dir: "up" | "down"): void {
    const j = dir === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= steps.length) return;
    onChange(arrayMove(steps, i, j));
  }
  function dupStep(i: number): void {
    const src = steps[i];
    if (!src) return;
    const clone: ProcedureMethodStep = {
      ...src,
      id: nextStepId(),
      body: { en: src.body.en, es: src.body.es },
      criticalLimit: src.criticalLimit ? { ...src.criticalLimit } : undefined,
      videoSegment: src.videoSegment ? { ...src.videoSegment } : undefined,
    };
    onChange([...steps.slice(0, i + 1), clone, ...steps.slice(i + 1)]);
  }
  function removeStep(i: number): void {
    if (steps.length <= 1) return;
    onChange(steps.filter((_, j) => j !== i));
  }
  function patchStep(i: number, next: ProcedureMethodStep): void {
    onChange(steps.map((s, j) => (j === i ? next : s)));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={steps.map((s, i) => s.id ?? `step-${i}`)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {steps.map((s, i) => (
            <SortableStepRow
              key={s.id ?? `step-${i}`}
              step={s}
              index={i}
              total={steps.length}
              onChange={(next) => patchStep(i, next)}
              onRemove={() => removeStep(i)}
              onMove={(dir) => moveStep(i, dir)}
              onDuplicate={() => dupStep(i)}
              recipeAware={recipeAware}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

// ---------------------------------------------------------------------------
// Method + Recipe editors
// ---------------------------------------------------------------------------

export function MethodEditor({
  block,
  onChange,
}: EditorProps<
  Extract<ProcedureBlock, { kind: "method" }>
>): React.ReactElement {
  const t = useTranslations("admin.library.new.form");
  return (
    <div className="space-y-3">
      <StepsList
        steps={block.steps}
        onChange={(steps) => onChange({ ...block, steps })}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() =>
          onChange({ ...block, steps: [...block.steps, newMethodStep()] })
        }
      >
        + {t("addStep")}
      </Button>
    </div>
  );
}
