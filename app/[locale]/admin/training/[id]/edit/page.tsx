import * as React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { fetchMe } from "@/lib/api";
import { canManageCourses } from "@/lib/rbac";
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

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  try {
    const { employee } = await fetchMe(cookieHeader);
    if (!canManageCourses(employee.role)) {
      redirect(`/${locale}/admin/training`);
    }
  } catch (err) {
    if ((err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT"))
      throw err;
  }

  return (
    <div className="mx-auto max-w-page">
      <EditCourseLoader locale={locale} id={id} />
    </div>
  );
}
