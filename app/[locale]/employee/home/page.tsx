import * as React from "react";
import { setRequestLocale } from "next-intl/server";
import { EmployeeHomeClient } from "./employee-home-client";

interface PageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Employee home shell — paints immediately with no backend waits.
 *
 * Previously this page awaited `/auth/me` + procedures + roles + stations
 * server-side (on top of the layout's own auth check) before first paint,
 * so every visit stared at a blank screen for 4+ seconds. Now the server
 * only resolves locale and the view override; `EmployeeHomeClient` streams
 * each section through the shared query caches (skeleton → content on
 * first visit, instant from cache on every back-navigation).
 */
export default async function EmployeeHomePage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  return <EmployeeHomeClient locale={locale} />;
}
