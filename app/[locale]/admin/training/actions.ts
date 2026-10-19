"use server";

import { revalidatePath } from "next/cache";
import { createTrainingCourse, saveTrainingCourse } from "@/lib/mock-training";
import type { Procedure } from "@/lib/types";

export async function createCourseAction({
  name,
  purpose,
  locale = "en",
}: {
  name: string;
  purpose: string;
  locale?: string;
}): Promise<{ ok: boolean; course: Procedure }> {
  const course = createTrainingCourse({
    titleEn: name,
    titleEs: name,
    purposeEn: purpose,
    purposeEs: purpose,
  });

  revalidatePath(`/${locale}/admin/training`, "page");
  return { ok: true, course };
}

export async function saveCourseAction({
  id,
  name,
  purpose,
  linkedSops,
  locale = "en",
}: {
  id?: string;
  name: string;
  purpose: string;
  linkedSops?: string[];
  locale?: string;
}): Promise<{ ok: boolean; course: Procedure }> {
  const course = saveTrainingCourse({
    id,
    titleEn: name,
    titleEs: name,
    purposeEn: purpose,
    purposeEs: purpose,
    linkedSops,
  });

  revalidatePath(`/${locale}/admin/training`, "page");
  return { ok: true, course };
}
