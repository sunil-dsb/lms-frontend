import * as React from "react";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  ApiException,
  fetchMe,
  getQuizById,
  getProcedureBySlug,
} from "@/lib/api";
import { fetchCourseById } from "@/services/courses/api";
import {
  getCourseById,
  listTrainingAssignments,
  listTrainingAssignmentsForEmployee,
  mockTrainingEmployees,
} from "@/lib/mock-training";
import type {
  Procedure,
  ProcedureBlock,
  TrainingAssignment,
} from "@/lib/types";
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

  let course: Procedure | null = null;

  if (isUuid(id)) {
    try {
      const backendCourse = await fetchCourseById(id);
      if (backendCourse) {
        course = {
          id: backendCourse.id,
          slug: backendCourse.id,
          titleEn: backendCourse.titleEn,
          titleEs: backendCourse.titleEs,
          purposeEn: backendCourse.purposeEn,
          purposeEs: backendCourse.purposeEs,
          status: backendCourse.status as any,
          createdAt: backendCourse.createdAt,
          updatedAt: backendCourse.updatedAt,
          attachedToTraining: true,
          chapterCount: backendCourse.chapters?.length ?? 0,
        } as unknown as Procedure;

        if (backendCourse.chapters && backendCourse.chapters.length > 0) {
          const chapterDefs: ChapterDefinition[] = backendCourse.chapters.map(
            (ch) => ({
              id: ch.id,
              number: ch.number,
              titleEn: ch.titleEn,
              titleEs: ch.titleEs,
              contentEn: ch.subtitleEn || "",
              contentEs: ch.subtitleEs || "",
              blocks: (ch.blocks as any[]) || [],
              procedureId: ch.procedureId ?? undefined,
              quizId: ch.quizId ?? undefined,
              quiz: (ch.quiz as any) ?? null,
              minCorrectAnswers: ch.minCorrectAnswers ?? undefined,
            }),
          );
          registerCourseChapters(backendCourse.id, chapterDefs);
        }
      }
    } catch (err) {
      console.warn("Could not fetch course from backend for employee:", err);
    }
  }

  if (!course) {
    course = getCourseById(id) ?? null;
  }

  if (!course) notFound();

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  let employee;
  try {
    const me = await fetchMe(cookieHeader);
    employee = me.employee;
  } catch (err) {
    if (
      err instanceof ApiException &&
      (err.status === 401 || err.code === "SESSION_INVALID")
    ) {
      redirect(`/${locale}/login`);
    }
    // Fall back to demo employee on transient server or network hiccups rather than breaking the session
    employee = {
      id: "emp-maria",
      name: "María González",
      role: "employee" as const,
      locationId: "loc-roma",
      roleIds: [],
      stationIds: [],
      languagePref: "en" as const,
    };
  }

  const matched =
    mockTrainingEmployees.find((e) => e.id === employee.id) ??
    mockTrainingEmployees.find(
      (e) => e.name.toLowerCase() === employee.name.toLowerCase(),
    );
  const mockEmployeeId = matched?.id ?? employee.id;

  // Find assignment for this employee or fallback to demo assignment for the course
  const assignment =
    listTrainingAssignmentsForEmployee(mockEmployeeId).find(
      (a: TrainingAssignment) => a.courseId === id,
    ) ??
    listTrainingAssignmentsForEmployee("emp-maria").find(
      (a: TrainingAssignment) => a.courseId === id,
    ) ??
    listTrainingAssignments().find(
      (a: TrainingAssignment) => a.courseId === id,
    );

  const isEs = locale === "es";
  const courseTitle =
    (isEs
      ? course.titleEs || course.titleEn
      : course.titleEn || course.titleEs) || course.slug;

  const chapterNumber = chapter ? parseInt(chapter, 10) : null;

  // 1. Chapter Quiz View: matches reference Image 2
  if (chapterNumber && !isNaN(chapterNumber) && mode === "quiz") {
    const chapterDetail = getChapterDetail(id, chapterNumber, locale);
    let chapterQuiz = chapterDetail.quiz;

    // If chapter doesn't have an inline quiz, resolve from linked procedure
    if ((!chapterQuiz || !chapterQuiz.questions?.length) && chapterDetail) {
      const procId =
        chapterDetail.procedureId ||
        chapterDetail.procedureSlug ||
        chapterDetail.blocks
          ?.filter(
            (b): b is Extract<ProcedureBlock, { kind: "linked_procedures" }> =>
              b.kind === "linked_procedures",
          )
          ?.flatMap((b) => b.procedureIds || [])[0];

      if (procId) {
        try {
          const { fetchProcedureById } = await import("@/services/library/api");
          const proc = await fetchProcedureById(procId, true);
          if (proc?.quizId) {
            const { fetchQuizById } = await import("@/lib/api/library");
            const loadedQuiz = await fetchQuizById(proc.quizId);
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
    const fallbackQuiz =
      (course.quizId ? getQuizById(course.quizId) : null) ??
      getQuizById("quiz-handwashing");
    const questions =
      chapterQuiz?.questions && chapterQuiz.questions.length > 0
        ? chapterQuiz.questions
        : fallbackQuiz?.questions && fallbackQuiz.questions.length > 0
          ? fallbackQuiz.questions
          : (getQuizById("quiz-handwashing")?.questions ?? []);

    const minCorrectAnswers =
      chapterDetail.minCorrectAnswers ??
      chapterQuiz?.minCorrectAnswers ??
      Math.max(1, Math.ceil(questions.length * 0.7));

    return (
      <ChapterQuizView
        courseId={id}
        courseTitle={courseTitle}
        chapterNumber={chapterNumber}
        totalChapters={chapterDetail.totalChapters}
        assignmentId={assignment?.id}
        locale={locale}
        questions={questions}
        minCorrectAnswers={minCorrectAnswers}
      />
    );
  }

  // 2. Chapter Learn View: matches reference Image 1
  if (chapterNumber && !isNaN(chapterNumber)) {
    const chapterDetail = getChapterDetail(id, chapterNumber, locale);
    let linkedProcedure = null;

    if (chapterDetail.procedureSlug) {
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
        courseTitle={courseTitle}
        chapterNumber={chapterNumber}
        totalChapters={chapterDetail.totalChapters}
        chapterTitle={chapterDetail.title}
        chapterSubtitle={chapterDetail.subtitle}
        locale={locale}
        blocks={chapterDetail.blocks}
        procedure={linkedProcedure}
        employee={employee}
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
