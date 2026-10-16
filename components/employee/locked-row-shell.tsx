"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/**
 * The shell a locked `ProcedureRow` sits inside while onboarding isn't done.
 *
 * A locked row is dimmed + dashed, but still tappable: tapping pushes the
 * cook to /employee/training so they can finish orientation. This needs a
 * client component (router.push), while `ProcedureRow` itself stays a server
 * component — the shell is the only client island.
 */
export function LockedRowShell({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}): React.ReactElement {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="flex w-full items-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)] text-left transition-colors hover:bg-[var(--color-wash)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-ring)]"
      style={{ paddingRight: "12px" }}
    >
      {children}
    </button>
  );
}
