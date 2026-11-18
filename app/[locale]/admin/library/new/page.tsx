import * as React from "react";
import { setRequestLocale } from "next-intl/server";
import { NewProcedureLoader } from "./new-procedure-loader";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = "force-dynamic";

export default async function AdminLibraryNewPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  // No server-side data fetching: the shell renders immediately and
  // the client loader resolves categories/locations through TanStack
  // Query (fresh fetch on each visit; the shell paints immediately).
  return <NewProcedureLoader locale={locale} />;
}
