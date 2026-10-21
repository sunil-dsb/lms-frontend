"use server";

import { revalidatePath } from "next/cache";
import { createTrainingCourse, saveTrainingCourse } from "@/lib/mock-training";
import {
  registerCourseChapters,
  type ChapterDefinition,
} from "@/lib/course-chapters-data";
import type { Procedure, ProcedureBlock } from "@/lib/types";

export interface SaveCourseChapterInput {
  id: string;
  title: string;
  subtitle?: string;
  blocks?: ProcedureBlock[];
  procedureSlug?: string;
  procedureId?: string;
  quiz?: {
    attached?: boolean;
    questions?: {
      id: string;
      prompt: { en: string; es: string };
      choices: { id: string; label: { en: string; es: string } }[];
      correctChoiceId: string;
    }[];
  } | null;
  quizQuestions?: {
    id: string;
    prompt: { en: string; es: string };
    choices: { id: string; label: { en: string; es: string } }[];
    correctChoiceId: string;
  }[];
}

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
  chapters,
  locale = "en",
}: {
  id?: string;
  name: string;
  purpose: string;
  linkedSops?: string[];
  chapters?: SaveCourseChapterInput[];
  locale?: string;
}): Promise<{ ok: boolean; course: Procedure }> {
  // Deep clone to strip React 19 temporary references from Server Action payload
  const cleanChapters: SaveCourseChapterInput[] = chapters
    ? JSON.parse(JSON.stringify(chapters))
    : [];
  const cleanLinkedSops: string[] = linkedSops
    ? JSON.parse(JSON.stringify(linkedSops))
    : [];

  const hasQuiz = cleanChapters.some(
    (c) =>
      (c.quizQuestions?.length ?? 0) > 0 ||
      (c.quiz?.questions?.length ?? 0) > 0 ||
      c.quiz?.attached === true,
  );
  const quizId = hasQuiz ? `quiz-${id || "custom"}` : null;

  const rawCourse = saveTrainingCourse({
    id,
    titleEn: name,
    titleEs: name,
    purposeEn: purpose,
    purposeEs: purpose,
    linkedSops: cleanLinkedSops,
    quizId,
  });

  const course: Procedure = JSON.parse(JSON.stringify(rawCourse));

  if (cleanChapters.length > 0) {
    const chapterDefs: ChapterDefinition[] = cleanChapters.map((ch, idx) => ({
      id: ch.id || `${course.id}-ch-${idx + 1}`,
      number: idx + 1,
      titleEn: ch.title,
      titleEs: ch.title,
      contentEn: ch.subtitle || "",
      contentEs: ch.subtitle || "",
      blocks: ch.blocks ?? [],
      procedureSlug: ch.procedureSlug,
    }));

    registerCourseChapters(course.id, chapterDefs);
  }

  revalidatePath(`/${locale}/admin/training`, "page");
  revalidatePath(`/${locale}/employee/training/${course.id}`, "page");
  return { ok: true, course };
}
