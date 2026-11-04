"use client";

import * as React from "react";
import {
  LuArrowLeft,
  LuCheck,
  LuChevronRight,
  LuEye,
  LuFileText,
  LuLayoutGrid,
  LuSparkles,
  LuTriangleAlert,
} from "react-icons/lu";
import { Button } from "@/components/ui/button";
import {
  BilingualInput,
  type BilingualValue,
} from "@/components/ui/bilingual-input";
import { WizardStepper } from "@/components/ui/wizard-stepper";
import { FormSection } from "@/components/admin/form-section";
import { NotionBlockList } from "@/app/[locale]/admin/library/new/notion-block-list";
import { QuizEditor } from "@/components/admin/quiz-editor";
import type {
  ProcedureBlock,
  ProcedureQuiz,
  ProcedureQuizQuestion,
} from "@/lib/types";
import { isQuizQuestionAuthored } from "@/lib/api";
import { ChapterPreviewDrawer } from "./chapter-preview-drawer";
import { ChapterLinkedQuizBanner } from "./chapter-linked-quiz-banner";
import {
  getQuestionNormalizedPrompt,
  validateChapterQuiz,
} from "./chapter-quiz-utils";
import { useChapterLinkedQuiz } from "./use-chapter-linked-quiz";
import type { EditorChapter } from "./course-editor";

interface ChapterContentEditorProps {
  locale: string;
  courseName: string;
  chapterNumber: number;
  initialChapter?: EditorChapter | null;
  onSave: (chapter: EditorChapter) => void;
  onCancel: () => void;
}

type WizardStep = "content" | "quiz";

export function ChapterContentEditor({
  locale,
  courseName,
  chapterNumber,
  initialChapter,
  onSave,
  onCancel,
}: ChapterContentEditorProps): React.ReactElement {
  const isEs = locale === "es";

  const [step, setStep] = React.useState<WizardStep>("content");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [step]);

  const [title, setTitle] = React.useState<BilingualValue>(() => {
    if (initialChapter?.title) {
      return { en: initialChapter.title, es: initialChapter.title };
    }
    const defaultTitle = isEs
      ? `Capítulo ${chapterNumber}`
      : `Chapter ${chapterNumber}`;
    return { en: defaultTitle, es: defaultTitle };
  });

  const [purpose, setPurpose] = React.useState<BilingualValue>(() => {
    if (initialChapter?.subtitle) {
      return { en: initialChapter.subtitle, es: initialChapter.subtitle };
    }
    return { en: "", es: "" };
  });

  const [titleError, setTitleError] = React.useState<string | null>(null);
  const [purposeError, setPurposeError] = React.useState<string | null>(null);
  const [quizError, setQuizError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const [blocks, setBlocks] = React.useState<ProcedureBlock[]>(
    () => initialChapter?.blocks ?? [],
  );

  const [quiz, setQuiz] = React.useState<ProcedureQuiz | null>(() => {
    if (!initialChapter?.quiz) return null;
    return {
      ...initialChapter.quiz,
      questions: (initialChapter.quiz.questions || []).map((q: any) => {
        const { en, es } = getQuestionNormalizedPrompt(q);
        return {
          ...q,
          prompt: { en, es },
          question: { en, es },
        };
      }),
    };
  });

  // Preview state
  const [previewOpen, setPreviewOpen] = React.useState(false);

  // Hook managing linked procedures discovery & quiz question extraction
  const {
    linkedProcedureIds,
    linkedProceduresMap,
    availableLinkedQuestions,
    hasAuthoredQuestions,
  } = useChapterLinkedQuiz({
    blocks,
    initialChapter,
    quiz,
    setQuiz,
    setQuizError,
    isEs,
  });

  const hasTitle = Boolean(title.en.trim() || title.es.trim());
  const hasPurpose = Boolean(purpose.en.trim() || purpose.es.trim());

  const handleNext = () => {
    let valid = true;
    if (!hasTitle) {
      setTitleError(isEs ? "El título es obligatorio." : "Title is required.");
      valid = false;
    } else {
      setTitleError(null);
    }

    if (!hasPurpose) {
      setPurposeError(
        isEs ? "El propósito es obligatorio." : "What it is for is required.",
      );
      valid = false;
    } else {
      setPurposeError(null);
    }

    if (!valid) {
      const firstErrEl =
        document.getElementById("chapter-field-title") ||
        document.getElementById("chapter-field-purpose");
      firstErrEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setStep("quiz");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = () => {
    if (isSaving) return;
    let valid = true;
    if (!hasTitle) {
      setTitleError(isEs ? "El título es obligatorio." : "Title is required.");
      valid = false;
    }
    if (!hasPurpose) {
      setPurposeError(
        isEs ? "El propósito es obligatorio." : "What it is for is required.",
      );
      valid = false;
    }
    if (!valid) {
      setStep("content");
      return;
    }

    // Frontend quiz validation
    const validationErr = validateChapterQuiz(quiz, isEs);
    if (validationErr) {
      setQuizError(validationErr);
      setStep("quiz");
      return;
    }

    setQuizError(null);

    const resolvedTitle =
      (isEs ? title.es || title.en : title.en || title.es).trim() ||
      (isEs ? `Capítulo ${chapterNumber}` : `Chapter ${chapterNumber}`);

    const resolvedSubtitle = (
      isEs ? purpose.es || purpose.en : purpose.en || purpose.es
    ).trim();

    const hasQuestions = Boolean(
      quiz?.questions &&
      quiz.questions.length > 0 &&
      quiz.questions.some(isQuizQuestionAuthored),
    );

    const primaryProcId =
      linkedProcedureIds[0] || initialChapter?.procedureId || undefined;
    const primaryProc = primaryProcId
      ? linkedProceduresMap[primaryProcId] ||
        Object.values(linkedProceduresMap).find(
          (p) => p.id === primaryProcId || p.slug === primaryProcId,
        )
      : undefined;

    const saved: EditorChapter = {
      id: initialChapter?.id || `chapter-${Date.now()}`,
      title: resolvedTitle,
      subtitle: resolvedSubtitle || undefined,
      procedureId: primaryProcId,
      procedureSlug:
        primaryProc?.slug || initialChapter?.procedureSlug || undefined,
      // A chapter quiz must be independent from any linked procedure's quiz!
      quizId:
        (quiz as any)?.id && (quiz as any)?.id !== primaryProc?.quizId
          ? (quiz as any).id
          : initialChapter?.quizId &&
              initialChapter?.quizId !== primaryProc?.quizId
            ? initialChapter.quizId
            : undefined,
      blocks,
      quiz:
        hasQuestions && quiz
          ? {
              ...quiz,
              quizType: "course",
              attached: true,
              questions: quiz.questions
                .filter(isQuizQuestionAuthored)
                .map((q: ProcedureQuizQuestion) => {
                  const { en: pEn, es: pEs } = getQuestionNormalizedPrompt(q);
                  return {
                    ...q,
                    prompt: { en: pEn, es: pEs },
                    question: { en: pEn, es: pEs },
                  };
                }),
              minCorrectAnswers:
                quiz.minCorrectAnswers ??
                Math.max(1, Math.ceil(quiz.questions.length * 0.7)),
            }
          : null,
    };

    setIsSaving(true);
    onSave(saved);
  };

  const handleOpenPreview = () => {
    setPreviewOpen(true);
  };

  const stepsList = [
    {
      id: "content",
      label: isEs ? "Contenido" : "Content",
      progress: blocks.length > 0 && hasTitle && hasPurpose ? 1 : 0.5,
    },
    {
      id: "quiz",
      label: isEs ? "Cuestionario" : "Quiz",
      progress: quiz && quiz.questions && quiz.questions.length > 0 ? 1 : 0,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-48 sm:pb-32 animate-in fade-in duration-200">
      {/* Top Header */}
      <div>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[var(--color-ink-2)] hover:text-[var(--color-ink)] transition-colors cursor-pointer"
        >
          <LuArrowLeft className="w-4 h-4" />
          <span>{isEs ? "Volver al curso" : "Back to course"}</span>
        </button>

        <div className="mt-2 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-ui)] text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-ink)]">
              {initialChapter
                ? isEs
                  ? "Editar capítulo"
                  : "Edit chapter"
                : isEs
                  ? `Nuevo capítulo #${chapterNumber}`
                  : `New chapter #${chapterNumber}`}
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-[var(--color-ink-2)]">
              {courseName}
            </p>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="sticky top-[56px] z-10 -mx-4 bg-[var(--color-bg-admin)]/95 px-4 py-2 backdrop-blur-md transition-all sm:-mx-6 sm:px-6 lg:top-[75px] lg:-mx-10 lg:px-10 border-b border-[var(--color-line-2)]/60">
        <div className="mx-auto max-w-4xl">
          <WizardStepper
            className="my-0"
            ariaLabel={isEs ? "Pasos del capítulo" : "Chapter steps"}
            current={step}
            steps={stepsList}
            onSelect={(id) => {
              if (id === "quiz") {
                handleNext();
              } else {
                setStep(id as WizardStep);
              }
            }}
          />
        </div>
      </div>

      {/* STEP 1: CONTENT */}
      {step === "content" && (
        <div className="space-y-6">
          {/* Section 1: About this chapter */}
          <FormSection
            id="chapter-details"
            icon={LuFileText}
            title={isEs ? "Sobre este capítulo" : "About this chapter"}
          >
            <div className="space-y-5">
              <div id="chapter-field-title">
                <BilingualInput
                  label={isEs ? "Título" : "Title"}
                  required
                  maxLength={100}
                  value={title}
                  onChange={(next) => {
                    setTitle(next);
                    if ((next.en || next.es)?.trim()) {
                      setTitleError(null);
                    }
                  }}
                  placeholder={{
                    en: "Enter chapter title...",
                    es: "Ingresa el título del capítulo...",
                  }}
                />
                {titleError ? (
                  <p
                    role="alert"
                    className="mt-2 flex items-center gap-2 text-xs font-normal text-[var(--color-warn-ink)] animate-in fade-in"
                  >
                    <LuTriangleAlert className="size-[13px] shrink-0 text-[var(--color-warn)]" />
                    <span>{titleError}</span>
                  </p>
                ) : null}
              </div>

              <div id="chapter-field-purpose">
                <BilingualInput
                  label={isEs ? "Para qué sirve" : "What it is for"}
                  required
                  multiline
                  maxLength={500}
                  value={purpose}
                  onChange={(next) => {
                    setPurpose(next);
                    if ((next.en || next.es)?.trim()) {
                      setPurposeError(null);
                    }
                  }}
                  placeholder={{
                    en: "Enter the purpose of this chapter...",
                    es: "Ingresa el propósito de este capítulo...",
                  }}
                />
                {purposeError ? (
                  <p
                    role="alert"
                    className="mt-2 flex items-center gap-2 text-xs font-normal text-[var(--color-warn-ink)] animate-in fade-in"
                  >
                    <LuTriangleAlert className="size-[13px] shrink-0 text-[var(--color-warn)]" />
                    <span>{purposeError}</span>
                  </p>
                ) : null}
              </div>
            </div>
          </FormSection>

          {/* Section 2: Content Blocks */}
          <FormSection
            id="chapter-content"
            icon={LuLayoutGrid}
            title={isEs ? "Contenido" : "Content"}
            subtitle={
              isEs
                ? "Los pasos, fotos y notas que sigue el empleado."
                : "What the employee reads, watches and does."
            }
            headerAction={
              <span className="inline-flex items-center rounded-full border border-[var(--color-line-2)] bg-[var(--color-wash)] px-3 py-1 text-xs font-semibold text-[var(--color-ink-2)]">
                {blocks.length} {blocks.length === 1 ? "block" : "blocks"}
              </span>
            }
          >
            <NotionBlockList
              blocks={blocks}
              onChange={setBlocks}
              allowLinkProcedure={true}
            />
          </FormSection>
        </div>
      )}

      {/* STEP 2: QUIZ */}
      {step === "quiz" && (
        <FormSection
          id="chapter-quiz"
          icon={LuSparkles}
          title={isEs ? "Evaluación de conocimientos" : "Knowledge check"}
          subtitle={
            isEs
              ? "Agrega preguntas de opción múltiple para validar la comprensión de este capítulo."
              : "Add multiple choice questions to validate comprehension for this chapter."
          }
        >
          {/* Linked procedures with existing quiz banner */}
          <ChapterLinkedQuizBanner
            availableLinkedQuestions={availableLinkedQuestions}
            quiz={quiz}
            isEs={isEs}
          />

          {quizError && (
            <div
              role="alert"
              className="rounded-xl border border-[var(--color-bad)]/30 bg-[var(--color-bad-tint)] p-4 mb-6 flex items-start gap-3 text-sm font-medium text-[var(--color-bad)] animate-in fade-in"
            >
              <LuTriangleAlert className="size-5 shrink-0 text-[var(--color-bad)] mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">
                  {isEs
                    ? "Error de validación en el cuestionario"
                    : "Quiz validation error"}
                </p>
                <p className="text-xs text-[var(--color-bad)]">{quizError}</p>
              </div>
            </div>
          )}

          <QuizEditor
            value={quiz}
            hideHeader
            hideAttachToggle
            showPassingScore={true}
            onChange={(next) => {
              setQuiz(next);
              if (quizError) setQuizError(null);
            }}
          />
        </FormSection>
      )}

      {/* Floating Preview button — single button hovering above footer, exactly like in procedure editor */}
      <div className="pointer-events-none fixed bottom-[68px] right-4 z-30 sm:bottom-[76px] sm:right-8">
        <Button
          type="button"
          variant="surface"
          icon={LuEye}
          onClick={handleOpenPreview}
          className="pointer-events-auto shadow-e2 text-xs font-semibold bg-white hover:bg-[var(--color-panel)] dark:bg-[var(--color-surface)] border border-[var(--color-line-2)]"
        >
          {isEs ? "Vista previa" : "Preview"}
        </Button>
      </div>

      {/* Sticky wizard footer bar like in procedure editor */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-between gap-2 border-t border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-3 shadow-e2 sm:px-8 sm:py-3">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          className="px-3 sm:px-4 text-xs sm:text-sm"
        >
          {isEs ? "Cancelar" : "Cancel"}
        </Button>

        <div className="flex items-center gap-2 sm:gap-3">
          {step === "content" ? (
            <div className="flex items-center gap-2">
              {initialChapter && (
                <Button
                  type="button"
                  variant="surface"
                  icon={LuCheck}
                  disabled={isSaving || !hasTitle || !hasPurpose}
                  onClick={handleSave}
                  className="px-3 sm:px-4 text-xs sm:text-sm"
                >
                  <span className="sm:hidden">
                    {isSaving
                      ? isEs
                        ? "..."
                        : "..."
                      : isEs
                        ? "Guardar"
                        : "Save"}
                  </span>
                  <span className="hidden sm:inline">
                    {isSaving
                      ? isEs
                        ? "Guardando..."
                        : "Saving..."
                      : isEs
                        ? "Guardar cambios"
                        : "Save changes"}
                  </span>
                </Button>
              )}
              <Button
                type="button"
                variant="primary"
                icon={LuChevronRight}
                disabled={isSaving || !hasTitle || !hasPurpose}
                onClick={handleNext}
                className="px-3 sm:px-4 text-xs sm:text-sm"
              >
                {isEs ? "Siguiente" : "Next"}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                type="button"
                variant="surface"
                icon={LuArrowLeft}
                disabled={isSaving}
                onClick={() => setStep("content")}
                className="px-3 sm:px-4 text-xs sm:text-sm"
              >
                {isEs ? "Anterior" : "Back"}
              </Button>
              <Button
                type="button"
                variant="primary"
                icon={LuCheck}
                disabled={isSaving}
                onClick={handleSave}
                className="px-3 sm:px-4 text-xs sm:text-sm"
              >
                <span className="sm:hidden">
                  {isSaving
                    ? isEs
                      ? "..."
                      : "..."
                    : isEs
                      ? "Guardar"
                      : "Save"}
                </span>
                <span className="hidden sm:inline">
                  {isSaving
                    ? isEs
                      ? "Guardando..."
                      : "Saving..."
                    : isEs
                      ? "Guardar cambios"
                      : "Save changes"}
                </span>
              </Button>
            </div>
          )}
        </div>
      </footer>

      {/* PREVIEW DRAWER */}
      <ChapterPreviewDrawer
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        isEs={isEs}
        courseName={courseName}
        chapterNumber={chapterNumber}
        title={title}
        purpose={purpose}
        blocks={blocks}
        linkedProceduresMap={linkedProceduresMap}
        quiz={quiz}
      />
    </div>
  );
}
