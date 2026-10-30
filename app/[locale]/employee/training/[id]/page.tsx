import * as React from "react";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ApiException, getProcedureBySlug } from "@/lib/api";
import {
  fetchEmployeeQuiz,
  fetchMyTrainingCourse,
} from "@/services/courses/api";
import type { Procedure, TrainingAssignment } from "@/lib/types";
import {
  getCourseChaptersViewData,
  getChapterDetail,
  registerCourseChapters,
  type ChapterDefinition,
} from "@/lib/course-chapters-data";
import { CourseChaptersView } from "./components/course-chapters-view";
import { ChapterLearnView } from "./components/chapter-learn-view";
import { ChapterQuizView } from "./components/chapter-quiz-view";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ chapter?: string; mode?: string }>;
}

export const dynamic = "force-dynamic";

function isUuid(val: string | null | undefined): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    val,
  );
}

export default async function EmployeeTrainingCoursePage({
  params,
  searchParams,
}: PageProps): Promise<React.ReactElement> {
  const { locale, id } = await params;
  const { chapter, mode } = await searchParams;
  setRequestLocale(locale);
  if (!isUuid(id)) notFound();

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  let employeeTraining: Awaited<ReturnType<typeof fetchMyTrainingCourse>>;
  try {
    employeeTraining = await fetchMyTrainingCourse(id, cookieHeader);
  } catch (err) {
    if (err instanceof ApiException && err.status === 401) {
      redirect(`/${locale}/login`);
    }
    if (err instanceof ApiException && err.status === 404) notFound();
    console.error("Could not fetch assigned course from backend:", err);
    throw err;
  }

  const backendCourse = employeeTraining.course;
  if (!backendCourse || backendCourse.chapters.length === 0) notFound();

  const course = {
    id: backendCourse.id,
    slug: backendCourse.id,
    titleEn: backendCourse.titleEn,
    titleEs: backendCourse.titleEs,
    purposeEn: backendCourse.purposeEn,
    purposeEs: backendCourse.purposeEs,
    status: "published" as any,
    createdAt: employeeTraining.assignment.assignedAt,
    updatedAt: employeeTraining.assignment.assignedAt,
    attachedToTraining: true,
    chapterCount: backendCourse.chapters.length,
  } as unknown as Procedure;

  const chapterDefs: ChapterDefinition[] = backendCourse.chapters.map((ch) => ({
    id: ch.id,
    number: ch.number,
    titleEn: ch.titleEn,
    titleEs: ch.titleEs,
    contentEn: ch.subtitleEn || "",
    contentEs: ch.subtitleEs || "",
    blocks: (ch.blocks as any[]) || [],
    procedureId: ch.procedureId ?? undefined,
    quizId: ch.quizId ?? undefined,
    quizQuestionsCount: ch.quizQuestionsCount,
    quiz: (ch.quiz as any) ?? null,
    minCorrectAnswers: ch.minCorrectAnswers ?? undefined,
  }));
  registerCourseChapters(backendCourse.id, chapterDefs);

  const chapterIndex = backendCourse.chapters.findIndex(
    (item) => item.id === employeeTraining.assignment.currentChapterId,
  );
  const completedChapterIds = employeeTraining.assignment.courseCompletedAt
    ? backendCourse.chapters.map((item) => item.id)
    : backendCourse.chapters
        .slice(0, Math.max(chapterIndex, 0))
        .map((item) => item.id);
  const assignment = {
    id: employeeTraining.assignment.id,
    courseId: backendCourse.id,
    employeeId: "",
    assignedAt: employeeTraining.assignment.assignedAt,
    dueAt: employeeTraining.assignment.dueDate,
    status: employeeTraining.assignment.status,
    completedStepIds: completedChapterIds,
    quizPassedAt: employeeTraining.assignment.courseCompletedAt,
    acknowledgedAt: null,
  } as TrainingAssignment;

  const isEs = locale === "es";
  const courseTitle =
    (isEs
      ? course.titleEs || course.titleEn
      : course.titleEn || course.titleEs) || course.slug;

  const chapterNumber = chapter ? parseInt(chapter, 10) : null;

  if (
    chapterNumber &&
    !employeeTraining.course.chapters.some(
      (item) => item.number === chapterNumber,
    )
  ) {
    notFound();
  }

  // 1. Chapter Quiz View: matches reference Image 2
  if (chapterNumber && !isNaN(chapterNumber) && mode === "quiz") {
    const chapterDetail = getChapterDetail(id, chapterNumber, locale);
    let chapterQuiz = chapterDetail.quiz;

    if (chapterDetail.quizId) {
      try {
        const loadedQuiz = await fetchEmployeeQuiz(
          chapterDetail.quizId,
          cookieHeader,
        );
        if (loadedQuiz?.questions?.length) {
          chapterQuiz = {
            attached: true,
            questions: loadedQuiz.questions,
            minCorrectAnswers:
              chapterDetail.minCorrectAnswers ?? loadedQuiz.minCorrectAnswers,
          } as any;
        }
      } catch (err) {
        console.warn("Could not load chapter quiz from backend:", err);
      }
    }

    // If chapter doesn't have an inline quiz, resolve from linked procedure
    if ((!chapterQuiz || !chapterQuiz.questions?.length) && chapterDetail) {
      const procId = chapterDetail.procedureId || chapterDetail.procedureSlug;

      if (procId) {
        try {
          const { fetchProcedureById } = await import("@/services/library/api");
          const proc = await fetchProcedureById(procId, true);
          if (proc?.quizId) {
            const loadedQuiz = await fetchEmployeeQuiz(
              proc.quizId,
              cookieHeader,
            );
            if (loadedQuiz?.questions?.length) {
              chapterQuiz = {
                attached: true,
                questions: loadedQuiz.questions,
                minCorrectAnswers:
                  chapterDetail.minCorrectAnswers ??
                  Math.max(1, Math.ceil(loadedQuiz.questions.length * 0.7)),
              };
            }
          }
        } catch {
          // fallback
        }
      }
    }

    // Prefer chapter/linked procedure quiz questions, otherwise course quizId or fallback
    const questions =
      chapterQuiz?.questions && chapterQuiz.questions.length > 0
        ? chapterQuiz.questions
        : [];
    if (questions.length === 0) {
      // If chapter has no quiz questions, advance directly to next chapter or course overview
      if (chapterNumber < chapterDetail.totalChapters) {
        redirect(
          `/${locale}/employee/training/${id}?chapter=${chapterNumber + 1}`,
        );
      } else {
        redirect(`/${locale}/employee/training/${id}`);
      }
    }

    const minCorrectAnswers =
      chapterDetail.minCorrectAnswers ??
      chapterQuiz?.minCorrectAnswers ??
      Math.max(1, Math.ceil(questions.length * 0.7));

    const currentChapterObj = employeeTraining.course.chapters.find(
      (item) => item.number === chapterNumber,
    );
    const isCurrentChapterCompleted =
      Boolean(employeeTraining.assignment.courseCompletedAt) ||
      (currentChapterObj
        ? completedChapterIds.includes(currentChapterObj.id)
        : false);

    return (
      <ChapterQuizView
        courseId={id}
        chapterId={currentChapterObj?.id}
        courseTitle={courseTitle}
        chapterNumber={chapterNumber}
        totalChapters={chapterDetail.totalChapters}
        locale={locale}
        questions={questions}
        minCorrectAnswers={minCorrectAnswers}
        isCompleted={isCurrentChapterCompleted}
      />
    );
  }

  // 2. Chapter Learn View: matches reference Image 1
  if (chapterNumber && !isNaN(chapterNumber)) {
    const chapterDetail = getChapterDetail(id, chapterNumber, locale);
    const currentChapterObj = employeeTraining.course.chapters.find(
      (item) => item.number === chapterNumber,
    );

    const hasQuiz =
      typeof (currentChapterObj as any)?.quizQuestionsCount === "number"
        ? (currentChapterObj as any).quizQuestionsCount > 0
        : Boolean(
            ((currentChapterObj as any)?.quiz?.questions &&
              (currentChapterObj as any).quiz.questions.length > 0) ||
            chapterDetail.quiz?.questions?.length,
          );

    // Check if blocks already contain linked_procedures — if so, use blocks directly
    // (BlockRenderer will handle rendering all procedure IDs in the block)
    const hasLinkedProceduresBlock = (chapterDetail.blocks ?? []).some(
      (b: any) =>
        b.kind === "linked_procedures" &&
        Array.isArray(b.procedureIds) &&
        b.procedureIds.length > 0,
    );

    let linkedProcedure = null;

    // Only fetch a single procedure when there's exactly one and no linked_procedures block
    if (!hasLinkedProceduresBlock && chapterDetail.procedureSlug) {
      try {
        const res = await getProcedureBySlug(
          chapterDetail.procedureSlug,
          cookieHeader,
        );
        linkedProcedure = res.procedure;
      } catch (err) {
        console.warn("Could not load live procedure from API:", err);
      }
    }

    return (
      <ChapterLearnView
        courseId={id}
        chapterId={currentChapterObj?.id}
        courseTitle={courseTitle}
        chapterNumber={chapterNumber}
        totalChapters={chapterDetail.totalChapters}
        chapterTitle={chapterDetail.title}
        chapterSubtitle={chapterDetail.subtitle}
        locale={locale}
        blocks={chapterDetail.blocks}
        procedure={linkedProcedure}
        hasQuiz={hasQuiz}
      />
    );
  }

  // 3. Default View: Course Chapters Overview matching reference Image 0
  const chaptersViewData = getCourseChaptersViewData(
    course,
    assignment,
    locale,
  );

  return <CourseChaptersView data={chaptersViewData} locale={locale} />;
}
