"use client";

import * as React from "react";
import Link from "next/link";

interface StickyContinueButtonProps {
  label: string;
  href: string;
}

/**
 * Sticky CTA button fixed at the bottom of the Course Chapters view.
 * Styled in primary brand terracotta (--color-brand-600) matching reference.
 */
export function StickyContinueButton({
  label,
  href,
}: StickyContinueButtonProps): React.ReactElement {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 mx-auto w-full max-w-doc bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)]/95 to-transparent px-4 pb-6 pt-4 backdrop-blur-xs sm:px-6">
      <Link
        href={href}
        className="flex w-full min-h-[50px] items-center justify-center rounded-2xl bg-[var(--color-brand-600)] px-6 py-3.5 text-center font-[family-name:var(--font-ui)] text-base font-semibold text-white shadow-md transition-all duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-brand-700)] active:scale-[0.99] focus-visible:outline-3 focus-visible:outline-[var(--color-brand-600)] focus-visible:outline-offset-2"
      >
        {label}
      </Link>
    </div>
  );
}
