import * as React from "react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ApiException } from "@/lib/api";
import { fetchTrainingProgress } from "@/lib/api/training-progress";
import { serverCookieHeader } from "@/lib/server-cookies";
import { fetchCourseAssignmentsApi } from "@/services/courses/api";
import type { CourseAssignmentRow } from "@/services/courses/types";
import type { CourseProgressRow } from "@/lib/types";
import { CourseProgressDetail } from "./course-progress-detail";

interface PageProps {
  params: Promise<{ locale: string; courseId: string }>;
}

export const dynamic = "force-dynamic";

function isUuid(val: string | null | undefined): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    val,
  );
}

/** The course detail page one level under the Progress tab: the same meta
 *  the "By course" row shows (title, people done / total) plus every
 *  assigned employee with their per-person progress, fetched server-side
 *  so the page paints complete. */
export default async function CourseProgressDetailPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale, courseId } = await params;
  setRequestLocale(locale);
  if (!isUuid(courseId)) notFound();

  // Meta comes from the same data the Progress table rows are built on, so
  // the numbers on the list row and the header card can never disagree.
  const cookieHeader = await serverCookieHeader();
  const { data: progress } = await fetchTrainingProgress(cookieHeader);
  const meta: CourseProgressRow | undefined = progress.courses.find(
    (row) => row.course.id === courseId,
  );

  // The per-employee assignment rows come from the course-assignments
  // endpoint (GET /api/v1/courses/:id/assignments), called with the
  // browser's session cookies the way the other server pages do it.
  let assignments: CourseAssignmentRow[] = [];
  try {
    assignments = await fetchCourseAssignmentsApi(courseId, cookieHeader);
  } catch (err) {
    if (err instanceof ApiException && err.status === 404) notFound();
    // A failed call degrades to the empty state instead of blowing up the
    // page — the meta card above still carries which course this is.
    console.error("Could not fetch course assignments:", err);
  }

  return (
    <div className="mx-auto max-w-page space-y-6 pb-12">
      <CourseProgressDetail
        locale={locale}
        meta={meta ?? null}
        assignments={assignments}
      />
    </div>
  );
}
