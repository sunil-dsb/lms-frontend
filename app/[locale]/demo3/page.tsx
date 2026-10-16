import * as React from "react";
import { setRequestLocale } from "next-intl/server";
import { GuacamoleRecipe } from "./guacamole-recipe";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const metadata = { title: "Guacamole Fresco — Alimentaria" };

/** A 23-step recipe, to see how a long method reads. No sign-in: a demo. */
export default async function Demo3Page({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);
  return <GuacamoleRecipe />;
}
