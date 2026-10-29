import * as React from "react";
import { setRequestLocale } from "next-intl/server";
import { EditCourseLoader } from "./edit-course-loader";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export const dynamic = "force-dynamic";

export default async function EditCoursePage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto max-w-page">
      <EditCourseLoader locale={locale} id={id} />
    </div>
  );
}
