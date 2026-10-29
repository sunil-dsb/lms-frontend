import * as React from "react";
import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "./reset-password-form";

interface ResetPasswordPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ResetPasswordPage({
  params,
}: ResetPasswordPageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AuthShell locale={locale}>
      <Suspense
        fallback={
          <div className="h-96 w-full animate-pulse rounded-3xl bg-[var(--color-surface)]" />
        }
      >
        <ResetPasswordForm locale={locale} />
      </Suspense>
    </AuthShell>
  );
}
