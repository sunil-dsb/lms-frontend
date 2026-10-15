'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/ui/icon';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { WizardStepper } from '@/components/ui/wizard-stepper';
import { EmptyState } from '@/components/ui/empty-state';
import { FormSection } from '@/components/admin/form-section';
import { cn } from '@/lib/utils';
import type {
  Localised,
  Procedure,
  ProcedureAcknowledgement,
  ProcedureBlock,
  ProcedureBlockKind,
  ProcedureBody,
  ProcedureQuiz,
  ProcedureQuizQuestion,
  ProcedureStatus,
} from '@/lib/types';
import {
  BLOCK_FACTORIES,
  nextBlockId,
} from '@/lib/procedure-blocks';
import { ProcedureBlockCard } from '@/components/admin/procedure-block-card';
import {
  LuArrowDown,
  LuArrowLeft,
  LuArrowUp,
  LuBookOpen,
  LuCheck,
  LuClipboardList,
  LuHeading1,
  LuImage,
  LuListChecks,
  LuListOrdered,
  LuPaperclip,
  LuPlus,
  LuSave,
  LuFileText,
  LuSearch,
  LuSignature,
  LuTable,
  LuTrash2,
  LuTriangleAlert,
  LuType,
  LuVideo,
  LuX,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';

// Allow-listed block kinds for a course. Course content excludes `recipe` â€”
// scaler / yield / ingredient / allergen subtree is library territory, not
// training (DESIGN.md Â§4). Everything else (videos, photos, tables, warnings,
// checklists, attachments, headings, numbered steps, free text) is in scope.
import { CourseLangSwitch, CourseBlockList, QuizEditor, LinkedSopsEditor, AcknowledgementEditor, emptyQuiz, textareaCls, type CourseLang } from './course-form-components';

type CourseStep = 'details' | 'content' | 'quiz' | 'sops' | 'ack';

const COURSE_STEPS: Array<{ id: CourseStep; labelKey: string; num: number }> = [
  { id: 'details', labelKey: 'stepDetails', num: 1 },
  { id: 'content', labelKey: 'stepContent', num: 2 },
  { id: 'quiz', labelKey: 'stepQuiz', num: 3 },
  { id: 'sops', labelKey: 'stepSops', num: 4 },
  { id: 'ack', labelKey: 'stepAck', num: 5 },
];

// ---------------------------------------------------------------------------
// NewCourseForm â€” the page's main composer.
// ---------------------------------------------------------------------------

export function NewCourseForm({
  locale,
  availableSops,
}: {
  locale: string;
  availableSops: Procedure[];
}): React.ReactElement {
  const tForm = useTranslations('admin.training.form');
  const router = useRouter();

  // Body state â€” courses are bilingual at the procedure level (bodyEn/bodyEs).
  // For the composer we maintain one ProcedureBody and mirror save across both
  // sides (a real backend will store them separately).
  const [titleEn, setTitleEn] = React.useState('');
  const [titleEs, setTitleEs] = React.useState('');
  const [purposeEn, setPurposeEn] = React.useState('');
  const [purposeEs, setPurposeEs] = React.useState('');
  const [blocks, setBlocks] = React.useState<ProcedureBlock[]>([]);
  const [quiz, setQuiz] = React.useState<ProcedureQuiz | null>(null);
  const [linkedSops, setLinkedSops] = React.useState<string[]>([]);
  const [acknowledgement, setAcknowledgement] =
    React.useState<ProcedureAcknowledgement | null>(null);
  const [status, setStatus] = React.useState<ProcedureStatus>('draft');
  const [step, setStep] = React.useState<CourseStep>('details');
  const [titleLang, setTitleLang] = React.useState<CourseLang>('en');
  const [purposeLang, setPurposeLang] = React.useState<CourseLang>('en');

  const canPublish =
    titleEn.trim().length > 0 && titleEs.trim().length > 0 && blocks.length > 0;
  const canSaveDraft = titleEn.trim().length > 0 || titleEs.trim().length > 0;

  function handleSave(nextStatus: ProcedureStatus): void {
    const body: ProcedureBody = { blocks };
    console.info('[training] save course (mock)', {
      title: { en: titleEn, es: titleEs },
      purpose: { en: purposeEn, es: purposeEs },
      body,
      quiz,
      linkedSops,
      acknowledgement,
      attachedToTraining: true,
      status: nextStatus,
    });
    setStatus(nextStatus);
    router.push(`/${locale}/admin/training`);
  }

  const stepIdx = COURSE_STEPS.findIndex((x) => x.id === step);
  const isLastStep = stepIdx === COURSE_STEPS.length - 1;

  // Per-step fill ratio â€” recomputed on every keystroke. Each step is one
  // required item; "ack" is derived from how many of the others are done so
  // the bar catches up the moment the manager finishes a step, even though
  // ack itself just collects a single confirmation value.
  const filled = (s: string): boolean => s.trim().length > 0;
  const stepProgress = React.useMemo<Record<CourseStep, number>>(() => {
    const details =
      (filled(titleEn) ? 1 : 0) +
      (filled(titleEs) ? 1 : 0) +
      (filled(purposeEn) ? 1 : 0) +
      (filled(purposeEs) ? 1 : 0);
    const content = blocks.length > 0 ? 1 : 0;
    const validQuestions = quiz
      ? quiz.questions.filter(
          (q) => filled(q.prompt.en) || filled(q.prompt.es),
        ).length
      : 0;
    // Skipping the quiz (null) counts as complete, otherwise need â‰¥3 questions.
    const quizDone = quiz === null
      ? 1
      : Math.min(validQuestions / 3, 1);
    const sops = linkedSops.length > 0 ? 1 : 0;
    const ackDone =
      ((details / 4) +
        content +
        quizDone +
        sops) /
      4;
    return {
      details: details / 4,
      content,
      quiz: quizDone,
      sops,
      ack: acknowledgement !== null ? 1 : ackDone,
    };
  }, [titleEn, titleEs, purposeEn, purposeEs, blocks, quiz, linkedSops, acknowledgement]);

  return (
    <div className="space-y-6 pb-24">
      <WizardStepper
        ariaLabel={tForm('stepperLabel')}
        current={step}
        steps={COURSE_STEPS.map((x) => ({
          id: x.id,
          label: tForm(x.labelKey as never),
          progress: stepProgress[x.id],
        }))}
        onSelect={(id) => setStep(id as CourseStep)}
      />

      {step === 'details' && (
        <FormSection icon={LuFileText} title={tForm('sectionTitle')} subtitle={tForm('sectionSubtitle')}>
          {/* One language at a time, switched by the control the rest of the
              product uses. Both titles side by side asked the author to write
              the Spanish before they had settled the English. */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm font-semibold text-[var(--color-ink)]">
                {tForm('titleLabel')}
                <span aria-hidden="true" className="ml-1 text-[var(--color-bad)]">*</span>
              </Label>
              <CourseLangSwitch active={titleLang} onChange={setTitleLang} label={tForm('titleLanguage')} />
            </div>
            <Input
              value={titleLang === 'en' ? titleEn : titleEs}
              onChange={(e) => (titleLang === 'en' ? setTitleEn : setTitleEs)(e.target.value)}
              placeholder={titleLang === 'en' ? tForm('titleEnPlaceholder') : tForm('titleEsPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm font-semibold text-[var(--color-ink)]">
                {tForm('purpose')}
                <span aria-hidden="true" className="ml-1 text-[var(--color-bad)]">*</span>
              </Label>
              <CourseLangSwitch active={purposeLang} onChange={setPurposeLang} label={tForm('purposeLanguage')} />
            </div>
            <textarea
              value={purposeLang === 'en' ? purposeEn : purposeEs}
              onChange={(e) => (purposeLang === 'en' ? setPurposeEn : setPurposeEs)(e.target.value)}
              rows={3}
              placeholder={purposeLang === 'en' ? tForm('purposeEnPlaceholder') : tForm('purposeEsPlaceholder')}
              className={textareaCls}
            />
            <p className="text-sm text-[var(--color-ink-2)]">{tForm('purposeHint')}</p>
          </div>
        </FormSection>
      )}

      {step === 'content' && (
        <FormSection icon={LuListOrdered} title={tForm('sectionBlocks')} subtitle={tForm('sectionBlocksSubtitle')}>
          {/* Always rendered: the palette that adds the first block lives inside
              it, so hiding the list while it was empty left no way in. */}
          <CourseBlockList blocks={blocks} onChange={setBlocks} />
        </FormSection>
      )}

      {step === 'quiz' && (
        <FormSection
          icon={LuListChecks}
          title={tForm('sectionQuiz')}
          subtitle={tForm('sectionQuizSubtitle')}
          headerAction={
            quiz === null ? (
              <Button type="button" variant="secondary" icon={LuPlus} onClick={() => setQuiz(emptyQuiz())}>
                {tForm('addQuiz')}
              </Button>
            ) : null
          }
        >
          {quiz ? (
            <QuizEditor quiz={quiz} onChange={setQuiz} onDetach={() => setQuiz(null)} />
          ) : (
            <EmptyState compact icon={LuListChecks} title={tForm('noQuizYet')} />
          )}
        </FormSection>
      )}

      {step === 'sops' && (
        <FormSection icon={LuBookOpen} title={tForm('sectionSops')} subtitle={tForm('sectionSopsSubtitle')}>
          <LinkedSopsEditor available={availableSops} selectedIds={linkedSops} onChange={setLinkedSops} />
        </FormSection>
      )}

      {step === 'ack' && (
        <FormSection icon={LuSignature} title={tForm('sectionAck')} subtitle={tForm('sectionAckSubtitle')}>
          <AcknowledgementEditor value={acknowledgement} onChange={setAcknowledgement} />
        </FormSection>
      )}

      {/* The same bar the procedure wizard carries: where the draft stands on
          the left, the way out of the step on the right. */}
      <div className="sticky-bar fixed bottom-0 left-0 right-0 z-sticky flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 shadow-e2 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-[var(--color-ink-2)]">
          <span
            className={cn('size-2 rounded-full', canPublish ? 'bg-[var(--color-ok-fill)]' : 'bg-[var(--color-warn)]')}
            aria-hidden="true"
          />
          {tForm('draftLabel')}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          {stepIdx > 0 && (
            <Button
              type="button"
              variant="neutral"
              icon={LuArrowLeft}
              onClick={() => setStep(COURSE_STEPS[stepIdx - 1].id)}
            >
              {tForm('back')}
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            icon={LuClipboardList}
            disabled={!canSaveDraft}
            onClick={() => handleSave('draft')}
          >
            {tForm('saveDraft')}
          </Button>
          {isLastStep ? (
            <Button
              type="button"
              variant="primary"
              icon={LuSave}
              disabled={!canPublish}
              onClick={() => handleSave('published')}
            >
              {tForm('publish')}
            </Button>
          ) : (
            <Button type="button" variant="primary" onClick={() => setStep(COURSE_STEPS[stepIdx + 1].id)}>
              {tForm('next')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
