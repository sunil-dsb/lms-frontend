import * as React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ApiException, fetchMe } from "@/lib/api";
import {
  getTrainingRowsForEmployee,
  mockTrainingEmployees,
} from "@/lib/mock-training";
import { TabBar } from "@/components/employee/tab-bar";
import { mapTrainingAssignmentRows } from "./lib/map-training-rows";
import { EmployeeTrainingView } from "./components/employee-training-view";

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

  let employee;
  try {
    const me = await fetchMe(cookieHeader);
    employee = me.employee;
  } catch (err) {
    if (
      err instanceof ApiException &&
      (err.status === 401 || err.code === "SESSION_INVALID")
    ) {
      redirect(`/${locale}/login`);
    }
    // Fall back to demo employee on transient server or network hiccups rather than breaking the session
    employee = {
      id: "emp-maria",
      name: "María González",
      role: "employee" as const,
      locationId: "loc-roma",
      roleIds: [],
      stationIds: [],
      languagePref: "en" as const,
    };
  }

  // Match the employee to a mock record, or fall back to "emp-maria" so assigned
  // training courses are always visible and testable regardless of login identity.
  const matched =
    mockTrainingEmployees.find((e) => e.id === employee.id) ??
    mockTrainingEmployees.find(
      (e) => e.name.toLowerCase() === employee.name.toLowerCase(),
    );
  const employeeId = matched?.id ?? "emp-maria";

  let rows = getTrainingRowsForEmployee(employeeId, new Date());
  if (rows.length === 0) {
    rows = getTrainingRowsForEmployee("emp-maria", new Date());
  }

  const { pending, completed } = mapTrainingAssignmentRows(rows, locale);

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
