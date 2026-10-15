'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomSelect } from '@/components/ui/custom-select';
import { RowActions } from '@/components/ui/row-actions';
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
} from '@/lib/types';
import { syncAmountsWithFactors } from '@/lib/procedure-blocks';
import { ALLERGEN_KEYS, type AllergenKey } from '@/lib/allergens';
import {
  uploadMedia,
  deleteUpload,
} from '@/lib/api';
import { classifyVideoUrl } from '@/lib/procedure-media';
import { LuArrowDown, LuArrowUp, LuCamera, LuChevronDown, LuChevronUp, LuCircleAlert, LuCirclePlay, LuCloudUpload, LuCopy, LuFocus, LuGripVertical, LuHeading1, LuHeading2, LuHeading3, LuImage, LuImagePlus, LuLightbulb, LuLink, LuListChecks, LuListOrdered, LuPaperclip, LuPlus, LuRefreshCw, LuRotateCcw, LuTable, LuTrash2, LuTriangleAlert, LuType, LuUpload, LuUtensils, LuVideo, LuWorkflow, LuWrench, LuX } from 'react-icons/lu';
import { Icon } from '@/components/ui/icon';
import type { IconType } from 'react-icons';

// Must stay in sync with the backend whitelist at lms-backend/src/services/uploads.ts.
// SVG is intentionally omitted — it can carry inline JS.
import { ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES, BilingualTabs, EditorProps, Field, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, NOTE_KINDS, UNITS, asLocalised, asOpt, emptyCriticalLimit, emptyIngredient, newMethodStep, setLocalised, setOpt, textareaCls } from './shared';

export function ImageEditor({
  block,
  onChange,
}: EditorProps<Extract<ProcedureBlock, { kind: 'image' }>>): React.ReactElement {
  const t = useTranslations('admin.library.new.form.composer');
  const [lang, setLang] = React.useState<'en' | 'es'>('en');
  const [sourceMode, setSourceMode] = React.useState<'upload' | 'url'>('upload');
  const [upload, setUpload] = React.useState<{
    state: 'idle' | 'uploading' | 'failed';
    fileName?: string;
    error?: string;
  }>({ state: 'idle' });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const startUpload = async (file: File): Promise<void> => {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setUpload({ state: 'failed', fileName: file.name, error: t('image.uploadUnsupported') });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setUpload({ state: 'failed', fileName: file.name, error: t('image.uploadTooBig') });
      return;
    }

    setUpload({ state: 'uploading', fileName: file.name });
    try {
      const finalSrc = await uploadMedia(file);
      // Backfill alt from the filename so the block survives buildGenericBody's
      // isBlockEmpty filter (image blocks with empty alt + caption are dropped
      // before save). Only fills the empty side — anything the user already
      // typed stays.
      const filenameNoExt = file.name.replace(/\.[^.]+$/, '');
      const currentEn = block.alt?.en?.trim() ?? '';
      const currentEs = block.alt?.es?.trim() ?? '';
      onChange({
        ...block,
        src: finalSrc,
        alt: {
          en: currentEn || filenameNoExt,
          es: currentEs || filenameNoExt,
        },
      });
      setUpload({ state: 'idle' });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('image.uploadFailed');
      setUpload({ state: 'failed', fileName: file.name, error: message });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
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
          Procedure Image <span aria-hidden="true" className="text-[var(--color-bad)]">*</span>
        </Label>
        <SegmentedControl
          label={t('image.sourceLabel')}
          value={sourceMode}
          onChange={(mode) => setSourceMode(mode as 'upload' | 'url')}
          segments={[
            { value: 'upload', label: t('image.uploadMode'), icon: LuCloudUpload },
            { value: 'url', label: t('image.urlMode'), icon: LuLink },
          ]}
        />
      </div>

      {block.src ? (
        <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-line)] pb-3">
            <div className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-ok-tint)] px-3 py-1 text-sm font-semibold text-[var(--color-ok)]">
              <LuImage aria-hidden="true" />
              <span>{t('image.uploadDone')}</span>
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
                {t('image.uploadChange')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Best-effort: try to delete the underlying R2 object so the
                  // bucket doesn't accumulate orphans. Backend returns 404 for
                  // non-R2 URLs (e.g. a CDN link the user pasted) — swallowed.
                  // Lifecycle rules in the bucket catch anything this misses.
                  if (block.src) {
                    void deleteUpload({ url: block.src }).catch(() => undefined);
                  }
                  onChange({ ...block, src: '' });
                }}
                className="gap-2 text-sm font-semibold text-[var(--color-bad)] hover:bg-[var(--color-bad-tint)]"
              >
                <LuTrash2 aria-hidden="true" className="text-sm" />
                {t('image.uploadRemove')}
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)] p-3 max-h-media">
            <img
              src={block.src}
              alt={t('image.previewAlt')}
              className="max-h-media w-auto rounded-sm object-contain shadow-e1"
            />
          </div>
        </div>
      ) : upload.state === 'uploading' ? (
        <div className="upload">
          <span className="pill-progress">
            <span className="spinner" aria-hidden="true" />
            {t('image.uploading')}
            {upload.fileName ? ` · ${upload.fileName}` : ''}
          </span>
        </div>
      ) : upload.state === 'failed' ? (
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
            {t('image.uploadChange')}
          </Button>
        </div>
      ) : sourceMode === 'upload' ? (
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
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className="dropzone"
        >
          <LuImagePlus aria-hidden="true" />
          <p>{t('image.uploadClick')}</p>
          <span>{t('image.uploadHint')}</span>
        </div>
      ) : (
        <Field label={t('imageSrc')}>
          <Input
            type="url"
            value={block.src}
            onChange={(e) => onChange({ ...block, src: e.target.value })}
            placeholder="https://images.unsplash.com/photo-..."
          />
        </Field>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        onChange={handleFileChange}
        className="hidden"
      />

      <Field label={t('imageHint.label')}>
        <CustomSelect
          value={block.hint || 'photo'}
          onChange={(v) => onChange({ ...block, hint: v as ProcedureImageHint })}
          options={[
            { value: 'photo', label: t('imageHint.photo'), icon: LuCamera },
            { value: 'diagram', label: t('imageHint.diagram'), icon: LuWorkflow },
          ]}
        />
      </Field>

      <BilingualTabs active={lang} onChange={setLang} enLabel={t('tabs.en')} esLabel={t('tabs.es')} />
      <Field label={t('imageAlt')} required>
        <Input
          value={asLocalised(block.alt, lang)}
          onChange={(e) => onChange({ ...block, alt: setLocalised(block.alt, lang, e.target.value) })}
          placeholder="e.g. Freshly cooked grilled chicken breast on cutting board"
        />
      </Field>
      <Field label={t('imageCaption')}>
        <Input
          value={asOpt(block.caption, lang)}
          onChange={(e) =>
            onChange({
              ...block,
              caption: setOpt(block.caption, lang, e.target.value),
            })
          }
          maxLength={50}
          placeholder="e.g. Ensure internal temperature reaches 165°F before serving"
        />
      </Field>
    </div>
  );
}

