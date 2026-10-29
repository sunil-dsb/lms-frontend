export interface ChapterQuiz {
  id?: string;
  attached?: boolean;
  minCorrectAnswers?: number | null;
  questions?: unknown[];
}

export interface BackendChapter {
  id: string;
  courseId: string;
  number: number;
  titleEn: string;
  titleEs: string;
  subtitleEn?: string;
  subtitleEs?: string;
  blocks: unknown[];
  procedureId?: string | null;
  quizId?: string | null;
  quiz?: ChapterQuiz | null;
  minCorrectAnswers?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChapterInput {
  courseId: string;
  number?: number;
  titleEn: string;
  titleEs: string;
  subtitleEn?: string;
  subtitleEs?: string;
  blocks?: unknown[];
  procedureId?: string | null;
  quizId?: string | null;
  minCorrectAnswers?: number | null;
  quiz?: ChapterQuiz | null;
}

export interface UpdateChapterInput {
  courseId?: string;
  number?: number;
  titleEn?: string;
  titleEs?: string;
  subtitleEn?: string;
  subtitleEs?: string;
  blocks?: unknown[];
  procedureId?: string | null;
  quizId?: string | null;
  minCorrectAnswers?: number | null;
  quiz?: ChapterQuiz | null;
}

export interface ChapterOrderItem {
  id: string;
  number: number;
}

export interface ReorderChaptersInput {
  courseId: string;
  orders: ChapterOrderItem[];
}
