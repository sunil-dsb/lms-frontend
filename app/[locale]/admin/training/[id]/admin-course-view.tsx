"use client";

import * as React from "react";
import Link from "next/link";
import { LuPencil } from "react-icons/lu";
import type {
  Procedure,
  ProcedureBlock,
  ProcedureQuizQuestion,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { getQuizById } from "@/lib/api";
import {
  getCourseChaptersViewData,
  getChapterDetail,
  registerCourseChapters,
  calculateChapterEstimatedMinutes,
  type ChapterDefinition,
} from "@/lib/course-chapters-data";
import { useCourse } from "@/services/courses/hooks";
import { useChapter } from "@/services/chapters/hooks";
import { CourseDetailSkeleton } from "@/components/admin/training-courses-skeleton";
import { CourseChaptersView } from "@/app/[locale]/employee/training/[id]/components/course-chapters-view";
import { ChapterLearnView } from "@/app/[locale]/employee/training/[id]/components/chapter-learn-view";
import { ChapterQuizView } from "@/app/[locale]/employee/training/[id]/components/chapter-quiz-view";

interface AdminCourseViewProps {
  locale: string;
  courseId: string;
  initialCourse?: Procedure;
  chapterNumber?: number | null;
  mode?: string | null;
  linkedProcedure?: Procedure | null;
}

export function AdminCourseView({
  locale,
  courseId,
  initialCourse,
  chapterNumber,
  mode,
  linkedProcedure,
}: AdminCourseViewProps): React.ReactElement {
  const isEs = locale === "es";

  // --- 1. ALL HOOKS CALLED UNCONDITIONALLY AT THE TOP ---
  const { data: apiCourse, isLoading, isError } = useCourse(courseId);

  // Hook to fetch specific chapter via API on chapter click
  const targetChapterParam = chapterNumber ? String(chapterNumber) : "";
  const { data: apiChapter, isLoading: isChapterLoading } = useChapter(
    targetChapterParam,
    courseId,
  );

  const [course, setCourse] = React.useState<Procedure | null>(
    initialCourse ?? null,
  );
  const [fetchedProcedure, setFetchedProcedure] =
    React.useState<Procedure | null>(null);
  const [localQuizQuestions, setLocalQuizQuestions] = React.useState<
    ProcedureQuizQuestion[] | null
  >(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (apiCourse) {
      const proc = {
        id: apiCourse.id,
        slug: apiCourse.id,
        titleEn: apiCourse.titleEn,
        titleEs: apiCourse.titleEs,
        purposeEn: apiCourse.purposeEn,
        purposeEs: apiCourse.purposeEs,
        status: apiCourse.status as any,
        createdAt: apiCourse.createdAt,
        updatedAt: apiCourse.updatedAt,
        attachedToTraining: true,
        chapterCount: apiCourse.chapters?.length ?? 0,
      } as unknown as Procedure;
      setCourse(proc);

      if (apiCourse.chapters && apiCourse.chapters.length > 0) {
        const chapterDefs: ChapterDefinition[] = apiCourse.chapters.map(
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
            estimatedMinutes: calculateChapterEstimatedMinutes(ch),
          }),
        );
        registerCourseChapters(apiCourse.id, chapterDefs);
      }
    }
  }, [apiCourse]);

  React.useEffect(() => {
    if (chapterNumber && mode === "quiz") {
      const chapterDetail = getChapterDetail(courseId, chapterNumber, locale);
      if (!chapterDetail?.quiz?.questions?.length) {
        const procId =
          apiChapter?.procedureId ||
          chapterDetail?.procedureId ||
          chapterDetail?.procedureSlug;

        if (procId) {
          import("@/services/library/api")
            .then(({ fetchProcedureById }) => fetchProcedureById(procId, true))
            .then(async (proc) => {
              if (proc?.quizId) {
                const { fetchQuizById } = await import("@/lib/api/library");
                const loadedQuiz = await fetchQuizById(proc.quizId);
                if (loadedQuiz?.questions?.length) {
                  setLocalQuizQuestions(loadedQuiz.questions);
                }
              }
            })
            .catch(() => {});
        }
      }
    }
  }, [chapterNumber, mode, courseId, locale, apiChapter?.procedureId]);

  React.useEffect(() => {
    const chapterDetail = getChapterDetail(
      courseId,
      chapterNumber ?? 1,
      locale,
    );
    const procId =
      apiChapter?.procedureId ||
      chapterDetail?.procedureId ||
      chapterDetail?.procedureSlug;

    if (
      procId &&
      !linkedProcedure &&
      (!fetchedProcedure ||
        (fetchedProcedure.id !== procId && fetchedProcedure.slug !== procId))
    ) {
      import("@/services/library/api")
        .then(({ fetchProcedureById }) => fetchProcedureById(procId, true))
        .then((proc) => {
          if (proc) setFetchedProcedure(proc);
        })
        .catch(() => {});
    }
  }, [
    apiChapter?.procedureId,
    linkedProcedure,
    courseId,
    chapterNumber,
    locale,
    fetchedProcedure,
  ]);

  const activeCourse = course ?? {
    id: courseId,
    slug: courseId.replace(/^course-/, ""),
    titleEn: "Course Preview",
    titleEs: "Vista previa del curso",
    purposeEn: "",
    purposeEs: "",
    category: null,
    status: "published" as const,
    bodyEn: { blocks: [] },
    bodyEs: { blocks: [] },
    createdBy: "admin-001",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    quizId: null,
    linkedTrainingId: null,
    quizMode: "training" as const,
    attachedToTraining: true,
    linkedSops: [],
  };

  const courseTitle =
    (isEs
      ? activeCourse.titleEs || activeCourse.titleEn
      : activeCourse.titleEn || activeCourse.titleEs) || activeCourse.slug;

  const basePath = `/${locale}/admin/training/${courseId}`;
  const backHref = `/${locale}/admin/training`;

  // Default chapters view data (all chapters unlocked for admin inspection)
  const chaptersViewData = React.useMemo(() => {
    const raw = getCourseChaptersViewData(activeCourse, undefined, locale);
    return {
      ...raw,
      chapters: raw.chapters.map((ch) => ({
        ...ch,
        status: (ch.status === "locked" ? "active" : ch.status) as
          "active" | "complete" | "locked",
      })),
    };
  }, [activeCourse, locale]);

  // --- 2. CONDITIONAL RENDERING (ALL HOOKS HAVE COMPLETED) ---

  // Loading state when course is being fetched
  if (isLoading && !course) {
    return (
      <div className="pt-12 lg:pt-0">
        <CourseDetailSkeleton sidebarOffsetPx={280} />
      </div>
    );
  }

  // Not found state
  if (isError || (!isLoading && !course && !apiCourse)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
        <div className="mx-auto max-w-card space-y-4">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-ink)]">
            {isEs
              ? "Este curso no está disponible"
              : "This course isn’t available"}
          </h1>
          <p className="text-base text-[var(--color-ink-2)]">
            {isEs
              ? "Puede que se haya quitado o movido."
              : "It may have been removed or moved."}
          </p>
          <div className="pt-4">
            <Link
              href={`/${locale}/admin/training`}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-600)] px-5 py-3 text-sm font-semibold text-white shadow-e1 hover:bg-[var(--color-brand-hover)]"
            >
              {isEs ? "Volver a capacitación" : "Back to courses"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 1. Chapter Quiz View (Admin Preview)
  if (chapterNumber && !isNaN(chapterNumber) && mode === "quiz") {
    if (isChapterLoading && !apiChapter) {
      return (
        <div className="pt-12 lg:pt-0">
          <CourseDetailSkeleton sidebarOffsetPx={280} />
        </div>
      );
    }

    const chapterDetail = getChapterDetail(courseId, chapterNumber, locale);
    const chapterQuiz = apiChapter?.quiz || chapterDetail.quiz;
    const fallbackQuiz =
      (activeCourse.quizId ? getQuizById(activeCourse.quizId) : null) ??
      getQuizById("quiz-handwashing");

    const questions: ProcedureQuizQuestion[] =
      localQuizQuestions && localQuizQuestions.length > 0
        ? localQuizQuestions
        : chapterQuiz?.questions && chapterQuiz.questions.length > 0
          ? (chapterQuiz.questions as ProcedureQuizQuestion[])
          : fallbackQuiz?.questions && fallbackQuiz.questions.length > 0
            ? fallbackQuiz.questions
            : (getQuizById("quiz-handwashing")?.questions ?? []);

    const minCorrectAnswers =
      apiChapter?.minCorrectAnswers ??
      chapterDetail.minCorrectAnswers ??
      chapterQuiz?.minCorrectAnswers ??
      Math.max(1, Math.ceil(questions.length * 0.7));

    return (
      <div className="pt-12 lg:pt-0">
        <ChapterQuizView
          courseId={courseId}
          courseTitle={courseTitle}
          chapterNumber={chapterNumber}
          totalChapters={
            apiCourse?.chapters?.length || chapterDetail.totalChapters
          }
          locale={locale}
          questions={questions}
          minCorrectAnswers={minCorrectAnswers}
          basePath={basePath}
          backHref={basePath}
          sidebarOffsetPx={280}
        />
      </div>
    );
  }

  // 2. Chapter Learn View (Admin Preview)
  if (chapterNumber && !isNaN(chapterNumber)) {
    const chapterDetail = getChapterDetail(courseId, chapterNumber, locale);
    const targetProcId =
      apiChapter?.procedureId ||
      chapterDetail?.procedureId ||
      chapterDetail?.procedureSlug;

    const isProcedureLoading = Boolean(
      targetProcId &&
      !linkedProcedure &&
      (!fetchedProcedure ||
        (fetchedProcedure.id !== targetProcId &&
          fetchedProcedure.slug !== targetProcId)),
    );

    if ((isChapterLoading && !apiChapter) || isProcedureLoading) {
      return (
        <div className="pt-12 lg:pt-0">
          <CourseDetailSkeleton sidebarOffsetPx={280} />
        </div>
      );
    }
    const effectiveTitle =
      (isEs
        ? apiChapter?.titleEs || apiChapter?.titleEn
        : apiChapter?.titleEn || apiChapter?.titleEs) || chapterDetail.title;

    const effectiveSubtitle =
      (isEs
        ? apiChapter?.subtitleEs || apiChapter?.subtitleEn
        : apiChapter?.subtitleEn || apiChapter?.subtitleEs) ||
      chapterDetail.subtitle;

    const effectiveBlocks =
      (apiChapter?.blocks as ProcedureBlock[]) || chapterDetail.blocks;

    return (
      <div className="pt-12 lg:pt-0">
        <ChapterLearnView
          courseId={courseId}
          courseTitle={courseTitle}
          chapterNumber={chapterNumber}
          totalChapters={
            apiCourse?.chapters?.length || chapterDetail.totalChapters
          }
          chapterTitle={effectiveTitle}
          chapterSubtitle={effectiveSubtitle}
          locale={locale}
          blocks={effectiveBlocks}
          procedure={linkedProcedure || fetchedProcedure}
          basePath={basePath}
          backHref={basePath}
          sidebarOffsetPx={280}
        />
      </div>
    );
  }

  // 3. Default View: Course Chapters Overview (Admin View)
  return (
    <div className="pt-12 lg:pt-0">
      <CourseChaptersView
        data={chaptersViewData}
        locale={locale}
        basePath={basePath}
        backHref={backHref}
        backLabel={isEs ? "Capacitación" : "Training"}
        sidebarOffsetPx={280}
        showProgress={false}
        extraHeaderActions={
          <Link href={`/${locale}/admin/training/${courseId}/edit`}>
            <Button
              size="sm"
              variant="surface"
              icon={LuPencil}
              className="cursor-pointer"
            >
              {isEs ? "Editar curso" : "Edit course"}
            </Button>
          </Link>
        }
      />
    </div>
  );
}
