import * as React from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ApiException, fetchMe } from "@/lib/api";
import { AdminProcedureDetailLoader } from "./admin-procedure-detail-loader";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export const dynamic = "force-dynamic";

export default async function AdminLibraryDetailPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale, id } = await params;
  setRequestLocale(locale);

  // Only the session resolves server-side — it gates the page and feeds
  // the view's employee context (fetchMe is cached, ~10s). The procedure
  // itself loads client-side, cache-first: navigating in from the
  // library list paints instantly; the loader refreshes from the API
  // behind it. See admin-procedure-detail-loader.tsx.
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
    if (err instanceof ApiException) {
      notFound();
    }
    throw err;
  }

  return (
    // Matches the demo procedure view reading column width (`max-w-doc`).
    <div className="mx-auto max-w-doc space-y-6 pb-12">
      <AdminProcedureDetailLoader locale={locale} id={id} employee={employee} />
    </div>
  );
}
