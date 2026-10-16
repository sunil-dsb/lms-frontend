import * as React from "react";
import { cookies } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { listLocations } from "@/lib/api";
import { NewEmployeeForm } from "./new-employee-form";
import type { Location } from "@/lib/types";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewEmployeePage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const t = await getTranslations("admin");

  const locationsRes = await listLocations(cookieHeader);
  const locations: Location[] = locationsRes.locations;

  return <NewEmployeeForm locale={locale} locations={locations} roles={[]} />;
}
