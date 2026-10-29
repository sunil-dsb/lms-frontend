import type { ReactNode } from "react";
import * as React from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { logout } from "@/lib/api";
import { EmployeeTopBarClient } from "@/components/employee/employee-top-bar-client";

export default async function EmployeeLayout({
  children,
  params,
}: EmployeeLayoutProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const hasSession =
    cookieStore.get("lms_token") ??
    cookieStore.get("better-auth.session_token");
  if (!hasSession) redirect(`/${locale}/login`);

  async function signOut(): Promise<void> {
    "use server";
    await logout();
    redirect(`/${locale}/login`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)]">
      <EmployeeTopBarClient
        locale={locale}
        signOutAction={signOut}
        loginHref={`/${locale}/login`}
      />

      {/* A div, not a second <main>: the page inside brings its own, and a document
          has one main. The page also brings its own padding and its own reading
          column, so this one only has to fill the height. */}
      <div className="flex-1 w-full min-h-0">{children}</div>
    </div>
  );
}

interface EmployeeLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}
