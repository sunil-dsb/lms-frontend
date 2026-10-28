"use client";

import * as React from "react";
import Link from "next/link";
import {
  LuCheck,
  LuEye,
  LuFileText,
  LuPencil,
  LuPlus,
  LuTriangleAlert,
} from "react-icons/lu";
import { Button } from "@/components/ui/button";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import {
  BilingualInput,
  type BilingualValue,
} from "@/components/ui/bilingual-input";
import type { Procedure } from "@/lib/types";
import type { EditorChapter } from "./course-editor";
import { CourseChapterItem } from "./course-chapter-item";

interface CourseChaptersStepProps {
  locale: string;
  isEs: boolean;
  courseId?: string;
  propCourseId?: string;
  initialCourseId?: string;
  courseTitle: BilingualValue;
  coursePurpose: BilingualValue;
  chapters: EditorChapter[];
  proceduresMap: Map<string, Procedure>;
  fetchedProcedures: Record<string, Procedure>;
  isDirty: boolean;
  isSaving: boolean;
  saveSuccess: boolean;
  isReordering: boolean;
  isDeleting: boolean;
  onSaveDetails: (
    nextTitle: BilingualValue,
    nextPurpose: BilingualValue,
  ) => Promise<void>;
  handlePreviewCourse: () => Promise<void>;
  handleSaveCourse: (opts?: {
    redirectAfter?: boolean;
  }) => Promise<string | null>;
  handleMoveChapter: (index: number, direction: "up" | "down") => Promise<void>;
  handleRemoveChapter: (id: string) => Promise<void>;
  onAddChapter: () => void;
  onSelectChapter: (chapter: EditorChapter) => void;
}

export function CourseChaptersStep({
  locale,
  isEs,
  courseId,
  propCourseId,
  initialCourseId,
  courseTitle,
  coursePurpose,
  chapters,
  proceduresMap,
  fetchedProcedures,
  isDirty,
  isSaving,
  saveSuccess,
  isReordering,
  isDeleting,
  onSaveDetails,
  handlePreviewCourse,
  handleSaveCourse,
  handleMoveChapter,
  handleRemoveChapter,
  onAddChapter,
  onSelectChapter,
}: CourseChaptersStepProps): React.ReactElement {
  const [isEditingDetails, setIsEditingDetails] = React.useState(false);
  const [editTitleDraft, setEditTitleDraft] =
    React.useState<BilingualValue>(courseTitle);
  const [editPurposeDraft, setEditPurposeDraft] =
    React.useState<BilingualValue>(coursePurpose);

  const courseName =
    (isEs ? courseTitle.es : courseTitle.en) ||
    courseTitle.en ||
    courseTitle.es ||
    "";
  const coursePurposeText =
    (isEs ? coursePurpose.es : coursePurpose.en) ||
    coursePurpose.en ||
    coursePurpose.es ||
    "";

  const [chapterToDelete, setChapterToDelete] = React.useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isDeletingLocal, setIsDeletingLocal] = React.useState(false);

  const handleOpenEditDetails = () => {
    setEditTitleDraft({ ...courseTitle });
    setEditPurposeDraft({ ...coursePurpose });
    setIsEditingDetails(true);
  };

  const handleSaveDetailsEdit = async () => {
    await onSaveDetails(editTitleDraft, editPurposeDraft);
    setIsEditingDetails(false);
  };
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
        {(courseId || propCourseId || initialCourseId) && (
          <>
            <span className="text-[var(--color-ink-3)] font-normal">/</span>
            <Link
              href={`/${locale}/admin/training/${courseId || propCourseId || initialCourseId}`}
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
                  <h1 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold leading-snug sm:leading-display tracking-tight text-[var(--color-ink)]">
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
                <p className="mt-1.5 text-sm sm:text-base leading-body text-[var(--color-ink-2)] max-w-prose">
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
          <h2 className="text-base font-semibold text-[var(--color-ink)]">
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
          <div className="py-16 px-6 text-center">
            <h3 className="text-lg font-semibold text-[var(--color-ink)]">
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
              <Button type="button" variant="primary" onClick={onAddChapter}>
                {isEs ? "Agregar capítulo +" : "Add chapter +"}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <ul className="divide-y divide-[var(--color-line-2)]">
              {chapters.map((ch, idx) => (
                <CourseChapterItem
                  key={ch.id}
                  chapter={ch}
                  index={idx}
                  totalCount={chapters.length}
                  isEs={isEs}
                  proceduresMap={proceduresMap}
                  fetchedProcedures={fetchedProcedures}
                  isReordering={isReordering}
                  isDeleting={isDeleting}
                  onSelect={onSelectChapter}
                  onMoveUp={(i) => handleMoveChapter(i, "up")}
                  onMoveDown={(i) => handleMoveChapter(i, "down")}
                  onRequestDelete={(chapterItem) =>
                    setChapterToDelete({
                      id: chapterItem.id,
                      title:
                        chapterItem.title ||
                        (isEs ? "este capítulo" : "this chapter"),
                    })
                  }
                />
              ))}
            </ul>

            {/* Bottom Action Bar inside Card */}
            <div className="border-t border-[var(--color-line-2)] bg-[var(--color-wash)]/40 px-6 py-4 flex items-center justify-start">
              <Button
                type="button"
                size="sm"
                variant="primary"
                icon={LuPlus}
                onClick={onAddChapter}
              >
                {isEs ? "Agregar capítulo" : "Add chapter"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Chapter Confirmation Dialog using standard small Modal */}
      <Modal
        open={Boolean(chapterToDelete)}
        onClose={() => {
          if (!isDeletingLocal) setChapterToDelete(null);
        }}
        size="sm"
      >
        <ModalHeader
          title={isEs ? "Confirmar" : "Confirm"}
          onClose={() => {
            if (!isDeletingLocal) setChapterToDelete(null);
          }}
          closeLabel={isEs ? "Cerrar" : "Close"}
        />
        <ModalBody className="space-y-2">
          <p className="text-sm text-[var(--color-ink-2)] leading-relaxed">
            {isEs
              ? `"${chapterToDelete?.title || ""}" y su contenido se eliminarán permanentemente. Esto no se puede deshacer.`
              : `"${chapterToDelete?.title || ""}" and its contents will be permanently removed. This can't be undone.`}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button
            type="button"
            variant="neutral"
            size="sm"
            onClick={() => setChapterToDelete(null)}
            disabled={isDeletingLocal}
          >
            {isEs ? "Cancelar" : "Cancel"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isDeletingLocal}
            onClick={async () => {
              if (!chapterToDelete) return;
              setIsDeletingLocal(true);
              try {
                await handleRemoveChapter(chapterToDelete.id);
              } finally {
                setIsDeletingLocal(false);
                setChapterToDelete(null);
              }
            }}
          >
            {isDeletingLocal
              ? isEs
                ? "Eliminando..."
                : "Deleting..."
              : isEs
                ? "¿Eliminar este capítulo?"
                : "Delete this chapter?"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
