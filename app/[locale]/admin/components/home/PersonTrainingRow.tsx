"use client";

import * as React from "react";
import Link from "next/link";
import { LuChevronRight } from "react-icons/lu";
import { Avatar } from "@/components/ui/avatar";

export function PersonTrainingRow({
  href,
  name,
  initials,
  courses,
  due,
  overdue,
}: {
  href: string;
  name: string;
  initials: string;
  courses: string;
  due: string;
  overdue: boolean;
}): React.ReactElement {
  const dueClass = overdue
    ? "font-semibold text-[var(--color-bad)]"
    : "text-[var(--color-ink-2)]";

  return (
    <li className="border-b border-[var(--color-line)] last:border-b-0">
      <Link
        href={href}
        className="-mx-2 flex min-w-0 items-center gap-4 rounded-[var(--radius-md)] px-2 py-3 text-left transition-colors hover:bg-[var(--color-wash)]"
      >
        <Avatar initials={initials} />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-[var(--color-ink)]">
            {name}
          </span>
          <span className="block text-sm leading-meta text-[var(--color-ink-2)] truncate">
            {courses}
          </span>
          {/* On a phone the date goes under the course, so the name keeps the width. */}
          <span className={`block text-sm sm:hidden ${dueClass}`}>{due}</span>
        </span>
        <span
          className={`hidden shrink-0 text-right text-sm sm:block ${dueClass}`}
        >
          {due}
        </span>
        <LuChevronRight
          aria-hidden="true"
          className="shrink-0 text-lg text-[var(--color-ink-3)]"
        />
      </Link>
    </li>
  );
}
