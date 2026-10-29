"use client";

"use client";

"use client";

import * as React from "react";

import {
  LuEye,
  LuFileText,
  LuImagePlus,
  LuLayoutGrid,
  LuSignature,
  LuSparkles,
  LuUsers,
} from "react-icons/lu";

import { Button } from "@/components/ui/button";

import { StatusPill } from "@/components/ui/status-pill";

import { IconTile } from "@/components/ui/icon-tile";

import { initialsOf, ProcedureIconPicker } from "./procedure-editor-fields";

import type { ProcedureEditorModel } from "./procedure-editor-model";

export function ProcedureEditorReviewPanel({
  model,
}: {
  model: ProcedureEditorModel;
}): React.ReactElement {
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
    published,
  } = model;
  return (
    <>
      {/* ── Step 4 — review before publishing ─────────────────────── */}
      {step === "review" ? (
        <div className="space-y-6">
          {/* Preview card — what the procedure looks like at a glance.
               The Drawer already holds the full read-through; this card just
               gives the manager the title, the purpose, and a way to jump
               back into the preview without scrolling the wizard. */}
          <section
            id="proc-review-preview"
            className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--color-ink-3)]">
                  {t("reviewPreviewLabel")}
                </p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold leading-tight tracking-tight text-[var(--color-ink)]">
                  {(isEs ? title.es || title.en : title.en || title.es) ||
                    t("previewUntitled")}
                </p>
                <p className="mt-2 text-sm text-[var(--color-ink-2)]">
                  {(title.en || title.es) && (purpose.en || purpose.es)
                    ? isEs
                      ? purpose.es || purpose.en
                      : purpose.en || purpose.es
                    : t("reviewPreviewEmpty")}
                </p>
              </div>
              <Button
                type="button"
                variant="neutral"
                size="sm"
                icon={LuEye}
                onClick={() => setPreviewOpen(true)}
              >
                {t("reviewPreviewCta")}
              </Button>
            </div>
          </section>

          {/* Summary card — every other fact about the procedure. */}
          <section
            id="proc-review-summary"
            className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6"
          >
            <div className="flex items-center gap-2">
              <IconTile size="xs" icon={LuFileText} />
              <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                {t("reviewSummaryHeading")}
              </h3>
            </div>
            <p className="mt-1 text-sm text-[var(--color-ink-2)]">
              {t("reviewSummarySubtitle")}
            </p>

            <ul className="mt-5 grid gap-5 sm:grid-cols-2">
              {/* Where it lives — category + subcategory */}
              <li className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-wash)] p-4">
                <div className="flex items-center gap-2">
                  <IconTile size="xs" icon={LuLayoutGrid} />
                  <p className="text-sm font-semibold text-[var(--color-ink-3)]">
                    {t("reviewWhereLabel")}
                  </p>
                </div>
                {category ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-[var(--color-ink-3)]">
                      {t("reviewWhereCategory")}
                    </p>
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      {nameOf(category)}
                    </p>
                    {subcategory ? (
                      <>
                        <p className="mt-2 text-sm text-[var(--color-ink-3)]">
                          {t("reviewWhereSubcategory")}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[var(--color-ink)]">
                            {nameOf(subcategory)}
                          </p>
                          <StatusPill
                            tone={
                              category?.kind === "station-tied"
                                ? "info"
                                : "neutral"
                            }
                          >
                            {category?.kind === "station-tied"
                              ? t("reviewStationsStationSpecific")
                              : t("reviewStationsGeneral")}
                          </StatusPill>
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-[var(--color-ink-2)]">
                    {t("reviewWhereEmpty")}
                  </p>
                )}
              </li>

              {/* Stations — list of chosen station names, or "All stations" */}
              <li className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-wash)] p-4">
                <div className="flex items-center gap-2">
                  <IconTile size="xs" icon={LuLayoutGrid} />
                  <p className="text-sm font-semibold text-[var(--color-ink-3)]">
                    {t("reviewStationsLabel")}
                  </p>
                </div>
                {audience.stationIds.length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {audience.stationIds.map((id) => {
                      const station = stations.find((s) => s.id === id);
                      return (
                        <li key={id}>
                          <span className="inline-flex items-center rounded-full border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-1 text-sm font-semibold text-[var(--color-ink)]">
                            {station?.name ?? id}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-[var(--color-ink-2)]">
                    {t("reviewStationsNone")}
                  </p>
                )}
              </li>

              {/* People assigned */}
              <li className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-wash)] p-4">
                <div className="flex items-center gap-2">
                  <IconTile size="xs" icon={LuUsers} />
                  <p className="text-sm font-semibold text-[var(--color-ink-3)]">
                    {t("reviewAssignLabel")}
                  </p>
                  {audience.mode === "everyone" ? null : (
                    <span className="text-sm font-normal text-[var(--color-ink-3)]">
                      {t("assignPicked", {
                        count: audience.employeeIds.length,
                      })}
                    </span>
                  )}
                </div>
                {audience.mode === "everyone" ? (
                  <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                    {t("reviewAssignEveryone")}
                  </p>
                ) : audience.employeeIds.length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {audience.employeeIds.map((id) => {
                      const person = people.find((p) => p.id === id);
                      if (!person) return null;
                      const personStationList = (person.stationIds ?? [])
                        .map((sid) => stations.find((s) => s.id === sid)?.name)
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <li
                          key={id}
                          className="flex items-center gap-2 rounded-full border border-[var(--color-brand-600)] bg-[var(--color-brand-tint)] px-2.5 py-1"
                        >
                          <span className="flex size-5 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-[10px] font-bold text-[var(--color-surface)]">
                            {initialsOf(person.name)}
                          </span>
                          <span className="text-sm font-semibold text-[var(--color-brand-700)]">
                            {person.name}
                          </span>
                          {personStationList ? (
                            <span className="text-xs font-normal text-[var(--color-brand-700)] opacity-80">
                              · {personStationList}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-[var(--color-ink-2)]">
                    {t("reviewAssignEmpty")}
                  </p>
                )}
              </li>

              {/* Quiz */}
              <li className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-wash)] p-4">
                <div className="flex items-center gap-2">
                  <IconTile size="xs" icon={LuSparkles} />
                  <p className="text-sm font-semibold text-[var(--color-ink-3)]">
                    {t("reviewQuizLabel")}
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-[var(--color-ink)]">
                    {quizCount
                      ? t("reviewQuizSummary", { count: quizCount })
                      : t("quizNone")}
                  </p>
                  {quizCount > 0 ? (
                    <StatusPill tone={quiz?.attached ? "ok" : "neutral"}>
                      {quiz?.attached
                        ? t("reviewQuizAttached")
                        : t("reviewQuizDetached")}
                    </StatusPill>
                  ) : null}
                </div>
              </li>

              {/* Protection */}
              <li className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-wash)] p-4 sm:col-span-2">
                <div className="flex items-center gap-2">
                  <IconTile size="xs" icon={LuSignature} />
                  <p className="text-sm font-semibold text-[var(--color-ink-3)]">
                    {t("reviewProtectionLabel")}
                  </p>
                </div>
                <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                  {t(
                    protection === "master"
                      ? "protectionMaster"
                      : protection === "confidential"
                        ? "protectionConfidential"
                        : "protectionStandard",
                  )}
                </p>
                <p className="mt-1 text-sm text-[var(--color-ink-2)]">
                  {t("protectionHint")}
                </p>
              </li>

              {/* The picker card. The picker resolves the default glyph itself
                    from PROCEDURE_ICON_MAP (slug -> IconType), shows the
                    uploaded file's name when an image is set, and offers
                    Upload / Replace / Remove. No "category" or "mark" wording
                    shows up here. */}
              <li className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-wash)] p-4 sm:col-span-2">
                <div className="flex items-center gap-2">
                  <IconTile size="xs" icon={LuImagePlus} />
                  <p className="text-sm font-semibold text-[var(--color-ink-3)]">
                    {t("reviewCoverLabel")}
                  </p>
                </div>
                <div className="mt-3">
                  <ProcedureIconPicker
                    subcategorySlug={subcategory?.slug ?? null}
                    imageUrl={iconImageUrl}
                    onChange={(next) => edit(setIconImageUrl)(next)}
                  />
                </div>
              </li>
            </ul>
          </section>

          {/* Ready to go live — the publishing reassurance, plus the
               notification count. Lives outside the summary card so it can
               stretch edge-to-edge with the rocket icon, like the sketch. */}
          <section
            id="proc-review-ready"
            className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6"
          >
            <div className="flex items-start gap-3">
              <IconTile size="sm" icon={LuSparkles} tone="quiet" />
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-[var(--color-ink)]">
                  {isEdit ? t("saveTitle") : t("reviewReadyHeading")}
                </h3>
                <p className="mt-1 text-sm text-[var(--color-ink-2)]">
                  {isEdit ? t("publishDescription") : t("reviewReadyBody")}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-start gap-2 text-sm text-[var(--color-ink-2)]">
              <LuFileText
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-[var(--color-ink-3)]"
              />
              <p>
                {audience.mode === "everyone"
                  ? t("reviewReadyNotifyEveryone")
                  : audience.employeeIds.length > 0
                    ? t("reviewReadyNotify", {
                        count: audience.employeeIds.length,
                      })
                    : t("reviewReadyNotifyNobody")}
              </p>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
