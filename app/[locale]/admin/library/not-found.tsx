import * as React from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { LuFileText } from "react-icons/lu";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClassName } from "@/components/ui/button";
import { PageHeader } from "@/components/admin/page-header";

/**
 * Friendly 404 for anything inside `/admin/library/*`.
 *
 * Without this, `notFound()` thrown from `library/[id]/page.tsx`,
 * `library/categories/[slug]/page.tsx`, or `library/categories/[slug]/[subSlug]/page.tsx`
 * falls through to Next.js' bare built-in page — chrome and all — and the
 * manager can't get back to the library without typing the URL.
 *
 * This file lives at the library segment so it inherits the admin layout
 * (sidebar + top bar stay visible) and matches every library subroute's
 * `notFound()` call.
 *
 * `not-found` components don't receive props in Next.js 16, so the locale
 * has to come from somewhere else. We read the `NEXT_LOCALE` cookie that
 * next-intl's middleware sets on every locale-prefixed request — it's the
 * same value the layout above used for `setRequestLocale`, so the strings
 * resolve against the right file. Falls back to `en` if the cookie is
 * missing (older browsers, server-side prefetch).
 */
export default async function AdminLibraryNotFound(): Promise<React.ReactElement> {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value ?? "en";
  setRequestLocale(locale);

  const t = await getTranslations("admin.library.notFound");
  const backHref = `/${locale}/admin/library`;

  return (
    <div className="mx-auto max-w-page space-y-6 pb-12">
      <PageHeader eyebrow={t("eyebrow")} title={t("title")} />
      <EmptyState
        icon={LuFileText}
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
