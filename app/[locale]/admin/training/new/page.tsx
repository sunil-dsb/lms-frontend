import * as React from "react";
import { setRequestLocale } from "next-intl/server";
import { CourseEditor } from "../components/course-editor";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewCoursePage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-page">
      <CourseEditor locale={locale} />
    </div>
  );
}
