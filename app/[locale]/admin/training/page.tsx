import * as React from "react";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LuGraduationCap, LuPlus } from "react-icons/lu";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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

  const t = await getTranslations("admin.training");
  const rows = getTrainingCourseRowsForAdmin();

  return (
    <div className="mx-auto max-w-page space-y-6">
      <PageHeader
        eyebrow={t("pageEyebrow")}
        title={t("pageTitle")}
        subtitle={t("pageSubtitle")}
        actions={
          <Link href={`/${locale}/admin/training/new`}>
            <Button icon={LuPlus}>{t("newCourse")}</Button>
          </Link>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={LuGraduationCap}
          title={t("emptyHeading")}
          body={t("emptyBody")}
          action={
            <Link href={`/${locale}/admin/training/new`}>
              <Button variant="secondary" icon={LuPlus}>
                {t("newCourse")}
              </Button>
            </Link>
          }
        />
      ) : (
        <TrainingCourseExplorer locale={locale} rows={rows} />
      )}
    </div>
  );
}
