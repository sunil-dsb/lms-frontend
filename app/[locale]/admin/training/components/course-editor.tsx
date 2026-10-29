"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Procedure, ProcedureBlock, ProcedureQuiz } from "@/lib/types";
import {
  registerCourseChapters,
  type ChapterDefinition,
} from "@/lib/course-chapters-data";
import { useSaveCourse, useUpdateCourse } from "@/services/courses/hooks";
import {
  useReorderChapters,
  useDeleteChapter,
} from "@/services/chapters/hooks";
import { isUuid } from "@/services/courses/api";
import type { BilingualValue } from "@/components/ui/bilingual-input";
import { ChapterContentEditor } from "./chapter-content-editor";
import { CourseDetailsStep } from "./course-details-step";
import { CourseChaptersStep } from "./course-chapters-step";

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
  const updateCourseMutation = useUpdateCourse();
  const reorderChaptersMutation = useReorderChapters();
  const deleteChapterMutation = useDeleteChapter();

  // In edit mode (or when courseId/initialCourse is provided), ALWAYS start in chapters view
  const [step, setStep] = React.useState<
    "details" | "chapters" | "chapter-editor"
  >(isEditMode ? "chapters" : "details");
  const [editingChapter, setEditingChapter] =
    React.useState<EditorChapter | null>(null);
  const [isDirty, setIsDirty] = React.useState(false);

  const isSavingChapterMutationRef = React.useRef(false);

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

  // Sync initialCourse into bilingual states when reloaded
  React.useEffect(() => {
    if (initialCourse) {
      if (initialCourse.titleEn || initialCourse.titleEs) {
        setCourseTitle({
          en: initialCourse.titleEn || initialCourse.titleEs || "",
          es: initialCourse.titleEs || initialCourse.titleEn || "",
        });
      }
      if (initialCourse.purposeEn || initialCourse.purposeEs) {
        setCoursePurpose({
          en: initialCourse.purposeEn || initialCourse.purposeEs || "",
          es: initialCourse.purposeEs || initialCourse.purposeEn || "",
        });
      }
    }
  }, [
    initialCourse?.titleEn,
    initialCourse?.titleEs,
    initialCourse?.purposeEn,
    initialCourse?.purposeEs,
  ]);

  // Sync initialChapters into state when refreshed from server
  React.useEffect(() => {
    if (initialChapters && initialChapters.length > 0 && !isDirty) {
      setChapters(initialChapters);
    }
  }, [initialChapters, isDirty]);

  const [fetchedProcedures, setFetchedProcedures] = React.useState<
    Record<string, Procedure>
  >({});

  // Merge availableSops and fetched procedures into a lookup map
  const proceduresMap = React.useMemo(() => {
    const map = new Map<string, Procedure>();
    (availableSops || []).forEach((p) => {
      if (p.id) map.set(p.id, p);
      if (p.slug) map.set(p.slug, p);
    });
    Object.values(fetchedProcedures).forEach((p) => {
      if (p.id) map.set(p.id, p);
      if (p.slug) map.set(p.slug, p);
    });
    return map;
  }, [availableSops, fetchedProcedures]);

  const fetchedIdsRef = React.useRef<Set<string>>(new Set());

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
      (id) => id && !proceduresMap.has(id) && !fetchedIdsRef.current.has(id),
    );
    if (missingIds.length === 0) return;

    for (const id of missingIds) {
      fetchedIdsRef.current.add(id);
    }

    let isMounted = true;
    for (const id of missingIds) {
      import("@/services/library/api")
        .then(({ fetchProcedureById }) => fetchProcedureById(id, true))
        .then((proc) => {
          if (isMounted && proc) {
            setFetchedProcedures((prev) => ({
              ...prev,
              [id]: proc,
              ...(proc.id ? { [proc.id]: proc } : {}),
              ...(proc.slug ? { [proc.slug]: proc } : {}),
            }));
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [chapters, proceduresMap]);

  const handleMoveChapter = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= chapters.length) return;

    const copy = [...chapters];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);

    // Update local state immediately for instant feedback
    setChapters(copy);

    const effectiveId = courseId || initialCourse?.id;
    if (effectiveId && isUuid(effectiveId)) {
      try {
        const orders = copy.map((ch, idx) => ({
          id: ch.id,
          number: idx + 1,
        }));
        await reorderChaptersMutation.mutateAsync({
          courseId: effectiveId,
          orders,
        });
      } catch (err) {
        console.error("Failed to reorder chapters via API:", err);
        setChapters(chapters);
      }
    } else {
      setIsDirty(true);
    }
  };

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

  const handleSaveDetails = async (
    nextTitle: BilingualValue,
    nextPurpose: BilingualValue,
  ) => {
    const nextTitleEn = nextTitle.en.trim() || nextTitle.es.trim();
    const nextTitleEs = nextTitle.es.trim() || nextTitle.en.trim();
    const nextPurposeEn = nextPurpose.en.trim() || nextPurpose.es.trim();
    const nextPurposeEs = nextPurpose.es.trim() || nextPurpose.en.trim();
    if (!nextTitleEn || !nextPurposeEn) return;

    setCourseTitle({ en: nextTitleEn, es: nextTitleEs });
    setCoursePurpose({ en: nextPurposeEn, es: nextPurposeEs });

    const effectiveId = courseId || initialCourse?.id;

    if (effectiveId && isUuid(effectiveId)) {
      try {
        setIsSaving(true);
        await updateCourseMutation.mutateAsync({
          id: effectiveId,
          input: {
            titleEn: nextTitleEn,
            titleEs: nextTitleEs,
            purposeEn: nextPurposeEn,
            purposeEs: nextPurposeEs,
          },
        });
        setSaveSuccess(true);
        setIsDirty(false);
        setTimeout(() => setSaveSuccess(false), 2500);
      } catch (err) {
        console.error("Failed to update course details via API:", err);
        setError(
          isEs
            ? "Error al actualizar los detalles del curso."
            : "Failed to update course details.",
        );
      } finally {
        setIsSaving(false);
      }
    } else {
      setIsDirty(true);
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
          if (
            typeof window !== "undefined" &&
            window.location.pathname.includes("/admin/training/new")
          ) {
            window.history.replaceState(
              null,
              "",
              `/${locale}/admin/training/${savedCourse.id}/edit`,
            );
          }
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

  // View/preview course in admin course view
  const handlePreviewCourse = async () => {
    const savedId = await handleSaveCourse({ redirectAfter: false });
    const finalId = savedId || courseId;
    if (finalId) {
      router.push(`/${locale}/admin/training/${finalId}`);
    }
  };

  const handleRemoveChapter = async (id: string) => {
    const effectiveId = courseId || initialCourse?.id;
    if (effectiveId && isUuid(effectiveId) && isUuid(id)) {
      try {
        await deleteChapterMutation.mutateAsync({
          id,
          courseId: effectiveId,
        });
        setChapters((prev) => prev.filter((c) => c.id !== id));
      } catch (err) {
        console.error("Failed to delete chapter via API:", err);
        setChapters((prev) => prev.filter((c) => c.id !== id));
      }
    } else {
      setChapters((prev) => prev.filter((c) => c.id !== id));
      setIsDirty(true);
    }
  };

  /* =========================================================================
     STEP 1: DETAILS ONLY (Course Name & Purpose required, nothing else)
     ========================================================================= */
  if (step === "details" && !isEditMode) {
    return (
      <CourseDetailsStep
        locale={locale}
        isEs={isEs}
        courseTitle={courseTitle}
        setCourseTitle={setCourseTitle}
        coursePurpose={coursePurpose}
        setCoursePurpose={setCoursePurpose}
        error={error}
        setError={setError}
        onProceed={handleProceedToAddChapter}
      />
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
          const exists = chapters.some((c) => c.id === savedChapter.id);
          const next = exists
            ? chapters.map((c) => (c.id === savedChapter.id ? savedChapter : c))
            : [...chapters, savedChapter];

          setChapters(next);
          setIsDirty(false);
          setEditingChapter(null);
          setStep("chapters");

          if (isSavingChapterMutationRef.current) return;
          isSavingChapterMutationRef.current = true;

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

          // Persist to backend so user does NOT have to save again (run once outside state setter)
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

                // If currently on /admin/training/new, update URL to this course's edit page
                if (
                  typeof window !== "undefined" &&
                  window.location.pathname.includes("/admin/training/new")
                ) {
                  window.history.replaceState(
                    null,
                    "",
                    `/${locale}/admin/training/${savedCourse.id}/edit`,
                  );
                }
              }
            })
            .catch((err) => {
              console.error(
                "Failed to auto-save course after chapter edit:",
                err,
              );
            })
            .finally(() => {
              isSavingChapterMutationRef.current = false;
            });
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
    <CourseChaptersStep
      locale={locale}
      isEs={isEs}
      courseId={courseId}
      propCourseId={propCourseId}
      initialCourseId={initialCourse?.id}
      courseTitle={courseTitle}
      coursePurpose={coursePurpose}
      chapters={chapters}
      proceduresMap={proceduresMap}
      fetchedProcedures={fetchedProcedures}
      isDirty={isDirty}
      isSaving={isSaving}
      saveSuccess={saveSuccess}
      isReordering={reorderChaptersMutation.isPending}
      isDeleting={deleteChapterMutation.isPending}
      onSaveDetails={handleSaveDetails}
      handlePreviewCourse={handlePreviewCourse}
      handleSaveCourse={handleSaveCourse}
      handleMoveChapter={handleMoveChapter}
      handleRemoveChapter={handleRemoveChapter}
      onAddChapter={() => {
        setEditingChapter(null);
        setStep("chapter-editor");
      }}
      onSelectChapter={(ch) => {
        setEditingChapter(ch);
        setStep("chapter-editor");
      }}
    />
  );
}
