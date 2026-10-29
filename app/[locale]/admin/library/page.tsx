import * as React from "react";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { LuPlus } from "react-icons/lu";
import { PageHeader } from "@/components/admin/page-header";
import { LibraryExplorerClient } from "./library-explorer-client";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function AdminLibraryPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("admin.library");

  // The header (and its "New Procedure" button) paints immediately;
  // the explorer fetches its data client-side through TanStack Query,
  // so repeat visits render from cache with no loading state. First
  // visits show the skeleton while the queries resolve.
  return (
    <div className="mx-auto max-w-page space-y-6 pb-12">
      <PageHeader
        title={t("pageTitle")}
        actions={
          <Link href={`/${locale}/admin/library/new`}>
            <Button icon={LuPlus}>{t("newProcedure")}</Button>
          </Link>
        }
      />
      <LibraryExplorerClient locale={locale} />
    </div>
  );
}
