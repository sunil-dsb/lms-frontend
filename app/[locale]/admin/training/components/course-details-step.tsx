"use client";

import * as React from "react";
import Link from "next/link";
import { LuTriangleAlert } from "react-icons/lu";
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
  titleError?: string | null;
  setTitleError?: (err: string | null) => void;
  purposeError?: string | null;
  setPurposeError?: (err: string | null) => void;
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
  titleError,
  setTitleError,
  purposeError,
  setPurposeError,
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
          className="rounded-[var(--radius-lg)] border border-[var(--color-bad)]/30 bg-[var(--color-bad-tint)] p-4 text-xs font-medium text-[var(--color-bad)]"
        >
          {error}
        </div>
      )}

      {/* Input Card */}
      <div className="rounded-2xl border border-[var(--color-line-2)] bg-[var(--color-surface)] p-6 sm:p-8 shadow-xs space-y-6">
        {/* Field 1: Course Name */}
        <div id="field-course-title" className="rounded-[var(--radius-md)]">
          <BilingualInput
            label={isEs ? "Nombre del curso" : "Course name"}
            value={courseTitle}
            onChange={(val) => {
              setCourseTitle(val);
              if (titleError) setTitleError?.(null);
              if (error) setError(null);
            }}
            defaultLang={isEs ? "es" : "en"}
            required
            maxLength={200}
            placeholder={{
              en: "e.g. Tacos al Pastor",
              es: "ej. Tacos al Pastor",
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

        {/* Field 2: Purpose */}
        <div id="field-course-purpose" className="rounded-[var(--radius-md)]">
          <BilingualInput
            label={isEs ? "Propósito" : "Purpose"}
            value={coursePurpose}
            onChange={(val) => {
              setCoursePurpose(val);
              if (purposeError) setPurposeError?.(null);
              if (error) setError(null);
            }}
            defaultLang={isEs ? "es" : "en"}
            multiline
            required
            maxLength={1000}
            placeholder={{
              en: "How we make tacos al pastor, from marinade to plating.",
              es: "Cómo preparamos tacos al pastor, desde el marinado hasta el emplatado.",
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

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href={`/${locale}/admin/training`}>
            <Button type="button" variant="ghost">
              {isEs ? "Cancelar" : "Cancel"}
            </Button>
          </Link>
          <Button type="button" variant="primary" onClick={onProceed}>
            {isEs ? "Agregar capítulo" : "Add chapter"}
          </Button>
        </div>
      </div>
    </div>
  );
}
