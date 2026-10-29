import * as React from "react";
import { buildBody } from "@/lib/procedure-draft";
import { getAllStepProgress } from "@/lib/getStepProgress";
import type { RecipeIngredientItem } from "@/components/admin/recipe-ingredients-editor";
import type {
  Category,
  ProcedureAudience,
  ProcedureBlock,
  ProcedureQuiz,
  ProcedureYieldItem,
} from "@/lib/types";
import type { BilingualValue } from "@/components/ui/bilingual-input";

interface ProcedureEditorDerivedInput {
  categories: Category[];
  categoryId: string;
  subcategoryId: string;
  isEs: boolean;
  lang: "en" | "es";
  title: BilingualValue;
  purpose: BilingualValue;
  blocks: ProcedureBlock[];
  ingredients: RecipeIngredientItem[];
  yieldItems: ProcedureYieldItem[];
  quiz: ProcedureQuiz | null;
  audience: ProcedureAudience;
}

export function useProcedureEditorDerivedData(
  input: ProcedureEditorDerivedInput,
) {
  const {
    categories,
    categoryId,
    subcategoryId,
    isEs,
    lang,
    title,
    purpose,
    blocks,
    ingredients,
    yieldItems,
    quiz,
    audience,
  } = input;
  const category = categories.find((item) => item.id === categoryId);
  const subcategory = category?.subcategories?.find(
    (item) => item.id === subcategoryId,
  );
  const isRecipe = Boolean(
    category && /recipe/i.test(`${category.slug} ${category.nameEn}`),
  );
  const nameOf = (item: { nameEn: string; nameEs?: string }): string =>
    isEs ? item.nameEs || item.nameEn : item.nameEn;
  const titleValue = lang === "en" ? title.en : title.es;
  const purposeValue = lang === "en" ? purpose.en : purpose.es;

  const body = React.useMemo(
    () =>
      buildBody({
        blocks,
        recipe: isRecipe
          ? { ingredients, yieldItems, title: { en: title.en, es: title.es } }
          : null,
      }),
    [blocks, isRecipe, ingredients, yieldItems, title],
  );
  const stepProgress = React.useMemo(
    () =>
      getAllStepProgress({
        title,
        purpose,
        blocks,
        quiz,
        subcategoryId,
        categoryKind: category?.kind ?? "general",
        audience,
      }),
    [title, purpose, blocks, quiz, subcategoryId, category?.kind, audience],
  );
  const hasQuizContent = React.useMemo(() => {
    if (!quiz?.questions.length) return false;
    return quiz.questions.some((question) => {
      const hasPrompt = Boolean(
        question.prompt?.en?.trim() || question.prompt?.es?.trim(),
      );
      const hasChoice = question.choices?.some((choice) =>
        Boolean(choice.label?.en?.trim() || choice.label?.es?.trim()),
      );
      return hasPrompt || hasChoice;
    });
  }, [quiz]);
  const quizQuestionMissingAnswer = React.useMemo(() => {
    if (!quiz || !hasQuizContent) return null;
    return (
      quiz.questions.find((question) => {
        const authored = Boolean(
          question.prompt?.en?.trim() ||
          question.prompt?.es?.trim() ||
          question.choices?.some(
            (choice) => choice.label?.en?.trim() || choice.label?.es?.trim(),
          ),
        );
        if (!authored) return false;
        return !question.choices?.some(
          (choice) =>
            choice.id === question.correctChoiceId &&
            Boolean(choice.label?.en?.trim() || choice.label?.es?.trim()),
        );
      }) ?? null
    );
  }, [quiz, hasQuizContent]);

  return {
    category,
    subcategory,
    isRecipe,
    nameOf,
    titleValue,
    purposeValue,
    body,
    stepProgress,
    hasQuizContent,
    quizQuestionMissingAnswer,
    quizCount: quiz?.questions.length ?? 0,
  };
}
