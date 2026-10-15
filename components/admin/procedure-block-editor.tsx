'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { classifyVideoUrl } from '@/lib/procedure-media';
import { LuArrowDown, LuArrowUp, LuCamera, LuChevronDown, LuChevronUp, LuCircleAlert, LuCirclePlay, LuCloudUpload, LuCopy, LuFocus, LuGripVertical, LuHeading1, LuHeading2, LuHeading3, LuImage, LuImagePlus, LuLightbulb, LuLink, LuListChecks, LuListOrdered, LuPaperclip, LuPlus, LuRefreshCw, LuRotateCcw, LuTable, LuTrash2, LuTriangleAlert, LuType, LuUpload, LuUtensils, LuVideo, LuWorkflow, LuWrench, LuX } from 'react-icons/lu';
import { Icon } from '@/components/ui/icon';
import type { IconType } from 'react-icons';
import type {
  Localised,
  LocalisedOptional,
  ProcedureBlock,
  ProcedureBlockKind,
  ProcedureYieldItem,
} from '@/lib/types';

// Must stay in sync with the backend whitelist at lms-backend/src/services/uploads.ts.
// SVG is intentionally omitted — it can carry inline JS.

import { TextEditor, HeadingEditor } from './procedure-block-editor/basic-editors';
import { MethodEditor } from './procedure-block-editor/step-editors';
import { RecipeEditor } from './procedure-block-editor/recipe-editor';
import { ImageEditor } from './procedure-block-editor/image-editor';
import { VideoEditor } from './procedure-block-editor/video-editor';
import { WarningEditor, AttachmentEditor } from './procedure-block-editor/callout-attachment-editors';
import { TableEditor, ChecklistEditor } from './procedure-block-editor/table-checklist-editors';

const KIND_ICON: Record<ProcedureBlockKind, IconType> = {
  text: LuType,
  heading: LuHeading1,
  method: LuListOrdered,
  ingredients: LuUtensils,
  recipe: LuUtensils,
  image: LuImage,
  video: LuVideo,
  warning: LuTriangleAlert,
  attachment: LuPaperclip,
  table: LuTable,
  checklist: LuListChecks,
};

export function ProcedureBlockEditor({
  block,
  onChange,
}: {
  block: ProcedureBlock;
  onChange: (next: ProcedureBlock) => void;
}): React.ReactElement {
  const t = useTranslations('admin.library.new.form.composer');
  const kindLabel = t(`kind.${block.kind}` as never);

  let body: React.ReactElement = <></>;
  switch (block.kind) {
    case 'text':
      body = <TextEditor block={block} onChange={onChange} />;
      break;
    case 'heading':
      body = <HeadingEditor block={block} onChange={onChange} />;
      break;
    case 'method':
      body = <MethodEditor block={block} onChange={onChange} />;
      break;
    case 'ingredients':
    case 'recipe':
      body = <RecipeEditor block={block as never} onChange={onChange as never} />;
      break;
    case 'image':
      body = <ImageEditor block={block} onChange={onChange} />;
      break;
    case 'video':
      body = <VideoEditor block={block} onChange={onChange} />;
      break;
    case 'warning':
      body = <WarningEditor block={block} onChange={onChange} />;
      break;
    case 'attachment':
      body = <AttachmentEditor block={block} onChange={onChange} />;
      break;
    case 'table':
      body = <TableEditor block={block} onChange={onChange} />;
      break;
    case 'checklist':
      body = <ChecklistEditor block={block} onChange={onChange} />;
      break;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink-2)]">
        <Icon icon={KIND_ICON[block.kind]} />
        {kindLabel}
      </div>
      {body}
    </div>
  );
}

// Localised + LocalisedOptional helpers, kept at the bottom so the per-kind
// editors don't carry the type noise.
export type { Localised, LocalisedOptional, ProcedureBlock, ProcedureYieldItem };
