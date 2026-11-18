import * as React from "react";
import { setRequestLocale } from "next-intl/server";
import { fetchTrainingProgress } from "@/lib/api/training-progress";
import { serverCookieHeader } from "@/lib/server-cookies";
import { ProgressOverview } from "./components/progress-overview";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; groupBy?: string }>;
}

export default async function AdminTrainingProgressPage({
  params,
  searchParams,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const validStatuses = [
    "all",
    "not_started",
    "in_progress",
    "due_soon",
    "complete",
    "overdue",
    "restricted",
  ];
  const status =
    sp.status && validStatuses.includes(sp.status) ? sp.status : "all";
  const groupBy = sp.groupBy === "course" ? "course" : "employee";

  // Backend-backed: `fetchTrainingProgress` answers the shape of
  // GET /courses/admin/progress. The cookie header forwards the browser session
  // so the server-side call is authenticated.
  const { data } = await fetchTrainingProgress(await serverCookieHeader(), {
    groupBy,
    status: status === "all" ? undefined : (status as any),
    page: 1,
    limit: 10,
    includeAssignments: false,
  });

  return (
    <div className="mx-auto max-w-page space-y-6 pb-12">
      <ProgressOverview
        locale={locale}
        data={data}
        initialStatus={status as any}
        initialGroupBy={groupBy}
      />
    </div>
  );
}
