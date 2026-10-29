import * as React from "react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ApiException } from "@/lib/api";
import { fetchTrainingProgress } from "@/lib/api/training-progress";
import { serverCookieHeader } from "@/lib/server-cookies";
import { fetchEmployeeTraining } from "@/services/employees/api";
import type { EmployeeTrainingRow } from "@/services/employees/types";
import type { EmployeeProgressRow } from "@/lib/types";
import { EmployeeProgressDetail } from "./employee-progress-detail";

interface PageProps {
  params: Promise<{ locale: string; employeeId: string }>;
}

export const dynamic = "force-dynamic";

function isUuid(val: string | null | undefined): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    val,
  );
}

/** The detail page one level under the Progress tab: the same meta the
 *  "By employee" row shows (name, station, courses done / total, where they
 *  are) plus every assigned course with its per-course state, fetched
 *  server-side so the page paints complete. */
export default async function EmployeeProgressDetailPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale, employeeId } = await params;
  setRequestLocale(locale);
  if (!isUuid(employeeId)) notFound();

  // Meta comes from the same data the Progress table rows are built on, so
  // the numbers on the list row and the header card can never disagree.
  const cookieHeader = await serverCookieHeader();
  const { data: progress } = await fetchTrainingProgress(cookieHeader);
  const meta: EmployeeProgressRow | undefined = progress.employees.find(
    (row) => row.employeeId === employeeId,
  );

  // The course-by-course assignments come from the dedicated admin
  // endpoint (GET /api/v1/employees/:id/training), called with the
  // browser's session cookies the way the other server pages do it.
  let assignments: EmployeeTrainingRow[] = [];
  try {
    assignments = await fetchEmployeeTraining(employeeId, cookieHeader);
  } catch (err) {
    if (err instanceof ApiException && err.status === 404) notFound();
    // A failed call degrades to the empty state instead of blowing up the
    // page — the meta card above still carries who this is and where.
    console.error("Could not fetch employee training:", err);
  }

  return (
    <div className="mx-auto max-w-page space-y-6 pb-12">
      <EmployeeProgressDetail
        locale={locale}
        meta={meta ?? null}
        assignments={assignments}
      />
    </div>
  );
}
