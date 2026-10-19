import * as React from "react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getCourseById, listAvailableSops } from "@/lib/mock-training";
import { CourseEditor } from "../../components/course-editor";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function EditCoursePage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const course = getCourseById(id);
  if (!course) {
    notFound();
  }

  const availableSops = listAvailableSops();

  return (
    <div className="mx-auto max-w-page">
      <CourseEditor
        locale={locale}
        initialCourse={course}
        availableSops={availableSops}
      />
    </div>
  );
}
