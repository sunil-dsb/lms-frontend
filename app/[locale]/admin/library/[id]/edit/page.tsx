import * as React from "react";
import { cookies } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { getProcedureBySlug, ApiException } from "@/lib/api";
import type { Procedure } from "@/lib/types";
import { EditProcedureLoader } from "./edit-procedure-loader";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export const dynamic = "force-dynamic";

export default async function AdminLibraryEditPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  // Load the procedure to edit when the server can see it. A miss used
  // to 404 immediately — but procedures the server can't reach may still
  // exist on the device (localStorage fallback store, or the backend
  // temporarily down), so the loader resolves it client-side: cache
  // first, then the API, and only then the not-found state.
  let procedure: Procedure | null = null;
  try {
    const result = await getProcedureBySlug(id, cookieHeader);
    procedure = result.procedure;
  } catch (err) {
    if (err instanceof ApiException) {
      // Loader will try client-side; it owns the not-found state.
      procedure = null;
    } else {
      throw err;
    }
  }

  return <EditProcedureLoader locale={locale} id={id} initial={procedure} />;
}
