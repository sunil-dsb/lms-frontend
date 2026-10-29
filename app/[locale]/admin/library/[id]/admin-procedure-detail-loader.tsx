"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getProcedureBySlug } from "@/lib/api";
import { PROCEDURES_QUERY_KEY } from "@/services/library/hooks";
import { AdminProcedureView } from "@/components/admin/admin-procedure-view";
import { AdminProcedureDetailSkeleton } from "@/components/admin/admin-procedure-detail-skeleton";
import type { Employee, Procedure } from "@/lib/types";

/**
 * Client data layer for the admin procedure detail.
 *
 * The page waits for the slug API and renders the whole procedure at
 * once — no partial paint from a cached list row (heading + purpose
 * with the body still loading). Only the document skeleton shows until
 * the API resolves; a miss renders the not-available message.
 */
export function AdminProcedureDetailLoader({
  locale,
  id,
  employee,
}: {
  locale: string;
  id: string;
  employee: Employee;
}): React.ReactElement {
  // The page waits for the slug API — no cached partial paint.
  const query = useQuery<Procedure, Error>({
    queryKey: [...PROCEDURES_QUERY_KEY, "detail", id],
    queryFn: () => getProcedureBySlug(id).then((r) => r.procedure),
    staleTime: 0,
  });

  if (query.isLoading) {
    return <AdminProcedureDetailSkeleton />;
  }

  if (query.isError || !query.data) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
        <div className="mx-auto max-w-card space-y-4">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-ink)]">
            {locale === "es"
              ? "Este procedimiento no está disponible"
              : "This procedure isn’t available"}
          </h1>
          <p className="text-base text-[var(--color-ink-2)]">
            {locale === "es"
              ? "Puede que se haya quitado o movido."
              : "It may have been removed or moved."}
          </p>
          <div className="pt-4">
            <Link
              href={`/${locale}/admin/library`}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-600)] px-5 py-3 text-sm font-semibold text-white shadow-e1 hover:bg-[var(--color-brand-hover)]"
            >
              {locale === "es" ? "Volver a la biblioteca" : "Back to library"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminProcedureView
      locale={locale}
      procedure={query.data}
      employee={employee}
    />
  );
}
