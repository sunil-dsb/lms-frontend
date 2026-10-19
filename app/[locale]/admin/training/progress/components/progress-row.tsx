"use client";

import * as React from "react";
import { StatusPill } from "@/components/ui/status-pill";
import { trainingStatusTone } from "@/components/admin/training-summary";
import type { ProgressCourseRef, ProgressStatus } from "@/lib/types";

/** The i18n key for each row status — the same three words the stat cards
 *  use, so a card and the rows under it can never name a state differently. */
export const PROGRESS_STATUS_LABEL_KEY = {
  complete: "statusDone",
  in_progress: "statusInProgress",
  overdue: "statusOverdue",
} as const;

/** A row's status as the shared badge, toned by the one mapping the rest of
 *  the training surfaces use (`trainingStatusTone`). */
export function ProgressStatusPill({
  status,
  label,
}: {
  status: ProgressStatus;
  label: string;
}): React.ReactElement {
  return (
    <StatusPill tone={trainingStatusTone(status)} withDot>
      {label}
    </StatusPill>
  );
}

/** A course's title in the reader's language, with the other language as the
 *  fallback — the `titleOf` the training lists are built on. */
export function courseTitle(course: ProgressCourseRef, locale: string): string {
  return locale === "es"
    ? course.titleEs || course.titleEn
    : course.titleEn || course.titleEs;
}
