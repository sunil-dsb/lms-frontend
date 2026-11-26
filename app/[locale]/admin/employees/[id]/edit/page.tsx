import * as React from "react";
import { setRequestLocale } from "next-intl/server";
import { EmployeeEditPage } from "./employee-edit-page";

export default async function EditEmployeeRoute({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<React.ReactElement> {
  const { locale, id } = await params;
  setRequestLocale(locale);
  return <EmployeeEditPage id={id} locale={locale} />;
}
