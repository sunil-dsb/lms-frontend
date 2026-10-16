import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LuBookOpen, LuSignature } from "react-icons/lu";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { StatusPill } from "@/components/ui/status-pill";
import { getQuizById } from "@/lib/api";
import {
  getCourseById,
  listTrainingAssignmentsForCourse,
  listLinkedSops,
  mockTrainingEmployees,
} from "@/lib/mock-training";
import { AssignForm } from "./assign-form";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function AssignCoursePage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("admin.training.assign");
  const tCourse = await getTranslations("admin.training");
  const tForm = await getTranslations("admin.training.form");

  const course = getCourseById(id);
  if (!course) notFound();

  const isEs = locale === "es";
  const title = (isEs ? course.titleEs : course.titleEn) || course.slug;
  const purpose = isEs ? course.purposeEs : course.purposeEn;
  const linkedSops = listLinkedSops(course);
  const assignments = listTrainingAssignmentsForCourse(course.id);

  return (
    <div className="mx-auto max-w-page space-y-6">
      {/* The course is the heading; the eyebrow says what is being done to it.
          Wrapping the name in straight quotes inside the h1 — Assign "Knife
          safety" — put punctuation at display size and said the page's job
          twice, once in the eyebrow and once in the title. */}
      <PageHeader
        eyebrow={t("eyebrow")}
        title={title}
        subtitle={t("subtitle")}
        actions={
          <Link href={`/${locale}/admin/training`}>
            <Button variant="neutral">{tForm("cancel")}</Button>
          </Link>
        }
      />

      {/* What this course carries, as a line on the page: a card here repeated
          the title and the purpose the header had just given. */}
      <div className="space-y-3">
        {purpose ? (
          <p className="max-w-prose text-base leading-body text-[var(--color-ink-2)]">
            {purpose}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          {course.quizId && getQuizById(course.quizId)?.questions?.length ? (
            <StatusPill tone="info">{tCourse("quizAttached")}</StatusPill>
          ) : (
            <StatusPill tone="warn">{tCourse("noQuiz")}</StatusPill>
          )}
          {course.acknowledgement ? (
            <StatusPill tone="info">
              <Icon icon={LuSignature} className="text-sm" aria-hidden="true" />
              {t("ackRequired", {
                version: course.acknowledgement.versionLabel,
              })}
            </StatusPill>
          ) : null}
          {linkedSops.length > 0 ? (
            <StatusPill tone="neutral">
              <Icon icon={LuBookOpen} className="text-sm" aria-hidden="true" />
              {t("linkedSopsCount", { count: linkedSops.length })}
            </StatusPill>
          ) : null}
        </div>
      </div>

      <AssignForm
        locale={locale}
        courseId={course.id}
        employees={mockTrainingEmployees}
        existingAssignments={assignments}
      />
    </div>
  );
}
