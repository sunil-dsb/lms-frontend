import * as React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ApiException } from "@/lib/api";
import { fetchMyTraining } from "@/services/courses/api";
import { TabBar } from "@/components/employee/tab-bar";
import { mapEmployeeTrainingAssignments } from "../lib/map-training-rows";
import { EmployeeTrainingView } from "../components/employee-training-view";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = "force-dynamic";

export default async function EmployeeTrainingPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("employee.training");

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  let assignments: Awaited<ReturnType<typeof fetchMyTraining>> = [];
  try {
    assignments = await fetchMyTraining(cookieHeader);
  } catch (err) {
    if (
      err instanceof ApiException &&
      (err.status === 401 || err.code === "SESSION_INVALID")
    ) {
      redirect(`/${locale}/login`);
    }
    console.error("Could not load employee training assignments:", err);
  }

  const { pending, completed } = mapEmployeeTrainingAssignments(
    assignments,
    locale,
  );

  return (
    <>
      <EmployeeTrainingView
        pendingItems={pending}
        completedItems={completed}
        locale={locale}
      />

      <TabBar
        locale={locale}
        active="training"
        labels={{
          home: t("tabHome"),
          procedures: t("tabProcedures"),
          training: t("tabTraining"),
          soon: t("tabSoon"),
          nav: t("tabsNav"),
        }}
      />
    </>
  );
}
