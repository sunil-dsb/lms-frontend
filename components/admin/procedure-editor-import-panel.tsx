'use client';

'use client';

"use client";

import * as React from "react";





import { LuCheck, LuClock, LuFileText, LuLoader, LuFilePen, LuFileUp, LuRotateCw, LuSparkles, LuUpload, LuX, LuTriangleAlert } from "react-icons/lu";

import { Button } from "@/components/ui/button";








import { FormSection } from "@/components/admin/form-section";









import { cn } from "@/lib/utils";









import type { ProcedureEditorModel } from './procedure-editor-model';

export function ProcedureEditorImportPanel({ model }: { model: ProcedureEditorModel }): React.ReactElement {
  const {
    locale,
    initial,
    t,
    tErr,
    tStep,
    tQuizDesc,
    router,
    queryClient,
    isEdit,
    isEs,
    categories,
    setCategories,
    stations,
    setStations,
    roles,
    setRoles,
    people,
    setPeople,
    accessDataLoaded,
    setAccessDataLoaded,
    start,
    lang,
    setLang,
    title,
    setTitle,
    purpose,
    setPurpose,
    categoryId,
    setCategoryId,
    subcategoryId,
    setSubcategoryId,
    blocks,
    setBlocks,
    ingredients,
    setIngredients,
    yieldItems,
    setYieldItems,
    batch,
    setBatch,
    iconImageUrl,
    setIconImageUrl,
    savedQuiz,
    quiz,
    setQuiz,
    audience,
    setAudience,
    protection,
    setProtection,
    previewOpen,
    setPreviewOpen,
    dirty,
    setDirty,
    error,
    setError,
    creationMode,
    setCreationMode,
    importedId,
    setImportedId,
    importedSlug,
    setImportedSlug,
    importFile,
    setImportFile,
    importBannerFile,
    setImportBannerFile,
    importStep,
    setImportStep,
    importing,
    setImporting,
    importError,
    setImportError,
    importDragOver,
    setImportDragOver,
    importLoadingId,
    setImportLoadingId,
    importAbortRef,
    importInputRef,
    titleError,
    setTitleError,
    purposeError,
    setPurposeError,
    blockErrors,
    setBlockErrors,
    stationsError,
    setStationsError,
    pending,
    startTransition,
    translating,
    stationsSectionRef,
    STEPS,
    step,
    setStep,
    stepIdx,
    isFirstStep,
    isLastStep,
    stationsReconciled,
    prefilled,
    catalogReconciled,
    edit,
    applyImportedProcedure,
    IMPORT_ACCEPT,
    startImport,
    cancelImport,
    runImport,
    importElapsed,
    setImportElapsed,
    formatFileSize,
    resetToChoiceScreen,
    isPristineNew,
    showEntryCards,
    category,
    subcategory,
    isRecipe,
    nameOf,
    titleValue,
    purposeValue,
    body,
    stepProgress,
    hasQuizContent,
    quizQuestionMissingAnswer,
    quizCount,
    whoSummary,
    scrollToTarget,
    validateProcedureForm,
    applyValidationError,
    handleNext,
    handleSelectStep,
    save,
    published
  } = model;
  return (
    <>
{/* ── State 1: Entry choice — clean cards with full-card click, no bottom CTA line ── */}
        {showEntryCards ? (
          <div
            className="py-4"
            style={{ animation: 'proc-fadein 200ms ease both' }}
          >
            {/* Options grid with full card clickability */}
            <div
              className="grid w-full gap-6 sm:grid-cols-2"
              role="group"
              aria-label={t('importChooseTitle')}
            >
              {/* The two ways in. Each card answers what a manager weighs before
                  choosing: what happens, how long it takes, and where the tap
                  goes -- the time on the left of its foot, the action on the right,
                  so a phone (no hover) still shows it is a button. The icon says
                  which is which: writing a document, or sending one up to be
                  drafted, with a spark for the drafting. Text is the admin
                  card's (20px title, 14px text); the 64px tile is this page's
                  one picture, and hover marks the
                  card the way every admin card does: edge and a breath of
                  shadow, no lift. */}
              {([
                {
                  id: 'entry-manual',
                  mode: 'manual' as const,
                  Icon: LuFilePen,
                  spark: false,
                  title: t('importManualTitle'),
                  body: t('importManualBody'),
                  hint: t('importManualHint'),
                  cta: t('importManualCta'),
                },
                {
                  id: 'entry-upload',
                  mode: 'upload' as const,
                  Icon: LuFileUp,
                  spark: true,
                  title: t('importUploadTitle'),
                  body: t('importUploadBody'),
                  hint: t('importUploadHint'),
                  cta: t('importUploadCardCta'),
                },
              ]).map((card) => (
                <button
                  key={card.id}
                  type="button"
                  id={card.id}
                  onClick={() => (card.mode === 'upload' ? importInputRef.current?.click() : setCreationMode('manual'))}
                  onDragOver={card.mode === 'upload' ? (e) => { e.preventDefault(); setImportDragOver(true); } : undefined}
                  onDragLeave={card.mode === 'upload' ? () => setImportDragOver(false) : undefined}
                  onDrop={card.mode === 'upload' ? (e) => { e.preventDefault(); setImportDragOver(false); startImport(e.dataTransfer.files?.[0]); } : undefined}
                  data-drag={card.mode === 'upload' && importDragOver ? '' : undefined}
                  className="group flex cursor-pointer flex-col items-start rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-6 text-left transition-colors duration-200 hover:border-[var(--color-line-hover)] hover:shadow-e1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] data-[drag]:border-[var(--color-brand-600)] data-[drag]:bg-[var(--color-brand-tint)]"
                >
                  <span className="relative mb-5 flex size-16 shrink-0 items-center justify-center rounded-[var(--radius-xl)] bg-[var(--color-panel)] text-[var(--color-ink)] transition-colors duration-200 group-hover:bg-[var(--color-panel-2)]">
                    <card.Icon aria-hidden="true" className="size-6" strokeWidth={1.5} />
                    {card.spark ? (
                      <span className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-brand-600)] text-[var(--color-white)]">
                        <LuSparkles aria-hidden="true" className="size-3" />
                      </span>
                    ) : null}
                  </span>
                  <span className="block text-md font-semibold tracking-snug text-[var(--color-ink)]">{card.title}</span>
                  <span className="mb-5 mt-1 block text-sm text-[var(--color-ink-2)]">{card.body}</span>

                  <span className="mt-auto flex w-full flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] pt-3">
                    <span className="inline-flex items-center gap-2 text-sm text-[var(--color-ink-3)]">
                      <LuClock aria-hidden="true" className="size-4 shrink-0 text-[var(--color-ink-3)]" />
                      {card.hint}
                    </span>
                    <span className="text-sm font-semibold text-[var(--color-brand-700)]">
                      {card.cta}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            {importError && creationMode === null ? (
              <p role="alert" className="mt-4 flex items-start gap-2 text-sm font-semibold text-[var(--color-bad)]">
                <LuTriangleAlert aria-hidden="true" className="mt-0_5 size-4 shrink-0" />
                {importError}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* One file input for the whole import flow: the upload card and the
            failed screen's "Choose another file" both open it. Reset after
            each pick so choosing the same file again still fires. */}
        {!initial ? (
          <input
            ref={importInputRef}
            type="file"
            accept={IMPORT_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              startImport(file);
            }}
          />
        ) : null}

        {/* ── State 2b: Upload panel & In-content loading (shown while creationMode === 'upload') ── */}
        {step === 'details' && creationMode === 'upload' && !initial ? (
          <div className="space-y-4" style={{ animation: 'proc-fadein 180ms ease both' }}>
            {/* While the draft is built, and when it could not be: the wizard's
                own section card, full width, so these two screens are a step of
                the form rather than a box of their own. */}
            {(importing || importLoadingId) ? (
              <div role="status" aria-live="polite" aria-label={t('importLoadingTitle')}>
                <FormSection
                  icon={LuFileUp}
                  title={t('importLoadingTitle')}
                  subtitle={importElapsed >= 60 ? t('importSlow') : t('importLoadingSubtitle')}
                  headerAction={
                    <Button type="button" variant="neutral" onClick={cancelImport}>
                      {t('importLoadingCancel')}
                    </Button>
                  }
                >
                  {importBannerFile || importFile ? (
                    <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-wash)] px-4 py-3">
                      <LuFileText aria-hidden="true" className="size-4 shrink-0 text-[var(--color-ink-3)]" />
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--color-ink)]">{importBannerFile ?? importFile?.name}</p>
                      {importFile?.size ? (
                        <span className="shrink-0 text-sm text-[var(--color-ink-3)]">{formatFileSize(importFile.size)}</span>
                      ) : null}
                    </div>
                  ) : null}

                  {/* The step being worked on spins; the server is one request and
                      cannot say how far it has got, so nothing claims a percentage. */}
                  <ol className="space-y-3">
                    {[
                      t('importProgressStep1'),
                      t('importProgressStep2'),
                      t('importProgressStep3'),
                      t('importProgressStep4'),
                    ].map((label, idx) => {
                      const done = idx < importStep;
                      const active = idx === importStep;
                      return (
                        <li key={idx} className="flex items-center gap-3">
                          <span className="flex size-5 shrink-0 items-center justify-center" aria-hidden="true">
                            {done ? (
                              <span className="flex size-5 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-[var(--color-white)]">
                                <LuCheck className="size-3" />
                              </span>
                            ) : active ? (
                              <LuLoader className="size-5 animate-spin text-[var(--color-brand-600)]" />
                            ) : (
                              <span className="size-5 rounded-full border border-[var(--color-line-3)]" />
                            )}
                          </span>
                          <span
                            className={cn(
                              'text-sm',
                              active ? 'font-semibold text-[var(--color-ink)]' : done ? 'text-[var(--color-ink-2)]' : 'text-[var(--color-ink-3)]',
                            )}
                          >
                            {label}
                          </span>
                        </li>
                      );
                    })}
                  </ol>

                  <p className="flex items-center gap-2 border-t border-[var(--color-line)] pt-4 text-sm text-[var(--color-ink-2)]">
                    <LuSparkles aria-hidden="true" className="size-4 shrink-0 text-[var(--color-brand-600)]" />
                    {t('importProgressHint')}
                  </p>
                </FormSection>
              </div>
            ) : importError ? (
              /* The upload failed. The file is kept, so trying again is one tap;
                 another file, or writing it by hand, are the other ways on. */
              <div role="alert">
                <FormSection icon={LuTriangleAlert} title={t('importErrorTitle')} subtitle={importError}>
                  {importFile ? (
                    <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-wash)] px-4 py-3">
                      <LuFileText aria-hidden="true" className="size-4 shrink-0 text-[var(--color-ink-3)]" />
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--color-ink)]">{importFile.name}</p>
                      <span className="shrink-0 text-sm text-[var(--color-ink-3)]">{formatFileSize(importFile.size)}</span>
                    </div>
                  ) : null}

                  {/* Actions bottom right, the primary last; stacked on a phone,
                      the primary on top. */}
                  <div className="flex flex-col-reverse gap-2 border-t border-[var(--color-line)] pt-4 sm:flex-row sm:items-center sm:justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setCreationMode('manual');
                        setImportFile(null);
                        setImportError(null);
                      }}
                    >
                      {t('importErrorManual')}
                    </Button>
                    <Button type="button" variant="neutral" icon={LuUpload} onClick={() => importInputRef.current?.click()}>
                      {t('importChooseAnother')}
                    </Button>
                    {importFile ? (
                      <Button type="button" variant="primary" icon={LuRotateCw} onClick={() => void runImport()}>
                        {t('importErrorRetry')}
                      </Button>
                    ) : null}
                  </div>
                </FormSection>
              </div>
            ) : null}
          </div>
        ) : null}



        {/* ── State 4: Persistent review banner after doc import ──────── */}
        {importBannerFile && step === 'details' ? (
          <div
            role="status"
            className="flex flex-wrap items-start justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] px-5 py-4"
            style={{ animation: 'proc-fadein 220ms ease both' }}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-tint)] text-[var(--color-brand-700)]">
                <LuCheck aria-hidden="true" className="size-3" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  {t('importBannerText', { file: importBannerFile })}
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-ink-3)]">Fields marked below were filled in automatically.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="neutral"
                size="sm"
                onClick={() => resetToChoiceScreen()}
              >
                {t('importBannerCta')}
              </Button>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setImportBannerFile(null)}
                className="flex size-7 items-center justify-center rounded-lg text-[var(--color-ink-3)] transition-colors hover:bg-[var(--color-line-2)] hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              >
                <LuX aria-hidden="true" className="size-3.5" />
              </button>
            </div>
          </div>
        ) : null}

            </>
  );
}
