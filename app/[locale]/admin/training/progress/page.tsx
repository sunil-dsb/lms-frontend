import * as React from "react";
import { cookies } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { fetchTrainingProgress } from "@/lib/api/training-progress";
import { serverCookieHeader } from "@/lib/server-cookies";
import { ProgressOverview } from "./components/progress-overview";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function AdminTrainingProgressPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  // Backend-backed: `fetchTrainingProgress` answers the shape of
  // GET /courses/admin/progress (mock fallback only if the backend is
  // briefly unreachable). The cookie header forwards the browser session
  // so the server-side call is authenticated.
  const { data } = await fetchTrainingProgress(await serverCookieHeader());

  return (
    <div className="mx-auto max-w-page space-y-6 pb-12">
      <ProgressOverview locale={locale} data={data} />
    </div>
  );
}
