"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  LuBookOpen,
  LuCalendar,
  LuCheck,
  LuLoader,
  LuSearch,
  LuSquareCheck,
  LuSquare,
  LuTriangleAlert,
} from "react-icons/lu";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { fetchCourses, assignCourseApi } from "@/services/courses/api";
import { cn } from "@/lib/utils";

interface AssignCourseModalProps {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  alreadyAssignedCourseIds: string[];
  locale: string;
  onAssigned: () => void;
}

function getDefaultDueDate(daysAhead = 14): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

export function AssignCourseModal({
  open,
  onClose,
  employeeId,
  employeeName,
  alreadyAssignedCourseIds,
  locale,
  onAssigned,
}: AssignCourseModalProps): React.ReactElement {
  const router = useRouter();
  const isEs = locale === "es";
  const [search, setSearch] = useState("");
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<string>(getDefaultDueDate(14));
  const [isRequired, setIsRequired] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quizErrorAction, setQuizErrorAction] = useState<{
    courseId: string;
    chapterNumber: number;
    courseTitle: string;
  } | null>(null);

  // Fetch published courses
  const { data: coursesData, isLoading } = useQuery({
    queryKey: ["courses-for-assignment"],
    queryFn: () => fetchCourses({ status: "published", limit: 100 }),
    enabled: open,
  });

  const allCourses = coursesData?.items ?? [];

  // Filter courses by search
  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allCourses;
    return allCourses.filter((c) => {
      const title = (
        isEs ? c.titleEs || c.titleEn : c.titleEn || c.titleEs
      ).toLowerCase();
      const purpose = (
        isEs ? c.purposeEs || c.purposeEn : c.purposeEn || c.purposeEs
      ).toLowerCase();
      return title.includes(q) || purpose.includes(q);
    });
  }, [allCourses, search, isEs]);

  const assignedSet = useMemo(
    () => new Set(alreadyAssignedCourseIds),
    [alreadyAssignedCourseIds],
  );

  const assignableFilteredCourses = useMemo(
    () => filteredCourses.filter((c) => !assignedSet.has(c.id)),
    [filteredCourses, assignedSet],
  );

  function toggleCourse(courseId: string): void {
    if (assignedSet.has(courseId)) return;
    setError(null);
    setQuizErrorAction(null);
    setSelectedCourseIds((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId],
    );
  }

  function handleSelectAll(): void {
    setError(null);
    setQuizErrorAction(null);
    const assignableIds = assignableFilteredCourses.map((c) => c.id);
    const allSelected = assignableIds.every((id) =>
      selectedCourseIds.includes(id),
    );
    if (allSelected) {
      // Unselect filtered
      setSelectedCourseIds((prev) =>
        prev.filter((id) => !assignableIds.includes(id)),
      );
    } else {
      // Select all filtered
      setSelectedCourseIds((prev) =>
        Array.from(new Set([...prev, ...assignableIds])),
      );
    }
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (selectedCourseIds.length === 0) {
      setError(
        isEs
          ? "Por favor, selecciona al menos un curso."
          : "Please select at least one training course to assign.",
      );
      return;
    }
    if (!dueDate) {
      setError(
        isEs
          ? "Por favor, especifica una fecha límite."
          : "Please select a due date.",
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setQuizErrorAction(null);

    try {
      // Assign all selected courses in parallel
      for (const cId of selectedCourseIds) {
        try {
          await assignCourseApi(cId, [employeeId], dueDate, "add", isRequired);
        } catch (subErr: any) {
          const rawMsg: string = subErr?.message || "";
          const targetCourse = allCourses.find((c) => c.id === cId);
          const cTitle = targetCourse
            ? isEs
              ? targetCourse.titleEs || targetCourse.titleEn
              : targetCourse.titleEn || targetCourse.titleEs
            : "Course";

          // Check if error is missing quiz questions
          if (
            subErr?.code === "CHAPTERS_MISSING_QUIZ_QUESTIONS" ||
            rawMsg.toLowerCase().includes("quiz question")
          ) {
            const chMatch = rawMsg.match(/Chapter\(?s?\)?\s*(\d+)/i);
            const chapterNum = chMatch ? parseInt(chMatch[1], 10) : 1;
            setQuizErrorAction({
              courseId: cId,
              chapterNumber: chapterNum,
              courseTitle: cTitle,
            });
            setError(
              isEs
                ? `El curso "${cTitle}" no se puede asignar porque le faltan preguntas de cuestionario en el capítulo ${chapterNum}.`
                : `Cannot assign "${cTitle}": Chapter ${chapterNum} does not have any quiz questions.`,
            );
            return;
          }
          throw subErr;
        }
      }
      onAssigned();
      onClose();
    } catch (err) {
      console.error("Failed to assign courses:", err);
      const msg =
        err instanceof Error
          ? err.message
          : isEs
            ? "Ocurrió un error al asignar los cursos."
            : "Failed to assign courses. Please try again.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleQuickDate(days: number): void {
    setDueDate(getDefaultDueDate(days));
  }

  const allFilteredSelected =
    assignableFilteredCourses.length > 0 &&
    assignableFilteredCourses.every((c) => selectedCourseIds.includes(c.id));

  return (
    <>
      {/* Subtle blur overlay that disables clicks while redirecting */}
      {isRedirecting &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[9999] backdrop-blur-[2px] bg-black/5 cursor-wait select-none pointer-events-auto" />,
          document.body,
        )}

      <Modal open={open && !isRedirecting} onClose={onClose} size="2xl">
        <ModalHeader
          title={
            isEs ? "Asignar Cursos de Capacitación" : "Assign Training Courses"
          }
          description={
            isEs
              ? `Selecciona los cursos que deseas asignar a ${employeeName}`
              : `Select courses to assign to ${employeeName}`
          }
          onClose={onClose}
          closeLabel={isEs ? "Cerrar" : "Close"}
        />

        <form
          onSubmit={handleSubmit}
          className="flex flex-col min-h-0 flex-1 overflow-hidden"
        >
          <ModalBody className="flex flex-col min-h-0 flex-1 p-5 sm:p-6 space-y-4 overflow-hidden">
            {/* Search Bar & Multiselect Actions */}
            <div className="shrink-0 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-semibold text-[var(--color-ink)] flex items-center gap-2">
                  <span>
                    {isEs ? "Cursos disponibles" : "Available Courses"}
                  </span>
                  {selectedCourseIds.length > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--color-brand-600)] text-white">
                      {selectedCourseIds.length}{" "}
                      {isEs ? "seleccionado(s)" : "selected"}
                    </span>
                  )}
                </label>
                {assignableFilteredCourses.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-brand-700)] hover:underline cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={handleSelectAll}
                      className="size-4 rounded border-[var(--color-line-2)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-600)] cursor-pointer pointer-events-none"
                      tabIndex={-1}
                    />
                    <span>
                      {allFilteredSelected
                        ? isEs
                          ? "Deseleccionar todos"
                          : "Deselect all"
                        : isEs
                          ? "Seleccionar todos"
                          : "Select all"}
                    </span>
                  </button>
                )}
              </div>

              {/* Clean, proper search box */}
              <div className="relative flex items-center">
                <LuSearch
                  className="pointer-events-none absolute left-3 text-[var(--color-ink-3)] size-4"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    isEs
                      ? "Buscar cursos por título..."
                      : "Search courses by title..."
                  }
                  className="w-full h-10 rounded-md border border-[var(--color-line-2)] bg-[var(--color-surface)] pl-9 pr-4 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-brand-600)] focus:ring-1 focus:ring-[var(--color-brand-600)] focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Scrollable Course List Section */}
            <div className="flex-1 min-h-[160px] max-h-[260px] overflow-y-auto rounded-md border border-[var(--color-line)] bg-[var(--color-wash)] p-2 space-y-2">
              {isLoading ? (
                <p className="p-6 text-center text-sm text-[var(--color-ink-3)]">
                  {isEs ? "Cargando cursos..." : "Loading courses..."}
                </p>
              ) : filteredCourses.length === 0 ? (
                <p className="p-6 text-center text-sm text-[var(--color-ink-3)]">
                  {isEs
                    ? "No se encontraron cursos disponibles."
                    : "No training courses found."}
                </p>
              ) : (
                filteredCourses.map((c) => {
                  const isSelected = selectedCourseIds.includes(c.id);
                  const isAlreadyAssigned = assignedSet.has(c.id);
                  const title = isEs
                    ? c.titleEs || c.titleEn
                    : c.titleEn || c.titleEs;
                  const purpose = isEs
                    ? c.purposeEs || c.purposeEn
                    : c.purposeEn || c.purposeEs;

                  return (
                    <div
                      key={c.id}
                      onClick={() => toggleCourse(c.id)}
                      className={cn(
                        "flex items-center justify-between gap-3 p-3 rounded-md border transition-all select-none",
                        isAlreadyAssigned
                          ? "opacity-60 cursor-not-allowed bg-[var(--color-surface)] border-[var(--color-line-2)]"
                          : isSelected
                            ? "cursor-pointer bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-950)] border-[var(--color-brand-600)] shadow-sm"
                            : "cursor-pointer bg-[var(--color-surface)] border-[var(--color-line-2)] hover:border-[var(--color-brand-400)] hover:bg-[var(--color-panel)]",
                      )}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {/* Checkbox */}
                        <div className="pt-0.5 shrink-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isAlreadyAssigned}
                            onChange={() => toggleCourse(c.id)}
                            className="size-4 rounded border-[var(--color-line-2)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-600)] cursor-pointer disabled:cursor-not-allowed"
                          />
                        </div>

                        {/* Icon */}
                        <div
                          className={cn(
                            "size-8 rounded-full flex items-center justify-center shrink-0",
                            isSelected
                              ? "bg-[var(--color-brand-600)] text-white"
                              : "bg-[var(--color-panel)] text-[var(--color-ink-2)]",
                          )}
                        >
                          <LuBookOpen className="size-4" />
                        </div>

                        {/* Title & Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm text-[var(--color-ink)] truncate">
                              {title}
                            </span>
                            {isAlreadyAssigned && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--color-panel)] text-[var(--color-ink-3)] border border-[var(--color-line-2)] shrink-0">
                                {isEs ? "Ya asignado" : "Already assigned"}
                              </span>
                            )}
                          </div>
                          {purpose && (
                            <p className="text-xs text-[var(--color-ink-3)] line-clamp-1 mt-0.5">
                              {purpose}
                            </p>
                          )}
                          <p className="text-xs text-[var(--color-ink-3)] mt-1">
                            {c.chapterCount ?? 0}{" "}
                            {isEs ? "capítulos" : "chapters"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Due Date & Requirement Settings Section (Side-by-side, perfectly balanced) */}
            <div className="shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Due Date Box */}
              <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] p-3.5 flex flex-col justify-between space-y-2.5">
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-[var(--color-ink)]">
                    <span className="flex items-center gap-1.5">
                      <LuCalendar className="size-4 text-[var(--color-ink-3)]" />
                      {isEs ? "Fecha límite" : "Due Date"}
                    </span>
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full h-9 rounded-md border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink)] focus:border-[var(--color-brand-600)] focus:ring-1 focus:ring-[var(--color-brand-600)] focus:outline-none"
                    required
                  />
                </div>

                {/* Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-xs text-[var(--color-ink-3)] mr-0.5">
                    {isEs ? "Preajustes:" : "Presets:"}
                  </span>
                  {[
                    { label: isEs ? "1 sem" : "1 week", days: 7 },
                    { label: isEs ? "2 sem" : "2 weeks", days: 14 },
                    { label: isEs ? "1 mes" : "1 month", days: 30 },
                  ].map((p) => (
                    <button
                      key={p.days}
                      type="button"
                      onClick={() => handleQuickDate(p.days)}
                      className="text-xs px-2.5 py-1 rounded-full border border-[var(--color-line-2)] bg-[var(--color-panel)] text-[var(--color-ink-2)] hover:bg-[var(--color-wash)] hover:text-[var(--color-ink)] transition-colors cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Requirement Box */}
              <div className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] p-3.5 flex flex-col justify-between space-y-2.5">
                <label className="block text-sm font-semibold text-[var(--color-ink)]">
                  {isEs ? "Prioridad de capacitación" : "Training Priority"}
                </label>

                <label className="flex items-start gap-2.5 p-2.5 rounded-md border border-[var(--color-line-2)] bg-[var(--color-wash)] cursor-pointer hover:border-[var(--color-line)] transition-colors flex-1">
                  <input
                    type="checkbox"
                    checked={isRequired}
                    onChange={(e) => setIsRequired(e.target.checked)}
                    className="size-4 mt-0.5 rounded border-[var(--color-line-2)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-600)] cursor-pointer shrink-0"
                  />
                  <div>
                    <span className="text-sm font-semibold text-[var(--color-ink)] block">
                      {isEs ? "Capacitación obligatoria" : "Mandatory training"}
                    </span>
                    <span className="text-xs text-[var(--color-ink-3)] block mt-0.5 leading-snug">
                      {isEs
                        ? "Debe completarse antes de la fecha límite para mantener la certificación al día."
                        : "Must be completed by due date to maintain certified status."}
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {error && (
              <div className="shrink-0 rounded-md border border-[var(--color-bad-tint)] bg-[var(--color-bad-tint)]/15 p-3 space-y-2">
                <div className="flex items-start gap-2.5 text-xs text-[var(--color-bad)]">
                  <LuTriangleAlert className="size-4 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold">{error}</p>
                    {quizErrorAction && (
                      <button
                        type="button"
                        disabled={isRedirecting}
                        onClick={() => {
                          setIsRedirecting(true);
                          const targetUrl = `/${locale}/admin/training/${quizErrorAction.courseId}/edit?chapter=${quizErrorAction.chapterNumber}&tab=quiz`;
                          window.location.href = targetUrl;
                        }}
                        className="inline-flex items-center gap-1.5 font-bold text-[var(--color-brand-600)] hover:underline cursor-pointer pt-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isRedirecting && (
                          <LuLoader className="size-3.5 animate-spin" />
                        )}
                        <span>
                          {isEs
                            ? `Ir a la sección de cuestionario del capítulo ${quizErrorAction.chapterNumber} →`
                            : `Go to Chapter ${quizErrorAction.chapterNumber} Quiz section →`}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </ModalBody>

          <ModalFooter className="flex items-center justify-between">
            <div className="text-xs font-medium text-[var(--color-ink-3)]">
              {selectedCourseIds.length > 0 ? (
                <span>
                  {selectedCourseIds.length}{" "}
                  {isEs
                    ? selectedCourseIds.length === 1
                      ? "curso seleccionado"
                      : "cursos seleccionados"
                    : selectedCourseIds.length === 1
                      ? "course selected"
                      : "courses selected"}
                </span>
              ) : (
                <span>
                  {isEs ? "Ningún curso seleccionado" : "No courses selected"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="neutral"
                onClick={onClose}
                disabled={isSubmitting}
              >
                {isEs ? "Cancelar" : "Cancel"}
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={selectedCourseIds.length === 0 || isSubmitting}
                className="gap-2"
              >
                <LuCheck className="size-4" />
                <span>
                  {isSubmitting
                    ? isEs
                      ? "Asignando..."
                      : "Assigning..."
                    : isEs
                      ? selectedCourseIds.length > 1
                        ? `Asignar ${selectedCourseIds.length} cursos`
                        : "Asignar curso"
                      : selectedCourseIds.length > 1
                        ? `Assign ${selectedCourseIds.length} Courses`
                        : "Assign Course"}
                </span>
              </Button>
            </div>
          </ModalFooter>
        </form>
      </Modal>
    </>
  );
}
