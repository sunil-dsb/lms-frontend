import * as React from "react";
import Link from "next/link";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { lookupInvite, ApiException } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";
import { SetPasswordForm } from "../set-password-form";

interface PageProps {
  params: Promise<{ locale: string; token: string }>;
}

export default async function SetPasswordTokenPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale, token } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("activate");

  let info: {
    employeeName: string;
    expiresAt: string;
    employeeStatus: "pending" | "active" | "deactivated";
  } | null = null;
  let errorCode:
    | "INVITE_NOT_FOUND"
    | "INVITE_EXPIRED"
    | "INVITE_ALREADY_USED"
    | "INVITE_CANCELLED"
    | null = null;
  try {
    info = await lookupInvite(token);
  } catch (err) {
    if (err instanceof ApiException) {
      if (
        err.code === "INVITE_NOT_FOUND" ||
        err.code === "INVITE_EXPIRED" ||
        err.code === "INVITE_ALREADY_USED" ||
        err.code === "INVITE_CANCELLED"
      ) {
        errorCode = err.code;
      } else {
        errorCode = "INVITE_NOT_FOUND";
      }
    } else {
      throw err;
    }
  }

  if (info && info.employeeStatus === "active") {
    return (
      <AuthShell locale={locale}>
        <Card
          className="flex-1 w-full border-t border-x sm:border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xl flex flex-col justify-between rounded-b-none sm:rounded-b-[32px] overflow-hidden pb-1 mb-0 sm:mb-20 text-center"
          style={{
            borderTopLeftRadius: "32px",
            borderTopRightRadius: "32px",
          }}
        >
          <div className="h-1.5 w-full bg-gradient-to-r from-[var(--color-brand)] to-[var(--color-brand-700)] shrink-0" />
          <CardHeader className="pt-8 pb-3 px-6 sm:px-8">
            <CardTitle className="font-[family-name:var(--font-display)] text-2xl font-bold">
              {t("alreadyActiveHeading")}
            </CardTitle>
            <CardDescription className="text-sm text-[var(--color-ink-2)] mt-2">
              {t("errorAlreadyActive")}
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-4 px-6 sm:px-8">
            <Link href={`/${locale}/login`} className="w-full">
              <Button className="w-full h-12 rounded-full font-semibold">
                {t("backToLogin")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </AuthShell>
    );
  }

  if (!info) {
    const message =
      errorCode === "INVITE_EXPIRED"
        ? t("errorExpired")
        : errorCode === "INVITE_ALREADY_USED"
          ? t("errorUsed")
          : errorCode === "INVITE_CANCELLED"
            ? t("errorCancelled")
            : t("errorNotFound");
    return (
      <AuthShell locale={locale}>
        <Card
          className="flex-1 w-full border-t border-x sm:border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-2xl flex flex-col justify-between rounded-b-none sm:rounded-b-[32px] overflow-hidden pb-1 mb-0 sm:mb-20 text-center"
          style={{
            borderTopLeftRadius: "32px",
            borderTopRightRadius: "32px",
          }}
        >
          <div className="h-1.5 w-full bg-gradient-to-r from-[var(--color-bad)] to-[var(--color-bad-fill)] shrink-0" />
          <CardHeader className="pt-8 pb-3 px-6 sm:px-8">
            <CardTitle className="font-[family-name:var(--font-display)] text-2xl font-bold">
              {t("invalidHeading")}
            </CardTitle>
            <CardDescription className="text-sm text-[var(--color-ink-2)] mt-2">
              {message}
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-4 px-6 sm:px-8">
            <Link href={`/${locale}/login`} className="w-full">
              <Button className="w-full h-12 rounded-full font-semibold">
                {t("backToLogin")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell locale={locale}>
      <SetPasswordForm
        locale={locale}
        token={token}
        employeeName={info.employeeName}
        employeeEmail={(info as { email?: string })?.email}
      />
    </AuthShell>
  );
}
