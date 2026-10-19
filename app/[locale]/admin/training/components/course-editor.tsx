"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LuBookOpen,
  LuCheck,
  LuChevronRight,
  LuFileText,
  LuPencil,
  LuPlus,
  LuSearch,
  LuTrash2,
  LuX,
} from "react-icons/lu";
import type { Procedure } from "@/lib/types";
import { saveCourseAction } from "../actions";

export interface EditorChapter {
  id: string;
  title: string;
  subtitle?: string;
  procedureId?: string;
  procedureSlug?: string;
}

interface CourseEditorProps {
  locale: string;
  initialCourse?: Procedure | null;
  availableSops?: Procedure[];
}

export function CourseEditor({
  locale,
  initialCourse,
  availableSops = [],
}: CourseEditorProps): React.ReactElement {
  const router = useRouter();
  const isEs = locale === "es";

  // If initialCourse provided, start directly in chapters view
  const [step, setStep] = React.useState<"details" | "chapters">(
    initialCourse ? "chapters" : "details",
  );

  const [courseId, setCourseId] = React.useState<string | undefined>(
    initialCourse?.id,
  );
  const [courseName, setCourseName] = React.useState(
    (isEs
      ? initialCourse?.titleEs || initialCourse?.titleEn
      : initialCourse?.titleEn || initialCourse?.titleEs) || "",
  );
  const [coursePurpose, setCoursePurpose] = React.useState(
    (isEs
      ? initialCourse?.purposeEs || initialCourse?.purposeEn
      : initialCourse?.purposeEn || initialCourse?.purposeEs) || "",
  );

  const [chapters, setChapters] = React.useState<EditorChapter[]>(() => {
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

  const [isEditingDetails, setIsEditingDetails] = React.useState(false);
  const [editNameDraft, setEditNameDraft] = React.useState("");
  const [editPurposeDraft, setEditPurposeDraft] = React.useState("");

  const [isAddChapterModalOpen, setIsAddChapterModalOpen] =
    React.useState(false);
  const [newChapterTitle, setNewChapterTitle] = React.useState("");
  const [newChapterSubtitle, setNewChapterSubtitle] = React.useState("");

  const [isAddProcedureModalOpen, setIsAddProcedureModalOpen] =
    React.useState(false);
  const [procedureSearch, setProcedureSearch] = React.useState("");

  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Transition from Step 1 (Details) to Step 2 (Chapters)
  const handleProceedToChapters = () => {
    if (!courseName.trim() || !coursePurpose.trim()) {
      setError(
        isEs
          ? "El nombre y el propósito son obligatorios."
          : "Course name and purpose are both required.",
      );
      return;
    }
    setError(null);
    setStep("chapters");
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

  // Save the entire course
  const handleSaveCourse = async () => {
    if (!courseName.trim() || !coursePurpose.trim()) return;
    setIsSaving(true);
    setError(null);

    try {
      const linkedSops = chapters
        .map((c) => c.procedureId)
        .filter((id): id is string => Boolean(id));

      const res = await saveCourseAction({
        id: courseId,
        name: courseName.trim(),
        purpose: coursePurpose.trim(),
        linkedSops,
        locale,
      });

      if (res.ok && res.course) {
        setCourseId(res.course.id);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save course:", err);
      setError(
        isEs ? "Error al guardar el curso." : "Failed to save the course.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Add custom chapter
  const handleAddCustomChapter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapterTitle.trim()) return;

    const newChapter: EditorChapter = {
      id: `custom-ch-${Date.now()}`,
      title: newChapterTitle.trim(),
      subtitle: newChapterSubtitle.trim() || undefined,
    };

    setChapters((prev) => [...prev, newChapter]);
    setNewChapterTitle("");
    setNewChapterSubtitle("");
    setIsAddChapterModalOpen(false);
  };

  // Add procedure as chapter
  const handleAddProcedureAsChapter = (proc: Procedure) => {
    const title = isEs
      ? proc.titleEs || proc.titleEn
      : proc.titleEn || proc.titleEs;
    const subtitle = isEs
      ? proc.purposeEs || proc.purposeEn
      : proc.purposeEn || proc.purposeEs;

    const newChapter: EditorChapter = {
      id: `sop-${proc.id}-${Date.now()}`,
      title,
      subtitle: subtitle || undefined,
      procedureId: proc.id,
      procedureSlug: proc.slug,
    };

    setChapters((prev) => [...prev, newChapter]);
    setIsAddProcedureModalOpen(false);
  };

  const handleRemoveChapter = (id: string) => {
    setChapters((prev) => prev.filter((c) => c.id !== id));
  };

  const filteredProcedures = React.useMemo(() => {
    const q = procedureSearch.trim().toLowerCase();
    if (!q) return availableSops;
    return availableSops.filter((proc) => {
      const title = (
        isEs ? proc.titleEs || proc.titleEn : proc.titleEn || proc.titleEs
      ).toLowerCase();
      const purpose = (
        isEs
          ? proc.purposeEs || proc.purposeEn
          : proc.purposeEn || proc.purposeEs
      ).toLowerCase();
      return title.includes(q) || purpose.includes(q);
    });
  }, [availableSops, procedureSearch, isEs]);

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
            <Link
              href={`/${locale}/admin/training`}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              {isEs ? "Cancelar" : "Cancel"}
            </Link>
            <button
              type="button"
              disabled={!courseName.trim() || !coursePurpose.trim()}
              onClick={handleProceedToChapters}
              className="rounded-2xl bg-[var(--color-brand-600)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--color-brand-700)] active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isEs ? "Continuar" : "Continue"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================================
     STEP 2: CHAPTERS VIEW (Matching Screenshot 2 - No draft/publish buttons)
     ========================================================================= */
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb">
        <Link
          href={`/${locale}/admin/training`}
          className="text-xs sm:text-sm font-medium text-[var(--color-ink-2)] hover:text-[var(--color-ink)] transition-colors inline-block"
        >
          Training / Courses
        </Link>
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
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingDetails(false)}
                  className="rounded-lg px-3 py-1 text-xs font-semibold text-[var(--color-ink)] hover:bg-black/5"
                >
                  {isEs ? "Cancelar" : "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={handleSaveDetailsEdit}
                  disabled={!editNameDraft.trim() || !editPurposeDraft.trim()}
                  className="rounded-lg bg-[var(--color-brand-600)] px-3.5 py-1 text-xs font-semibold text-white disabled:opacity-40"
                >
                  {isEs ? "Listo" : "Done"}
                </button>
              </div>
            </div>
          ) : (
            <div className="group relative">
              <div className="flex items-center gap-2">
                <h1 className="font-[family-name:var(--font-ui)] text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-ink)]">
                  {courseName}
                </h1>
                <button
                  type="button"
                  onClick={handleOpenEditDetails}
                  title={isEs ? "Editar datos" : "Edit details"}
                  className="rounded-lg p-1 text-[var(--color-ink-3)] opacity-70 hover:opacity-100 hover:text-[var(--color-ink)] hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                >
                  <LuPencil className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-1 text-sm sm:text-base text-[var(--color-ink-2)]">
                {coursePurpose}
              </p>
            </div>
          )}
        </div>

        {/* Top Right Action - ONLY SAVE (No draft/publish) */}
        <div className="flex items-center gap-2 self-start">
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              <LuCheck className="w-3.5 h-3.5" />
              {isEs ? "Guardado" : "Saved"}
            </span>
          )}

          <button
            type="button"
            onClick={handleSaveCourse}
            disabled={isSaving}
            className="rounded-2xl bg-[var(--color-brand-600)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--color-brand-700)] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving
              ? isEs
                ? "Guardando..."
                : "Saving..."
              : isEs
                ? "Guardar"
                : "Save"}
          </button>
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
              <button
                type="button"
                onClick={() => setIsAddChapterModalOpen(true)}
                className="rounded-2xl bg-[var(--color-brand-600)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--color-brand-700)] active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>{isEs ? "Agregar capítulo +" : "Add chapter +"}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddProcedureModalOpen(true)}
                className="rounded-2xl border border-[var(--color-line-2)] bg-[var(--color-surface)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] shadow-xs hover:bg-[var(--color-wash)] transition-all cursor-pointer flex items-center gap-2"
              >
                <LuBookOpen className="w-4 h-4 text-[var(--color-ink-2)]" />
                <span>
                  {isEs
                    ? "Agregar desde procedimientos"
                    : "Add from procedures"}
                </span>
              </button>
            </div>
          </div>
        ) : (
          /* Populated Chapters List */
          <div>
            <ul className="divide-y divide-[var(--color-line-2)]">
              {chapters.map((ch, idx) => (
                <li
                  key={ch.id}
                  className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-[var(--color-wash)] transition-colors"
                >
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-panel-2)] text-xs font-bold text-[var(--color-ink)]">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm text-[var(--color-ink)] truncate">
                          {ch.title}
                        </h4>
                        {ch.procedureSlug && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-brand-600)] bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-950)]/40 px-2 py-0.5 rounded-full border border-[var(--color-brand-200)] dark:border-[var(--color-brand-800)]">
                            <LuBookOpen className="w-3 h-3" />
                            {isEs ? "Procedimiento" : "Procedure"}
                          </span>
                        )}
                      </div>
                      {ch.subtitle && (
                        <p className="mt-0.5 text-xs text-[var(--color-ink-2)] line-clamp-1">
                          {ch.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveChapter(ch.id)}
                    title={isEs ? "Eliminar capítulo" : "Remove chapter"}
                    className="shrink-0 p-1.5 rounded-lg text-[var(--color-ink-3)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <LuTrash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>

            {/* Bottom Add Buttons */}
            <div className="border-t border-[var(--color-line-2)] bg-[var(--color-wash)]/40 px-6 py-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setIsAddChapterModalOpen(true)}
                className="rounded-xl bg-[var(--color-brand-600)] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[var(--color-brand-700)] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <LuPlus className="w-3.5 h-3.5" />
                <span>{isEs ? "Agregar capítulo" : "Add chapter"}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddProcedureModalOpen(true)}
                className="rounded-xl border border-[var(--color-line-2)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold text-[var(--color-ink)] shadow-xs hover:bg-[var(--color-wash)] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <LuBookOpen className="w-3.5 h-3.5 text-[var(--color-ink-2)]" />
                <span>{isEs ? "Desde procedimientos" : "From procedures"}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          MODAL: ADD CHAPTER
          ===================================================================== */}
      {isAddChapterModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            className="fixed inset-0"
            onClick={() => setIsAddChapterModalOpen(false)}
          />
          <div className="relative w-full max-w-[500px] overflow-hidden rounded-[24px] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[var(--color-ink)]">
                {isEs ? "Nuevo capítulo" : "New chapter"}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddChapterModalOpen(false)}
                className="text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
              >
                <LuX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomChapter} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-[var(--color-ink)]">
                  {isEs ? "Título del capítulo" : "Chapter title"}
                </label>
                <input
                  type="text"
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  placeholder="e.g. Station Prep & Sanitization"
                  autoFocus
                  required
                  className="w-full rounded-xl border border-[var(--color-line-2)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-brand-600)] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-[var(--color-ink)]">
                  {isEs ? "Descripción (opcional)" : "Description (optional)"}
                </label>
                <textarea
                  value={newChapterSubtitle}
                  onChange={(e) => setNewChapterSubtitle(e.target.value)}
                  placeholder="e.g. Opening standards, safety guidelines and checklist."
                  rows={2}
                  className="w-full rounded-xl border border-[var(--color-line-2)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-brand-600)] focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddChapterModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-[var(--color-ink)] hover:bg-black/5"
                >
                  {isEs ? "Cancelar" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={!newChapterTitle.trim()}
                  className="rounded-xl bg-[var(--color-brand-600)] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--color-brand-700)] disabled:opacity-40"
                >
                  {isEs ? "Agregar" : "Add chapter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: ADD FROM PROCEDURES
          ===================================================================== */}
      {isAddProcedureModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            className="fixed inset-0"
            onClick={() => setIsAddProcedureModalOpen(false)}
          />
          <div className="relative w-full max-w-[560px] max-h-[85vh] flex flex-col overflow-hidden rounded-[24px] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-[var(--color-line-2)]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-[var(--color-ink)]">
                    {isEs ? "Vincular procedimiento" : "Link procedure"}
                  </h3>
                  <p className="mt-0.5 text-xs text-[var(--color-ink-2)]">
                    {isEs
                      ? "Selecciona un procedimiento para añadirlo como capítulo."
                      : "Pick a procedure to add as a chapter lesson."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddProcedureModalOpen(false)}
                  className="text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
                >
                  <LuX className="w-5 h-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="mt-4 relative">
                <LuSearch className="absolute left-3.5 top-3 w-4 h-4 text-[var(--color-ink-3)]" />
                <input
                  type="search"
                  value={procedureSearch}
                  onChange={(e) => setProcedureSearch(e.target.value)}
                  placeholder={
                    isEs ? "Buscar procedimiento..." : "Search procedures..."
                  }
                  className="w-full rounded-xl border border-[var(--color-line-2)] bg-[var(--color-surface)] pl-10 pr-4 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-brand-600)] focus:outline-none"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[400px]">
              {filteredProcedures.length === 0 ? (
                <div className="py-12 text-center text-sm text-[var(--color-ink-3)]">
                  {isEs
                    ? "No se encontraron procedimientos."
                    : "No procedures found."}
                </div>
              ) : (
                filteredProcedures.map((proc) => {
                  const title = isEs
                    ? proc.titleEs || proc.titleEn
                    : proc.titleEn || proc.titleEs;
                  const purpose = isEs
                    ? proc.purposeEs || proc.purposeEn
                    : proc.purposeEn || proc.purposeEs;

                  return (
                    <div
                      key={proc.id}
                      onClick={() => handleAddProcedureAsChapter(proc)}
                      className="group flex items-start justify-between gap-3 p-3.5 rounded-xl border border-[var(--color-line-2)] hover:border-[var(--color-brand-600)] hover:bg-[var(--color-wash)] transition-all cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <LuFileText className="w-4 h-4 shrink-0 text-[var(--color-brand-600)]" />
                          <h4 className="text-sm font-semibold text-[var(--color-ink)] group-hover:text-[var(--color-brand-600)] transition-colors truncate">
                            {title}
                          </h4>
                        </div>
                        {purpose && (
                          <p className="mt-1 text-xs text-[var(--color-ink-2)] line-clamp-2">
                            {purpose}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        className="shrink-0 rounded-lg bg-[var(--color-panel-2)] group-hover:bg-[var(--color-brand-600)] group-hover:text-white px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] transition-colors"
                      >
                        {isEs ? "Añadir" : "Add"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[var(--color-line-2)] bg-[var(--color-wash)]/40 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAddProcedureModalOpen(false)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-[var(--color-ink)] hover:bg-black/5"
              >
                {isEs ? "Cerrar" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
