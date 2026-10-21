"use client";

import * as React from "react";
import Link from "next/link";

interface StickyContinueButtonProps {
  label: string;
  href: string;
  /**
   * On desktop, the admin shell has a sidebar on the left.
   * Pass the sidebar width (e.g. 280) so the fixed button starts
   * after the sidebar instead of behind it. Default: 0 (employee layout).
   */
  sidebarOffsetPx?: number;
}

/**
 * Sticky CTA button fixed at the bottom of the Course Chapters view.
 * Styled in primary brand terracotta (--color-brand-600) matching reference.
 */
export function StickyContinueButton({
  label,
  href,
  sidebarOffsetPx = 0,
}: StickyContinueButtonProps): React.ReactElement {
  return (
    <div
      className="fixed bottom-0 right-0 z-30 flex justify-center"
      style={{ left: sidebarOffsetPx ? `${sidebarOffsetPx}px` : 0 }}
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
          className="flex w-full min-h-[52px] items-center justify-center rounded-2xl bg-[var(--color-brand-600)] px-6 py-3.5 text-center font-[family-name:var(--font-ui)] text-base font-semibold text-white shadow-lg transition-all duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-brand-700)] active:scale-[0.99] focus-visible:outline-3 focus-visible:outline-[var(--color-brand-600)] focus-visible:outline-offset-2"
        >
          {label}
        </Link>
      </div>
    </div>
  );
}
