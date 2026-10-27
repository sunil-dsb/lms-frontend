import * as React from "react";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { fetchCourseById } from "@/services/courses/api";
import { getProcedureBySlug } from "@/lib/api";
import {
  getChapterDetail,
  registerCourseChapters,
  type ChapterDefinition,
} from "@/lib/course-chapters-data";
import { AdminCourseView } from "./admin-course-view";
import type { Procedure } from "@/lib/types";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ chapter?: string; mode?: string }>;
}

export const dynamic = "force-dynamic";

function isUuid(val: string | null | undefined): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    val,
  );
}

export default async function AdminTrainingCoursePage({
  params,
  searchParams,
}: PageProps): Promise<React.ReactElement> {
  const { locale, id } = await params;
  const { chapter, mode } = await searchParams;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  let course: Procedure | null = null;

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
      console.warn("Could not fetch course from backend:", err);
    }
  }

  if (!course) {
    notFound();
  }

  const chapterNumber = chapter ? parseInt(chapter, 10) : null;
  let linkedProcedure = null;

  if (chapterNumber && !isNaN(chapterNumber)) {
    const chapterDetail = getChapterDetail(id, chapterNumber, locale);
    if (chapterDetail.procedureSlug) {
      try {
        const res = await getProcedureBySlug(
          chapterDetail.procedureSlug,
          cookieHeader,
        );
        linkedProcedure = res.procedure;
      } catch (err) {
        console.warn("Could not load procedure from API:", err);
      }
    }
  }

  return (
    <AdminCourseView
      locale={locale}
      courseId={id}
      initialCourse={course ?? undefined}
      chapterNumber={chapterNumber}
      mode={mode}
      linkedProcedure={linkedProcedure}
    />
  );
}
