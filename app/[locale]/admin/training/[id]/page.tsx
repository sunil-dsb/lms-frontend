import * as React from "react";
import { setRequestLocale } from "next-intl/server";
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

  const chapterNumber = chapter ? parseInt(chapter, 10) : null;

  return (
    <AdminCourseView
      locale={locale}
      courseId={id}
      chapterNumber={chapterNumber}
      mode={mode}
    />
  );
}
