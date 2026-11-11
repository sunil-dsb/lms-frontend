import * as React from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchMe } from "@/lib/api";
import { PageHeader } from "@/components/admin/page-header";
import { AuditClientTable } from "./audit-client-table";
import type { AuditItemType } from "@/services/audit/types";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ itemType?: string; action?: string; q?: string }>;
}

const ITEM_TYPES: readonly (AuditItemType | "all")[] = [
  "all",
  "course",
  "chapter",
  "procedure",
  "assignment",
  "station",
  "location",
  "job",
];

function parseItemType(raw: string | undefined): AuditItemType | "all" {
  if (raw && (ITEM_TYPES as readonly string[]).includes(raw)) {
    return raw as AuditItemType | "all";
  }
  return "all";
}

export default async function AdminAuditPage({
  params,
  searchParams,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  // Viewer gate: the API answers 403 to anyone but a super_admin, so a
  // rendered page could only ever fail. Fetch the role before rendering
  // (fetchMe is server-cached, so the layout's identical call usually
  // already paid for it). redirect() throws — keep it out of the catch,
  // or the catch would swallow NEXT_REDIRECT and send admins to login.
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  let sessionOk = true;
  let isSuperAdmin = false;
  try {
    const { employee } = await fetchMe(cookieHeader);
    isSuperAdmin = employee.role === "super_admin";
  } catch {
    // Same policy as the admin layout: any auth failure lands on login.
    sessionOk = false;
  }
  if (!sessionOk) redirect(`/${locale}/login?reason=session`);
  if (!isSuperAdmin) redirect(`/${locale}/admin`);

  const sp = await searchParams;
  const itemType = parseItemType(sp.itemType);
  const q = (sp.q ?? "").trim();

  const t = await getTranslations("admin");
  const tc = await getTranslations("common");

  const labels = {
    heading: t("auditHeading"),
    subtitle: t("auditSubtitle"),
    empty: t("auditEmpty"),
    emptyBody: t("auditEmptyBody"),
    loading: tc("loading"),
    thWhen: t("auditThWhen"),
    thWho: t("auditThWho"),
    thAction: t("auditThAction"),
    thWhat: t("auditThWhat"),
    thChanges: t("auditThChanges"),
    filterType: t("auditFilterType"),
    filterAction: t("auditFilterAction"),
    filterAll: t("filterAll"),
    clearFilter: t("auditClearFilter"),
    fromLabel: t("auditFrom"),
    toLabel: t("auditTo"),
    yes: t("auditYes"),
    no: t("auditNo"),
    status: {
      draft: t("auditStatusDraft"),
      published: t("auditStatusPublished"),
      archived: t("auditStatusArchived"),
    } as Record<string, string>,
    searchLabel: t("auditSearchLabel"),
    searchPlaceholder: t("auditSearchPlaceholder"),
    changesNone: t("auditChangesNone"),
    retry: t("auditRetry"),
    noAccessTitle: t("auditNoAccessTitle"),
    noAccessBody: t("auditNoAccessBody"),
    noAccessBack: t("auditNoAccessBack"),
    itemType: {
      course: t("auditTypeCourse"),
      chapter: t("auditTypeChapter"),
      procedure: t("auditTypeProcedure"),
      assignment: t("auditTypeAssignment"),
      station: t("auditTypeStation"),
      location: t("auditTypeLocation"),
      job: t("auditTypeJob"),
    } as Record<AuditItemType, string>,
    action: {
      create: t("auditActionCreate"),
      update: t("auditActionUpdate"),
      delete: t("auditActionDelete"),
      publish: t("auditActionPublish"),
      archive: t("auditActionArchive"),
      unarchive: t("auditActionUnarchive"),
      assign: t("auditActionAssign"),
      unassign: t("auditActionUnassign"),
      reorder: t("auditActionReorder"),
      override: t("auditActionOverride"),
      revoke_override: t("auditActionRevokeOverride"),
    } as Record<string, string>,
    field: {
      title: t("auditFieldTitle"),
      titleEn: t("auditFieldTitleEn"),
      titleEs: t("auditFieldTitleEs"),
      purposeEn: t("auditFieldPurposeEn"),
      purposeEs: t("auditFieldPurposeEs"),
      status: t("auditFieldStatus"),
      name: t("auditFieldName"),
      stationIds: t("auditFieldStations"),
      assignUsers: t("auditFieldAssignUsers"),
      employees: t("auditFieldEmployees"),
      dueDate: t("auditFieldDueDate"),
      isRequired: t("auditFieldIsRequired"),
      mode: t("auditFieldMode"),
      remainingCount: t("auditFieldRemaining"),
      subcategoryId: t("auditFieldCategory"),
      isPromo: t("auditFieldPromo"),
      blocksEn: t("auditFieldContentEn"),
      blocksEs: t("auditFieldContentEs"),
      blocks: t("auditFieldBlocks"),
      subtitleEn: t("auditFieldSubtitleEn"),
      subtitleEs: t("auditFieldSubtitleEs"),
      position: t("auditFieldPosition"),
      number: t("auditFieldPosition"),
      added: t("auditFieldAdded"),
      removed: t("auditFieldRemoved"),
      content: t("auditFieldContent"),
      chapters: t("auditFieldChapters"),
      overrideUntil: t("auditFieldOverrideUntil"),
      reason: t("auditFieldReason"),
    } as Record<string, string>,
  };

  return (
    <div className="mx-auto w-full max-w-page space-y-6 pb-12">
      <PageHeader title={labels.heading} subtitle={labels.subtitle} />

      <AuditClientTable
        locale={locale}
        initialItemType={itemType}
        initialSearch={q}
        labels={labels}
      />
    </div>
  );
}
