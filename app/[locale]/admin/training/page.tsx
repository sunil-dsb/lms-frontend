import * as React from "react";
import { setRequestLocale } from "next-intl/server";
import { getTrainingCourseRowsForAdmin } from "@/lib/mock-training";
import { TrainingCourseExplorer } from "./training-course-explorer";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function AdminTrainingPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const rows = getTrainingCourseRowsForAdmin();

  return (
    <div className="mx-auto max-w-page space-y-6">
      <TrainingCourseExplorer locale={locale} rows={rows} />
    </div>
  );
}
