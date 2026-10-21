"use client";

import * as React from "react";
import Link from "next/link";
import { LuPencil } from "react-icons/lu";
import type { Procedure, ProcedureQuizQuestion } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { getQuizById } from "@/lib/api";
import {
  getCourseChaptersViewData,
  getChapterDetail,
  registerCourseChapters,
  type ChapterDefinition,
} from "@/lib/course-chapters-data";
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
  const [course, setCourse] = React.useState<Procedure | null>(
    initialCourse ?? null,
  );
  const [localQuizQuestions, setLocalQuizQuestions] = React.useState<
    ProcedureQuizQuestion[] | null
  >(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("lms_created_courses");
      if (raw) {
        const customMap = JSON.parse(raw);
        const decodedId = decodeURIComponent(courseId);
        const norm = (s: string) =>
          s
            .toLowerCase()
            .replace(/^course-/, "")
            .replace(/[^a-z0-9]/g, "");
        const targetNorm = norm(decodedId);

        let saved: any =
          customMap[courseId] ||
          customMap[decodedId] ||
          customMap[`course-${courseId}`] ||
          customMap[courseId.replace(/^course-/, "")];

        if (!saved) {
          saved = Object.values(customMap).find((c: any) => {
            if (!c) return false;
            if (c.id && norm(c.id) === targetNorm) return true;
            if (c.name && norm(c.name) === targetNorm) return true;
            return false;
          });
        }

        if (saved) {
          const registeredCourse: Procedure = {
            id: saved.id || courseId,
            slug: (saved.id || courseId).replace(/^course-/, ""),
            titleEn: saved.name || "Untitled Course",
            titleEs: saved.name || "Curso sin título",
            purposeEn: saved.purpose || "",
            purposeEs: saved.purpose || "",
            category: null,
            status: "published",
            bodyEn: { blocks: [] },
            bodyEs: { blocks: [] },
            createdBy: "admin-001",
            createdAt: saved.updatedAt || new Date().toISOString(),
            updatedAt: saved.updatedAt || new Date().toISOString(),
            quizId: saved.quizId || `quiz-${saved.id || courseId}`,
            linkedTrainingId: null,
            quizMode: "training",
            attachedToTraining: true,
            linkedSops: saved.linkedSops || [],
          };

          if (Array.isArray(saved.chapters) && saved.chapters.length > 0) {
            const defs: ChapterDefinition[] = saved.chapters.map(
              (ch: any, idx: number) => ({
                id: ch.id || `${saved.id || courseId}-ch-${idx + 1}`,
                number: idx + 1,
                titleEn: ch.title,
                titleEs: ch.title,
                contentEn: ch.subtitle || "",
                contentEs: ch.subtitle || "",
                blocks: ch.blocks ?? [],
                procedureSlug: ch.procedureSlug,
              }),
            );
            registerCourseChapters(saved.id || courseId, defs);
            if (saved.id && saved.id !== courseId) {
              registerCourseChapters(courseId, defs);
            }

            // Collect authored quiz questions
            const questions = saved.chapters.flatMap(
              (ch: any) => ch.quiz?.questions || ch.quizQuestions || [],
            );
            if (questions.length > 0) {
              setLocalQuizQuestions(questions);
            }
          }

          setCourse(registeredCourse);
        }
      }
    } catch (e) {
      console.warn("Failed to read course from localStorage:", e);
    }
  }, [courseId]);

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

  // Loading state when initialCourse wasn't on server and client hasn't mounted yet
  if (!initialCourse && !mounted) {
    return (
      <div className="pt-12 lg:pt-0">
        <div className="relative min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-8">
          <div className="text-sm text-[var(--color-ink-3)] animate-pulse">
            {isEs ? "Cargando curso..." : "Loading course..."}
          </div>
        </div>
      </div>
    );
  }

  // 1. Chapter Quiz View (Admin Preview)
  if (chapterNumber && !isNaN(chapterNumber) && mode === "quiz") {
    const chapterDetail = getChapterDetail(courseId, chapterNumber, locale);
    const quiz =
      (activeCourse.quizId ? getQuizById(activeCourse.quizId) : null) ??
      getQuizById("quiz-handwashing");

    const questions: ProcedureQuizQuestion[] =
      localQuizQuestions && localQuizQuestions.length > 0
        ? localQuizQuestions
        : quiz?.questions && quiz.questions.length > 0
          ? quiz.questions
          : (getQuizById("quiz-handwashing")?.questions ?? []);

    return (
      <div className="pt-12 lg:pt-0">
        <ChapterQuizView
          courseId={courseId}
          courseTitle={courseTitle}
          chapterNumber={chapterNumber}
          totalChapters={chapterDetail.totalChapters}
          locale={locale}
          questions={questions}
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

    return (
      <div className="pt-12 lg:pt-0">
        <ChapterLearnView
          courseId={courseId}
          courseTitle={courseTitle}
          chapterNumber={chapterNumber}
          totalChapters={chapterDetail.totalChapters}
          chapterTitle={chapterDetail.title}
          chapterSubtitle={chapterDetail.subtitle}
          locale={locale}
          blocks={chapterDetail.blocks}
          procedure={linkedProcedure}
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
