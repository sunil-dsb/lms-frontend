"use client";

import * as React from "react";
import Link from "next/link";
import { flushSync } from "react-dom";
import { LuArrowUpRight, LuLogOut, LuMoon } from "react-icons/lu";
import { LocaleSwitch } from "@/components/ui/locale-switch";
import { EmployeeTopBarBackButton } from "./employee-top-bar-back-button";
import { THEME_COOKIE, THEME_MAX_AGE } from "@/lib/theme";

interface EmployeeTopBarProps {
  locale: string;
  name: string;
  role?: string;
  canEnterAdmin: boolean;
  signOutAction: () => Promise<void>;
  labels: {
    signedInAs: string;
    signOut: string;
    admin: string;
    toDark: string;
    toLight: string;
    back: string;
    langLabel?: string;
    darkMode?: string;
    roleLabel?: string;
    restaurantName?: string;
  };
}

/**
 * Top navigation bar for employee-side surfaces.
 * Features:
 * - Brand logo (restaurant logo mark + "Alimentaria Mexicana")
 * - Bilingual locale switcher (EN / ES)
 * - User profile avatar button with terracotta accent ring
 * - Anchored dropdown menu with user info, dark mode toggle switch, admin link & sign out
 */
export function EmployeeTopBar({
  locale,
  name,
  canEnterAdmin,
  signOutAction,
  labels,
}: EmployeeTopBarProps): React.ReactElement {
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [isDark, setIsDark] = React.useState<boolean>(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  // Sync theme with document & cookie
  React.useEffect(() => {
    const root = document.documentElement;
    let pinned = root.getAttribute("data-theme");
    if (!pinned) {
      try {
        const legacy = localStorage.getItem(THEME_COOKIE);
        if (legacy === "dark" || legacy === "light") {
          document.cookie = `${THEME_COOKIE}=${legacy}; path=/; max-age=${THEME_MAX_AGE}; samesite=lax`;
          root.setAttribute("data-theme", legacy);
          pinned = legacy;
        }
        localStorage.removeItem(THEME_COOKIE);
      } catch {}
    }
    setIsDark(
      pinned
        ? pinned === "dark"
        : window.matchMedia("(prefers-color-scheme: dark)").matches,
    );
  }, []);

  // Close menu on click outside or Escape
  React.useEffect(() => {
    if (!isOpen) return;

    function handlePointer(e: PointerEvent): void {
      const target = e.target as Node | null;
      if (!target) return;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setIsOpen(false);
    }

    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function toggleDark(): void {
    const next = !isDark;
    const apply = (): void => {
      document.documentElement.setAttribute(
        "data-theme",
        next ? "dark" : "light",
      );
      flushSync(() => setIsDark(next));
    };

    document.cookie = `${THEME_COOKIE}=${next ? "dark" : "light"}; path=/; max-age=${THEME_MAX_AGE}; samesite=lax`;
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => unknown;
    };
    if (typeof doc.startViewTransition === "function") {
      doc.startViewTransition(apply);
    } else {
      apply();
    }
  }

  const initial = (name.trim().charAt(0) || "U").toUpperCase();
  const roleDisplay = labels.roleLabel || "Employee";
  const restaurantName = labels.restaurantName || "Alimentaria Mexicana";

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4 sm:px-6 shrink-0 select-none"
      style={{ height: "56px", minHeight: "56px" }}
    >
      {/* Brand: Brand logo + Alimentaria Mexicana */}
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <EmployeeTopBarBackButton label={labels.back} />
        <Link
          href={`/${locale}/employee/home`}
          className="flex items-center gap-2.5 transition-opacity hover:opacity-85 active:scale-98"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand-mark.png"
            alt={restaurantName}
            width={30}
            height={30}
            style={{ width: "30px", height: "30px" }}
            className="rounded-full object-cover shrink-0"
          />
          <span className="font-[family-name:var(--font-ui)] font-normal text-sm sm:text-base tracking-tight text-[var(--color-ink)] leading-none truncate">
            {restaurantName}
          </span>
        </Link>
      </div>

      {/* Right controls: Language switcher + User avatar trigger */}
      <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
        <LocaleSwitch locale={locale} label={labels.langLabel ?? "Language"} />

        {/* User avatar button with terracotta ring */}
        <div className="relative flex items-center">
          <button
            ref={triggerRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={isOpen}
            aria-label={labels.signedInAs}
            onClick={() => setIsOpen((prev) => !prev)}
            style={{ width: "34px", height: "34px" }}
            className="flex items-center justify-center rounded-full bg-[#1e1b18] text-white font-semibold text-xs sm:text-sm cursor-pointer transition-transform active:scale-95 ring-2 ring-[var(--color-brand-600)] ring-offset-2 ring-offset-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--color-ring)]"
          >
            {initial}
          </button>

          {/* User profile dropdown popover */}
          {isOpen && (
            <div
              ref={menuRef}
              role="menu"
              aria-label="User account menu"
              className="absolute right-0 top-[calc(100%+8px)] z-50 rounded-2xl border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-xl shadow-black/8 select-none"
              style={{ width: "220px", padding: "16px" }}
            >
              {/* User info */}
              <div className="space-y-0.5">
                <p className="font-bold text-sm sm:text-base text-[var(--color-ink)] leading-tight">
                  {name}
                </p>
                <p className="text-xs text-[var(--color-ink-2)]">
                  {roleDisplay}
                </p>
              </div>

              <div className="my-3 border-t border-[var(--color-line-2)]" />

              {/* Dark mode toggle row with pill switch */}
              <div className="flex items-center justify-between py-1">
                <div
                  className="flex items-center text-[var(--color-ink)]"
                  style={{ gap: "10px" }}
                >
                  <LuMoon
                    className="size-4 shrink-0 text-[var(--color-ink)]"
                    aria-hidden="true"
                  />
                  <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
                    {labels.darkMode || "Dark mode"}
                  </span>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={isDark}
                  aria-label={labels.darkMode || "Dark mode"}
                  onClick={toggleDark}
                  className={`relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] ${
                    isDark
                      ? "bg-[var(--color-brand-600)]"
                      : "bg-[#e5dfd7] dark:bg-[var(--color-panel-2)]"
                  }`}
                  style={{
                    width: "44px",
                    height: "24px",
                    padding: "2px",
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none inline-block rounded-full bg-white shadow-xs transition-transform duration-200 ease-in-out"
                    style={{
                      width: "20px",
                      height: "20px",
                      transform: isDark
                        ? "translateX(20px)"
                        : "translateX(0px)",
                    }}
                  />
                </button>
              </div>

              {/* Admin Link if authorized */}
              {canEnterAdmin && (
                <>
                  <div className="my-2 border-t border-[var(--color-line-2)]" />
                  <Link
                    href={`/${locale}/admin`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center py-1 text-xs sm:text-sm font-medium text-[var(--color-ink)] hover:text-[var(--color-brand-600)] transition-colors"
                    style={{ gap: "10px" }}
                  >
                    <LuArrowUpRight
                      className="size-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{labels.admin}</span>
                  </Link>
                </>
              )}

              {/* Sign out button */}
              <div className="my-2 border-t border-[var(--color-line-2)]" />
              <form action={signOutAction} className="pt-1">
                <button
                  type="submit"
                  className="flex items-center text-xs sm:text-sm font-semibold text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] transition-colors cursor-pointer w-full text-left"
                  style={{ gap: "10px" }}
                >
                  <LuLogOut
                    className="size-4 shrink-0 text-[var(--color-brand-600)]"
                    aria-hidden="true"
                  />
                  <span>{labels.signOut}</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
