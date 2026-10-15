import type { Dispatch, SetStateAction } from 'react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { QueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import { PROCEDURES_QUERY_KEY } from '@/services/library/hooks';
import {
  ApiException,
  createProcedure,
  createQuiz,
  deleteQuiz,
  updateProcedure,
  updateQuiz,
} from '@/lib/api';
import { waitForTranslations } from '@/lib/use-bilingual-translation';
import type {
  Category,
  CreateProcedureInput,
  Procedure,
  ProcedureAudience,
  ProcedureProtection,
  ProcedureQuiz,
  ProcedureBody,
} from '@/lib/types';
import type { BilingualValue } from '@/components/ui/bilingual-input';
import type { ValidationErrorResult } from './procedure-editor-validation';
import type { WizardStepId } from './procedure-editor-model';

interface ProcedureSaveDependencies {
  quizQuestionMissingAnswer: ProcedureQuiz['questions'][number] | null;
  setStep: Dispatch<SetStateAction<WizardStepId>>;
  tQuizDesc: (key: 'answerRequiredForPublish') => string;
  validateProcedureForm: (scope: 'details' | 'access' | 'all', status: 'draft' | 'published') => ValidationErrorResult | null;
  applyValidationError: (error: ValidationErrorResult) => void;
  setTitleError: Dispatch<SetStateAction<string | null>>;
  setPurposeError: Dispatch<SetStateAction<string | null>>;
  setBlockErrors: Dispatch<SetStateAction<Record<string, string>>>;
  setStationsError: Dispatch<SetStateAction<boolean>>;
  startTransition: (callback: () => void | Promise<void>) => void;
  quiz: ProcedureQuiz | null;
  hasQuizContent: boolean;
  initial?: Procedure;
  subcategoryId: string;
  categoryId: string;
  categories: Category[];
  category: Category | undefined;
  isEs: boolean;
  scrollToTarget: (target: string | HTMLElement | null) => void;
  title: BilingualValue;
  purpose: BilingualValue;
  audience: ProcedureAudience;
  body: ProcedureBody;
  iconImageUrl: string | null;
  protection: ProcedureProtection;
  setDirty: Dispatch<SetStateAction<boolean>>;
  importedId: string | null;
  isEdit: boolean;
  queryClient: QueryClient;
  router: AppRouterInstance;
  locale: string;
  tErr: (key: 'generic') => string;
  setError: Dispatch<SetStateAction<string | null>>;
}

export function createProcedureSaveHandler(deps: ProcedureSaveDependencies): (status: 'draft' | 'published') => void {
  const {
    quizQuestionMissingAnswer,
    setStep,
    tQuizDesc,
    validateProcedureForm,
    applyValidationError,
    setTitleError,
    setPurposeError,
    setBlockErrors,
    setStationsError,
    startTransition,
    quiz,
    hasQuizContent,
    initial,
    subcategoryId,
    categoryId,
    categories,
    category,
    isEs,
    scrollToTarget,
    title,
    purpose,
    audience,
    body,
    iconImageUrl,
    protection,
    setDirty,
    importedId,
    isEdit,
    queryClient,
    router,
    locale,
    tErr,
    setError,
  } = deps;

  return function save(status: 'draft' | 'published'): void {
    if (status === 'published' && quizQuestionMissingAnswer) {
      setStep('quiz');
      toast.error(tQuizDesc('answerRequiredForPublish'));
      requestAnimationFrame(() => {
        document.getElementById(`quiz-question-${quizQuestionMissingAnswer.id}`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      });
      return;
    }
    const valErr = validateProcedureForm('all', status);
    if (valErr) {
      applyValidationError(valErr);
      return;
    }

    setTitleError(null);
    setPurposeError(null);
    setBlockErrors({});
    setStationsError(false);

    setStationsError(false);
    startTransition(async () => {
      try {
        // Safety net: the buttons are already disabled while a translation is
        // pending, so this normally returns immediately. Bounded either way,
        // so a hung request can never wedge the save.
        await waitForTranslations();

        // The quiz lives in its own table: keep its row, make one, or drop it.
        // Edit semantics are PUT: question ids the backend issued (UUIDs)
        // edit in place, new rows omit `id` (backend generates), and omitted
        // existing rows are deleted — the mapping lives in lib/api.
        let quizId: string | null = null;
        const prevQuizId = initial?.quizId ?? null;
        if (quiz && hasQuizContent && quiz.questions.length > 0) {
          const quizNameEn = `${title.en.trim() || 'Procedure'} Quiz`;
          const quizNameEs = `${title.es.trim() || 'Procedimiento'} Quiz`;
          if (prevQuizId) {
            const { isUuid } = await import('@/services/library/api');
            const ownerId = initial && isUuid(initial.id) ? initial.id : importedId;
            await updateQuiz(prevQuizId, {
              nameEn: quizNameEn,
              nameEs: quizNameEs,
              questions: quiz.questions,
              attached: quiz.attached,
              ...(ownerId && isUuid(ownerId) ? { procedureId: ownerId } : {}),
            });
            quizId = prevQuizId;
          } else {
            quizId = (
              await createQuiz({
                nameEn: quizNameEn,
                nameEs: quizNameEs,
                quizType: 'procedure',
                questions: quiz.questions,
                attached: quiz.attached,
              })
            ).quiz.id;
          }
        } else if (prevQuizId) {
          // Emptied while editing — delete the backend row instead of
          // orphaning it (the API nulls quizId on referencing procedures).
          await deleteQuiz(prevQuizId);
          quizId = null;
        }
        const effectiveSubcategoryId =
          subcategoryId ||
          categories.find((c) => c.id === categoryId)?.subcategories?.[0]?.id ||
          null;

        // The picker's catalog is the local mock store — resolve the pick
        // to a live backend UUID before saving. A stale/missing match used
        // to be sent through and died with SUBCATEGORY_NOT_FOUND.
        const { resolveLiveSubcategoryId } = await import('@/services/categories/api');
        const pickedSub = categories
          .flatMap((c) =>
            (c.subcategories ?? []).map((s) => ({ ...s, categoryId: c.id, categorySlug: c.slug, categoryNameEn: c.nameEn })),
          )
          .find((s) => s.id === effectiveSubcategoryId);
        const liveSubcategoryId = effectiveSubcategoryId
          ? await resolveLiveSubcategoryId({
              categoryId: categoryId || null,
              categorySlug: category?.slug ?? null,
              categoryNameEn: category?.nameEn ?? null,
              subcategoryId: effectiveSubcategoryId,
              subcategorySlug: pickedSub?.slug ?? null,
              subcategoryNameEn: pickedSub?.nameEn ?? null,
            })
          : null;
        if (effectiveSubcategoryId && !liveSubcategoryId) {
          toast.error(
            isEs
              ? 'La subcategoría elegida no existe en el servidor. Elige otra subcategoría.'
              : "The chosen subcategory doesn't exist on the server. Pick another subcategory.",
          );
          setStep('access');
          scrollToTarget('proc-categories');
          return;
        }

        const effectiveTitleEn = (title.en.trim() || title.es.trim()).slice(0, 200);
        const effectiveTitleEs = (title.es.trim() || title.en.trim()).slice(0, 200);
        const effectivePurposeEn = purpose.en.trim() || purpose.es.trim() || effectiveTitleEn;
        const effectivePurposeEs = purpose.es.trim() || purpose.en.trim() || effectiveTitleEs;

        const input: CreateProcedureInput = {
          titleEn: effectiveTitleEn,
          titleEs: effectiveTitleEs,
          purposeEn: effectivePurposeEn,
          purposeEs: effectivePurposeEs,
          categoryId: categoryId || null,
          subcategoryId: liveSubcategoryId,
          stationIds: audience.stationIds,
          stationId: audience.stationIds[0] || null,
          assignUsers: audience.employeeIds,
          stationScope: {
            mode: audience.stationIds.length ? "specific" : "all",
            stationIds: audience.stationIds,
          },
          status,
          bodyEn: body,
          bodyEs: body,
          iconImageUrl,
          quizId,
          audience: audience.mode === "everyone" ? null : audience,
          protection,
        };
        let publishedNow = false;
        if (initial) {
          const { isUuid, publishProcedure } = await import('@/services/library/api');
          // The draft → published flip belongs to POST /:id/publish, not the
          // edit endpoint: the PUT ships the content edits at the procedure's
          // CURRENT status, then the dedicated publish call is the one request
          // that takes it live. Demo rows (non-UUID) live only in the local
          // store, so they keep carrying the status through the PUT fallback.
          const flipViaPublish =
            status === 'published' && initial.status !== 'published' && isUuid(initial.id);
          await updateProcedure(initial.id, {
            ...input,
            status: flipViaPublish ? 'draft' : input.status,
          });
          if (flipViaPublish) {
            await publishProcedure(initial.id);
            publishedNow = true;
          }
        } else if (importedId) {
          // Doc-import flow: the server already created the draft on import,
          // so edits UPDATE that row instead of POSTing a second one.
          const { isUuid, publishProcedure } = await import('@/services/library/api');
          const flipViaPublish = status === 'published' && isUuid(importedId);
          await updateProcedure(importedId, {
            ...input,
            status: flipViaPublish ? 'draft' : input.status,
          });
          if (flipViaPublish) {
            await publishProcedure(importedId);
            publishedNow = true;
          }
        } else {
          await createProcedure(input);
        }
        await queryClient.invalidateQueries({ queryKey: PROCEDURES_QUERY_KEY, refetchType: 'all' });
        queryClient.removeQueries({ queryKey: PROCEDURES_QUERY_KEY });
        setDirty(false);
        toast.success(
          publishedNow
            ? "Procedure published successfully"
            : isEdit || importedId
              ? "Procedure updated successfully"
              : "Procedure created successfully",
        );
        router.push(`/${locale}/admin/library`);
        router.refresh();
      } catch (err) {
        if (err instanceof ApiException) {
          const detailMsg = err.details?.length
            ? `: ${err.details.map((d) => `${d.path ? `${d.path}: ` : ''}${d.message}`).join(', ')}`
            : '';
          const msg = `${err.message}${detailMsg}`;
          setError(msg);
          toast.error(msg);
        } else {
          const msg = err instanceof Error ? err.message : tErr("generic");
          setError(msg);
          toast.error(msg);
        }
      }
    });
  
  };
}
