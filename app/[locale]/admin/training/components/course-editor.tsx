"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LuBookOpen,
  LuCheck,
  LuChevronDown,
  LuChevronUp,
  LuEye,
  LuFileText,
  LuPencil,
  LuPlus,
  LuSparkles,
  LuTrash2,
} from "react-icons/lu";
import { Button } from "@/components/ui/button";
import type { Procedure, ProcedureBlock, ProcedureQuiz } from "@/lib/types";
import {
  getChapterDefinitions,
  registerCourseChapters,
  type ChapterDefinition,
} from "@/lib/course-chapters-data";
import { useProcedures } from "@/services/library/hooks";
import { useSaveCourse } from "@/services/courses/hooks";
import { ChapterContentEditor } from "./chapter-content-editor";
import {
  BilingualInput,
  type BilingualValue,
} from "@/components/ui/bilingual-input";

export interface EditorChapter {
  id: string;
  title: string;
  subtitle?: string;
  procedureId?: string;
  procedureSlug?: string;
  quizId?: string;
  blocks?: ProcedureBlock[];
  quiz?: ProcedureQuiz | null;
}

interface CourseEditorProps {
  locale: string;
  courseId?: string;
  initialCourse?: Procedure | null;
  initialChapters?: EditorChapter[];
  availableSops?: Procedure[];
  mode?: "new" | "edit";
}

export function CourseEditor({
  locale,
  courseId: propCourseId,
  initialCourse,
  initialChapters = [],
  availableSops = [],
  mode,
}: CourseEditorProps): React.ReactElement {
  const router = useRouter();
  const isEs = locale === "es";

  const isEditMode = mode === "edit" || Boolean(propCourseId || initialCourse);
  const effectiveInitialId = propCourseId || initialCourse?.id;
  const saveCourseMutation = useSaveCourse();

  // In edit mode (or when courseId/initialCourse is provided), ALWAYS start in chapters view
  const [step, setStep] = React.useState<
    "details" | "chapters" | "chapter-editor"
  >(isEditMode ? "chapters" : "details");
  const [editingChapter, setEditingChapter] =
    React.useState<EditorChapter | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [step]);

  const [courseId, setCourseId] = React.useState<string | undefined>(
    effectiveInitialId,
  );

  const [courseTitle, setCourseTitle] = React.useState<BilingualValue>({
    en: initialCourse?.titleEn || initialCourse?.titleEs || "",
    es: initialCourse?.titleEs || initialCourse?.titleEn || "",
  });
  const [coursePurpose, setCoursePurpose] = React.useState<BilingualValue>({
    en: initialCourse?.purposeEn || initialCourse?.purposeEs || "",
    es: initialCourse?.purposeEs || initialCourse?.purposeEn || "",
  });

  const courseName =
    (isEs
      ? courseTitle.es || courseTitle.en
      : courseTitle.en || courseTitle.es) || "";
  const coursePurposeText =
    (isEs
      ? coursePurpose.es || coursePurpose.en
      : coursePurpose.en || coursePurpose.es) || "";

  const [chapters, setChapters] = React.useState<EditorChapter[]>(() => {
    if (initialChapters && initialChapters.length > 0) {
      return initialChapters;
    }
    return [];
  });

  // Fetch real procedures from the backend library for live title resolution
  const { data: apiProceduresData } = useProcedures({}, true);
  const [fetchedProcedures, setFetchedProcedures] = React.useState<
    Record<string, Procedure>
  >({});

  // Merge availableSops, apiProceduresData, and fetched procedures into a fast lookup map
  const proceduresMap = React.useMemo(() => {
    const map = new Map<string, Procedure>();
    (availableSops || []).forEach((p) => {
      if (p.id) map.set(p.id, p);
      if (p.slug) map.set(p.slug, p);
    });
    (apiProceduresData?.procedures || []).forEach((p) => {
      if (p.id) map.set(p.id, p);
      if (p.slug) map.set(p.slug, p);
    });
    Object.values(fetchedProcedures).forEach((p) => {
      if (p.id) map.set(p.id, p);
      if (p.slug) map.set(p.slug, p);
    });
    return map;
  }, [availableSops, apiProceduresData, fetchedProcedures]);

  // Fetch any missing procedure directly from library API if referenced
  React.useEffect(() => {
    const referencedIds = chapters.flatMap((c) => {
      const fromCh = c.procedureId ? [c.procedureId] : [];
      const fromBlocks = (c.blocks ?? [])
        .filter(
          (b): b is Extract<ProcedureBlock, { kind: "linked_procedures" }> =>
            b.kind === "linked_procedures",
        )
        .flatMap((b) => b.procedureIds || []);
      return [...fromCh, ...fromBlocks];
    });

    const missingIds = referencedIds.filter(
      (id) => id && !proceduresMap.has(id) && !fetchedProcedures[id],
    );
    if (missingIds.length === 0) return;

    let isMounted = true;
    for (const id of missingIds) {
      import("@/services/library/api")
        .then(({ fetchProcedureById }) => fetchProcedureById(id, true))
        .then((proc) => {
          if (isMounted && proc) {
            setFetchedProcedures((prev) => ({
              ...prev,
              [id]: proc,
              ...(proc.slug ? { [proc.slug]: proc } : {}),
            }));
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [chapters, proceduresMap, fetchedProcedures]);

  const handleMoveChapter = (index: number, direction: "up" | "down") => {
    setChapters((prev) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, moved);
      return copy;
    });
    setIsDirty(true);
  };

  const [isDirty, setIsDirty] = React.useState(false);
  const [isEditingDetails, setIsEditingDetails] = React.useState(false);
  const [editTitleDraft, setEditTitleDraft] =
    React.useState<BilingualValue>(courseTitle);
  const [editPurposeDraft, setEditPurposeDraft] =
    React.useState<BilingualValue>(coursePurpose);

  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Transition from Step 1 (Details) to Chapter Content Creation
  const handleProceedToAddChapter = () => {
    const hasTitle = Boolean(courseTitle.en.trim() || courseTitle.es.trim());
    const hasPurpose = Boolean(
      coursePurpose.en.trim() || coursePurpose.es.trim(),
    );
    if (!hasTitle || !hasPurpose) {
      setError(
        isEs
          ? "El nombre y el propósito son obligatorios."
          : "Course name and purpose are both required.",
      );
      return;
    }
    setError(null);
    setEditingChapter(null);
    setStep("chapter-editor");
  };

  // Open inline edit for details
  const handleOpenEditDetails = () => {
    setEditTitleDraft({ ...courseTitle });
    setEditPurposeDraft({ ...coursePurpose });
    setIsEditingDetails(true);
  };

  const handleSaveDetailsEdit = async () => {
    const nextTitleEn = editTitleDraft.en.trim() || editTitleDraft.es.trim();
    const nextTitleEs = editTitleDraft.es.trim() || editTitleDraft.en.trim();
    const nextPurposeEn =
      editPurposeDraft.en.trim() || editPurposeDraft.es.trim();
    const nextPurposeEs =
      editPurposeDraft.es.trim() || editPurposeDraft.en.trim();
    if (!nextTitleEn || !nextPurposeEn) return;

    setCourseTitle({ en: nextTitleEn, es: nextTitleEs });
    setCoursePurpose({ en: nextPurposeEn, es: nextPurposeEs });
    setIsEditingDetails(false);

    const effectiveId =
      courseId ||
      initialCourse?.id ||
      `course-${
        nextTitleEn
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || Date.now()
      }`;

    // Persist to backend in background
    try {
      setIsSaving(true);
      const savedCourse = await saveCourseMutation.mutateAsync({
        id: effectiveId,
        titleEn: nextTitleEn,
        titleEs: nextTitleEs,
        purposeEn: nextPurposeEn,
        purposeEs: nextPurposeEs,
        chapters,
      });
      if (savedCourse?.id) {
        setCourseId(savedCourse.id);
        setSaveSuccess(true);
        setIsDirty(false);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (err) {
      console.error("Failed to save course details:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Save the entire course (persisting to server)
  const handleSaveCourse = async (options?: {
    redirectAfter?: boolean;
  }): Promise<string | null> => {
    const effectiveTitleEn = courseTitle.en.trim() || courseTitle.es.trim();
    const effectiveTitleEs = courseTitle.es.trim() || courseTitle.en.trim();
    const effectivePurposeEn =
      coursePurpose.en.trim() || coursePurpose.es.trim();
    const effectivePurposeEs =
      coursePurpose.es.trim() || coursePurpose.en.trim();
    if (!effectiveTitleEn || !effectivePurposeEn) return null;

    setIsSaving(true);
    setError(null);

    const effectiveId =
      courseId ||
      initialCourse?.id ||
      `course-${
        effectiveTitleEn
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || Date.now()
      }`;

    try {
      const linkedSops = Array.from(
        new Set(
          chapters
            .flatMap((c) => {
              const fromCh = c.procedureId ? [c.procedureId] : [];
              const fromBlocks = (c.blocks ?? [])
                .filter(
                  (
                    b,
                  ): b is Extract<
                    ProcedureBlock,
                    { kind: "linked_procedures" }
                  > => b.kind === "linked_procedures",
                )
                .flatMap((b) => b.procedureIds);
              return [...fromCh, ...fromBlocks];
            })
            .filter((id): id is string => Boolean(id)),
        ),
      );

      // Persist to backend & course chapters registry
      const savedCourse = await saveCourseMutation.mutateAsync({
        id: effectiveId,
        titleEn: effectiveTitleEn,
        titleEs: effectiveTitleEs,
        purposeEn: effectivePurposeEn,
        purposeEs: effectivePurposeEs,
        linkedSops,
        chapters,
      });

      if (savedCourse?.id) {
        setCourseId(savedCourse.id);
        if (chapters.length > 0) {
          const chapterDefs: ChapterDefinition[] = chapters.map((ch, idx) => ({
            id: ch.id || `${savedCourse.id}-ch-${idx + 1}`,
            number: idx + 1,
            titleEn: ch.title,
            titleEs: ch.title,
            contentEn: ch.subtitle || "",
            contentEs: ch.subtitle || "",
            blocks: ch.blocks ?? [],
            procedureSlug: ch.procedureSlug,
            procedureId: ch.procedureId,
            quizId: ch.quizId,
            quiz: ch.quiz as any,
            minCorrectAnswers: (ch.quiz as any)?.minCorrectAnswers ?? null,
          }));
          registerCourseChapters(savedCourse.id, chapterDefs);
        }

        setSaveSuccess(true);
        setIsDirty(false);
        if (options?.redirectAfter !== false) {
          const redirectTargetId = savedCourse.id || effectiveId;
          setTimeout(() => {
            router.push(`/${locale}/admin/training/${redirectTargetId}`);
          }, 600);
        } else {
          setTimeout(() => setSaveSuccess(false), 3000);
        }
        return savedCourse.id;
      }
      return effectiveId;
    } catch (err) {
      console.error("Failed to save course:", err);
      setError(
        isEs ? "Error al guardar el curso." : "Failed to save the course.",
      );
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Preview full course as employee in a new tab without redirecting
  const handlePreviewCourse = async () => {
    const savedId = await handleSaveCourse({ redirectAfter: false });
    const finalId = savedId || courseId;
    if (finalId) {
      window.open(`/${locale}/employee/training/${finalId}`, "_blank");
    }
  };

  const handleRemoveChapter = (id: string) => {
    setChapters((prev) => {
      const next = prev.filter((c) => c.id !== id);
      return next;
    });
    setIsDirty(true);
  };

  /* =========================================================================
     STEP 1: DETAILS ONLY (Course Name & Purpose required, nothing else)
     ========================================================================= */
  if (step === "details" && !isEditMode) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 pb-16 animate-in fade-in duration-200">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb">
          <Link
            href={`/${locale}/admin/training`}
            className="text-sm font-medium text-[var(--color-ink-2)] hover:text-[var(--color-ink)] transition-colors"
          >
            Training / Courses
          </Link>
        </nav>

        <div>
          <h1 className="font-[family-name:var(--font-ui)] text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-ink)]">
            {isEs ? "Nuevo curso" : "New course"}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-ink-2)]">
            {isEs
              ? "Ponle un nombre y un propósito. Agregas capítulos en la siguiente pantalla."
              : "Give it a name and purpose. You add chapters on the next screen."}
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </div>
        )}

        {/* Input Card */}
        <div className="rounded-2xl border border-[var(--color-line-2)] bg-[var(--color-surface)] p-6 sm:p-8 shadow-xs space-y-6">
          {/* Field 1: Course Name */}
          <BilingualInput
            label={isEs ? "Nombre del curso" : "Course name"}
            value={courseTitle}
            onChange={(val) => {
              setCourseTitle(val);
              if (error) setError(null);
            }}
            defaultLang={isEs ? "es" : "en"}
            required
            placeholder={{
              en: "e.g. Tacos al Pastor",
              es: "ej. Tacos al Pastor",
            }}
          />

          {/* Field 2: Purpose */}
          <BilingualInput
            label={isEs ? "Propósito" : "Purpose"}
            value={coursePurpose}
            onChange={(val) => {
              setCoursePurpose(val);
              if (error) setError(null);
            }}
            defaultLang={isEs ? "es" : "en"}
            multiline
            required
            placeholder={{
              en: "How we make tacos al pastor, from marinade to plating.",
              es: "Cómo preparamos tacos al pastor, desde el marinado hasta el emplatado.",
            }}
          />

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href={`/${locale}/admin/training`}>
              <Button type="button" variant="ghost">
                {isEs ? "Cancelar" : "Cancel"}
              </Button>
            </Link>
            <Button
              type="button"
              variant="primary"
              disabled={
                !(courseTitle.en.trim() || courseTitle.es.trim()) ||
                !(coursePurpose.en.trim() || coursePurpose.es.trim())
              }
              onClick={handleProceedToAddChapter}
            >
              {isEs ? "Agregar capítulo" : "Add chapter"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================================
     CHAPTER EDITOR VIEW (Procedure content creation wizard view)
     ========================================================================= */
  if (step === "chapter-editor") {
    const chapterNum = editingChapter
      ? chapters.findIndex((c) => c.id === editingChapter.id) + 1 || 1
      : chapters.length + 1;

    return (
      <ChapterContentEditor
        locale={locale}
        courseName={courseName}
        chapterNumber={chapterNum}
        initialChapter={editingChapter}
        onSave={(savedChapter) => {
          setChapters((prev) => {
            const exists = prev.some((c) => c.id === savedChapter.id);
            const next = exists
              ? prev.map((c) => (c.id === savedChapter.id ? savedChapter : c))
              : [...prev, savedChapter];

            const effectiveTitleEn =
              courseTitle.en.trim() || courseTitle.es.trim();
            const effectiveTitleEs =
              courseTitle.es.trim() || courseTitle.en.trim();
            const effectivePurposeEn =
              coursePurpose.en.trim() || coursePurpose.es.trim();
            const effectivePurposeEs =
              coursePurpose.es.trim() || coursePurpose.en.trim();

            const effectiveId =
              courseId ||
              initialCourse?.id ||
              propCourseId ||
              `course-${
                effectiveTitleEn
                  .toLowerCase()
                  .trim()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-|-$/g, "") || Date.now()
              }`;

            // Persist to backend so user does NOT have to save again
            saveCourseMutation
              .mutateAsync({
                id: effectiveId,
                titleEn: effectiveTitleEn,
                titleEs: effectiveTitleEs,
                purposeEn: effectivePurposeEn,
                purposeEs: effectivePurposeEs,
                chapters: next,
              })
              .then((savedCourse) => {
                if (savedCourse?.id) {
                  setCourseId(savedCourse.id);
                  setSaveSuccess(true);
                  setTimeout(() => setSaveSuccess(false), 2500);
                }
              })
              .catch((err) => {
                console.error(
                  "Failed to auto-save course after chapter edit:",
                  err,
                );
              });

            return next;
          });
          setIsDirty(false);
          setEditingChapter(null);
          setStep("chapters");
        }}
        onCancel={() => {
          setEditingChapter(null);
          if (!isEditMode && chapters.length === 0) {
            setStep("details");
          } else {
            setStep("chapters");
          }
        }}
      />
    );
  }

  /* =========================================================================
     STEP 2: CHAPTERS VIEW (Matching Screenshot 2 - No draft/publish buttons)
     ========================================================================= */
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-xs sm:text-sm font-medium text-[var(--color-ink-2)]"
      >
        <Link
          href={`/${locale}/admin/training`}
          className="hover:text-[var(--color-ink)] transition-colors"
        >
          {isEs ? "Capacitación" : "Training"}
        </Link>
        {(courseId || propCourseId || initialCourse?.id) && (
          <>
            <span className="text-[var(--color-ink-3)] font-normal">/</span>
            <Link
              href={`/${locale}/admin/training/${courseId || propCourseId || initialCourse?.id}`}
              className="hover:text-[var(--color-ink)] transition-colors max-w-[220px] truncate"
            >
              {courseName || (isEs ? "Curso" : "Course")}
            </Link>
          </>
        )}
        <span className="text-[var(--color-ink-3)] font-normal">/</span>
        <span className="text-[var(--color-ink)] font-semibold">
          {isEs ? "Editar" : "Edit"}
        </span>
      </nav>

      {/* Course Header Banner */}
      {isEditingDetails ? (
        <div className="rounded-2xl border border-[var(--color-line-2)] bg-[var(--color-surface)] p-5 sm:p-6 shadow-xs space-y-5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--color-line-2)]">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-[var(--color-brand-600)]/10 text-[var(--color-brand-600)]">
                <LuFileText className="size-4" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-[var(--color-ink)]">
                  {isEs ? "Detalles del curso" : "Course details"}
                </h3>
                <p className="text-xs text-[var(--color-ink-2)]">
                  {isEs
                    ? "Modifica el título y propósito del curso"
                    : "Update course title and purpose"}
                </p>
              </div>
            </div>
          </div>

          {/* Field 1: Course Name */}
          <BilingualInput
            label={isEs ? "Nombre del curso *" : "Course name *"}
            value={editTitleDraft}
            onChange={setEditTitleDraft}
            defaultLang={isEs ? "es" : "en"}
            required
            placeholder={{
              en: "e.g. Tacos al Pastor",
              es: "ej. Tacos al Pastor",
            }}
          />

          {/* Field 2: Course Purpose */}
          <BilingualInput
            label={isEs ? "Para qué sirve *" : "What it is for *"}
            value={editPurposeDraft}
            onChange={setEditPurposeDraft}
            defaultLang={isEs ? "es" : "en"}
            multiline
            required
            placeholder={{
              en: "Describe the objective and what employees will learn...",
              es: "Describe el objetivo y lo que aprenderán los empleados...",
            }}
          />

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--color-line-2)]">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsEditingDetails(false)}
            >
              {isEs ? "Cancelar" : "Cancel"}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSaveDetailsEdit}
              disabled={
                !(editTitleDraft.en.trim() || editTitleDraft.es.trim()) ||
                !(editPurposeDraft.en.trim() || editPurposeDraft.es.trim()) ||
                isSaving
              }
              className={
                saveSuccess
                  ? "!bg-emerald-600 !text-white !border-emerald-600 hover:!bg-emerald-600 shadow-sm transition-all duration-200 !opacity-100 font-semibold"
                  : isSaving
                    ? "!opacity-90 font-medium"
                    : ""
              }
            >
              {isSaving
                ? isEs
                  ? "Guardando..."
                  : "Saving..."
                : isEs
                  ? "Guardar cambios"
                  : "Save changes"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3.5">
                  <h1 className="font-[family-name:var(--font-ui)] text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-ink)] leading-tight">
                    {courseName ||
                      (isEs ? "Curso sin título" : "Untitled Course")}
                  </h1>
                  {isDirty && (
                    <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 shrink-0 shadow-xs">
                      <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                      {isEs ? "Cambios sin guardar" : "Unsaved changes"}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-sm sm:text-base text-[var(--color-ink-2)] leading-relaxed max-w-2xl">
                  {coursePurposeText ||
                    (isEs ? "Sin propósito asignado" : "No purpose provided")}
                </p>
              </div>
              <Button
                type="button"
                variant="surface"
                size="sm"
                icon={LuPencil}
                onClick={handleOpenEditDetails}
                className="shrink-0 text-xs font-semibold shadow-xs"
              >
                {isEs ? "Editar detalles" : "Edit details"}
              </Button>
            </div>
          </div>

          {/* Top Right Action - Preview & Save */}
          <div className="flex items-center gap-2 self-start shrink-0">
            <Button
              type="button"
              variant="surface"
              icon={LuEye}
              onClick={handlePreviewCourse}
              disabled={isSaving}
            >
              {isEs ? "Vista previa" : "Preview course"}
            </Button>

            {isDirty && (
              <Button
                type="button"
                variant="primary"
                icon={saveSuccess ? LuCheck : undefined}
                onClick={() => handleSaveCourse({ redirectAfter: true })}
                disabled={
                  isSaving || !courseName.trim() || !coursePurposeText.trim()
                }

                className={
                  saveSuccess
                    ? "!bg-emerald-600 !text-white !border-emerald-600 hover:!bg-emerald-600 shadow-sm transition-all duration-200 !opacity-100 font-semibold"
                    : isSaving
                      ? "!opacity-90 font-medium"
                      : ""
                }
              >
                {isSaving
                  ? isEs
                    ? "Guardando..."
                    : "Saving..."
                  : saveSuccess
                    ? isEs
                      ? "Guardado"
                      : "Saved"
                    : isEs
                      ? "Guardar cambios"
                      : "Save changes"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Chapters Container matching Screenshot 2 */}
      <div className="rounded-2xl border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-xs overflow-hidden">
        {/* Card Header */}
        <div className="border-b border-[var(--color-line-2)] px-6 py-4 flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-ui)] text-base font-semibold text-[var(--color-ink)]">
            {isEs ? "Capítulos" : "Chapters"}
          </h2>
          {chapters.length > 0 && (
            <span className="text-xs font-medium text-[var(--color-ink-2)]">
              {chapters.length} {chapters.length === 1 ? "chapter" : "chapters"}
            </span>
          )}
        </div>

        {/* Card Body */}
        {chapters.length === 0 ? (
          /* Empty state matching Screenshot 2 */
          <div className="py-16 px-6 text-center">
            <h3 className="font-[family-name:var(--font-ui)] text-lg font-bold text-[var(--color-ink)]">
              {isEs ? "Aún no hay capítulos" : "No chapters yet"}
            </h3>
            <p className="mt-1 text-sm text-[var(--color-ink-2)]">
              {isEs
                ? "Un capítulo es una lección. Agrega todos los que necesites."
                : "A chapter is one lesson. Add as many as you need."}
            </p>
            <p className="text-sm text-[var(--color-ink-2)]">
              {isEs
                ? "Los empleados los completan en orden."
                : "Employees take them in order."}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setEditingChapter(null);
                  setStep("chapter-editor");
                }}
              >
                {isEs ? "Agregar capítulo +" : "Add chapter +"}
              </Button>
            </div>
          </div>
        ) : (
          /* Populated Chapters List */
          <div>
            <ul className="divide-y divide-[var(--color-line-2)]">
              {chapters.map((ch, idx) => {
                // Extract linked procedures info
                const linkedProcedures: { id: string; title: string }[] = [];
                const seenIds = new Set<string>();

                const resolveProcedureTitle = (id: string, slug?: string) => {
                  const sop =
                    proceduresMap.get(id) ||
                    (slug ? proceduresMap.get(slug) : undefined) ||
                    fetchedProcedures[id];
                  if (sop) {
                    const title = isEs
                      ? sop.titleEs || sop.titleEn
                      : sop.titleEn || sop.titleEs;
                    if (title) return title;
                  }
                  return isEs ? "Procedimiento vinculado" : "Linked procedure";
                };

                if (ch.procedureId) {
                  seenIds.add(ch.procedureId);
                  linkedProcedures.push({
                    id: ch.procedureId,
                    title: resolveProcedureTitle(
                      ch.procedureId,
                      ch.procedureSlug,
                    ),
                  });
                }

                (ch.blocks ?? []).forEach((b) => {
                  if (b.kind === "linked_procedures" && b.procedureIds) {
                    b.procedureIds.forEach((pid) => {
                      if (!seenIds.has(pid)) {
                        seenIds.add(pid);
                        linkedProcedures.push({
                          id: pid,
                          title: resolveProcedureTitle(pid),
                        });
                      }
                    });
                  }
                });

                const quizQuestionsCount = ch.quiz?.questions?.length || 0;
                const contentBlocksCount =
                  ch.blocks?.filter((b) => b.kind !== "linked_procedures")
                    .length ?? 0;

                return (
                  <li
                    key={ch.id}
                    onClick={() => {
                      setEditingChapter(ch);
                      setStep("chapter-editor");
                    }}
                    className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-[var(--color-wash)] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      {/* Chapter index number without pill badge */}
                      <span className="w-5 shrink-0 pt-0.5 text-sm font-semibold text-[var(--color-ink-3)] font-mono select-none">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm text-[var(--color-ink)] group-hover:text-[var(--color-brand-600)] transition-colors truncate">
                            {ch.title}
                          </h4>
                        </div>
                        {ch.subtitle && (
                          <p className="mt-0.5 text-xs text-[var(--color-ink-2)] line-clamp-1">
                            {ch.subtitle}
                          </p>
                        )}

                        {/* Chapter Metadata: linked procedures, quiz, blocks */}
                        <div className="mt-1.5 flex items-center gap-3 text-xs text-[var(--color-ink-3)] flex-wrap">
                          {linkedProcedures.length > 0 && (
                            <span className="inline-flex items-center gap-1.5 font-medium text-[var(--color-brand-600)]">
                              <LuBookOpen className="w-3.5 h-3.5 shrink-0" />
                              {linkedProcedures.length === 1
                                ? linkedProcedures[0].title
                                : `${linkedProcedures.length} ${
                                    isEs
                                      ? "procedimientos vinculados"
                                      : "linked procedures"
                                  }`}
                            </span>
                          )}

                          {quizQuestionsCount > 0 && (
                            <>
                              {linkedProcedures.length > 0 && (
                                <span className="inline-block h-1 w-1 rounded-full bg-[var(--color-line-2)]" />
                              )}
                              <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                                <LuSparkles className="w-3.5 h-3.5 shrink-0" />
                                {quizQuestionsCount}{" "}
                                {quizQuestionsCount === 1
                                  ? isEs
                                    ? "pregunta de quiz"
                                    : "quiz question"
                                  : isEs
                                    ? "preguntas de quiz"
                                    : "quiz questions"}
                              </span>
                            </>
                          )}

                          {contentBlocksCount > 0 && (
                            <>
                              <span className="inline-block h-1 w-1 rounded-full bg-[var(--color-line-2)]" />
                              <span>
                                {contentBlocksCount}{" "}
                                {contentBlocksCount === 1
                                  ? isEs
                                    ? "bloque"
                                    : "block"
                                  : isEs
                                    ? "bloques"
                                    : "blocks"}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveChapter(idx, "up")}
                        title={isEs ? "Subir capítulo" : "Move up"}
                        className="p-1.5 rounded-lg text-[var(--color-ink-3)] hover:text-[var(--color-ink)] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                      >
                        <LuChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === chapters.length - 1}
                        onClick={() => handleMoveChapter(idx, "down")}
                        title={isEs ? "Bajar capítulo" : "Move down"}
                        className="p-1.5 rounded-lg text-[var(--color-ink-3)] hover:text-[var(--color-ink)] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                      >
                        <LuChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveChapter(ch.id)}
                        title={isEs ? "Eliminar capítulo" : "Remove chapter"}
                        className="p-1.5 rounded-lg text-[var(--color-ink-3)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <LuTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Bottom Action Bar inside Card */}
            <div className="border-t border-[var(--color-line-2)] bg-[var(--color-wash)]/40 px-6 py-4 flex items-center justify-start">
              <Button
                type="button"
                size="sm"
                variant="primary"
                icon={LuPlus}
                onClick={() => {
                  setEditingChapter(null);
                  setStep("chapter-editor");
                }}
              >
                {isEs ? "Agregar capítulo" : "Add chapter"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
