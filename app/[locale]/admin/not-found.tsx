import * as React from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { LuLayoutDashboard } from "react-icons/lu";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClassName } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/page-header";

/**
 * Friendly 404 for anything inside `/admin/*` without a closer
 * `not-found` boundary (the library keeps its own at
 * `admin/library/not-found.tsx`).
 *
 * Without this, `notFound()` thrown from `employees/[id]`, training
 * routes, or a mistyped admin URL falls through to Next.js' bare
 * built-in page — chrome and all — and the manager can't get back to
 * the dashboard without typing the URL.
 *
 * `not-found` components don't receive props in Next.js 16, so the locale
 * has to come from somewhere else. We read the `NEXT_LOCALE` cookie that
 * next-intl's middleware sets on every locale-prefixed request — it's the
 * same value the layout above used for `setRequestLocale`, so the strings
 * resolve against the right file. Falls back to `en` if the cookie is
 * missing (older browsers, server-side prefetch).
 */
export default async function AdminNotFound(): Promise<React.ReactElement> {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value ?? "en";
  setRequestLocale(locale);

  const t = await getTranslations("admin.notFound");
  const backHref = `/${locale}/admin`;

  return (
    <div className="mx-auto max-w-page space-y-6 pb-12">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} />
      <EmptyState
        icon={LuLayoutDashboard}
        title={t("title")}
        body={t("body")}
        action={
          <Link
            href={backHref}
            className={buttonClassName({ variant: "secondary" })}
          >
            {t("back")}
          </Link>
        }
      />
    </div>
  );
}
