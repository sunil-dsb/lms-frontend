"use server";

import { revalidatePath } from "next/cache";
import { completeAssignment, toggleAssignmentStep } from "@/lib/mock-training";

/** Record a finished course and refresh the pages that count it. */
export async function finishCourse(
  assignmentId: string,
  locale: string,
): Promise<{ ok: boolean }> {
  const done = completeAssignment(assignmentId);
  revalidatePath(`/${locale}/employee/training`, "layout");
  revalidatePath(`/${locale}/employee/home`);
  return { ok: Boolean(done) };
}

/** Tick or untick a step, and refresh the counts that show it. */
export async function tickStep(
  assignmentId: string,
  stepId: string,
  done: boolean,
  locale: string,
): Promise<void> {
  toggleAssignmentStep(assignmentId, stepId, done);
  revalidatePath(`/${locale}/employee/training`, "layout");
  revalidatePath(`/${locale}/employee/home`);
}
