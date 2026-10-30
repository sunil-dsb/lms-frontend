"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface StickyContinueButtonProps {
  label: string;
  href: string;
  /**
   * On desktop (>= lg), the admin shell has a persistent sidebar on the left.
   * On mobile (< lg), the sidebar is a drawer and the button spans the full width.
   */
  sidebarOffsetPx?: number;
}

/**
 * Sticky CTA button fixed at the bottom of the Course Chapters view.
 * Responsive: spans full screen on mobile viewports (< lg), and offsets after
 * the sidebar on desktop viewports (>= lg).
 */
export function StickyContinueButton({
  label,
  href,
  sidebarOffsetPx = 0,
}: StickyContinueButtonProps): React.ReactElement {
  return (
    <div
      className={cn(
        "fixed bottom-0 right-0 z-30 flex justify-center left-0",
        sidebarOffsetPx > 0 && "lg:left-[280px]",
      )}
    >
      <div
        className="w-full max-w-doc px-4 sm:px-6 pt-4"
        style={{
          paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))",
          background:
            "linear-gradient(to top, var(--color-bg) 60%, color-mix(in srgb, var(--color-bg) 95%, transparent) 80%, transparent 100%)",
        }}
      >
        <Link
          href={href}
          className="flex w-full min-h-[52px] items-center justify-center rounded-2xl bg-[var(--color-brand-600)] px-6 py-3 text-center font-[family-name:var(--font-ui)] text-base font-semibold text-white shadow-lg transition-all duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-brand-700)] active:scale-[0.99] focus-visible:outline-3 focus-visible:outline-[var(--color-brand-600)] focus-visible:outline-offset-2 cursor-pointer"
        >
          {label}
        </Link>
      </div>
    </div>
  );
}
