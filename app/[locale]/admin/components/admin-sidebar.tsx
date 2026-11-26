"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Employee, SystemRole } from "@/lib/types";
import { formatSystemRole, normalizeRole } from "@/lib/rbac";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LocaleSwitch } from "@/components/ui/locale-switch";
import {
  LuChartColumn,
  LuChefHat,
  LuCirclePlus,
  LuClipboardList,
  LuFolders,
  LuGraduationCap,
  LuHistory,
  LuHouse,
  LuLogOut,
  LuUserPlus,
  LuUsers,
} from "react-icons/lu";
import { Icon } from "@/components/ui/icon";
import type { IconType } from "react-icons";

export type NavItem = {
  href: string;
  icon: IconType;
  labelKey: string;
  soon?: boolean;
  /**
   * Restrict this row to these system roles (omit = every role that can
   * reach the admin shell). The audit log is super_admin-only, matching
   * the API's `requireRoles(['super_admin'])`.
   */
  roles?: readonly SystemRole[];
};

export type NavGroup = {
  headingKey:
    | "groupWorkspace"
    | "groupLibrary"
    | "groupTraining"
    | "groupPeople"
    | "groupSettings";
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
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
        roles: ["super_admin", "manager"],
      },
      {
        href: "/library/new",
        icon: LuCirclePlus,
        labelKey: "navNewProcedure",
        roles: ["super_admin", "manager"],
      },
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
      {
        href: "/employees/new",
        icon: LuUserPlus,
        labelKey: "inviteEmployee",
        roles: ["super_admin", "manager"],
      },
    ],
  },
  {
    headingKey: "groupSettings",
    items: [
      {
        href: "/settings",
        icon: LuChefHat,
        labelKey: "navSettings",
        roles: ["super_admin"],
      },
      {
        href: "/audit",
        icon: LuHistory,
        labelKey: "navAuditLog",
        roles: ["super_admin"],
      },
    ],
  },
];

export interface SidebarProps {
  locale: string;
  employee: Pick<Employee, "id" | "name" | "role">;
  workspace: string;
  groups: NavGroup[];
  labelFor: (key: string) => string;
  headingFor: (key: NavGroup["headingKey"]) => string;
  isActive: (href: string) => boolean;
  onNavigate: () => void;
  signOutLabel: string;
  titleLabel: string;
  soonLabel: string;
  langLabel: string;
  themeToDarkLabel: string;
  themeToLightLabel: string;
  signOutAction: () => Promise<void>;
  className?: string;
}

export function Sidebar({
  locale,
  employee,
  workspace,
  groups,
  labelFor,
  headingFor,
  isActive,
  onNavigate,
  signOutLabel,
  titleLabel,
  soonLabel,
  langLabel,
  themeToDarkLabel,
  themeToLightLabel,
  signOutAction,
  className,
}: SidebarProps): React.ReactElement {
  const isEs = locale === "es";
  const systemRole = normalizeRole(employee.role);

  const roleName = React.useMemo(() => {
    return formatSystemRole(employee.role, isEs);
  }, [employee.role, isEs]);

  const panelTitle = React.useMemo(() => {
    const r = employee.role?.toLowerCase();
    if (r === "manager") return isEs ? "Panel de Gerente" : "Manager Panel";
    if (r === "supervisor")
      return isEs ? "Panel de Supervisor" : "Supervisor Panel";
    if (r === "super_admin") return isEs ? "Panel de Admin" : "Admin Panel";
    return isEs ? "Portal de Personal" : "Staff Portal";
  }, [employee.role, isEs]);

  return (
    <aside
      className={cn(
        "sticky top-0 h-screen w-sidebar shrink-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-surface)]",
        className,
      )}
      aria-label={panelTitle || titleLabel}
    >
      <div className="flex h-16 min-h-16 items-center gap-3 bg-[var(--color-brand-600)] px-4 py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand-mark.png"
          alt=""
          width={40}
          height={40}
          className="size-10 shrink-0 rounded-[var(--radius-md)] object-cover shadow-xs"
        />
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold leading-heading text-white">
            {workspace.split(",")[0] || "Alimentaria Mexicana"}
          </span>
          <span className="block truncate text-xs leading-meta text-white/80">
            {panelTitle}
          </span>
        </div>
      </div>
      <span className="pix-edge is-down" aria-hidden="true" />

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4 pt-6">
        {groups.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.roles || item.roles.includes(systemRole),
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.headingKey} className="space-y-1">
              {group.headingKey === "groupWorkspace" ? null : (
                <p className="px-3 pb-1 text-sm leading-meta text-[var(--color-ink-3)]">
                  {headingFor(group.headingKey)}
                </p>
              )}
              <ul className="space-y-0.5">
                {visibleItems.map((item) => (
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
          );
        })}
      </nav>

      <div className="border-t border-[var(--color-line)] p-3">
        <Link
          href={`/${locale}/admin/profile`}
          onClick={onNavigate}
          aria-label={isEs ? "Ver mi perfil" : "View my profile"}
          className="flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 transition-colors hover:bg-[var(--color-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
        >
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-panel)] text-sm font-semibold text-[var(--color-ink)] border border-[var(--color-line-2)] shadow-2xs"
          >
            {employee.name
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0])
              .join("")
              .toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-[var(--color-ink)]">
              {employee.name}
            </div>
            <div className="truncate text-xs text-[var(--color-ink-3)] capitalize">
              {roleName}
            </div>
          </div>
        </Link>
        {/* Sign out — a form so the server action runs directly on submit
            (same pattern as the employee top bar). Sits in the footer so it
            is present on desktop and in the mobile drawer. */}
        <form action={signOutAction}>
          <button
            type="submit"
            onClick={onNavigate}
            className={cn(
              "flex min-h-10 w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-left",
              "text-sm font-medium text-[var(--color-ink-2)]",
              "transition-colors duration-[var(--dur)] ease-[var(--ease)]",
              "hover:bg-[var(--color-panel)] hover:text-[var(--color-ink)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2",
              "cursor-pointer",
            )}
          >
            <LuLogOut aria-hidden="true" className="text-md" />
            <span className="flex-1 truncate">{signOutLabel}</span>
          </button>
        </form>
        <div className="mt-2 flex items-center justify-between border-t border-[var(--color-line)] pt-3 px-1 lg:hidden">
          <LocaleSwitch locale={locale} label={langLabel} />
          <ThemeToggle
            labels={{ toDark: themeToDarkLabel, toLight: themeToLightLabel }}
          />
        </div>
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
  soon?: string;
}): React.ReactElement {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex min-h-10 items-center gap-3 rounded-[var(--radius-md)] px-3 py-2",
        "text-sm font-medium",
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
