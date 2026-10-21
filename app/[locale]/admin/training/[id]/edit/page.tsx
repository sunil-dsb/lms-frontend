import * as React from "react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getCourseById, listAvailableSops } from "@/lib/mock-training";
import { getChapterDefinitions } from "@/lib/course-chapters-data";
import {
  CourseEditor,
  type EditorChapter,
} from "../../components/course-editor";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function EditCoursePage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const course = getCourseById(id);
  const availableSops = listAvailableSops();

  const defs =
    getChapterDefinitions(id) ||
    (course?.id ? getChapterDefinitions(course.id) : undefined);

  const initialChapters: EditorChapter[] =
    defs && defs.length > 0
      ? defs.map((d) => ({
          id: d.id,
          title:
            locale === "es" ? d.titleEs || d.titleEn : d.titleEn || d.titleEs,
          subtitle:
            locale === "es"
              ? d.contentEs || d.contentEn
              : d.contentEn || d.contentEs,
          procedureSlug: d.procedureSlug,
          blocks: d.blocks,
        }))
      : [];

  return (
    <div className="mx-auto max-w-page">
      <CourseEditor
        locale={locale}
        courseId={id}
        initialCourse={course ?? null}
        initialChapters={initialChapters}
        availableSops={availableSops}
        mode="edit"
      />
    </div>
  );
}
