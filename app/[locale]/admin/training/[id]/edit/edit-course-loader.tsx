"use client";

import * as React from "react";
import Link from "next/link";
import { useCourse } from "@/services/courses/hooks";
import {
  registerCourseChapters,
  type ChapterDefinition,
} from "@/lib/course-chapters-data";
import {
  CourseEditor,
  type EditorChapter,
} from "../../components/course-editor";
import { EditProcedureSkeleton } from "@/components/admin/edit-procedure-skeleton";
import type { Procedure } from "@/lib/types";

export function EditCourseLoader({
  locale,
  id,
}: {
  locale: string;
  id: string;
}): React.ReactElement {
  const isEs = locale === "es";
  const { data: course, isLoading, isError } = useCourse(id);

  const { procedure, chapters } = React.useMemo(() => {
    if (!course) {
      return { procedure: null, chapters: [] };
    }

    const proc = {
      id: course.id,
      slug: course.id,
      titleEn: course.titleEn,
      titleEs: course.titleEs,
      purposeEn: course.purposeEn,
      purposeEs: course.purposeEs,
      status: course.status as any,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      attachedToTraining: true,
      chapterCount: course.chapters?.length ?? 0,
    } as unknown as Procedure;

    const backendChapters: EditorChapter[] = (course.chapters || []).map(
      (ch) => ({
        id: ch.id,
        title:
          locale === "es" ? ch.titleEs || ch.titleEn : ch.titleEn || ch.titleEs,
        subtitle:
          locale === "es"
            ? ch.subtitleEs || ch.subtitleEn
            : ch.subtitleEn || ch.subtitleEs,
        blocks: (ch.blocks as any[]) || [],
        procedureId: ch.procedureId ?? undefined,
        procedureSlug: undefined,
        quizId: ch.quizId ?? undefined,
        quiz: (ch.quiz as any) ?? null,
      }),
    );

    if (course.chapters && course.chapters.length > 0) {
      const chapterDefs: ChapterDefinition[] = course.chapters.map((ch) => ({
        id: ch.id,
        number: ch.number,
        titleEn: ch.titleEn,
        titleEs: ch.titleEs,
        contentEn: ch.subtitleEn || "",
        contentEs: ch.subtitleEs || "",
        blocks: (ch.blocks as any[]) || [],
        procedureId: ch.procedureId ?? undefined,
        quizId: ch.quizId ?? undefined,
        quiz: (ch.quiz as any) ?? null,
        minCorrectAnswers: ch.minCorrectAnswers ?? undefined,
      }));
      registerCourseChapters(course.id, chapterDefs);
    }

    return { procedure: proc, chapters: backendChapters };
  }, [course, locale]);

  if (isLoading) {
    return <EditProcedureSkeleton />;
  }

  if (isError || !procedure) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
        <div className="mx-auto max-w-card space-y-4">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-ink)]">
            {isEs
              ? "Este curso no está disponible"
              : "This course isn’t available"}
          </h1>
          <p className="text-base text-[var(--color-ink-2)]">
            {isEs
              ? "Puede que se haya quitado o movido."
              : "It may have been removed or moved."}
          </p>
          <div className="pt-4">
            <Link
              href={`/${locale}/admin/training`}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-600)] px-5 py-3 text-sm font-semibold text-white shadow-e1 hover:bg-[var(--color-brand-hover)]"
            >
              {isEs ? "Volver a capacitación" : "Back to courses"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CourseEditor
      locale={locale}
      courseId={id}
      initialCourse={procedure}
      initialChapters={chapters}
      mode="edit"
    />
  );
}
