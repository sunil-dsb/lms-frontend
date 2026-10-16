"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LuBookOpen, LuGraduationCap, LuHouse } from "react-icons/lu";

export type EmployeeTab = "home" | "procedures" | "training";

export function TabBar({
  locale,
  active,
  labels,
}: {
  locale: string;
  active: EmployeeTab;
  labels: {
    home: string;
    procedures: string;
    training: string;
    soon: string;
    nav: string;
  };
}): React.ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [targetTab, setTargetTab] = React.useState<EmployeeTab | null>(null);

  const tabs: {
    key: EmployeeTab;
    href?: string;
    icon: typeof LuHouse;
    label: string;
    soon?: boolean;
  }[] = [
    {
      key: "home",
      href: `/${locale}/employee/home`,
      icon: LuHouse,
      label: labels.home,
    },
    {
      key: "procedures",
      href: `/${locale}/procedures`,
      icon: LuBookOpen,
      label: labels.procedures,
    },
    {
      key: "training",
      href: `/${locale}/employee/training`,
      icon: LuGraduationCap,
      label: labels.training,
    },
  ];

  const handleTabClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    tab: (typeof tabs)[0],
  ) => {
    // 1. If clicking the tab we are already on, do nothing
    if (tab.key === active) {
      e.preventDefault();
      return;
    }

    // 2. If a tab switch transition is already pending, ignore repeated clicks
    if (isPending) {
      e.preventDefault();
      return;
    }

    if (!tab.href) {
      e.preventDefault();
      return;
    }

    // Navigate with transition to prevent repeated clicks and wait for response
    e.preventDefault();
    setTargetTab(tab.key);
    startTransition(() => {
      router.push(tab.href!);
    });
  };

  React.useEffect(() => {
    if (!isPending) {
      setTargetTab(null);
    }
  }, [isPending]);

  return (
    <nav
      aria-label={labels.nav}
      className="fixed inset-x-0 bottom-0 z-sticky border-t border-[var(--color-line)] bg-[var(--color-surface)]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] shadow-xs"
    >
      <div className="mx-auto flex max-w-doc">
        {tabs.map((tab) => {
          const on = tab.key === active;
          const isTarget = isPending && tab.key === targetTab;
          const inner = (
            <>
              <tab.icon
                aria-hidden="true"
                className={`text-lg sm:text-xl transition-transform duration-200 group-hover:scale-110 ${
                  isTarget ? "animate-pulse" : ""
                }`}
              />
              <span className="tracking-tight">{tab.label}</span>
              {tab.soon ? <span className="sr-only">{labels.soon}</span> : null}
            </>
          );
          const shape = `group flex flex-1 flex-col items-center justify-center text-xs font-semibold transition-colors duration-150 ${
            on
              ? "text-[var(--color-brand-700)]"
              : isTarget
                ? "text-[var(--color-brand-600)] opacity-80"
                : tab.soon
                  ? "text-[var(--color-ink-3)]"
                  : "text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
          } ${isPending ? "cursor-wait pointer-events-none" : ""}`;

          return tab.href ? (
            <a
              key={tab.key}
              href={tab.href}
              onClick={(e) => handleTabClick(e, tab)}
              aria-current={on ? "page" : undefined}
              className={shape}
              style={{ minHeight: "56px", gap: "3px" }}
            >
              {inner}
            </a>
          ) : (
            <span
              key={tab.key}
              className={shape}
              style={{ minHeight: "56px", gap: "3px" }}
            >
              {inner}
            </span>
          );
        })}
      </div>
    </nav>
  );
}
