import type { Dispatch, RefObject, SetStateAction } from "react";
import { toast } from "@/components/ui/toast";
import type { ProcedureQuiz } from "@/lib/types";
import type { ValidationErrorResult } from "./procedure-editor-validation";
import type { WizardStepId } from "./procedure-editor-model";

interface NavigationDependencies {
  step: WizardStepId;
  quizQuestionMissingAnswer: ProcedureQuiz["questions"][number] | null;
  tQuizDesc: (key: "answerRequiredForPublish") => string;
  validateProcedureForm: (
    scope: "details" | "access" | "all",
    status: "draft" | "published",
  ) => ValidationErrorResult | null;
  setTitleError: Dispatch<SetStateAction<string | null>>;
  setPurposeError: Dispatch<SetStateAction<string | null>>;
  setBlockErrors: Dispatch<SetStateAction<Record<string, string>>>;
  setStationsError: Dispatch<SetStateAction<boolean>>;
  setStep: Dispatch<SetStateAction<WizardStepId>>;
  stepIdx: number;
  steps: readonly { id: WizardStepId }[];
  stationsSectionRef: RefObject<HTMLElement | null>;
}

export function createProcedureNavigationHandlers(
  deps: NavigationDependencies,
) {
  const {
    step,
    quizQuestionMissingAnswer,
    tQuizDesc,
    validateProcedureForm,
    setTitleError,
    setPurposeError,
    setBlockErrors,
    setStationsError,
    setStep,
    stepIdx,
    steps,
    stationsSectionRef,
  } = deps;

  function scrollToTarget(target: string | HTMLElement | null): void {
    if (!target) return;
    const tryScroll = (attemptsLeft = 6) => {
      const el =
        typeof target === "string" ? document.getElementById(target) : target;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const input = el.querySelector(
          "input:not([type=hidden]):not([type=file]):not([disabled]), textarea:not([disabled])",
        ) as HTMLInputElement | HTMLTextAreaElement | null;
        if (input) setTimeout(() => input.focus(), 350);
        el.classList.add(
          "ring-2",
          "ring-[var(--color-warn)]/60",
          "ring-offset-2",
          "transition-all",
        );
        setTimeout(() => {
          el.classList.remove(
            "ring-2",
            "ring-[var(--color-warn)]/60",
            "ring-offset-2",
          );
        }, 3000);
      } else if (attemptsLeft > 0) {
        setTimeout(() => tryScroll(attemptsLeft - 1), 50);
      }
    };
    requestAnimationFrame(() => tryScroll());
  }

  function applyValidationError(valErr: ValidationErrorResult): void {
    if (valErr.field === "title") setTitleError(valErr.message);
    else if (valErr.field === "purpose") setPurposeError(valErr.message);
    else if (valErr.blockId)
      setBlockErrors({ [valErr.blockId]: valErr.message });
    if (valErr.step !== step) setStep(valErr.step);
    if (valErr.step === "access" || valErr.field === "stations")
      setStationsError(true);
    toast.error(valErr.message);
    scrollToTarget(valErr.target);
  }

  function handleNext(): void {
    if (step === "quiz" && quizQuestionMissingAnswer) {
      toast.error(tQuizDesc("answerRequiredForPublish"));
      document
        .getElementById(`quiz-question-${quizQuestionMissingAnswer.id}`)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      return;
    }
    const valErr =
      step === "details" ? validateProcedureForm("details", "draft") : null;
    if (valErr) {
      applyValidationError(valErr);
      return;
    }
    setTitleError(null);
    setPurposeError(null);
    setBlockErrors({});
    setStationsError(false);
    if (stepIdx < steps.length - 1) {
      setStep(steps[stepIdx + 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleSelectStep(newStepId: WizardStepId): void {
    if (
      step === "quiz" &&
      steps.findIndex((item) => item.id === newStepId) >
        steps.findIndex((item) => item.id === "quiz") &&
      quizQuestionMissingAnswer
    ) {
      toast.error(tQuizDesc("answerRequiredForPublish"));
      document
        .getElementById(`quiz-question-${quizQuestionMissingAnswer.id}`)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      return;
    }
    if (step === "details" && newStepId !== "details") {
      const valErr = validateProcedureForm("details", "draft");
      if (valErr) {
        applyValidationError(valErr);
        return;
      }
    }
    setTitleError(null);
    setPurposeError(null);
    setBlockErrors({});
    setStationsError(false);
    setStep(newStepId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return { scrollToTarget, applyValidationError, handleNext, handleSelectStep };
}
