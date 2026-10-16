import type { ReactNode } from "react";
import * as React from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { logout } from "@/lib/api";
import { EmployeeTopBarClient } from "@/components/employee/employee-top-bar-client";

/**
 * Employee shell — paints instantly, never waits on the backend.
 *
 * Previously this layout awaited `/auth/me` before rendering anything, so
 * every /employee/* navigation paid a full backend round-trip (~2s) before
 * first paint — and then each page paid it AGAIN for its own data. Now the
 * server only checks cookie *presence* (instant, no backend): cookieless
 * visitors bounce to /login immediately. Everyone else gets the shell at
 * once; `EmployeeTopBarClient` resolves the session through the shared
 * `useMe` cache (skeleton → top bar, login bounce on 401) and each page
 * streams its own sections the same way.
 */
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
      <div className="flex-1">{children}</div>
    </div>
  );
}

interface EmployeeLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}
