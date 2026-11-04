import * as React from "react";
import type {
  Procedure,
  ProcedureBlock,
  ProcedureQuiz,
  ProcedureQuizQuestion,
} from "@/lib/types";
import { isQuizQuestionAuthored } from "@/lib/api";
import type { EditorChapter } from "./course-editor";
import {
  type LinkedProcedure,
  getProcedureQuizQuestions,
  getQuestionComparableKey,
  getQuestionNormalizedPrompt,
  validateChapterQuiz,
} from "./chapter-quiz-utils";

export {
  type LinkedProcedure,
  getProcedureQuizQuestions,
  getQuestionComparableKey,
  getQuestionNormalizedPrompt,
  validateChapterQuiz,
};

interface UseChapterLinkedQuizProps {
  blocks: ProcedureBlock[];
  initialChapter?: EditorChapter | null;
  quiz: ProcedureQuiz | null;
  setQuiz: React.Dispatch<React.SetStateAction<ProcedureQuiz | null>>;
  setQuizError: React.Dispatch<React.SetStateAction<string | null>>;
  isEs: boolean;
}

export function useChapterLinkedQuiz({
  blocks,
  initialChapter,
  quiz,
  setQuiz,
  setQuizError,
  isEs,
}: UseChapterLinkedQuizProps) {
  const [linkedProceduresMap, setLinkedProceduresMap] = React.useState<
    Record<string, LinkedProcedure>
  >({});

  // Collect all procedureIds linked in chapter blocks or initialChapter
  const linkedProcedureIds = React.useMemo(() => {
    const ids: string[] = [];
    if (
      initialChapter?.procedureId &&
      !ids.includes(initialChapter.procedureId)
    ) {
      ids.push(initialChapter.procedureId);
    }
    for (const b of blocks) {
      if (b.kind === "linked_procedures" && Array.isArray(b.procedureIds)) {
        for (const id of b.procedureIds) {
          if (id && !ids.includes(id)) ids.push(id);
        }
      }
    }
    return ids;
  }, [blocks, initialChapter]);

  const isMountedRef = React.useRef(true);
  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchingIdsRef = React.useRef<Set<string>>(new Set());
  const linkedProceduresMapRef = React.useRef(linkedProceduresMap);
  linkedProceduresMapRef.current = linkedProceduresMap;

  // Fetch full details for any linked procedures not yet in linkedProceduresMap
  React.useEffect(() => {
    const uniqueIds = Array.from(new Set(linkedProcedureIds));
    const missing = uniqueIds.filter(
      (id) =>
        id &&
        !linkedProceduresMapRef.current[id] &&
        !Object.values(linkedProceduresMapRef.current).some(
          (p) => p.id === id || p.slug === id,
        ) &&
        !fetchingIdsRef.current.has(id),
    );
    if (missing.length === 0) return;

    for (const id of missing) {
      fetchingIdsRef.current.add(id);
      import("@/services/library/api")
        .then(({ fetchProcedureById, getCachedProcedure }) => {
          const cached = getCachedProcedure(id);
          if (cached && isMountedRef.current) {
            setLinkedProceduresMap((prev) => ({
              ...prev,
              [id]: cached,
              ...(cached.id ? { [cached.id]: cached } : {}),
              ...(cached.slug ? { [cached.slug]: cached } : {}),
            }));
          }
          return fetchProcedureById(id, true);
        })
        .then(async (proc) => {
          if (!isMountedRef.current || !proc) return;

          let fullProc: LinkedProcedure = proc;
          if (proc.quizId && !fullProc.quiz) {
            try {
              const { fetchQuizById } = await import("@/lib/api/library");
              const loadedQuiz = await fetchQuizById(proc.quizId);
              if (loadedQuiz) {
                fullProc = {
                  ...proc,
                  quiz: {
                    attached: loadedQuiz.attached ?? true,
                    questions: loadedQuiz.questions,
                  },
                };
              }
            } catch {
              // ignore
            }
          }

          if (!isMountedRef.current) return;
          setLinkedProceduresMap((prev) => ({
            ...prev,
            [id]: fullProc,
            ...(fullProc.id ? { [fullProc.id]: fullProc } : {}),
            ...(fullProc.slug ? { [fullProc.slug]: fullProc } : {}),
          }));
        })
        .catch(() => {
          // ignore
        })
        .finally(() => {
          fetchingIdsRef.current.delete(id);
        });
    }
  }, [linkedProcedureIds]);

  // Discover all linked procedures that contain a quiz
  const availableLinkedQuestions = React.useMemo(() => {
    const result: {
      procedure: Procedure;
      questions: ProcedureQuizQuestion[];
    }[] = [];
    const visited = new Set<string>();

    for (const id of linkedProcedureIds) {
      const proc =
        linkedProceduresMap[id] ||
        Object.values(linkedProceduresMap).find(
          (p) => p.id === id || p.slug === id,
        );
      if (proc && !visited.has(proc.id)) {
        visited.add(proc.id);
        const qs = getProcedureQuizQuestions(proc);
        if (qs.length > 0) {
          result.push({ procedure: proc, questions: qs });
        }
      }
    }
    return result;
  }, [linkedProcedureIds, linkedProceduresMap]);

  // Helper to test if a quiz has at least one authored question
  const hasAuthoredQuestions = React.useCallback(
    (q: ProcedureQuiz | null | undefined): boolean => {
      if (!q || !q.questions || q.questions.length === 0) return false;
      return q.questions.some(isQuizQuestionAuthored);
    },
    [],
  );

  // Auto-prefill linked procedure questions into the chapter quiz
  React.useEffect(() => {
    if (availableLinkedQuestions.length > 0) {
      setQuiz((prev) => {
        const existingQuestions = prev?.questions ?? [];

        if (!hasAuthoredQuestions(prev)) {
          const importedQuestions: ProcedureQuizQuestion[] = [];
          const seenPrompts = new Set<string>();

          availableLinkedQuestions.forEach(({ procedure, questions }) => {
            const procTitle = isEs
              ? procedure.titleEs || procedure.titleEn
              : procedure.titleEn || procedure.titleEs;
            questions.forEach((q) => {
              const key = getQuestionComparableKey(q);
              if (key && seenPrompts.has(key)) return;
              if (key) seenPrompts.add(key);

              const { en, es } = getQuestionNormalizedPrompt(q);
              importedQuestions.push({
                ...q,
                id:
                  q.id ||
                  `q-imp-${procedure.id}-${Math.random().toString(36).slice(2, 8)}`,
                prompt: { en, es },
                question: { en, es },
                sourceProcedureId: procedure.id,
                sourceProcedureTitle: procTitle,
              });
            });
          });

          if (importedQuestions.length === 0) return prev;

          return {
            attached: true,
            questions: importedQuestions,
            minCorrectAnswers: Math.max(
              1,
              Math.ceil(importedQuestions.length * 0.7),
            ),
          };
        }

        const existingPrompts = new Set<string>();
        const existingIds = new Set<string>();

        existingQuestions.forEach((q) => {
          if (q.id) existingIds.add(q.id);
          const key = getQuestionComparableKey(q);
          if (key) existingPrompts.add(key);
        });

        let updatedExisting = false;
        const normalizedExisting = existingQuestions.map((q) => {
          const qKey = getQuestionComparableKey(q);
          const { en, es } = getQuestionNormalizedPrompt(q);

          for (const { procedure, questions } of availableLinkedQuestions) {
            const matchedProcQ = questions.find(
              (pq) =>
                pq.id === q.id ||
                (qKey && getQuestionComparableKey(pq) === qKey),
            );
            if (matchedProcQ) {
              const procTitle = isEs
                ? procedure.titleEs || procedure.titleEn
                : procedure.titleEn || procedure.titleEs;
              if (
                q.sourceProcedureId !== procedure.id ||
                q.sourceProcedureTitle !== procTitle ||
                !q.prompt?.en ||
                !q.question?.en
              ) {
                updatedExisting = true;
                return {
                  ...q,
                  prompt: { en, es },
                  question: { en, es },
                  sourceProcedureId: procedure.id,
                  sourceProcedureTitle: procTitle,
                };
              }
            }
          }

          if (!q.prompt?.en && en) {
            updatedExisting = true;
            return {
              ...q,
              prompt: { en, es },
              question: { en, es },
            };
          }

          return q;
        });

        const toAdd: ProcedureQuizQuestion[] = [];
        availableLinkedQuestions.forEach(({ procedure, questions }) => {
          const procTitle = isEs
            ? procedure.titleEs || procedure.titleEn
            : procedure.titleEn || procedure.titleEs;
          questions.forEach((q) => {
            const key = getQuestionComparableKey(q);
            if (
              (q.id && existingIds.has(q.id)) ||
              (key && existingPrompts.has(key))
            ) {
              return;
            }

            const { en, es } = getQuestionNormalizedPrompt(q);
            toAdd.push({
              ...q,
              id:
                q.id ||
                `q-imp-${procedure.id}-${Math.random().toString(36).slice(2, 8)}`,
              prompt: { en, es },
              question: { en, es },
              sourceProcedureId: procedure.id,
              sourceProcedureTitle: procTitle,
            });

            if (q.id) existingIds.add(q.id);
            if (key) existingPrompts.add(key);
          });
        });

        if (toAdd.length === 0 && !updatedExisting) return prev;

        const merged = [...normalizedExisting, ...toAdd];
        return {
          attached: true,
          questions: merged,
          minCorrectAnswers: Math.max(
            prev?.minCorrectAnswers || 1,
            Math.ceil(merged.length * 0.7),
          ),
        };
      });
    }
  }, [availableLinkedQuestions, isEs, hasAuthoredQuestions, setQuiz]);

  const handleImportLinkedQuestions = () => {
    const existingPrompts = new Set(
      (quiz?.questions ?? [])
        .filter(isQuizQuestionAuthored)
        .map(getQuestionComparableKey)
        .filter(Boolean),
    );
    const existingIds = new Set(
      (quiz?.questions ?? []).map((q) => q.id).filter(Boolean),
    );

    const toAdd: ProcedureQuizQuestion[] = [];
    availableLinkedQuestions.forEach(({ procedure, questions }) => {
      const procTitle = isEs
        ? procedure.titleEs || procedure.titleEn
        : procedure.titleEn || procedure.titleEs;
      questions.forEach((q) => {
        const promptKey = getQuestionComparableKey(q);
        if (
          (q.id && existingIds.has(q.id)) ||
          (promptKey && existingPrompts.has(promptKey))
        ) {
          return;
        }

        const { en, es } = getQuestionNormalizedPrompt(q);
        toAdd.push({
          ...q,
          id:
            q.id ||
            `q-imp-${procedure.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          prompt: { en, es },
          question: { en, es },
          sourceProcedureId: procedure.id,
          sourceProcedureTitle: procTitle,
        });
        if (q.id) existingIds.add(q.id);
        if (promptKey) existingPrompts.add(promptKey);
      });
    });

    if (toAdd.length === 0) return;

    setQuiz((prev) => {
      const currentQuestions = (prev?.questions ?? []).filter(
        isQuizQuestionAuthored,
      );
      const merged = [...currentQuestions, ...toAdd];
      return {
        attached: true,
        questions: merged,
        minCorrectAnswers: Math.max(
          prev?.minCorrectAnswers || 1,
          Math.ceil(merged.length * 0.7),
        ),
      };
    });
    setQuizError(null);
  };

  const handleRemoveQuestionsForProcedure = (procId: string) => {
    setQuiz((prev) => {
      if (!prev || !prev.questions) return prev;
      const filtered = prev.questions.filter(
        (q) => q.sourceProcedureId !== procId,
      );
      return {
        ...prev,
        questions: filtered,
        minCorrectAnswers: Math.max(1, Math.ceil(filtered.length * 0.7)),
      };
    });
  };

  const handleSelectAllLinkedQuestions = (
    proc: Procedure,
    questions: ProcedureQuizQuestion[],
    selected: boolean,
  ) => {
    if (selected) {
      setQuiz((prev) => {
        const currentQuestions = (prev?.questions ?? []).filter(
          isQuizQuestionAuthored,
        );
        const existingKeys = new Set(
          currentQuestions.map(getQuestionComparableKey),
        );
        const existingIds = new Set(currentQuestions.map((q) => q.id));

        const procTitle = isEs
          ? proc.titleEs || proc.titleEn
          : proc.titleEn || proc.titleEs;

        const toAdd: ProcedureQuizQuestion[] = [];
        questions.forEach((q) => {
          const key = getQuestionComparableKey(q);
          if (
            (q.id && existingIds.has(q.id)) ||
            (key && existingKeys.has(key))
          ) {
            return;
          }
          const { en, es } = getQuestionNormalizedPrompt(q);
          toAdd.push({
            ...q,
            id:
              q.id ||
              `q-imp-${proc.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            prompt: { en, es },
            question: { en, es },
            sourceProcedureId: proc.id,
            sourceProcedureTitle: procTitle,
          });
        });

        const merged = [...currentQuestions, ...toAdd];
        return {
          attached: true,
          questions: merged,
          minCorrectAnswers: Math.max(
            prev?.minCorrectAnswers || 1,
            Math.ceil(merged.length * 0.7),
          ),
        };
      });
      setQuizError(null);
    } else {
      handleRemoveQuestionsForProcedure(proc.id);
    }
  };

  const handleSelectIndividualQuestion = (
    proc: Procedure,
    question: ProcedureQuizQuestion,
    selected: boolean,
  ) => {
    const qKey = getQuestionComparableKey(question);
    const qId = question.id;

    if (selected) {
      setQuiz((prev) => {
        const currentQuestions = (prev?.questions ?? []).filter(
          isQuizQuestionAuthored,
        );
        const alreadyExists = currentQuestions.some(
          (q) =>
            (qId && q.id === qId) ||
            (qKey && getQuestionComparableKey(q) === qKey),
        );
        if (alreadyExists) return prev;

        const procTitle = isEs
          ? proc.titleEs || proc.titleEn
          : proc.titleEn || proc.titleEs;
        const { en, es } = getQuestionNormalizedPrompt(question);

        const newQ: ProcedureQuizQuestion = {
          ...question,
          id:
            question.id ||
            `q-imp-${proc.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          prompt: { en, es },
          question: { en, es },
          sourceProcedureId: proc.id,
          sourceProcedureTitle: procTitle,
        };

        const merged = [...currentQuestions, newQ];
        return {
          attached: true,
          questions: merged,
          minCorrectAnswers: Math.max(
            prev?.minCorrectAnswers || 1,
            Math.ceil(merged.length * 0.7),
          ),
        };
      });
      setQuizError(null);
    } else {
      setQuiz((prev) => {
        if (!prev || !prev.questions) return prev;
        const filtered = prev.questions.filter((q) => {
          if (qId && q.id === qId) return false;
          if (qKey && getQuestionComparableKey(q) === qKey) return false;
          return true;
        });
        return {
          ...prev,
          questions: filtered,
          minCorrectAnswers: Math.max(1, Math.ceil(filtered.length * 0.7)),
        };
      });
    }
  };

  return {
    linkedProcedureIds,
    linkedProceduresMap,
    availableLinkedQuestions,
    hasAuthoredQuestions,
    handleImportLinkedQuestions,
    handleRemoveQuestionsForProcedure,
    handleSelectAllLinkedQuestions,
    handleSelectIndividualQuestion,
  };
}
