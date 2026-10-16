import * as React from "react";
import { setRequestLocale } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { InviteLinkForm } from "./invite-link-form";

interface InviteTokenPageProps {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function InviteTokenPage({
  params,
  searchParams,
}: InviteTokenPageProps): Promise<React.ReactElement> {
  const { locale, token: routeToken } = await params;
  const { token: queryToken } = await searchParams;
  setRequestLocale(locale);

  const token =
    (routeToken && routeToken !== "token" ? routeToken : queryToken) ||
    queryToken ||
    routeToken;

  return (
    <AuthShell locale={locale}>
      <InviteLinkForm locale={locale} token={token} />
    </AuthShell>
  );
}
