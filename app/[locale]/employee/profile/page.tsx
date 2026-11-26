import * as React from "react";
import { setRequestLocale } from "next-intl/server";
import { MyProfilePage } from "@/components/profile/my-profile-page";

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);
  return <MyProfilePage locale={locale} />;
}
