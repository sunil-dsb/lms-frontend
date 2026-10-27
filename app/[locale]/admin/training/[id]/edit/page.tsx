import * as React from "react";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { fetchCourseById } from "@/services/courses/api";
import {
  registerCourseChapters,
  type ChapterDefinition,
} from "@/lib/course-chapters-data";
import {
  CourseEditor,
  type EditorChapter,
} from "../../components/course-editor";
import type { Procedure } from "@/lib/types";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

function isUuid(val: string | null | undefined): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    val,
  );
}

export default async function EditCoursePage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  let course: Procedure | null = null;
  let backendChapters: EditorChapter[] = [];

  if (isUuid(id)) {
    try {
      const backendCourse = await fetchCourseById(id);
      if (backendCourse) {
        course = {
          id: backendCourse.id,
          slug: backendCourse.id,
          titleEn: backendCourse.titleEn,
          titleEs: backendCourse.titleEs,
          purposeEn: backendCourse.purposeEn,
          purposeEs: backendCourse.purposeEs,
          status: backendCourse.status as any,
          createdAt: backendCourse.createdAt,
          updatedAt: backendCourse.updatedAt,
          attachedToTraining: true,
          chapterCount: backendCourse.chapters?.length ?? 0,
        } as unknown as Procedure;

        if (backendCourse.chapters && backendCourse.chapters.length > 0) {
          backendChapters = backendCourse.chapters.map((ch) => ({
            id: ch.id,
            title:
              locale === "es"
                ? ch.titleEs || ch.titleEn
                : ch.titleEn || ch.titleEs,
            subtitle:
              locale === "es"
                ? ch.subtitleEs || ch.subtitleEn
                : ch.subtitleEn || ch.subtitleEs,
            blocks: (ch.blocks as any[]) || [],
            procedureId: ch.procedureId ?? undefined,
            procedureSlug: undefined,
            quizId: ch.quizId ?? undefined,
            quiz: (ch.quiz as any) ?? null,
          }));

          const chapterDefs: ChapterDefinition[] = backendCourse.chapters.map(
            (ch) => ({
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
            }),
          );
          registerCourseChapters(backendCourse.id, chapterDefs);
        }
      }
    } catch (err) {
      console.warn("Could not fetch course from backend for edit:", err);
    }
  }

  if (!course) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-page">
      <CourseEditor
        locale={locale}
        courseId={id}
        initialCourse={course}
        initialChapters={backendChapters}
        mode="edit"
      />
    </div>
  );
}
