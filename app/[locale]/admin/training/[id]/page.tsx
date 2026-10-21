import * as React from "react";
import { cookies } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { getCourseById } from "@/lib/mock-training";
import { getProcedureBySlug } from "@/lib/api";
import { getChapterDetail } from "@/lib/course-chapters-data";
import { AdminCourseView } from "./admin-course-view";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ chapter?: string; mode?: string }>;
}

export const dynamic = "force-dynamic";

export default async function AdminTrainingCoursePage({
  params,
  searchParams,
}: PageProps): Promise<React.ReactElement> {
  const { locale, id } = await params;
  const { chapter, mode } = await searchParams;
  setRequestLocale(locale);

  const course = getCourseById(id);

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

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
      initialCourse={course}
      chapterNumber={chapterNumber}
      mode={mode}
      linkedProcedure={linkedProcedure}
    />
  );
}
