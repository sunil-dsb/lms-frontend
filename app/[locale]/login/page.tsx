import * as React from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "./login-form";

interface LoginPageProps {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ status?: string; email?: string }>;
}

export default async function LoginPage({
  params,
  searchParams,
}: LoginPageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  setRequestLocale(locale);

  return (
    <AuthShell locale={locale}>
      <LoginForm
        locale={locale}
        initialEmail={resolvedSearchParams?.email}
        status={resolvedSearchParams?.status}
      />
    </AuthShell>
  );
}
