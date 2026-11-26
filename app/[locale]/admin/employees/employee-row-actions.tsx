"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { deactivateEmployee } from "@/services/employees/api";
import { RowActions, type RowActionItem } from "@/components/ui/row-actions";
import type { AdminEmployee } from "@/lib/types";
import { LuBan, LuPencil, LuSend } from "react-icons/lu";
import { ResendInviteModal } from "./resend-invite-modal";
import { EMPLOYEES_QUERY_KEY } from "@/services/employees/hooks";
import { useMe } from "@/services/auth/hooks";
import {
  canDeactivateEmployees,
  canEditEmployees,
  isManager,
  isSuperAdmin,
} from "@/lib/rbac";

interface EmployeeRowActionsProps {
  locale: string;
  employee: AdminEmployee;
  /** When provided, the kebab's Edit item calls this instead of
   *  navigating. The detail page passes its `openEdit` so the kebab Edit
   *  opens the modal directly — without it, clicking Edit on a page
   *  you're already on would just re-route to itself. The list page
   *  omits this and falls back to navigation. */
  onEdit?: () => void;
  /** When true, omits the Edit item (e.g. on detail pages where a dedicated header Edit button already exists). */
  hideEdit?: boolean;
}

export function EmployeeRowActions({
  locale,
  employee,
  onEdit,
  hideEdit = false,
}: EmployeeRowActionsProps): React.ReactElement | null {
  const t = useTranslations("admin");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [_pending, startTransition] = useTransition();
  const [isResendOpen, setIsResendOpen] = useState(false);
  const { employee: me } = useMe();
  const isSelf = me?.id === employee.id;
  const isSuper = isSuperAdmin(me?.role);
  const isManagerUser = isManager(me?.role);
  const isTargetElevated =
    employee.role === "manager" || employee.role === "super_admin";

  const canEdit =
    canEditEmployees(me?.role) &&
    (!isSelf || isSuper) &&
    (!isManagerUser || !isTargetElevated);

  const canDeactivate =
    canDeactivateEmployees(me?.role) &&
    (!isSelf || isSuper) &&
    (!isManagerUser || !isTargetElevated);

  function refresh(): void {
    router.refresh();
  }

  function handleEdit(): void {
    if (!canEdit) return;
    if (onEdit) {
      onEdit();
      return;
    }
    // No callback provided — assume the caller is the list and the user
    // needs to navigate to the detail page. Use the locale-aware path
    // so the same row in the EN and ES routes lands on the right page.
    router.push(`/${locale}/admin/employees/${employee.id}/edit`);
  }

  function onResend(): void {
    if (!canDeactivate) return;
    setIsResendOpen(true);
  }

  function onDeactivate(): void {
    if (!canDeactivate) return;
    startTransition(async () => {
      try {
        await deactivateEmployee(employee.id);
        await queryClient.invalidateQueries({ queryKey: EMPLOYEES_QUERY_KEY });
        refresh();
      } catch {
        // page refresh reflects the error
      }
    });
  }

  function buildItems(): RowActionItem[] {
    const editItem: RowActionItem = {
      label: t("actionsEdit"),
      icon: LuPencil,
      onSelect: handleEdit,
    };

    const allowedEdit = canEdit && !hideEdit;

    if (employee.status === "pending") {
      return [
        ...(allowedEdit ? [editItem] : []),
        ...(canDeactivate
          ? [
              {
                label: t("actionsResend"),
                icon: LuSend,
                onSelect: onResend,
              },
              {
                label: t("actionsDeactivate"),
                icon: LuBan,
                destructive: true,
                confirmTitle:
                  locale === "es"
                    ? "¿Desactivar empleado?"
                    : "Deactivate employee?",
                confirmDescription:
                  locale === "es"
                    ? "El empleado quedará inactivo y se conservarán sus datos."
                    : "This employee will be deactivated and their records will be kept.",
                confirmLabel: locale === "es" ? "Desactivar" : "Deactivate",
                onSelect: onDeactivate,
              },
            ]
          : []),
      ];
    }
    if (employee.status === "active") {
      return [
        ...(allowedEdit ? [editItem] : []),
        ...(canDeactivate
          ? [
              {
                label: t("actionsDeactivate"),
                icon: LuBan,
                destructive: true,
                confirmTitle:
                  locale === "es"
                    ? "¿Desactivar empleado?"
                    : "Deactivate employee?",
                confirmDescription:
                  locale === "es"
                    ? "El empleado quedará inactivo y se conservarán sus datos."
                    : "This employee will be deactivated and their records will be kept.",
                confirmLabel: locale === "es" ? "Desactivar" : "Deactivate",
                onSelect: onDeactivate,
              },
            ]
          : []),
      ];
    }
    return allowedEdit ? [editItem] : [];
  }

  const items = buildItems();
  if (items.length === 0) return null;

  return (
    <>
      <RowActions
        items={items}
        triggerLabel={`${t("rowActionsLabel")}: ${employee.name}`}
      />
      {employee.status === "pending" && canDeactivate ? (
        <ResendInviteModal
          open={isResendOpen}
          onClose={() => setIsResendOpen(false)}
          employee={employee}
          locale={locale}
        />
      ) : null}
    </>
  );
}
