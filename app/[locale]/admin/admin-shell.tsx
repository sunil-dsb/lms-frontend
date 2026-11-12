"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Employee, SystemRole } from "@/lib/types";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LocaleSwitch } from "@/components/ui/locale-switch";
import { LuArrowUpRight, LuMenu, LuX } from "react-icons/lu";
import {
  Sidebar,
  NAV_GROUPS,
  type NavGroup,
  type NavItem,
} from "./components/admin-sidebar";

export type { NavGroup, NavItem };

/**
 * AdminShell — DESIGN.md §3.5 admin navigation.
 *
 * Desktop (>= 900 px): persistent sidebar on the left, main content
 *   to the right. Brandmark + grouped nav + counts + sign-out at the
 *   bottom. Targets are 36 px (admin density).
 *
 * Below 900 px: the sidebar hides and a single hamburger button appears
 *   in the top bar. Tapping it opens a drawer containing the same nav.
 *   Targets become 48 px because the user is now touch (DESIGN.md §5).
 *
 * The drawer uses a focus trap-lite: focus moves into the drawer when
 * it opens, and pressing Escape closes it. Body scroll is locked while
 * the drawer is open so the page underneath doesn't move.
 *
 * The nav is flat: one level, one name per thing. `Library` used to be a
 * parent row holding a child also called `Library`, so the same word appeared
 * twice in a column and neither one said what it opened.
 *
 * What is not built yet (training) is marked rather than hidden: a manager who
 * was promised it looks for it, and a row that says "Soon" answers that, where
 * an unmarked row that lands on an empty page does not.
 *
 * Active-state rules: the longest-prefix matching href wins. So when
 * the user is on /admin/library/categories, only `Categories` shows as
 * active — `Library` is shown as "ancestor active" (softer highlight),
 * never double-active.
 */

interface AdminShellProps {
  children: React.ReactNode;
  locale: string;
  employee: Pick<Employee, "id" | "name" | "role">;
  /** The restaurant this admin area belongs to. The sidebar is the chrome, so
   *  the workspace name lives there rather than being repeated on every page. */
  workspace: string;
  signOutAction: () => Promise<void>;
}

export function AdminShell({
  children,
  locale,
  employee,
  workspace,
  signOutAction,
}: AdminShellProps): React.ReactElement {
  const t = useTranslations("admin");
  const tApp = useTranslations("app");
  const tShell = useTranslations("admin.shell");
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Rows some roles must not see. The audit log is super_admin-only — the
  // API answers 403 for anyone else, so don't show a door that isn't theirs.
  const visibleGroups = React.useMemo(() => {
    const role = employee.role as SystemRole;
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => item.roles === undefined || item.roles.includes(role),
      ),
    })).filter((group) => group.items.length > 0);
  }, [employee.role]);

  const activeHref = React.useMemo(() => {
    // Longest matching href wins — the most specific item is "the"
    // current page. Initialised to `null` (not `''`) so the `Home` row,
    // whose own href is the empty string, doesn't accidentally light up
    // on every non-admin route the shell is wrapped around (e.g. the
    // shared /procedures/* detail pages — admins there aren't "on Home",
    // they're on a procedure).
    let best: string | null = null;
    for (const group of visibleGroups) {
      for (const item of group.items) {
        const full = `/${locale}/admin${item.href}`;
        const matches =
          item.href === ""
            ? pathname === full || pathname === `${full}/`
            : pathname === full || pathname.startsWith(`${full}/`);
        if (matches && (best === null || item.href.length > best.length)) {
          best = item.href;
        }
      }
    }
    return best;
  }, [pathname, locale, visibleGroups]);

  function isActive(href: string): boolean {
    return activeHref === href;
  }

  // Close drawer on route change so the user lands clean.
  const lastPath = React.useRef(pathname);
  React.useEffect(() => {
    if (lastPath.current !== pathname) {
      lastPath.current = pathname;
      setDrawerOpen(false);
    }
  }, [pathname]);

  // Escape closes the drawer; lock body scroll while it's open.
  React.useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [drawerOpen]);

  const sidebarProps = {
    locale,
    employee,
    workspace,
    groups: visibleGroups,
    labelFor: (key: string) => t(key),
    headingFor: (key: string) => tShell(key),
    isActive,
    onNavigate: () => setDrawerOpen(false),
    signOutLabel: t("signOut"),
    backToAppLabel: t("backToApp"),
    titleLabel: tShell("title"),
    soonLabel: tShell("soon"),
    langLabel: tShell("langLabel"),
    themeToDarkLabel: tApp("themeToDark"),
    themeToLightLabel: tApp("themeToLight"),
    signOutAction,
  };

  const isProcedureDetailPage = React.useMemo(() => {
    // When viewing an individual procedure in the admin library (e.g. /admin/library/[id]),
    // make the background pure white to match the procedure document sheet.
    // Edit page /admin/library/[id]/edit is a wizard form, so keep the standard admin background.
    const parts = pathname.split("/").filter(Boolean);
    const adminIdx = parts.indexOf("admin");
    if (
      adminIdx !== -1 &&
      parts[adminIdx + 1] === "library" &&
      parts[adminIdx + 2]
    ) {
      const segment = parts[adminIdx + 2];
      const subSegment = parts[adminIdx + 3];
      return (
        segment !== "new" && segment !== "categories" && subSegment !== "edit"
      );
    }
    return false;
  }, [pathname]);

  // Training course detail pages (/admin/training/[id]) render a full-bleed
  // course view that manages its own layout and has a fixed sticky button.
  // Strip the shell padding so it can fill the available column correctly.
  const isTrainingCoursePage = React.useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    const adminIdx = parts.indexOf("admin");
    if (
      adminIdx !== -1 &&
      parts[adminIdx + 1] === "training" &&
      parts[adminIdx + 2] &&
      parts[adminIdx + 2] !== "new"
    ) {
      // /admin/training/[id] and /admin/training/[id]?chapter=N — fullbleed
      // But NOT /admin/training/[id]/edit (the wizard keeps shell padding)
      return parts[adminIdx + 3] !== "edit";
    }
    return false;
  }, [pathname]);

  return (
    <div
      className={cn(
        "flex min-h-screen w-full",
        isProcedureDetailPage
          ? "bg-[var(--color-bg)]"
          : "bg-[var(--color-bg-admin)]",
      )}
    >
      {/* Desktop sidebar — visible at >= 900 px (DESIGN.md §5). */}
      <Sidebar {...sidebarProps} className="hidden lg:flex" />

      {/* Mobile top bar — visible below 900 px. */}
      <header className="fixed inset-x-0 top-0 z-sticky flex h-bar items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-surface)] px-2 sm:px-3 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label={tShell("openNav")}
          className={cn(
            "inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-[var(--radius-md)] shrink-0",
            "text-[var(--color-ink)] transition-colors duration-[var(--dur)] ease-[var(--ease)] cursor-pointer",
            "hover:bg-[var(--color-panel)] active:translate-y-px",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2",
          )}
        >
          <LuMenu aria-hidden="true" className="text-lg" />
        </button>
        <span className="font-[family-name:var(--font-ui)] text-sm sm:text-md font-semibold tracking-tight text-[var(--color-ink)] shrink-0">
          {tShell("title")}
        </span>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <ThemeToggle
            labels={{
              toDark: tApp("themeToDark"),
              toLight: tApp("themeToLight"),
            }}
          />
          <LocaleSwitch locale={locale} label={tShell("langLabel")} />
        </div>
      </header>

      {/* Mobile drawer — slide-in from the left, full-height, dark backdrop. */}
      {drawerOpen ? (
        <div
          className="fixed inset-0 z-backdrop lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={tShell("title")}
        >
          <button
            type="button"
            aria-label={tShell("closeNav")}
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 cursor-default bg-scrim"
          />
          <div
            className={cn(
              "absolute inset-y-0 left-0 flex w-sheet max-w-sheet flex-col",
              "border-r border-[var(--color-line)] bg-[var(--color-surface)]",
              "shadow-[var(--e-3)]",
            )}
            style={{ animation: "drawer-in var(--dur) var(--ease) both" }}
          >
            <div className="flex h-bar items-center justify-between border-b border-[var(--color-line)] px-4">
              <span className="font-[family-name:var(--font-ui)] text-md font-semibold tracking-tight text-[var(--color-ink)]">
                {tShell("title")}
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label={tShell("closeNav")}
                className={cn(
                  "inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)]",
                  "text-[var(--color-ink)] transition-colors duration-[var(--dur)] ease-[var(--ease)]",
                  "hover:bg-[var(--color-panel)] active:translate-y-px",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2",
                )}
              >
                <LuX aria-hidden="true" className="text-lg" />
              </button>
            </div>
            <Sidebar {...sidebarProps} className="flex flex-1 flex-col" />
          </div>
        </div>
      ) : null}

      {/* Main column. Pad-top accounts for the fixed mobile header. */}
      <div className="flex min-w-0 max-w-full flex-1 flex-col overflow-x-hidden">
        {/* The desktop bar. It holds the link to what the cooks see, the theme
            toggle, and which language you are reading it in — the things that
            belong to the whole admin area rather than to one page. The page's
            own title stays on the page — repeating it here would be the same
            words twice on one screen.

            It is not shown below 900px: there the mobile header already occupies
            that row, and a phone has no space for a field this wide. */}
        <header className="sticky top-0 z-sticky hidden h-[75px] min-h-[75px] items-center border-b border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 sm:px-6 lg:px-10 shadow-[var(--e-1)] backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--color-surface)_80%,transparent)] lg:flex">
          <div className="mx-auto flex w-full max-w-page items-center justify-end gap-3">
            {/* The way across to what the cooks see. The employee bar has the same
                link back, under the name of the area it opens — so this one is
                "Employee", not "Preview" or "Back": the two sides name each other
                the same way. The sidebar footer has it too, for the phone, where
                this bar is not shown. */}
            <Link
              href={`/${locale}/employee/home`}
              className="inline-flex min-h-tap-admin items-center gap-1 rounded-full px-3 text-sm font-medium text-[var(--color-ink-2)] transition-colors duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-panel)] hover:text-[var(--color-ink)]"
            >
              {t("backToApp")}
              {/* The mark for a link that leaves this area for the other one. */}
              <LuArrowUpRight aria-hidden="true" />
            </Link>
            <ThemeToggle
              labels={{
                toDark: tApp("themeToDark"),
                toLight: tApp("themeToLight"),
              }}
            />
            <LocaleSwitch locale={locale} label={tShell("langLabel")} />
          </div>
        </header>

        <main
          className={cn(
            "min-w-0 max-w-full flex-1 px-3 sm:px-6 lg:px-10 pb-12 pt-6 lg:pb-12 lg:pt-8 overflow-x-hidden",
            isProcedureDetailPage && "bg-[var(--color-bg)]",
          )}
        >
          {/* Keyed by locale, so the fade runs when the language changes rather
              than on every render. */}
          <div
            key={locale}
            className="content-in pt-10 lg:pt-0 max-w-full overflow-x-hidden"
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
