import * as React from "react";
import { setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { lookupInvite } from "@/lib/api";
import { SetPasswordForm } from "./set-password-form";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function SetPasswordLandingPage({
  params,
  searchParams,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  const { token } = await searchParams;
  setRequestLocale(locale);

  let employeeName = "";
  let employeeEmail = "";
  if (token) {
    try {
      const info = await lookupInvite(token);
      employeeName = info.employeeName;
      employeeEmail = (info as { email?: string }).email || "";
    } catch {
      // fallback
    }
  }

  return (
    <AuthShell locale={locale}>
      <SetPasswordForm
        locale={locale}
        token={token ?? ""}
        employeeName={employeeName}
        employeeEmail={employeeEmail}
      />
    </AuthShell>
  );
}
