import type { ReactNode } from "react";
import * as React from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { fetchMe, listLocations, logout } from "@/lib/api";
import type { Employee } from "@/lib/types";
import { AdminShell } from "./admin-shell";

/**
 * Admin layout — server-side auth + locale, then hands the rendered
 * children to the client AdminShell which owns the sidebar / drawer.
 *
 * The auth check stays here (server) so the cookie is read on the
 * server with `cookies()` and we can `redirect()` before any client
 * code runs. The shell stays client because it owns drawer state.
 *
 * ANY auth-check failure — expired session (401), transient network,
 * upstream 5xx, database blip — redirects to /login with
 * `?reason=session`. A dead-end error card is a worse experience than
 * a sign-in screen that explains what happened; the login page shows
 * a notice so the bounce never feels like a random logout.
 */

interface AdminLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function AdminLayout({
  children,
  params,
}: AdminLayoutProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  let employee: Employee;
  let workspace = "";
  try {
    // Auth + workspace resolve together: the locations list does not depend
    // on the /auth/me result (the location match happens locally below),
    // so awaiting them one after the other wastes a full backend round-trip
    // (~2s) on every /admin navigation.
    const [meRes, locRes] = await Promise.allSettled([
      fetchMe(cookieHeader),
      listLocations(cookieHeader),
    ]);
    if (meRes.status === "rejected") throw meRes.reason;
    employee = meRes.value.employee;
    if (locRes.status === "fulfilled") {
      const { locations } = locRes.value;
      workspace =
        (locations.find((l) => l.id === employee.locationId) ?? locations[0])
          ?.name ?? "";
    }
  } catch {
    // Any failure — expired session, network blip, 5xx — lands on the
    // login screen with a reason flag so it explains itself instead of
    // showing a dead-end error card.
    redirect(`/${locale}/login?reason=session`);
  }

  async function signOut(): Promise<void> {
    "use server";
    await logout();
    redirect(`/${locale}/login`);
  }

  return (
    <AdminShell
      locale={locale}
      employee={{ id: employee.id, name: employee.name, role: employee.role }}
      workspace={workspace}
      signOutAction={signOut}
    >
      {children}
    </AdminShell>
  );
}
