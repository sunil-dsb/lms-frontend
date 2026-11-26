import * as React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { fetchMe } from "@/lib/api";
import { canManageCourses } from "@/lib/rbac";
import { CourseEditor } from "../components/course-editor";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewCoursePage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
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
      <CourseEditor locale={locale} />
    </div>
  );
}
