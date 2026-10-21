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
  LuPencil,
  LuPlus,
  LuSparkles,
  LuTrash2,
} from "react-icons/lu";
import { Button } from "@/components/ui/button";
import type { Procedure, ProcedureBlock, ProcedureQuiz } from "@/lib/types";
import { listAvailableSops } from "@/lib/mock-training";
import { getChapterDefinitions } from "@/lib/course-chapters-data";
import { useProcedures } from "@/services/library/hooks";
import { saveCourseAction } from "../actions";
import { ChapterContentEditor } from "./chapter-content-editor";

export interface EditorChapter {
  id: string;
  title: string;
  subtitle?: string;
  procedureId?: string;
  procedureSlug?: string;
  blocks?: ProcedureBlock[];
  quiz?: ProcedureQuiz | null;
}

interface CourseEditorProps {
  locale: string;
  courseId?: string;
  initialCourse?: Procedure | null;
  initialChapters?: EditorChapter[];
  availableSops?: Procedure[];
}

export function CourseEditor({
  locale,
  courseId: propCourseId,
  initialCourse,
  initialChapters = [],
  availableSops = [],
}: CourseEditorProps): React.ReactElement {
  const router = useRouter();
  const isEs = locale === "es";

  const effectiveInitialId = propCourseId || initialCourse?.id;

  // If courseId or initialCourse provided, start directly in chapters view
  const [step, setStep] = React.useState<
    "details" | "chapters" | "chapter-editor"
  >(effectiveInitialId || initialCourse ? "chapters" : "details");
  const [editingChapter, setEditingChapter] =
    React.useState<EditorChapter | null>(null);

  const [courseId, setCourseId] = React.useState<string | undefined>(
    effectiveInitialId,
  );

  const initialName =
    (isEs
      ? initialCourse?.titleEs || initialCourse?.titleEn
      : initialCourse?.titleEn || initialCourse?.titleEs) || "";
  const initialPurpose =
    (isEs
      ? initialCourse?.purposeEs || initialCourse?.purposeEn
      : initialCourse?.purposeEn || initialCourse?.purposeEs) || "";

  const [courseName, setCourseName] = React.useState(initialName);
  const [coursePurpose, setCoursePurpose] = React.useState(initialPurpose);

  const [chapters, setChapters] = React.useState<EditorChapter[]>(() => {
    if (initialChapters && initialChapters.length > 0) {
      return initialChapters;
    }
    const targetId = effectiveInitialId;
    if (targetId) {
      const defs =
        getChapterDefinitions(targetId) ||
        getChapterDefinitions(targetId.replace(/^course-/, "")) ||
        getChapterDefinitions(`course-${targetId}`);
      if (defs && defs.length > 0) {
        return defs.map((d) => ({
          id: d.id,
          title: isEs ? d.titleEs || d.titleEn : d.titleEn || d.titleEs,
          subtitle: isEs
            ? d.contentEs || d.contentEn
            : d.contentEn || d.contentEs,
          procedureSlug: d.procedureSlug,
          blocks: d.blocks,
        }));
      }
    }
    if (!initialCourse?.linkedSops?.length) return [];
    return initialCourse.linkedSops.map((sopId, idx) => {
      const sop = availableSops.find((s) => s.id === sopId);
      return {
        id: `sop-${sopId}-${idx}`,
        title: sop
          ? isEs
            ? sop.titleEs || sop.titleEn
            : sop.titleEn || sop.titleEs
          : `Procedure ${idx + 1}`,
        subtitle: sop
          ? isEs
            ? sop.purposeEs || sop.purposeEn
            : sop.purposeEn || sop.purposeEs
          : "",
        procedureId: sopId,
        procedureSlug: sop?.slug,
      };
    });
  });

  const LOCAL_STORAGE_KEY = "lms_created_courses";

  // Fetch real procedures from the backend library for live title resolution
  const { data: apiProceduresData } = useProcedures({}, true);
  const [fetchedProcedures, setFetchedProcedures] = React.useState<
    Record<string, Procedure>
  >({});

  // Merge availableSops, apiProceduresData, and mock sops into a fast lookup map
  const proceduresMap = React.useMemo(() => {
    const map = new Map<string, Procedure>();
    listAvailableSops().forEach((p) => {
      if (p.id) map.set(p.id, p);
      if (p.slug) map.set(p.slug, p);
    });
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

  // Hydrate custom course details and chapters from localStorage or registered course definitions
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const targetId = courseId || propCourseId || initialCourse?.id;
      if (!targetId) return;

      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const customMap = JSON.parse(raw);
        const decodedId = decodeURIComponent(targetId);
        const norm = (s: string) =>
          s
            .toLowerCase()
            .replace(/^course-/, "")
            .replace(/[^a-z0-9]/g, "");
        const targetNorm = norm(decodedId);

        let saved: any =
          customMap[targetId] ||
          customMap[decodedId] ||
          customMap[`course-${targetId}`] ||
          customMap[targetId.replace(/^course-/, "")];

        if (!saved) {
          saved = Object.values(customMap).find((c: any) => {
            if (!c) return false;
            if (c.id && norm(c.id) === targetNorm) return true;
            if (c.name && norm(c.name) === targetNorm) return true;
            return false;
          });
        }

        if (saved) {
          if (saved.id) setCourseId(saved.id);
          if (saved.name) {
            setCourseName(saved.name);
            setEditNameDraft(saved.name);
          }
          if (saved.purpose) {
            setCoursePurpose(saved.purpose);
            setEditPurposeDraft(saved.purpose);
          }
          if (Array.isArray(saved.chapters) && saved.chapters.length > 0) {
            setChapters(saved.chapters);
          }
          setStep("chapters");
          return;
        }
      }

      // If not in localStorage, check if chapters exist in registered course definitions
      const defs =
        getChapterDefinitions(targetId) ||
        getChapterDefinitions(targetId.replace(/^course-/, ""));
      if (defs && defs.length > 0) {
        const editorChs: EditorChapter[] = defs.map((d) => ({
          id: d.id,
          title: isEs ? d.titleEs || d.titleEn : d.titleEn || d.titleEs,
          subtitle: isEs
            ? d.contentEs || d.contentEn
            : d.contentEn || d.contentEs,
          procedureSlug: d.procedureSlug,
          blocks: d.blocks,
        }));
        setChapters(editorChs);
        setStep("chapters");
      }
    } catch (e) {
      console.warn(
        "Failed to load course details from localStorage/registry:",
        e,
      );
    }
  }, [courseId, propCourseId, initialCourse, isEs]);

  const handleMoveChapter = (index: number, direction: "up" | "down") => {
    setChapters((prev) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const [moved] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, moved);
      return copy;
    });
  };

  const [isEditingDetails, setIsEditingDetails] = React.useState(false);
  const [editNameDraft, setEditNameDraft] = React.useState(initialName);
  const [editPurposeDraft, setEditPurposeDraft] =
    React.useState(initialPurpose);

  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Transition from Step 1 (Details) to Step 2 (Chapters)
  // Transition from Step 1 (Details) to Chapter Content Creation
  const handleProceedToAddChapter = () => {
    if (!courseName.trim() || !coursePurpose.trim()) {
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
    setEditNameDraft(courseName);
    setEditPurposeDraft(coursePurpose);
    setIsEditingDetails(true);
  };

  const handleSaveDetailsEdit = () => {
    if (!editNameDraft.trim() || !editPurposeDraft.trim()) return;
    setCourseName(editNameDraft.trim());
    setCoursePurpose(editPurposeDraft.trim());
    setIsEditingDetails(false);
  };

  // Save the entire course (persisting to localStorage and server)
  const handleSaveCourse = async (options?: {
    redirectAfter?: boolean;
  }): Promise<string | null> => {
    if (!courseName.trim() || !coursePurpose.trim()) return null;
    setIsSaving(true);
    setError(null);

    const effectiveId =
      courseId ||
      initialCourse?.id ||
      `course-${
        courseName
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

      // 1. Immediately persist to client localStorage
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem(LOCAL_STORAGE_KEY) || "{}";
          const map = JSON.parse(raw);
          map[effectiveId] = {
            id: effectiveId,
            name: courseName.trim(),
            purpose: coursePurpose.trim(),
            linkedSops,
            chapters,
            updatedAt: new Date().toISOString(),
          };
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(map));
        } catch (e) {
          console.warn("Failed to save course to localStorage:", e);
        }
      }

      // 2. Persist to server mock & course chapters registry
      const res = await saveCourseAction({
        id: effectiveId,
        name: courseName.trim(),
        purpose: coursePurpose.trim(),
        linkedSops,
        chapters,
        locale,
      });

      if (res.ok && res.course) {
        setCourseId(res.course.id);
        setSaveSuccess(true);
        if (options?.redirectAfter !== false) {
          const redirectTargetId = res.course.id || effectiveId;
          setTimeout(() => {
            router.push(`/${locale}/admin/training/${redirectTargetId}`);
          }, 600);
        } else {
          setTimeout(() => setSaveSuccess(false), 3000);
        }
        return res.course.id;
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
    setChapters((prev) => prev.filter((c) => c.id !== id));
  };

  /* =========================================================================
     STEP 1: DETAILS ONLY (Course Name & Purpose required, nothing else)
     ========================================================================= */
  if (step === "details") {
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
          <div className="space-y-1.5">
            <label
              htmlFor="step1-course-name"
              className="block text-sm font-semibold text-[var(--color-ink)]"
            >
              {isEs ? "Nombre del curso" : "Course name"}
            </label>
            <input
              id="step1-course-name"
              type="text"
              value={courseName}
              onChange={(e) => {
                setCourseName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Tacos al Pastor"
              autoFocus
              required
              className="w-full rounded-xl border border-[var(--color-line-2)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-brand-600)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-600)] transition-colors"
            />
          </div>

          {/* Field 2: Purpose */}
          <div className="space-y-1.5">
            <label
              htmlFor="step1-course-purpose"
              className="block text-sm font-semibold text-[var(--color-ink)]"
            >
              {isEs ? "Propósito" : "Purpose"}
            </label>
            <textarea
              id="step1-course-purpose"
              value={coursePurpose}
              onChange={(e) => {
                setCoursePurpose(e.target.value);
                if (error) setError(null);
              }}
              placeholder="How we make tacos al pastor, from marinade to plating."
              rows={3}
              required
              className="w-full rounded-xl border border-[var(--color-line-2)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-brand-600)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-600)] transition-colors resize-none min-h-[96px]"
            />
          </div>

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
              disabled={!courseName.trim() || !coursePurpose.trim()}
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
            if (exists) {
              return prev.map((c) =>
                c.id === savedChapter.id ? savedChapter : c,
              );
            }
            return [...prev, savedChapter];
          });
          setEditingChapter(null);
          setStep("chapters");
        }}
        onCancel={() => {
          setEditingChapter(null);
          if (chapters.length === 0) {
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
    <div className="mx-auto max-w-4xl space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Breadcrumbs */}
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[var(--color-ink-2)]"
      >
        <Link
          href={`/${locale}/admin/training`}
          className="hover:text-[var(--color-ink)] transition-colors inline-block"
        >
          {isEs ? "Capacitación" : "Training"}
        </Link>
        {(courseId || propCourseId || initialCourse?.id) && (
          <>
            <span>/</span>
            <Link
              href={`/${locale}/admin/training/${courseId || propCourseId || initialCourse?.id}`}
              className="hover:text-[var(--color-ink)] transition-colors inline-block max-w-[200px] truncate"
            >
              {courseName || (isEs ? "Curso" : "Course")}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-[var(--color-ink)] font-semibold">
          {isEs ? "Editar" : "Edit"}
        </span>
      </nav>

      {/* Course Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {isEditingDetails ? (
            <div className="space-y-3 rounded-2xl border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4 shadow-sm">
              <input
                type="text"
                value={editNameDraft}
                onChange={(e) => setEditNameDraft(e.target.value)}
                placeholder="Course name"
                className="w-full rounded-lg border border-[var(--color-line-2)] px-3 py-1.5 text-lg font-bold text-[var(--color-ink)] focus:border-[var(--color-brand-600)] focus:outline-none"
              />
              <textarea
                value={editPurposeDraft}
                onChange={(e) => setEditPurposeDraft(e.target.value)}
                placeholder="Purpose"
                rows={2}
                className="w-full rounded-lg border border-[var(--color-line-2)] px-3 py-1.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-brand-600)] focus:outline-none resize-none"
              />
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="neutral"
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
                  disabled={!editNameDraft.trim() || !editPurposeDraft.trim()}
                >
                  {isEs ? "Listo" : "Done"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="group relative">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-[family-name:var(--font-ui)] text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-ink)]">
                  {courseName ||
                    (isEs ? "Curso sin título" : "Untitled Course")}
                </h1>
                <button
                  type="button"
                  onClick={handleOpenEditDetails}
                  title={
                    isEs
                      ? "Editar título y propósito"
                      : "Edit title and purpose"
                  }
                  className="rounded-lg px-2.5 py-1 text-[var(--color-brand-600)] bg-[var(--color-brand-600)]/10 hover:bg-[var(--color-brand-600)]/20 transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                >
                  <LuPencil className="w-3.5 h-3.5" />
                  <span>{isEs ? "Editar título" : "Edit details"}</span>
                </button>
              </div>
              <p className="mt-1 text-sm sm:text-base text-[var(--color-ink-2)]">
                {coursePurpose ||
                  (isEs ? "Sin propósito asignado" : "No purpose provided")}
              </p>
            </div>
          )}
        </div>

        {/* Top Right Action - Preview & Save */}
        <div className="flex items-center gap-2 self-start">
          <Button
            type="button"
            variant="surface"
            icon={LuEye}
            onClick={handlePreviewCourse}
            disabled={isSaving}
          >
            {isEs ? "Vista previa" : "Preview course"}
          </Button>

          <Button
            type="button"
            variant="primary"
            icon={saveSuccess ? LuCheck : undefined}
            onClick={() => handleSaveCourse({ redirectAfter: true })}
            disabled={isSaving}
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
                  ? "Guardar"
                  : "Save"}
          </Button>
        </div>
      </div>

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

            {/* Bottom Action Bar */}
            <div className="border-t border-[var(--color-line-2)] bg-[var(--color-wash)]/40 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
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

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="surface"
                  icon={LuEye}
                  onClick={handlePreviewCourse}
                  disabled={isSaving}
                >
                  {isEs ? "Vista previa del curso" : "Preview course"}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  icon={saveSuccess ? LuCheck : undefined}
                  onClick={() => handleSaveCourse({ redirectAfter: true })}
                  disabled={isSaving}
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
                        ? "Guardar"
                        : "Save"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
