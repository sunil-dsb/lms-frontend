"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface OutlineItem {
  id: string;
  /** Translation key under `admin.library.new.form.outline*`. */
  labelKey: "outlineDetails" | "outlinePurpose" | "outlineContent";
}

const ITEMS: OutlineItem[] = [
  { id: "proc-details", labelKey: "outlineDetails" },
  { id: "proc-purpose", labelKey: "outlinePurpose" },
  { id: "proc-content", labelKey: "outlineContent" },
];

/** Desktop-only sticky sidebar that lists the page's top-level sections.
 *  Hidden below the `lg` breakpoint; the sticky bar at the bottom of the form
 *  stays the primary wayfinding on mobile. */
export function ProcedureOutline(): React.ReactElement {
  const tForm = useTranslations("admin.library.new.form");
  const [activeId, setActiveId] = useState<string>(ITEMS[0]!.id);

  useEffect(() => {
    const sections = ITEMS.map((it) => document.getElementById(it.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (sections.length === 0) return;

    // Track which sections are currently in the viewport. The "active" link is
    // the topmost one that's at least 25% visible.
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.intersectionRatio);
          } else {
            visible.delete(entry.target.id);
          }
        }
        if (visible.size > 0) {
          // Pick the earliest section in document order that's visible — matches
          // what the eye reads when scrolled.
          const next = ITEMS.map((it) => it.id).find((id) => visible.has(id));
          if (next) setActiveId(next);
        }
      },
      { rootMargin: "-15% 0px -55% 0px", threshold: [0.25, 0.5, 0.75] },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label={tForm("outlineHeading")} className="hidden lg:block">
      <div className="sticky top-6 space-y-3">
        <p className="text-sm font-semibold text-[var(--color-ink-3)]">
          {tForm("outlineHeading")}
        </p>
        <ol className="space-y-1 border-l border-[var(--color-line-2)] pl-3">
          {ITEMS.map((it) => {
            const active = it.id === activeId;
            return (
              <li key={it.id}>
                <a
                  href={`#${it.id}`}
                  className={cn(
                    "-ml-px inline-flex items-center gap-2 border-l py-1 pl-3 text-sm transition-colors",
                    active
                      ? "border-[var(--color-ring)] font-semibold text-[var(--color-ink)]"
                      : "border-transparent text-[var(--color-ink-2)] hover:text-[var(--color-ink)]",
                  )}
                  aria-current={active ? "true" : undefined}
                >
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      active
                        ? "bg-[var(--color-brand-600)]"
                        : "bg-[var(--color-line-3)]",
                    )}
                    aria-hidden="true"
                  />
                  {tForm(it.labelKey)}
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
