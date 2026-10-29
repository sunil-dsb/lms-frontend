import * as React from "react";
import { setRequestLocale } from "next-intl/server";
import { EmployeeDetailClient } from "./employee-detail-client";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default async function AdminEmployeeDetailPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale, id } = await params;
  setRequestLocale(locale);

  // No server-side fetch here on purpose: the detail call is made
  // client-side by EmployeeDetailClient (React Query, visible in the
  // Network tab, deduped on StrictMode double-mount).
  return <EmployeeDetailClient locale={locale} id={id} />;
}
