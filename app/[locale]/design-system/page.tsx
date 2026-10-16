import * as React from "react";
import { setRequestLocale } from "next-intl/server";
import { readDesignTokens } from "@/lib/design-tokens";
import { DesignSystem } from "./design-system";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const metadata = { title: "Design system — Alimentaria" };

/**
 * The design system, published from the code: the tokens are read out of
 * app/lms.css on the server, and every component shown is the real one from
 * components/ui and components/doc. No sign-in, like the demos, so the team
 * can open it.
 */
export default async function DesignSystemPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);
  const groups = await readDesignTokens();
  return <DesignSystem groups={groups} />;
}
