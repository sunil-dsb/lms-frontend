"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createCourseAction } from "../actions";

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
  const [name, setName] = React.useState("");
  const [purpose, setPurpose] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setName("");
      setPurpose("");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedPurpose = purpose.trim();

    if (!trimmedName || !trimmedPurpose) {
      setError(
        !trimmedName && !trimmedPurpose
          ? "Course name and purpose are required."
          : !trimmedName
            ? "Course name is required."
            : "Description/purpose is required.",
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await createCourseAction({
        name: trimmedName,
        purpose: trimmedPurpose,
        locale,
      });

      if (res.ok && res.course) {
        onClose();
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to create course:", err);
      setError("Failed to create course. Please try again.");
      setIsSubmitting(false);
    }
  };

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
      <div className="relative w-full max-w-[540px] overflow-hidden rounded-[26px] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xl transition-all animate-in zoom-in-95 duration-200">
        <form onSubmit={handleSubmit}>
          {/* Header & Fields */}
          <div className="p-6 sm:p-8 space-y-5">
            <div>
              <h2
                id="new-course-modal-title"
                className="font-[family-name:var(--font-ui)] text-2xl font-bold tracking-tight text-[var(--color-ink)]"
              >
                New course
              </h2>
              <p className="mt-1 text-sm text-[var(--color-ink-2)]">
                Give it a name. You add chapters on the next screen.
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
            <div className="space-y-1.5">
              <label
                htmlFor="course-name-input"
                className="block text-sm font-semibold text-[var(--color-ink)]"
              >
                {locale === "es" ? "Nombre del curso" : "Course name"}
              </label>
              <input
                id="course-name-input"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={
                  locale === "es" ? "Tacos al Pastor" : "Tacos al Pastor"
                }
                autoFocus
                required
                className="w-full rounded-xl border border-[var(--color-line-2)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-brand-600)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-600)] transition-colors"
              />
            </div>

            {/* Field 2: Purpose */}
            <div className="space-y-1.5">
              <label
                htmlFor="course-purpose-input"
                className="block text-sm font-semibold text-[var(--color-ink)]"
              >
                {locale === "es" ? "Propósito" : "Purpose"}
              </label>
              <textarea
                id="course-purpose-input"
                value={purpose}
                onChange={(e) => {
                  setPurpose(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={
                  locale === "es"
                    ? "Cómo preparamos tacos al pastor, desde el marinado hasta el emplatado."
                    : "How we make tacos al pastor, from marinade to plating."
                }
                rows={3}
                required
                className="w-full rounded-xl border border-[var(--color-line-2)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-brand-600)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-600)] transition-colors resize-none min-h-[96px]"
              />
            </div>
          </div>

          {/* Modal Footer matching reference design */}
          <div className="flex items-center justify-end gap-3 border-t border-[var(--color-line-2)] bg-[#FAF7F2] dark:bg-[#1E1B18] px-6 sm:px-8 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              {locale === "es" ? "Cancelar" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !purpose.trim() || isSubmitting}
              className="rounded-2xl bg-[var(--color-brand-600)] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--color-brand-700)] active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? locale === "es"
                  ? "Creando..."
                  : "Creating..."
                : locale === "es"
                  ? "Crear curso"
                  : "Create course"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
