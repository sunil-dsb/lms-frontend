import * as React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { fetchMe } from "@/lib/api";
import { canManageProcedures } from "@/lib/rbac";
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

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  try {
    const { employee } = await fetchMe(cookieHeader);
    if (!canManageProcedures(employee.role)) {
      redirect(`/${locale}/admin/library`);
    }
  } catch (err) {
    if ((err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT"))
      throw err;
  }

  // No server-side data fetching: the shell renders immediately and
  // the client loader resolves categories/locations through TanStack
  // Query (fresh fetch on each visit; the shell paints immediately).
  return <NewProcedureLoader locale={locale} />;
}
