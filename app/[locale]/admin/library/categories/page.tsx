import * as React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { fetchBackendCategories } from "@/services/categories/api";
import { fetchMe } from "@/lib/api";
import { canManageProcedures, isSuperAdmin } from "@/lib/rbac";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CategoriesClientList } from "./categories-client-list";
import { CreateCategoryButton } from "./category-actions";
import { PageHeader } from "@/components/admin/page-header";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = "force-dynamic";

export default async function AdminLibraryCategoriesPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("admin.library.categories");

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  let canManageCategories = false;
  try {
    const { employee } = await fetchMe(cookieHeader);
    if (!canManageProcedures(employee.role)) {
      redirect(`/${locale}/admin/library`);
    }
    canManageCategories = isSuperAdmin(employee.role);
  } catch (err) {
    if ((err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT"))
      throw err;
  }

  let categories: Category[] = [];
  let loadError: string | null = null;
  try {
    categories = await fetchBackendCategories(
      { page: 1, limit: 200 },
      cookieHeader,
    );
  } catch (err) {
    loadError = err instanceof Error ? err.message : "LOAD_FAILED";
  }

  return (
    <div className="mx-auto max-w-page space-y-6">
      <PageHeader
        title={t("pageTitle")}
        actions={canManageCategories ? <CreateCategoryButton /> : null}
      />

      {loadError ? (
        <p
          role="alert"
          className={cn(
            "rounded-[var(--radius-md)] bg-[var(--color-bad-tint)]",
            "px-3 py-2 text-sm text-[var(--color-bad)]",
          )}
        >
          {loadError}
        </p>
      ) : null}

      <CategoriesClientList
        initialCategories={categories}
        locale={locale}
        canManageCategories={canManageCategories}
      />
    </div>
  );
}
