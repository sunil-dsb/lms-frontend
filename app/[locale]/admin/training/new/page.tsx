import * as React from "react";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { listAvailableSops } from "@/lib/mock-training";
import { NewCourseForm } from "./new-course-form";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewCoursePage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("admin.training");
  const tForm = await getTranslations("admin.training.form");
  const availableSops = listAvailableSops();

  return (
    <div className="mx-auto max-w-page space-y-6">
      {/* The eyebrow says where this is and Cancel is the way back, which is the
          same pair the procedure wizard uses. A third link above the title said
          it a second time. */}
      <PageHeader
        eyebrow={t("pageEyebrow")}
        title={t("newCourseTitle")}
        subtitle={t("newCourseSubtitle")}
        actions={
          <Link href={`/${locale}/admin/training`}>
            <Button variant="neutral">{tForm("cancel")}</Button>
          </Link>
        }
      />

      <NewCourseForm locale={locale} availableSops={availableSops} />
    </div>
  );
}
