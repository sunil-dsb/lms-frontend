"use client";

import * as React from "react";
import Link from "next/link";
import { LuChevronRight } from "react-icons/lu";
import { Avatar } from "@/components/ui/avatar";
import { Drawer } from "@/components/ui/drawer";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { RemindButton } from "./RemindButton";

export interface PersonTrainingLine {
  key: string;
  course: string;
  href: string;
  tone: StatusTone;
  label: string;
}

/**
 * One person on Team training. The row opens their whole training record in
 * a drawer -- every course, where each one stands -- because the owner's next
 * question about someone overdue is "what else do they owe?", and the row used
 * to answer with one course's assignment page instead.
 */
export function PersonTrainingRow({
  name,
  initials,
  courses,
  due,
  overdue,
  trainings,
  labels,
}: {
  name: string;
  initials: string;
  courses: string;
  due: string;
  overdue: boolean;
  trainings: PersonTrainingLine[];
  labels: { open: string; close: string; remind: string; reminded: string };
}): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const dueClass = overdue
    ? "font-semibold text-[var(--color-bad)]"
    : "text-[var(--color-ink-2)]";
  const remind = overdue ? (
    <RemindButton
      label={labels.remind}
      sentLabel={labels.reminded}
      name={name}
      sent={sent}
      onSend={() => setSent(true)}
    />
  ) : null;

  return (
    <li className="flex items-center gap-2 border-b border-[var(--color-line)] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="-mx-2 flex min-w-0 flex-1 items-center gap-4 rounded-[var(--radius-md)] px-2 py-3 text-left hover:bg-[var(--color-wash)]"
      >
        <Avatar initials={initials} />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-[var(--color-ink)]">
            {name}
          </span>
          <span className="block text-sm leading-meta text-[var(--color-ink-2)]">
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
        <span className="sr-only">{labels.open}</span>
        {overdue ? null : (
          <LuChevronRight
            aria-hidden="true"
            className="shrink-0 text-lg text-[var(--color-ink-3)]"
          />
        )}
      </button>
      {/* Overdue is the one group with an obvious next step. */}
      {remind}

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={name}
        closeLabel={labels.close}
        size="sm"
        footer={remind}
      >
        <ul>
          {trainings.map((t) => (
            <li
              key={t.key}
              className="border-b border-[var(--color-line)] last:border-b-0"
            >
              <Link
                href={t.href}
                className="-mx-2 flex items-center gap-3 rounded-[var(--radius-md)] px-2 py-3 hover:bg-[var(--color-wash)]"
              >
                <span className="min-w-0 flex-1 font-semibold text-[var(--color-ink)]">
                  {t.course}
                </span>
                <StatusPill tone={t.tone} withDot className="shrink-0">
                  {t.label}
                </StatusPill>
              </Link>
            </li>
          ))}
        </ul>
      </Drawer>
    </li>
  );
}
