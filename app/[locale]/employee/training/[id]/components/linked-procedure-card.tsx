"use client";

import * as React from "react";
import Link from "next/link";
import { LuBookOpen } from "react-icons/lu";
import type { LinkedProcedureInfo } from "@/lib/course-chapters-data";

interface LinkedProcedureCardProps {
  procedure: LinkedProcedureInfo;
  headlineLabel: string;
}

/**
 * Linked procedure card shown beneath chapters in the reference design.
 * Displays book icon, "Linked procedure" label and procedure title.
 */
export function LinkedProcedureCard({
  procedure,
  headlineLabel,
}: LinkedProcedureCardProps): React.ReactElement {
  return (
    <div className="pt-1">
      <Link
        href={procedure.href}
        style={{ gap: "14px" }}
        className="group flex items-start rounded-2xl border border-[var(--color-line-2)] bg-[var(--color-panel)]/40 p-4 transition-all duration-[var(--dur)] ease-[var(--ease)] hover:bg-[var(--color-panel)]/60 hover:border-[var(--color-line)] focus-visible:outline-3 focus-visible:outline-[var(--color-brand-600)] focus-visible:outline-offset-2"
      >
        <span
          aria-hidden="true"
          style={{
            width: "36px",
            height: "36px",
            minWidth: "36px",
            minHeight: "36px",
          }}
          className="flex shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface)] text-[var(--color-brand-600)] border border-[var(--color-line-2)] shadow-2xs group-hover:text-[var(--color-brand-700)] transition-colors"
        >
          <LuBookOpen className="text-lg" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink)]">
            {headlineLabel}
          </p>
          <p className="mt-0.5 text-sm font-medium text-[var(--color-ink-2)] group-hover:text-[var(--color-ink)] transition-colors">
            {procedure.title}
          </p>
        </div>
      </Link>
    </div>
  );
}
