import type { EditorChapter } from "./course-editor";

export interface CourseValidationErrorResult {
  message: string;
  target: string | HTMLElement | null;
  field?: "title" | "purpose" | "chapters";
  chapterIndex?: number;
}

interface CourseValidationInput {
  scope: "details" | "chapters" | "all";
  title: { en: string; es: string };
  purpose: { en: string; es: string };
  chapters?: EditorChapter[];
  isEs: boolean;
}

export function validateCourseForm({
  scope,
  title,
  purpose,
  chapters = [],
  isEs,
}: CourseValidationInput): CourseValidationErrorResult | null {
  // 1. Details validation (Course Name & Purpose)
  if (scope === "details" || scope === "all") {
    const titleEn = title.en.trim();
    const titleEs = title.es.trim();
    if (!titleEn && !titleEs) {
      return {
        message: isEs
          ? "Por favor, ingresa el nombre del curso."
          : "Please enter a course name.",
        target: "field-course-title",
        field: "title",
      };
    }
    if (titleEn.length > 200 || titleEs.length > 200) {
      return {
        message: isEs
          ? "El nombre del curso no debe exceder los 200 caracteres."
          : "Course name must not exceed 200 characters.",
        target: "field-course-title",
        field: "title",
      };
    }

    const purposeEn = purpose.en.trim();
    const purposeEs = purpose.es.trim();
    if (!purposeEn && !purposeEs) {
      return {
        message: isEs
          ? "Por favor, ingresa el propósito del curso."
          : "Please enter what this course is for.",
        target: "field-course-purpose",
        field: "purpose",
      };
    }
    if (purposeEn.length > 1000 || purposeEs.length > 1000) {
      return {
        message: isEs
          ? "El propósito del curso no debe exceder los 1000 caracteres."
          : "Course purpose must not exceed 1000 characters.",
        target: "field-course-purpose",
        field: "purpose",
      };
    }
  }

  // 2. Chapters validation (when saving the full course)
  if (scope === "chapters" || scope === "all") {
    if (chapters.length === 0) {
      return {
        message: isEs
          ? "Por favor, agrega al menos un capítulo antes de guardar el curso."
          : "Please add at least one chapter before saving the course.",
        target: "course-chapters-container",
        field: "chapters",
      };
    }

    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      if (!ch.title?.trim()) {
        return {
          message: isEs
            ? `El capítulo ${i + 1} debe tener un título.`
            : `Chapter ${i + 1} must have a title.`,
          target: `chapter-item-${ch.id}`,
          field: "chapters",
          chapterIndex: i,
        };
      }
      if (ch.title.trim().length > 200) {
        return {
          message: isEs
            ? `El título del capítulo ${i + 1} no debe exceder los 200 caracteres.`
            : `Chapter ${i + 1} title must not exceed 200 characters.`,
          target: `chapter-item-${ch.id}`,
          field: "chapters",
          chapterIndex: i,
        };
      }
    }
  }

  return null;
}

export function scrollToTarget(target: string | HTMLElement | null): void {
  if (!target || typeof window === "undefined") return;
  const tryScroll = (attemptsLeft = 6) => {
    const el =
      typeof target === "string" ? document.getElementById(target) : target;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const input = el.querySelector(
        "input:not([type=hidden]):not([type=file]):not([disabled]), textarea:not([disabled])",
      ) as HTMLInputElement | HTMLTextAreaElement | null;
      if (input) setTimeout(() => input.focus(), 350);
      el.classList.add(
        "ring-2",
        "ring-[var(--color-warn)]/60",
        "ring-offset-2",
        "transition-all",
      );
      setTimeout(() => {
        el.classList.remove(
          "ring-2",
          "ring-[var(--color-warn)]/60",
          "ring-offset-2",
        );
      }, 3000);
    } else if (attemptsLeft > 0) {
      setTimeout(() => tryScroll(attemptsLeft - 1), 50);
    }
  };
  requestAnimationFrame(() => tryScroll());
}
