"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Employee } from "@/lib/types";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LocaleSwitch } from "@/components/ui/locale-switch";
import {
  LuArrowLeft,
  LuArrowUpRight,
  LuChartColumn,
  LuChefHat,
  LuCirclePlus,
  LuClipboardList,
  LuFolders,
  LuGraduationCap,
  LuHouse,
  LuLogOut,
  LuMenu,
  LuUserPlus,
  LuUsers,
  LuX,
} from "react-icons/lu";
import { Icon } from "@/components/ui/icon";
import { AdminSearch } from "@/components/admin/admin-search";
import type { IconType } from "react-icons";

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
 * What is not built yet (training, reports) is marked rather than hidden: a
 * manager who was promised it looks for it, and a row that says "Soon" answers
 * that, where an unmarked row that lands on an empty page does not.
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

type NavItem = {
  href: string;
  icon: IconType;
  labelKey: string;
  /** Marked in the nav and reachable, but the page behind it is a placeholder. */
  soon?: boolean;
};

type NavGroup = {
  headingKey:
    | "groupWorkspace"
    | "groupLibrary"
    | "groupTraining"
    | "groupPeople"
    | "groupSettings"
    | "groupSoon";
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    headingKey: "groupWorkspace",
    items: [{ href: "", icon: LuHouse, labelKey: "navHome" }],
  },
  {
    headingKey: "groupLibrary",
    items: [
      { href: "/library", icon: LuClipboardList, labelKey: "navProcedures" },
      {
        href: "/library/categories",
        icon: LuFolders,
        labelKey: "navCategories",
      },
      { href: "/library/new", icon: LuCirclePlus, labelKey: "navNewProcedure" },
    ],
  },
  {
    headingKey: "groupTraining",
    items: [
      { href: "/training", icon: LuGraduationCap, labelKey: "navCourses" },
      {
        href: "/training/progress",
        icon: LuChartColumn,
        labelKey: "navProgress",
      },
    ],
  },
  {
    headingKey: "groupPeople",
    items: [
      { href: "/employees", icon: LuUsers, labelKey: "navEmployees" },
      { href: "/employees/new", icon: LuUserPlus, labelKey: "inviteEmployee" },
    ],
  },
  {
    headingKey: "groupSettings",
    items: [
      // One Settings row that opens the single /admin/settings page — the
      // three sub-resources (stations, roles, locations) are now inline
      // panels in that page rather than separate URLs.
      { href: "/settings", icon: LuChefHat, labelKey: "navSettings" },
    ],
  },
  {
    headingKey: "groupSoon",
    items: [
      {
        href: "/reports",
        icon: LuChartColumn,
        labelKey: "navReports",
        soon: true,
      },
    ],
  },
];

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

  const activeHref = React.useMemo(() => {
    // Longest matching href wins — the most specific item is "the"
    // current page. Initialised to `null` (not `''`) so the `Home` row,
    // whose own href is the empty string, doesn't accidentally light up
    // on every non-admin route the shell is wrapped around (e.g. the
    // shared /procedures/* detail pages — admins there aren't "on Home",
    // they're on a procedure).
    let best: string | null = null;
    for (const group of NAV_GROUPS) {
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
  }, [pathname, locale]);

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
    groups: NAV_GROUPS,
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
        {/* The desktop bar. It holds the two things that belong to the whole admin
            area rather than to one page: find anything, and which language you are
            reading it in. The page's own title stays on the page — repeating it
            here would be the same words twice on one screen.

            It is not shown below 900px: there the mobile header already occupies
            that row, and a phone has no space for a field this wide. */}
        <header className="sticky top-0 z-sticky hidden h-[75px] min-h-[75px] items-center gap-4 border-b border-[var(--color-line-2)] bg-[var(--color-surface)] px-10 shadow-[var(--e-1)] backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--color-surface)_80%,transparent)] lg:flex">
          <AdminSearch
            locale={locale}
            labels={{
              label: tShell("searchLabel"),
              placeholder: tShell("searchPlaceholder"),
              procedures: tShell("searchProcedures"),
              people: tShell("searchPeople"),
              empty: tShell("searchEmpty"),
              hint: tShell("searchHint"),
              results: (n: number) => tShell("searchResults", { count: n }),
            }}
          />
          <div className="ml-auto flex items-center gap-3">
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

interface SidebarProps {
  locale: string;
  employee: Pick<Employee, "id" | "name" | "role">;
  workspace: string;
  groups: NavGroup[];
  labelFor: (key: string) => string;
  headingFor: (key: NavGroup["headingKey"]) => string;
  isActive: (href: string) => boolean;
  onNavigate: () => void;
  signOutLabel: string;
  backToAppLabel: string;
  titleLabel: string;
  soonLabel: string;
  langLabel: string;
  themeToDarkLabel: string;
  themeToLightLabel: string;
  signOutAction: () => Promise<void>;
  className?: string;
}

function Sidebar({
  locale,
  employee,
  workspace,
  groups,
  labelFor,
  headingFor,
  isActive,
  onNavigate,
  signOutLabel,
  backToAppLabel,
  titleLabel,
  soonLabel,
  langLabel,
  themeToDarkLabel,
  themeToLightLabel,
  signOutAction,
  className,
}: SidebarProps): React.ReactElement {
  return (
    <aside
      className={cn(
        "sticky top-0 h-screen w-sidebar shrink-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-surface)]",
        className,
      )}
      aria-label={titleLabel}
    >
      {/* The brand block is the restaurant's block: its colour, ending in its own
          stepped zigzag instead of a 1px rule. It is the one place in the admin
          chrome that looks like the restaurant rather than like software, which
          is why it is also the only terracotta field on the screen. */}
      <div className="flex h-16 min-h-16 items-center gap-3 bg-[var(--color-brand-600)] px-4 py-3">
        {/* The restaurant's own mark, from alimentariamexicana.com. It carries its
            own cream ground, so it sits in a plain rounded frame. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand-mark.png"
          alt=""
          width={40}
          height={40}
          className="size-10 shrink-0 rounded-[var(--radius-md)] object-cover"
        />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold leading-heading text-[var(--color-white)]">
            {workspace.split(",")[0] || titleLabel}
          </span>
          {/* White, not the peach tint: the tint reads at 4.09:1 on terracotta,
              under the 4.5:1 this size needs. The weight carries the hierarchy. */}
          <span className="block truncate text-sm leading-meta text-[var(--color-white)]">
            {workspace.split(",").slice(1).join(",").trim() || titleLabel}
          </span>
        </span>
      </div>
      {/* Teeth down: the block above owns the edge, the way the site draws it. */}
      <span className="pix-edge is-down" aria-hidden="true" />

      {/* The zigzag is a piece of ornament, not a rule, so it needs room under it
          before the first row — pressed up against Home it reads as that row's
          decoration rather than as the brand block's edge. */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4 pt-6">
        {groups.map((group) => (
          <div key={group.headingKey} className="space-y-1">
            {/* 14px, because 12px is the one size this system does not use on an
                admin screen — and a group label is read, not decoration. The first
                group is a single row called Home, which needs no heading over it. */}
            {group.headingKey === "groupWorkspace" ? null : (
              <p className="px-3 pb-1 text-sm leading-meta text-[var(--color-ink-3)]">
                {headingFor(group.headingKey)}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.href || "home"}>
                  <NavLink
                    href={`/${locale}/admin${item.href}`}
                    icon={item.icon}
                    label={labelFor(item.labelKey)}
                    active={isActive(item.href)}
                    onClick={onNavigate}
                    soon={item.soon ? soonLabel : undefined}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--color-line)] p-3">
        <p className="flex items-center gap-3 px-3 py-2">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-panel)] text-sm font-semibold text-[var(--color-ink)]"
          >
            {employee.name
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0])
              .join("")
              .toUpperCase()}
          </span>
          <span className="min-w-0 truncate text-sm font-medium text-[var(--color-ink)]">
            {employee.name}
          </span>
        </p>
        <Link
          href={`/${locale}/employee/home`}
          onClick={onNavigate}
          className={cn(
            "flex min-h-10 items-center gap-3 rounded-[var(--radius-md)] px-3 py-2",
            "text-sm font-medium text-[var(--color-ink-2)]",
            "transition-colors duration-[var(--dur)] ease-[var(--ease)]",
            "hover:bg-[var(--color-panel)] hover:text-[var(--color-ink)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2",
          )}
        >
          <LuArrowLeft aria-hidden="true" className="text-md" />
          <span className="flex-1 truncate">{backToAppLabel}</span>
        </Link>
        <div className="mt-2 flex items-center justify-between border-t border-[var(--color-line)] pt-3 px-1 lg:hidden">
          <LocaleSwitch locale={locale} label={langLabel} />
          <ThemeToggle
            labels={{ toDark: themeToDarkLabel, toLight: themeToLightLabel }}
          />
        </div>
        {/* Sign out is hidden in the sidebar for now — UI only. The action and its
            label are still wired, so putting this row back is uncommenting it.
            Signing out is still reachable from the employee bar via "Back to app".
        <form action={signOutAction}>
          <button
            type="submit"
            className={cn(
              'mt-1 flex w-full min-h-10 items-center gap-3 rounded-[var(--radius-md)] px-3 py-2',
              'text-sm font-medium text-[var(--color-ink-3)]',
              'transition-colors duration-[var(--dur)] ease-[var(--ease)]',
              'hover:bg-[var(--color-bad-tint)] hover:text-[var(--color-bad)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2',
            )}
          >
            <LuLogOut aria-hidden="true" className="text-md" />
            <span className="flex-1 truncate text-left">{signOutLabel}</span>
          </button>
        </form>
        */}
      </div>
    </aside>
  );
}

function NavLink({
  href,
  icon,
  label,
  active,
  onClick,
  soon,
}: {
  href: string;
  icon: IconType;
  label: string;
  active: boolean;
  onClick: () => void;
  /** Text of the badge for a page that is not built yet. */
  soon?: string;
}): React.ReactElement {
  return (
    <Link
      href={href}
      onClick={(e) => {
        if (active) {
          e.preventDefault();
          return;
        }
        onClick();
      }}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex min-h-10 items-center gap-3 rounded-[var(--radius-md)] px-3 py-2",
        "text-sm font-medium",
        // A sidebar link is passed over dozens of times an hour: the colour
        // lands at press speed, and the row gives a little when pressed.
        "transition-[background-color,color,transform] duration-[var(--dur-press)] ease-[var(--ease)]",
        "active:scale-[var(--press)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2",
        active
          ? "bg-[var(--color-nav-current)] text-[var(--color-brand-700)]"
          : "text-[var(--color-ink-2)] hover:bg-[var(--color-panel)] hover:text-[var(--color-ink)]",
      )}
    >
      <Icon
        icon={icon}
        className={cn(
          "text-md",
          active
            ? "text-[var(--color-brand-700)]"
            : "text-[var(--color-ink-3)] group-hover:text-[var(--color-ink-2)]",
        )}
      />
      <span className="flex-1 truncate">{label}</span>
      {soon ? (
        <span className="rounded-[var(--radius-sm)] bg-[var(--color-panel)] px-2 py-0.5 text-sm font-semibold text-[var(--color-ink-2)]">
          {soon}
        </span>
      ) : null}
    </Link>
  );
}
