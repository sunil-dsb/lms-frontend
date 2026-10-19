import * as React from "react";
import { setRequestLocale } from "next-intl/server";
import { fetchTrainingProgress } from "@/lib/api/training-progress";
import { ProgressOverview } from "./components/progress-overview";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function AdminTrainingProgressPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  // Mock-backed for now: `fetchTrainingProgress` already answers the shape
  // GET /training/progress will return, so the view below never changes.
  const { data } = await fetchTrainingProgress();

  return (
    <div className="mx-auto max-w-page space-y-6 pb-12">
      <ProgressOverview locale={locale} data={data} />
    </div>
  );
}
