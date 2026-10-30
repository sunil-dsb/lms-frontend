"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  BilingualInput,
  type BilingualValue,
} from "@/components/ui/bilingual-input";

interface CourseDetailsStepProps {
  locale: string;
  isEs: boolean;
  courseTitle: BilingualValue;
  setCourseTitle: (val: BilingualValue) => void;
  coursePurpose: BilingualValue;
  setCoursePurpose: (val: BilingualValue) => void;
  isRequiredOrientation: boolean;
  setIsRequiredOrientation: (value: boolean) => void;
  error: string | null;
  setError: (err: string | null) => void;
  onProceed: () => void;
}

export function CourseDetailsStep({
  locale,
  isEs,
  courseTitle,
  setCourseTitle,
  coursePurpose,
  setCoursePurpose,
  isRequiredOrientation,
  setIsRequiredOrientation,
  error,
  setError,
  onProceed,
}: CourseDetailsStepProps): React.ReactElement {
  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb">
        <Link
          href={`/${locale}/admin/training`}
          className="text-sm font-medium text-[var(--color-ink-2)] hover:text-[var(--color-ink)] transition-colors"
        >
          {isEs ? "Capacitación / Cursos" : "Training / Courses"}
        </Link>
      </nav>

      <div>
        <h1 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold leading-snug sm:leading-display tracking-tight text-[var(--color-ink)]">
          {isEs ? "Nuevo curso" : "New course"}
        </h1>
        <p className="mt-1 text-sm sm:text-base leading-body text-[var(--color-ink-2)]">
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

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-line-2)] p-4">
          <input
            type="checkbox"
            checked={isRequiredOrientation}
            onChange={(event) => setIsRequiredOrientation(event.target.checked)}
            className="mt-1 size-4 accent-[var(--color-brand-600)]"
          />
          <span>
            <span className="block text-sm font-semibold text-[var(--color-ink)]">
              {isEs ? "Capacitación obligatoria" : "Required training"}
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-[var(--color-ink-2)]">
              {isEs
                ? "Los empleados deben completar este curso antes de que se desbloqueen sus otros cursos asignados."
                : "Employees must complete this course before their other assigned courses unlock."}
            </span>
          </span>
        </label>

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
            onClick={onProceed}
          >
            {isEs ? "Agregar capítulo" : "Add chapter"}
          </Button>
        </div>
      </div>
    </div>
  );
}
