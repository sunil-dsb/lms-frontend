"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useCreateCourse } from "@/services/courses/hooks";
import {
  BilingualInput,
  type BilingualValue,
} from "@/components/ui/bilingual-input";

interface NewCourseModalProps {
  open: boolean;
  onClose: () => void;
  locale: string;
}

export function NewCourseModal({
  open,
  onClose,
  locale,
}: NewCourseModalProps): React.ReactElement | null {
  const router = useRouter();
  const createCourseMutation = useCreateCourse();
  const isEs = locale === "es";

  const [name, setName] = React.useState<BilingualValue>({ en: "", es: "" });
  const [purpose, setPurpose] = React.useState<BilingualValue>({
    en: "",
    es: "",
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setName({ en: "", es: "" });
      setPurpose({ en: "", es: "" });
      setError(null);
      setIsSubmitting(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const titleEn = name.en.trim() || name.es.trim();
  const titleEs = name.es.trim() || name.en.trim();
  const purposeEn = purpose.en.trim() || purpose.es.trim();
  const purposeEs = purpose.es.trim() || purpose.en.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titleEn || !purposeEn) {
      setError(
        !titleEn && !purposeEn
          ? isEs
            ? "El nombre del curso y el propósito son obligatorios."
            : "Course name and purpose are required."
          : !titleEn
            ? isEs
              ? "El nombre del curso es obligatorio."
              : "Course name is required."
            : isEs
              ? "El propósito/descripción es obligatorio."
              : "Description/purpose is required.",
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await createCourseMutation.mutateAsync({
        titleEn,
        titleEs,
        purposeEn,
        purposeEs,
        chapters: [],
      });

      if (created?.id) {
        onClose();
        router.push(`/${locale}/admin/training/${created.id}`);
      }
    } catch (err) {
      console.error("Failed to create course:", err);
      setError(
        isEs
          ? "Error al crear el curso. Inténtalo de nuevo."
          : "Failed to create course. Please try again.",
      );
      setIsSubmitting(false);
    }
  };

  const isFormValid = Boolean(titleEn && purposeEn);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-course-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
    >
      {/* Backdrop overlay */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Dialog Card matching reference design */}
      <div className="relative w-full max-w-[620px] max-h-[92vh] overflow-hidden flex flex-col rounded-[26px] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xl transition-all animate-in zoom-in-95 duration-200">
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
          {/* Header & Fields */}
          <div className="p-6 sm:p-8 space-y-5 overflow-y-auto min-h-0 flex-1">
            <div>
              <h2
                id="new-course-modal-title"
                className="font-[family-name:var(--font-ui)] text-2xl font-bold tracking-tight text-[var(--color-ink)]"
              >
                {isEs ? "Nuevo curso" : "New course"}
              </h2>
              <p className="mt-1 text-sm text-[var(--color-ink-2)]">
                {isEs
                  ? "Asigna un nombre y propósito. Agregas capítulos en la siguiente pantalla."
                  : "Give it a name and purpose. You add chapters on the next screen."}
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
              >
                {error}
              </div>
            )}

            {/* Field 1: Course name */}
            <BilingualInput
              label={isEs ? "Nombre del curso" : "Course name"}
              value={name}
              onChange={(val) => {
                setName(val);
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
              value={purpose}
              onChange={(val) => {
                setPurpose(val);
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
          </div>

          {/* Modal Footer matching reference design */}
          <div className="flex items-center justify-end gap-3 border-t border-[var(--color-line-2)] bg-[#FAF7F2] dark:bg-[#1E1B18] px-6 sm:px-8 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              {isEs ? "Cancelar" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="rounded-2xl bg-[var(--color-brand-600)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--color-brand-700)] active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? isEs
                  ? "Creando..."
                  : "Creating..."
                : isEs
                  ? "Crear curso"
                  : "Create course"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
