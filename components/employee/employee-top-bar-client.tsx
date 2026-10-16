"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { EmployeeTopBar } from "./employee-top-bar";
import { useMe } from "@/services/auth/hooks";

/**
 * Client half of the employee shell. The layout paints this instantly;
 * the session resolves through the shared `useMe` cache — skeleton bar
 * while it loads, top bar when it lands, login bounce on 401. The layout
 * already redirected cookieless visitors server-side, so reaching here
 * without a session means an expired token, not a logged-out user.
 */
export function EmployeeTopBarClient({
  locale,
  signOutAction,
  loginHref,
}: {
  locale: string;
  signOutAction: () => Promise<void>;
  loginHref: string;
}): React.ReactElement {
  const router = useRouter();
  const t = useTranslations("employee");
  const tCommon = useTranslations("app");
  const { employee, isLoading, error } = useMe();

  React.useEffect(() => {
    if (!isLoading && (error || !employee)) router.replace(loginHref);
  }, [isLoading, error, employee, router, loginHref]);

  if (isLoading || error || !employee) {
    return (
      <header
        aria-busy="true"
        aria-label="Loading account"
        className="flex items-center justify-between gap-2 border-b border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5 sm:px-6 sm:py-3"
      >
        <Skeleton className="h-4 w-40" />
        <div className="flex shrink-0 items-center gap-3">
          <Skeleton className="size-8 rounded-full bg-[var(--color-panel)]" />
          <Skeleton className="h-8 w-20 rounded-full bg-[var(--color-panel)]" />
        </div>
      </header>
    );
  }

  return (
    <EmployeeTopBar
      locale={locale}
      name={employee.name}
      canEnterAdmin={
        employee.role === "admin" ||
        employee.role === "super_admin" ||
        employee.accessLevel === "manager"
      }
      signOutAction={signOutAction}
      labels={{
        signedInAs: t("signedInAs", { name: employee.name }),
        signOut: t("signOut"),
        admin: tCommon("admin"),
        toDark: tCommon("themeToDark"),
        toLight: tCommon("themeToLight"),
        back: t("back"),
      }}
    />
  );
}
