import * as React from "react";
import Link from "next/link";
import { LuChevronRight } from "react-icons/lu";

/** A home section's heading, with the way to all of it when there is more. */
export function SectionHead({
  id,
  title,
  aside,
  all,
}: {
  /** The section's aria-labelledby points here. */
  id: string;
  title: string;
  /** A short fact on the heading's line, e.g. "1 of 4 done". */
  aside?: React.ReactNode;
  all?: { href: string; label: string };
}): React.ReactElement {
  return (
    <div className="flex items-baseline justify-between" style={{ gap: "8px" }}>
      <h2
        id={id}
        className="min-w-0 text-base font-semibold leading-snug text-[var(--color-ink)]"
      >
        {title}
      </h2>
      {aside}
      {all ? (
        <Link
          href={all.href}
          className="inline-flex shrink-0 items-center whitespace-nowrap text-xs font-semibold text-[var(--color-ink-2)] hover:text-[var(--color-ink)]"
          style={{ gap: "2px", minHeight: "32px" }}
        >
          {all.label}
          <LuChevronRight aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}
