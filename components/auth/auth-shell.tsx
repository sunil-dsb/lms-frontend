"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { LocaleSwitch } from "@/components/ui/locale-switch";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface AuthShellProps {
  locale?: string;
  children: React.ReactNode;
}

/**
 * Shared shell for every screen a guest can act on: sign-in, forgot-password,
 * reset-password, the invite-accept set-password page. The chrome on those pages
 * is the restaurant itself (logo + name) rather than admin / employee
 * navigation — there is nothing to navigate to until the user has an account.
 *
 * The EN / ES toggle is pinned to the top-right so a guest who landed on
 * `/es/login` but reads English (or vice versa) can switch without hunting.
 * It is small (a `segbar`), does not displace the centered brand block, and
 * sits in front of the ambient lighting so it stays legible against either
 * the white surface or the peach glow underneath.
 */
export function AuthShell({
  locale,
  children,
}: AuthShellProps): React.ReactElement {
  const t = useTranslations("app");

  return (
    <div className="relative min-h-[100dvh] w-full flex flex-col bg-[var(--color-bg)] text-[var(--color-ink)] selection:bg-[var(--color-brand-tint)] selection:text-[var(--color-brand-700)] overflow-x-hidden">
      {/* Background ambient lighting */}
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[100px] opacity-25 dark:opacity-20"
          style={{
            background:
              "radial-gradient(circle, var(--color-brand) 0%, rgba(235, 89, 64, 0.12) 50%, transparent 80%)",
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-[350px] h-[350px] rounded-full blur-[120px] opacity-15 dark:opacity-10"
          style={{
            background:
              "radial-gradient(circle, var(--color-brand-600) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Language + theme — fixed top-right, sit above the ambient lighting
          (z-20 vs the lights at z-0). Pinned here rather than inside the
          form so they are reachable on mobile where the brand moves into the
          card. The segbar styling already keeps the hit area at 36 px; the
          theme toggle is the same size. Order matches the admin / employee
          top bar so the right edge of every screen looks the same. */}
      {locale ? (
        <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-20 flex items-center gap-2 sm:gap-3">
          <ThemeToggle
            labels={{ toDark: t("themeToDark"), toLight: t("themeToLight") }}
          />
          <LocaleSwitch locale={locale} label={t("langLabel")} />
        </div>
      ) : null}

      {/* Full-Length Mobile Container */}
      <div className="relative z-10 w-full max-w-[480px] mx-auto min-h-[100dvh] flex flex-col pt-3 sm:pt-0">
        {/* Top Restaurant Logo & Name Header - Shown on desktop; on mobile it is moved inside the form */}
        <div className="hidden sm:flex flex-col items-center justify-center text-center gap-2 pt-6 pb-4 shrink-0 px-4">
          {/* Circular Restaurant Logo */}
          <div className="flex items-center justify-center rounded-full bg-white shadow-md border-2 border-[var(--color-line-2)] p-1.5 shrink-0 transition-transform hover:scale-105 w-[58px] h-[58px]">
            <img
              src="/brand-mark.png"
              alt="Alimentaria Mexicana"
              className="object-contain rounded-full w-full h-full"
            />
          </div>

          {/* Restaurant Name */}
          <h1 className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-[var(--color-ink)] leading-tight">
            Alimentaria Mexicana
          </h1>
        </div>

        {/* Full-Length Form Sheet Area */}
        <main className="flex-1 w-full flex flex-col">{children}</main>
      </div>
    </div>
  );
}
