'use client';


import * as React from "react";
import Link from "next/link";




import { LuArrowLeft, LuEye, LuFileText, LuLayoutGrid, LuSparkles, LuTriangleAlert } from "react-icons/lu";

import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { MultiSelectChips } from "@/components/ui/multi-select-chips";
import { Drawer } from "@/components/ui/drawer";
import { BilingualInput } from "@/components/ui/bilingual-input";
import { WizardStepper } from "@/components/ui/wizard-stepper";

import { StatusPill } from "@/components/ui/status-pill";
import { PageHeader } from "@/components/admin/page-header";
import { FormSection } from "@/components/admin/form-section";
import { IconTile } from "@/components/ui/icon-tile";


import { QuizEditor } from "@/components/admin/quiz-editor";

import { BlockRenderer } from "@/components/doc/block-renderer";
import { Cover, DocHead, DocPurpose } from "@/components/doc";
import { NotionBlockList } from "@/app/[locale]/admin/library/new/notion-block-list";

import { cn } from "@/lib/utils";



import type { ProcedureBlock } from "@/lib/types";



import { AssignBlock, CategoryAccordion } from './procedure-editor-fields';

import type { ProcedureEditorModel } from './procedure-editor-model';
import { ProcedureEditorImportPanel } from './procedure-editor-import-panel';
import { ProcedureEditorReviewPanel } from './procedure-editor-review-panel';

export function ProcedureEditorView({ model }: { model: ProcedureEditorModel }): React.ReactElement {
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
    <div>
      <div className="mx-auto max-w-page">
        {showEntryCards ? (
          /* On the choose screen the sidebar already leads back to Procedures,
             so there is no eyebrow: the page opens straight on its question. */
          <PageHeader title={t('importChooseTitle')} subtitle={t('importChooseSubtitle')} />
        ) : (
          <PageHeader
            eyebrow={(creationMode === 'manual' || creationMode === 'upload') && !initial && !importedId ? t("importBack") : t("back")}
            eyebrowHref={(creationMode === 'manual' || creationMode === 'upload') && !initial && !importedId ? undefined : `/${locale}/admin/library`}
            onEyebrowClick={(creationMode === 'manual' || creationMode === 'upload') && !initial && !importedId ? () => (creationMode === 'upload' ? cancelImport() : resetToChoiceScreen()) : undefined}
            title={isEdit ? t("titleEdit") : t("titleNew")}
          />
        )}
      </div>

      {!showEntryCards && creationMode !== 'upload' ? (
        <div className="sticky top-[56px] z-10 -mx-4 bg-[var(--color-bg-admin)]/95 px-4 py-2.5 backdrop-blur-md transition-all sm:-mx-6 sm:px-6 lg:top-[75px] lg:-mx-10 lg:px-10">
          <div className="mx-auto max-w-page">
            <WizardStepper
              className="my-0"
              ariaLabel={tStep("ariaLabel")}
              current={step}
              steps={STEPS.map((s) => ({
                id: s.id,
                label: s.label,
                progress: stepProgress[s.id],
              }))}
              onSelect={(id) => handleSelectStep(id as import("./procedure-editor-model").WizardStepId)}
            />
          </div>
        </div>
      ) : null}


      {!showEntryCards && !importing && !importLoadingId && creationMode !== 'upload' ? (
        <div className="pointer-events-none fixed bottom-[90px] right-5 z-30 lg:right-6">
          <Button
            type="button"
            variant="surface"
            icon={LuEye}
            onClick={() => setPreviewOpen(true)}
            className="pointer-events-auto shadow-e2"
          >
            {t("preview")}
          </Button>
        </div>
      ) : null}

      <div className="mx-auto max-w-page mt-4 space-y-4 pb-20">
                <ProcedureEditorImportPanel model={model} />

{/* ── Step 1 form — only rendered once a method is chosen ─────── */}
        {step === "details" && (creationMode === 'manual' || initial) ? (
          <>
            <FormSection
              id="proc-details"
              icon={LuFileText}
              title={t("detailsTitle")}
            >
              <div className="space-y-5">
                <div id="field-title" className="rounded-[var(--radius-md)]">
                  <BilingualInput
                    label={t("fieldTitle")}
                    required
                    maxLength={100}
                    value={title}
                    onChange={(next) => {
                      setTitleError(null);
                      edit(setTitle)(next);
                    }}
                    placeholder={{
                      en: "Enter the procedure title...",
                      es: "Ingresa el título del procedimiento...",
                    }}
                  />
                  {titleError ? (
                    <p
                      role="alert"
                      className="mt-1.5 flex items-center gap-2 text-xs font-normal text-[var(--color-warn-ink)] animate-in fade-in"
                    >
                      <LuTriangleAlert className="size-[13px] shrink-0 text-[var(--color-warn)]" />
                      <span>{titleError}</span>
                    </p>
                  ) : null}
                </div>

                <div id="field-purpose" className="rounded-[var(--radius-md)]">
                  <BilingualInput
                    label={t("fieldPurpose")}
                    required
                    multiline
                    maxLength={500}
                    value={purpose}
                    onChange={(next) => {
                      setPurposeError(null);
                      edit(setPurpose)(next);
                    }}
                    placeholder={{
                      en: "Enter the purpose of this procedure...",
                      es: "Ingresa el propósito de este procedimiento...",
                    }}
                  />
                  {purposeError ? (
                    <p
                      role="alert"
                      className="mt-1.5 flex items-center gap-2 text-xs font-normal text-[var(--color-warn-ink)] animate-in fade-in"
                    >
                      <LuTriangleAlert className="size-[13px] shrink-0 text-[var(--color-warn)]" />
                      <span>{purposeError}</span>
                    </p>
                  ) : null}
                </div>
              </div>
            </FormSection>

            {/* ── What it says ─────────────────────────────────────────── */}
            <FormSection
              id="proc-content"
              icon={LuLayoutGrid}
              title={t("contentTitle")}
              subtitle={
                isRecipe ? t("contentSubtitleRecipe") : t("contentSubtitle")
              }
              headerAction={
                <span className="inline-flex items-center rounded-full border border-[var(--color-line-2)] bg-[var(--color-wash)] px-3 py-1 text-xs font-semibold text-[var(--color-ink-2)]">
                  {t("contentBlocksCount", { count: blocks.length })}
                </span>
              }
            >
              <NotionBlockList
                blocks={blocks}
                errors={blockErrors}
                onChange={(next) => {
                  setBlockErrors({});
                  edit(setBlocks)(next);
                }}
              />
            </FormSection>
          </>
        ) : null}

        {/* ── Step 2 — knowledge check ──────────────────────────────── */}
        {step === "quiz" ? (
          <FormSection
            id="proc-quiz"
            icon={LuSparkles}
            title={t("quizTitle")}
            subtitle={tQuizDesc("description")}
          >
            {/* The quiz author needs a question on screen the moment they
                land on this step — no Drawer gate, no Add button. Passing
                `null` lets the editor seed one blank question (attached
                off, four empty options) so the "Attach" toggle and Question 1
                are visible immediately. On first edit the parent state
                catches up through `edit(setQuiz)`. */}
            <QuizEditor
              value={quiz}
              hideHeader
              onChange={(next) => {
                if (!quiz) setQuiz(next);
                else edit(setQuiz)(next);
              }}
            />
          </FormSection>
        ) : null}

        {/* ── Step 3 — Categories accordion + Station row + Assign block ── */}
        {step === "access" ? (
          <div className="space-y-6">
            {/* Block 1 — pick the category & subcategory. The accordion shows
                one parent category at a time; the chosen subcategory drives
                what shows below (station row for station-specific
                subcategories, employee list always). */}
            <FormSection
              id="proc-categories"
              icon={LuLayoutGrid}
              title={t("categoriesTitle")}
              subtitle={t("categoriesSubtitle")}
            >
              <CategoryAccordion
                categories={categories}
                selectedSubcategoryId={subcategoryId}
                onSelectSubcategory={(catId, subId) => {
                  edit(setCategoryId)(catId);
                  edit(setSubcategoryId)(subId);
                }}
                locale={locale}
              />
            </FormSection>

            {/* Block 2 — Stations. Always shown: general procedures broadcast to
                every station (chips come pre-selected), station-specific
                ones start blank so the manager picks. The picker is the
                place where exactly-one-station-attached is enforced at
                publish time, so it has to be visible regardless of kind.
                When publish-time validation fails, the section swaps to a
                red border and renders an inline error here (not just in
                the top banner) so the manager sees the problem next to
                the control they need to touch. */}
            {category ? (
              <section
                ref={stationsSectionRef}
                id="proc-stations"
                aria-invalid={stationsError}
                className={cn(
                  "rounded-[var(--radius-lg)] border bg-[var(--color-surface)] p-6 transition-colors",
                  stationsError
                    ? "border-[var(--color-bad)] ring-2 ring-[var(--color-bad-tint)]"
                    : "border-[var(--color-line)]",
                )}
              >
                <div className="flex items-center gap-2">
                  <IconTile size="xs" icon={LuLayoutGrid} />
                  <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                    {t("stationsRowTitle")}
                  </h3>
                  <StatusPill
                    tone={stationsError ? "bad" : "info"}
                    withDot={stationsError}
                  >
                    {audience.stationIds.length === 0
                      ? t("stationsRowNone")
                      : t("stationsRowCount", {
                        count: audience.stationIds.length,
                      })}
                  </StatusPill>
                </div>
                <p className="mt-2 text-xs leading-meta text-[var(--color-ink-3)]">
                  {t("stationsHintStationSpecific")}
                </p>
                {stationsError ? (
                  <p
                    role="alert"
                    className="mt-3 rounded-[var(--radius-md)] bg-[var(--color-bad-tint)] px-3 py-2 text-xs font-semibold text-[var(--color-bad)]"
                  >
                    {t("stationsRequired")}
                  </p>
                ) : null}
                <div className="mt-3">
                  <MultiSelectChips
                    id="who-stations"
                    label={t("stationsAddTitle")}
                    value={audience.stationIds}
                    onChange={(v) => {
                      if (v.length > 0) setStationsError(false);
                      edit(setAudience)({ ...audience, stationIds: v });
                    }}
                    options={stations.map((s) => ({
                      value: s.id,
                      label: s.name,
                    }))}
                    addLabel={t("whoAdd")}
                    emptyText={t("stationsEmpty")}
                  />
                </div>
              </section>
            ) : null}

            {/* Block 3 — Assign. Lists employees filtered by the chosen
                stations (or everyone, when no stations are filtered).
                The block supplies its own header bar (icon + title + picked
                chip on the left, search on the right) so it sits in a plain
                card instead of a FormSection — the header would otherwise
                repeat itself. */}
            <section
              id="proc-assign"
              className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6"
            >
              <AssignBlock
                people={people}
                stations={stations}
                roles={roles}
                filterStationIds={
                  audience.stationIds.length > 0
                    ? audience.stationIds
                    : null
                }
                selected={audience.employeeIds}
                onToggle={(id) => {
                  const next = audience.employeeIds.includes(id)
                    ? audience.employeeIds.filter((x) => x !== id)
                    : [...audience.employeeIds, id];
                  edit(setAudience)({ ...audience, employeeIds: next });
                }}
                isEs={isEs}
              />
            </section>
          </div>
        ) : null}

                <ProcedureEditorReviewPanel model={model} />
      </div>

{/* ── Sticky wizard footer (hidden on the choose screen and while a
          document is being drafted: there is nothing to save or move on to) ── */}
      {!showEntryCards && creationMode !== 'upload' ? (
        <div className="fixed bottom-0 left-0 right-0 z-sticky flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 shadow-e2 sm:px-6">
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink-2)]">
            <StatusPill tone={published ? "ok" : "neutral"} withDot>
              {published ? t("statusPublished") : t("statusDraft")}
            </StatusPill>
            {dirty ? (
              <span className="text-[var(--color-warn-ink)]">{t("unsaved")}</span>
            ) : null}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {!isFirstStep ? (
              <Button
                type="button"
                variant="neutral"
                icon={LuArrowLeft}
                onClick={() => setStep(STEPS[stepIdx - 1].id)}
              >
                {t("wizardBack")}
              </Button>
            ) : (
              <Link href={`/${locale}/admin/library`}>
                <Button type="button" variant="ghost">
                  {t("cancel")}
                </Button>
              </Link>
            )}

            {/* When in edit mode for a published procedure, allow "Save changes" from intermediate steps */}
            {isEdit && published && !isLastStep ? (
              <Button
                type="button"
                variant="surface"
                disabled={pending || translating}
                onClick={() => save("published")}
              >
                {t("saveChanges")}
              </Button>
            ) : !published ? (
              <Button
                type="button"
                variant="surface"
                disabled={pending || translating}
                onClick={() => save("draft")}
              >
                {t("saveDraft")}
              </Button>
            ) : null}

            {isLastStep ? (
              <Button
                type="button"
                disabled={pending || translating}
                onClick={() => save("published")}
              >
                {published ? t("saveChanges") : t("publishNow")}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleNext}
              >
                {step === "quiz" && !hasQuizContent
                  ? t("wizardSkip")
                  : t("wizardNext")}
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {/* ── What a cook will see ─────────────────────────────────────── */}
      <Drawer
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={t("preview")}
        closeLabel={t("cancel")}
        size="lg"
      >
        <div className="space-y-4">
          <SegmentedControl
            label={t("language")}
            value={lang}
            onChange={(v) => setLang(v as "en" | "es")}
            segments={[
              { value: "en", label: "EN" },
              { value: "es", label: "ES" },
            ]}
          />
          {(() => {
            const { cover, rest } = splitCover(body.blocks);
            const headingTitle =
              (lang === "en" ? title.en || title.es : title.es || title.en) ||
              t("previewUntitled");
            const headingPurpose =
              lang === "en" ? purpose.en || purpose.es : purpose.es || purpose.en;
            const categoryLabel = category
              ? lang === "es"
                ? category.nameEs || category.nameEn
                : category.nameEn || category.nameEs
              : "Recipes";

            return (
              <div className="doc overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-xs">
                {cover ? <Cover src={cover.src} alt={cover.alt} /> : null}
                <div className="px-4 py-3 sm:px-6">
                  <DocHead
                    icon={subcategory?.slug ? `procedure-${subcategory.slug}` : "file-text"}
                    iconImageUrl={iconImageUrl}
                    category={categoryLabel}
                    title={headingTitle}
                    withCover={Boolean(cover)}
                  />
                  {headingPurpose ? <DocPurpose>{headingPurpose}</DocPurpose> : null}
                  {rest.length ? (
                    <BlockRenderer blocks={rest} locale={lang} />
                  ) : (
                    <p className="py-4 text-[var(--color-ink-3)]">{t("previewEmpty")}</p>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </Drawer>
    </div>
  );

}

function splitCover(blocks: ProcedureBlock[]): {
  cover?: { src: string; alt: string };
  rest: ProcedureBlock[];
} {
  const i = blocks.findIndex((b, idx) => b.kind === "image" && Boolean(b.src) && idx === 0);
  if (i === -1) return { rest: blocks };
  const b = blocks[i] as Extract<ProcedureBlock, { kind: "image" }>;
  return {
    cover: { src: b.src, alt: b.alt?.en || b.alt?.es || "" },
    rest: blocks.filter((_, n) => n !== i),
  };
}

/* ---------------------------------------------------------------- helpers -- */
