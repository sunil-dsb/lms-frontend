'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { classifyVideoUrl } from '@/lib/procedure-media';
import { LuArrowDown, LuArrowUp, LuCamera, LuChevronDown, LuChevronUp, LuCircleAlert, LuCirclePlay, LuCloudUpload, LuCopy, LuFocus, LuGripVertical, LuHeading1, LuHeading2, LuHeading3, LuImage, LuImagePlus, LuLightbulb, LuLink, LuListChecks, LuListOrdered, LuPaperclip, LuPlus, LuRefreshCw, LuRotateCcw, LuTable, LuTrash2, LuTriangleAlert, LuType, LuUpload, LuUtensils, LuVideo, LuWorkflow, LuWrench, LuX } from 'react-icons/lu';
import { Icon } from '@/components/ui/icon';
import type { IconType } from 'react-icons';
import type { ProcedureBlock } from '@/lib/types';
import { CustomSelect } from '@/components/ui/custom-select';
import { Input } from '@/components/ui/input';

// Must stay in sync with the backend whitelist at lms-backend/src/services/uploads.ts.
// SVG is intentionally omitted — it can carry inline JS.
import { ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES, BilingualTabs, EditorProps, Field, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, NOTE_KINDS, UNITS, asLocalised, asOpt, emptyCriticalLimit, emptyIngredient, newMethodStep, setLocalised, setOpt, textareaCls } from './shared';

export function TextEditor({ block, onChange }: EditorProps<Extract<ProcedureBlock, { kind: 'text' }>>): React.ReactElement {
  const t = useTranslations('admin.library.new.form.composer');
  const [lang, setLang] = React.useState<'en' | 'es'>('en');
  return (
    <div className="space-y-3">
      <BilingualTabs active={lang} onChange={setLang} enLabel={t('tabs.en')} esLabel={t('tabs.es')} />
      <textarea
        value={asLocalised(block.body, lang)}
        onChange={(e) => onChange({ ...block, body: setLocalised(block.body, lang, e.target.value) })}
        rows={4}
        maxLength={1000}
        className={textareaCls}
      />
      <span className="text-xs text-[var(--color-ink-2)] ml-1">max {1000} chars</span>
    </div>
  );
}

export function HeadingEditor({
  block,
  onChange,
}: EditorProps<Extract<ProcedureBlock, { kind: 'heading' }>>): React.ReactElement {
  const t = useTranslations('admin.library.new.form.composer');
  const [lang, setLang] = React.useState<'en' | 'es'>('en');
  return (
    <div className="space-y-3">
      <Field label={t('headingLevel.label')}>
        <CustomSelect
          value={String(block.level)}
          onChange={(val) =>
            onChange({ ...block, level: Number(val) as 1 | 2 | 3 })
          }
          options={[
            { value: '1', label: t('headingLevel.1'), icon: LuHeading1 },
            { value: '2', label: t('headingLevel.2'), icon: LuHeading2 },
            { value: '3', label: t('headingLevel.3'), icon: LuHeading3 },
          ]}
        />
      </Field>
      <BilingualTabs active={lang} onChange={setLang} enLabel={t('tabs.en')} esLabel={t('tabs.es')} />
      <Input
        value={asLocalised(block.text, lang)}
        onChange={(e) => onChange({ ...block, text: setLocalised(block.text, lang, e.target.value) })}
        maxLength={50}
      />
      <span className="text-xs text-[var(--color-ink-2)] ml-1">max {50} chars</span>
    </div>
  );
}

