import * as React from "react";
import { setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

interface ForgotPasswordPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ForgotPasswordPage({
  params,
}: ForgotPasswordPageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AuthShell locale={locale}>
      <ForgotPasswordForm locale={locale} />
    </AuthShell>
  );
}
