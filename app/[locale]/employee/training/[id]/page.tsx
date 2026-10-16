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
import {
  getCourseById,
  listTrainingAssignments,
  listTrainingAssignmentsForEmployee,
  mockTrainingEmployees,
} from "@/lib/mock-training";
import type { TrainingAssignment } from "@/lib/types";
import {
  getCourseChaptersViewData,
  getChapterDetail,
} from "@/lib/course-chapters-data";
import { CourseChaptersView } from "./components/course-chapters-view";
import { ChapterLearnView } from "./components/chapter-learn-view";
import { ChapterQuizView } from "./components/chapter-quiz-view";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ chapter?: string; mode?: string }>;
}

export const dynamic = "force-dynamic";

export default async function EmployeeTrainingCoursePage({
  params,
  searchParams,
}: PageProps): Promise<React.ReactElement> {
  const { locale, id } = await params;
  const { chapter, mode } = await searchParams;
  setRequestLocale(locale);

  const course = getCourseById(id);
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
    if (err instanceof ApiException) redirect(`/${locale}/login`);
    throw err;
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
    // Lookup quiz by course quizId or fallback to handwashing quiz bank
    const quiz =
      (course.quizId ? getQuizById(course.quizId) : null) ??
      getQuizById("quiz-handwashing");
    const questions =
      quiz?.questions && quiz.questions.length > 0
        ? quiz.questions
        : (getQuizById("quiz-handwashing")?.questions ?? []);

    return (
      <ChapterQuizView
        courseId={id}
        courseTitle={courseTitle}
        chapterNumber={chapterNumber}
        totalChapters={chapterDetail.totalChapters}
        assignmentId={assignment?.id}
        locale={locale}
        questions={questions}
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
