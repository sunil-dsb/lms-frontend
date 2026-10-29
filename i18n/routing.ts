import { defineRouting } from "next-intl/routing";

// Single source of truth for supported locales.
// English and Spanish are the initial set; architecture must allow more without schema change.
export const routing = defineRouting({
  locales: ["en", "es"] as const,
  defaultLocale: "en",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
