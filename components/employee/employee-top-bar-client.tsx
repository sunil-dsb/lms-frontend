"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
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
}): React.ReactElement | null {
  const router = useRouter();
  const pathname = usePathname();
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
        className="flex items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-surface)] px-3 sm:px-6 shrink-0"
        style={{ height: "56px", minHeight: "56px" }}
      >
        <div className="flex items-center" style={{ gap: "8px" }}>
          <Skeleton
            className="rounded-full bg-[var(--color-panel-2)]"
            style={{ width: "28px", height: "28px" }}
          />
          <Skeleton
            className="h-4 rounded bg-[var(--color-panel-2)]"
            style={{ width: "120px" }}
          />
        </div>
        <div className="flex shrink-0 items-center" style={{ gap: "10px" }}>
          <Skeleton
            className="rounded-full bg-[var(--color-panel)]"
            style={{ width: "64px", height: "34px" }}
          />
          <Skeleton
            className="rounded-full bg-[var(--color-panel)]"
            style={{ width: "34px", height: "34px" }}
          />
        </div>
      </header>
    );
  }

  const roleLabel =
    employee.role === "admin" || employee.role === "super_admin"
      ? tCommon("admin")
      : employee.role === "manager"
        ? "Manager"
        : t("roleEmployee");

  return (
    <EmployeeTopBar
      locale={locale}
      name={employee.name}
      role={employee.role}
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
        langLabel: tCommon("langLabel"),
        darkMode: t("darkMode"),
        roleLabel,
        restaurantName: tCommon("title"),
      }}
    />
  );
}
