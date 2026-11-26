"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  QuizAiModal,
  type QuizAiModalProcedureContext,
  type QuizAiModalChapterContext,
} from "@/components/admin/quiz-ai-modal";
import type {
  ProcedureQuiz,
  ProcedureQuizQuestion,
  QuizSequenceItem,
} from "@/lib/types";
import { LocalisedInput } from "@/components/ui/localised-input";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  LuBookOpen,
  LuCheck,
  LuMinus,
  LuPlus,
  LuSparkles,
  LuTarget,
  LuTrash2,
  LuArrowUp,
  LuArrowDown,
  LuListOrdered,
  LuSquareCheck,
  LuGripVertical,
} from "react-icons/lu";

const MIN_CHOICES = 2;
const MAX_CHOICES = 6;
const LANGS: Array<"en" | "es"> = ["en", "es"];

function emptyQuestion(
  type: "multiple_choice" | "sequence" = "multiple_choice",
): ProcedureQuizQuestion {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `q-${Math.random().toString(36).slice(2, 10)}`,
    type,
    prompt: { en: "", es: "" },
    choices: Array.from({ length: 4 }, () => ({
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `c-${Math.random().toString(36).slice(2, 10)}`,
      label: { en: "", es: "" },
    })),
    correctChoiceId: "",
    sequenceItems: Array.from({ length: 3 }, () => ({
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `s-${Math.random().toString(36).slice(2, 10)}`,
      label: { en: "", es: "" },
    })),
  };
}

function cleanQuestionForEditor(
  q: ProcedureQuizQuestion,
): ProcedureQuizQuestion {
  const isSeq = q.type === "sequence";
  const choices = (q.choices || []).map((c) => ({
    id: c.id || makeId(),
    label: {
      en: typeof c.label === "string" ? c.label : (c.label?.en ?? ""),
      es: typeof c.label === "string" ? c.label : (c.label?.es ?? ""),
    },
  }));
  const sequenceItems = (
    q.sequenceItems && q.sequenceItems.length > 0
      ? q.sequenceItems
      : Array.from({ length: 3 }, () => ({
          id: makeId(),
          label: { en: "", es: "" },
        }))
  ).map((s) => ({
    id: s.id || makeId(),
    label: {
      en: typeof s.label === "string" ? s.label : (s.label?.en ?? ""),
      es: typeof s.label === "string" ? s.label : (s.label?.es ?? ""),
    },
  }));

  // Prevent cross-contamination: if question is multiple_choice and sequenceItems was copied from choices
  if (!isSeq && choices.length > 0 && choices.length === sequenceItems.length) {
    const isDupe = choices.every(
      (c, i) =>
        (c.label.en || "").trim() ===
          (sequenceItems[i]?.label.en || "").trim() &&
        (c.label.es || "").trim() ===
          (sequenceItems[i]?.label.es || "").trim() &&
        Boolean((c.label.en || "").trim() || (c.label.es || "").trim()),
    );
    if (isDupe) {
      sequenceItems.splice(
        0,
        sequenceItems.length,
        ...Array.from({ length: 3 }, () => ({
          id: makeId(),
          label: { en: "", es: "" },
        })),
      );
    }
  }

  // Prevent cross-contamination: if question is sequence and choices was copied from sequenceItems
  if (
    isSeq &&
    sequenceItems.length > 0 &&
    sequenceItems.length === choices.length
  ) {
    const isDupe = sequenceItems.every(
      (s, i) =>
        (s.label.en || "").trim() === (choices[i]?.label.en || "").trim() &&
        (s.label.es || "").trim() === (choices[i]?.label.es || "").trim() &&
        Boolean((s.label.en || "").trim() || (s.label.es || "").trim()),
    );
    if (isDupe) {
      choices.splice(
        0,
        choices.length,
        ...Array.from({ length: 3 }, () => ({
          id: makeId(),
          label: { en: "", es: "" },
        })),
      );
    }
  }

  return {
    id: q.id || makeId(),
    type: isSeq ? ("sequence" as const) : ("multiple_choice" as const),
    sourceProcedureId: q.sourceProcedureId,
    sourceProcedureTitle: q.sourceProcedureTitle,
    prompt: {
      en:
        typeof q.prompt === "string"
          ? q.prompt
          : (q.prompt?.en ?? q.question?.en ?? ""),
      es:
        typeof q.prompt === "string"
          ? q.prompt
          : (q.prompt?.es ?? q.question?.es ?? ""),
    },
    choices:
      choices.length >= 2
        ? choices
        : Array.from({ length: 3 }, () => ({
            id: makeId(),
            label: { en: "", es: "" },
          })),
    correctChoiceId:
      q.correctChoiceId && choices.some((c) => c.id === q.correctChoiceId)
        ? q.correctChoiceId
        : choices[0]?.id || "",
    sequenceItems:
      sequenceItems.length >= 2
        ? sequenceItems
        : Array.from({ length: 3 }, () => ({
            id: makeId(),
            label: { en: "", es: "" },
          })),
  };
}

function SortableSequenceStep({
  step,
  index,
  total,
  lang,
  isSaving,
  onUpdateText,
  onMoveUp,
  onMoveDown,
  onDelete,
  placeholder,
  deleteTitle,
}: {
  step: QuizSequenceItem;
  index: number;
  total: number;
  lang: "en" | "es";
  isSaving?: boolean;
  onUpdateText: (lang: "en" | "es", text: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  placeholder?: string;
  deleteTitle?: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id, disabled: isSaving });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-xl p-2 transition-all select-none",
        isDragging
          ? "z-50 bg-[var(--color-surface)] border-2 border-[var(--color-brand-600)] shadow-lg opacity-95 scale-[1.01]"
          : "hover:bg-[var(--color-wash)]/60",
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        aria-label="Drag to reorder"
        title="Drag to reorder"
        className="flex size-7 cursor-grab items-center justify-center rounded-md text-[var(--color-ink-3)] hover:bg-[var(--color-panel)] hover:text-[var(--color-ink)] active:cursor-grabbing transition-colors shrink-0 touch-none"
        style={{ touchAction: "none" }}
        {...attributes}
        {...listeners}
      >
        <LuGripVertical className="size-4" />
      </button>

      {/* Step Number - simple black text */}
      <span className="flex size-6 shrink-0 items-center justify-center text-sm font-bold text-[var(--color-ink)] select-none">
        {index + 1}
      </span>

      {/* Input */}
      <div className="flex-1 min-w-0">
        <LocalisedInput
          lang={lang}
          value={step.label}
          onText={onUpdateText}
          type="text"
          placeholder={placeholder}
          disabled={isSaving}
          className="w-full rounded-[var(--radius-sm)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-ring)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-tint)]"
        />
      </div>

      {/* Up / Down reorder */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0 || isSaving}
          title="Move up"
          aria-label="Move step up"
          className="flex size-8 items-center justify-center rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:text-[var(--color-ink)] hover:bg-[var(--color-wash)] disabled:opacity-20 transition-colors cursor-pointer"
        >
          <LuArrowUp className="size-4" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1 || isSaving}
          title="Move down"
          aria-label="Move step down"
          className="flex size-8 items-center justify-center rounded-lg border border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:text-[var(--color-ink)] hover:bg-[var(--color-wash)] disabled:opacity-20 transition-colors cursor-pointer"
        >
          <LuArrowDown className="size-4" />
        </button>
      </div>

      {/* Delete Step */}
      {total > 2 ? (
        <button
          type="button"
          onClick={onDelete}
          disabled={isSaving}
          aria-label={deleteTitle || "Delete step"}
          title={deleteTitle || "Delete step"}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--color-ink-3)] hover:bg-[var(--color-bad-tint)] hover:text-[var(--color-bad)] disabled:opacity-50 transition-colors cursor-pointer"
        >
          <LuTrash2 className="size-4" aria-hidden="true" />
        </button>
      ) : (
        <div className="size-8 shrink-0" aria-hidden="true" />
      )}
    </li>
  );
}

function SequenceStepList({
  qi,
  q,
  lang,
  isSaving,
  t,
  updateSequenceItem,
  moveSequenceItem,
  deleteSequenceItem,
  addSequenceItem,
  onReorderSteps,
}: {
  qi: number;
  q: ProcedureQuizQuestion;
  lang: "en" | "es";
  isSaving?: boolean;
  t: (key: string, values?: Record<string, any>) => string;
  updateSequenceItem: (
    qi: number,
    si: number,
    lang: "en" | "es",
    text: string,
  ) => void;
  moveSequenceItem: (qi: number, from: number, to: number) => void;
  deleteSequenceItem: (qi: number, si: number) => void;
  addSequenceItem: (qi: number) => void;
  onReorderSteps: (qi: number, newItems: QuizSequenceItem[]) => void;
}) {
  const items = q.sequenceItems || [];
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorderSteps(qi, arrayMove(items, oldIndex, newIndex));
    }
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <span className="block text-xs font-semibold uppercase text-[var(--color-ink-3)] tracking-wider">
          {lang === "en"
            ? "Steps (in correct order)"
            : "Pasos (en orden correcto)"}
        </span>
        <span className="text-xs text-[var(--color-ink-3)] font-mono">
          {items.length} {lang === "en" ? "steps" : "pasos"}
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-1">
            {items.map((step, si) => (
              <SortableSequenceStep
                key={step.id}
                step={step}
                index={si}
                total={items.length}
                lang={lang}
                isSaving={isSaving}
                onUpdateText={(nextLang, text) =>
                  updateSequenceItem(qi, si, nextLang, text)
                }
                onMoveUp={() => moveSequenceItem(qi, si, si - 1)}
                onMoveDown={() => moveSequenceItem(qi, si, si + 1)}
                onDelete={() => deleteSequenceItem(qi, si)}
                placeholder={
                  lang === "en"
                    ? t("stepPlaceholder", { n: si + 1 }) ||
                      `Step ${si + 1} (in correct order)...`
                    : `Paso ${si + 1} (en orden correcto)...`
                }
                deleteTitle={t("deleteStep") || "Delete step"}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <div className="pt-1 flex items-center justify-between">
        <button
          type="button"
          onClick={() => addSequenceItem(qi)}
          disabled={isSaving || items.length >= 20}
          className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-[var(--color-brand-700)] hover:bg-[var(--color-panel)] disabled:opacity-40 transition-colors cursor-pointer"
        >
          <LuPlus className="size-4" />
          {t("addStep") || "Add step"}
        </button>
        {items.length >= 20 && (
          <span className="text-xs text-[var(--color-ink-3)] font-medium">
            {lang === "es"
              ? "Máximo 20 pasos permitidos"
              : "Maximum 20 steps allowed"}
          </span>
        )}
      </div>
    </div>
  );
}

interface QuizEditorProps {
  value?: ProcedureQuiz | null;
  quiz?: ProcedureQuiz | null;
  onChange: (next: ProcedureQuiz | null) => void;
  isSaving?: boolean;
  hideHeader?: boolean;
  hideAttachToggle?: boolean;
  showPassingScore?: boolean;
  onDetach?: () => void;
  sourceType?: "procedure" | "chapter";
  procedureId?: string | null;
  procedureContext?: QuizAiModalProcedureContext | null;
  chapterId?: string | null;
  chapterContext?: QuizAiModalChapterContext | null;
}

export function QuizEditor({
  value,
  quiz,
  onChange,
  isSaving,
  hideHeader,
  hideAttachToggle = false,
  showPassingScore = false,
  onDetach,
  sourceType = "procedure",
  procedureId,
  procedureContext,
  chapterId,
  chapterContext,
}: QuizEditorProps): React.ReactElement {
  const locale = useLocale();
  const isEs = locale === "es";
  const t = useTranslations("admin.library.new.quiz");
  const [aiModalOpen, setAiModalOpen] = React.useState(false);
  const [questionLangs, setQuestionLangs] = React.useState<
    Record<string, "en" | "es">
  >({});

  const initialValue = value ?? quiz ?? null;

  const [working, setWorking] = React.useState<ProcedureQuiz>(() => {
    if (!initialValue) return makeBlankQuiz(hideAttachToggle);
    return {
      attached: hideAttachToggle ? true : Boolean(initialValue.attached),
      minCorrectAnswers:
        initialValue.minCorrectAnswers ??
        Math.max(1, Math.ceil(initialValue.questions.length * 0.7)),
      passingScorePercent: initialValue.passingScorePercent,
      questions: initialValue.questions.map(cleanQuestionForEditor),
    };
  });

  // Keep in sync if parent passes new quiz questions (e.g. from linked procedure imports)
  React.useEffect(() => {
    if (value && value.questions) {
      setWorking((prev) => {
        // If question IDs are identical, avoid unnecessary re-render loop
        const prevIds = prev.questions.map((q) => q.id).join(",");
        const nextIds = value.questions.map((q) => q.id).join(",");
        if (
          prevIds === nextIds &&
          prev.minCorrectAnswers === value.minCorrectAnswers
        ) {
          return prev;
        }

        return {
          ...prev,
          attached: value.attached ?? prev.attached,
          minCorrectAnswers:
            value.minCorrectAnswers ??
            prev.minCorrectAnswers ??
            Math.max(1, Math.ceil(value.questions.length * 0.7)),
          questions: value.questions.map(cleanQuestionForEditor),
        };
      });
    }
  }, [value]);

  const getLang = (qId: string): "en" | "es" => questionLangs[qId] ?? "en";
  const setLang = (qId: string, l: "en" | "es"): void =>
    setQuestionLangs((prev) => ({ ...prev, [qId]: l }));

  const update = (next: ProcedureQuiz): void => {
    const totalQ = next.questions.length;
    const clampedMin = next.minCorrectAnswers
      ? Math.min(Math.max(1, next.minCorrectAnswers), Math.max(1, totalQ))
      : Math.max(1, Math.ceil(totalQ * 0.7));

    const enriched: ProcedureQuiz = {
      ...next,
      minCorrectAnswers: clampedMin,
      attached: hideAttachToggle ? true : Boolean(next.attached),
    };
    setWorking(enriched);
    onChange(enriched);
  };

  const setAttached = (next: boolean): void =>
    update({ ...working, attached: next });

  const setMinCorrect = (count: number): void => {
    update({ ...working, minCorrectAnswers: count });
  };

  const updateQuestion = (
    qi: number,
    patch: Partial<ProcedureQuizQuestion>,
  ): void => {
    const questions = working.questions.map((q, i) =>
      i === qi ? { ...q, ...patch } : q,
    );
    update({ ...working, questions });
  };

  const updatePrompt = (qi: number, lang: "en" | "es", text: string): void => {
    const q = working.questions[qi];
    if (!q) return;
    updateQuestion(qi, { prompt: { ...q.prompt, [lang]: text } });
  };

  const updateChoice = (
    qi: number,
    ci: number,
    lang: "en" | "es",
    text: string,
  ): void => {
    const q = working.questions[qi];
    if (!q) return;
    const choices = q.choices.map((c, j) =>
      j === ci ? { ...c, label: { ...c.label, [lang]: text } } : c,
    );
    updateQuestion(qi, { choices });
  };

  const setCorrect = (qi: number, ci: number): void => {
    const q = working.questions[qi];
    if (!q) return;
    updateQuestion(qi, { correctChoiceId: q.choices[ci]?.id ?? "" });
  };

  const addQuestion = (): void =>
    update({ ...working, questions: [...working.questions, emptyQuestion()] });

  const handleApplyAiQuestions = (
    newQuestions: ProcedureQuizQuestion[],
    applyMode: "replace" | "append",
  ): void => {
    // Strictly sanitize & validate:
    // - MCQ must have at least 2 non-empty choices, sequenceItems: undefined
    // - Sequence must have at least 2 steps, choices: []
    const sanitizedApplied = newQuestions
      .filter((q) => {
        if (q.type === "sequence") {
          return (q.sequenceItems || []).length >= 2;
        }
        // MCQ strictly requires at least 2 valid, non-empty choices
        const validChoices = (q.choices || []).filter((c) =>
          Boolean((c.label.en || "").trim() || (c.label.es || "").trim()),
        );
        return validChoices.length >= 2;
      })
      .map((q) => {
        const isSeq = q.type === "sequence";
        return {
          ...q,
          type: isSeq ? ("sequence" as const) : ("multiple_choice" as const),
          choices: isSeq ? [] : q.choices || [],
          correctChoiceId: isSeq ? "" : q.correctChoiceId || "",
          sequenceItems: isSeq ? q.sequenceItems || [] : undefined,
        };
      });

    let nextQuestions: ProcedureQuizQuestion[];
    if (applyMode === "append") {
      const existingAuthored = working.questions.filter((q) => {
        const hasPrompt = Boolean(q.prompt?.en?.trim() || q.prompt?.es?.trim());
        return hasPrompt;
      });
      nextQuestions = [...existingAuthored, ...sanitizedApplied].slice(0, 10);
    } else {
      nextQuestions = sanitizedApplied;
    }

    update({
      ...working,
      attached: true,
      questions: nextQuestions,
    });
  };

  const deleteQuestion = (qi: number): void => {
    const next = working.questions.filter((_, i) => i !== qi);
    update({
      ...working,
      questions: next.length > 0 ? next : [emptyQuestion()],
    });
  };

  const addChoice = (qi: number): void => {
    const q = working.questions[qi];
    if (!q || q.choices.length >= MAX_CHOICES) return;
    updateQuestion(qi, {
      choices: [...q.choices, { id: makeId(), label: { en: "", es: "" } }],
    });
  };

  const deleteChoice = (qi: number, ci: number): void => {
    const q = working.questions[qi];
    if (!q || q.choices.length <= MIN_CHOICES) return;
    const removed = q.choices[ci];
    const choices = q.choices.filter((_, j) => j !== ci);
    const correctChoiceId =
      removed && q.correctChoiceId === removed.id ? "" : q.correctChoiceId;
    updateQuestion(qi, { choices, correctChoiceId });
  };

  const setQuestionType = (
    qi: number,
    type: "multiple_choice" | "sequence",
  ): void => {
    const q = working.questions[qi];
    if (!q || q.type === type) return;

    if (type === "sequence") {
      const existingItems =
        q.sequenceItems && q.sequenceItems.length >= 2
          ? q.sequenceItems
          : Array.from({ length: 3 }, () => ({
              id: makeId(),
              label: { en: "", es: "" },
            }));

      // Never duplicate choices into sequence items
      const isDupe =
        q.choices &&
        q.choices.length > 0 &&
        existingItems.length === q.choices.length &&
        existingItems.every(
          (item, idx) =>
            (item.label.en || "").trim() ===
              (q.choices[idx]?.label.en || "").trim() &&
            (item.label.es || "").trim() ===
              (q.choices[idx]?.label.es || "").trim() &&
            Boolean(
              (item.label.en || "").trim() || (item.label.es || "").trim(),
            ),
        );

      const sequenceItems = isDupe
        ? Array.from({ length: 3 }, () => ({
            id: makeId(),
            label: { en: "", es: "" },
          }))
        : existingItems;

      updateQuestion(qi, {
        type: "sequence",
        sequenceItems,
      });
      return;
    }

    // Switching to multiple_choice
    const existingChoices =
      q.choices && q.choices.length >= 2
        ? q.choices
        : Array.from({ length: 3 }, () => ({
            id: makeId(),
            label: { en: "", es: "" },
          }));

    // Never duplicate sequence items into choices
    const isDupe =
      q.sequenceItems &&
      q.sequenceItems.length > 0 &&
      existingChoices.length === q.sequenceItems.length &&
      existingChoices.every(
        (c, idx) =>
          (c.label.en || "").trim() ===
            (q.sequenceItems![idx]?.label.en || "").trim() &&
          (c.label.es || "").trim() ===
            (q.sequenceItems![idx]?.label.es || "").trim() &&
          Boolean((c.label.en || "").trim() || (c.label.es || "").trim()),
      );

    const choices = isDupe
      ? Array.from({ length: 3 }, () => ({
          id: makeId(),
          label: { en: "", es: "" },
        }))
      : existingChoices;

    updateQuestion(qi, {
      type: "multiple_choice",
      choices,
      correctChoiceId:
        q.correctChoiceId && choices.some((c) => c.id === q.correctChoiceId)
          ? q.correctChoiceId
          : choices[0]?.id || "",
    });
  };

  const updateSequenceItem = (
    qi: number,
    si: number,
    lang: "en" | "es",
    text: string,
  ): void => {
    const q = working.questions[qi];
    if (!q || !q.sequenceItems) return;
    const sequenceItems = q.sequenceItems.map((item, j) =>
      j === si ? { ...item, label: { ...item.label, [lang]: text } } : item,
    );
    updateQuestion(qi, { sequenceItems });
  };

  const addSequenceItem = (qi: number): void => {
    const q = working.questions[qi];
    if (!q) return;
    const current = q.sequenceItems || [];
    if (current.length >= 20) return;
    updateQuestion(qi, {
      sequenceItems: [...current, { id: makeId(), label: { en: "", es: "" } }],
    });
  };

  const reorderSequenceItems = (
    qi: number,
    sequenceItems: QuizSequenceItem[],
  ): void => {
    updateQuestion(qi, { sequenceItems });
  };

  const deleteSequenceItem = (qi: number, si: number): void => {
    const q = working.questions[qi];
    if (!q || !q.sequenceItems || q.sequenceItems.length <= 2) return;
    updateQuestion(qi, {
      sequenceItems: q.sequenceItems.filter((_, j) => j !== si),
    });
  };

  const moveSequenceItem = (
    qi: number,
    fromIndex: number,
    toIndex: number,
  ): void => {
    const q = working.questions[qi];
    if (!q || !q.sequenceItems) return;
    if (toIndex < 0 || toIndex >= q.sequenceItems.length) return;
    const next = [...q.sequenceItems];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    updateQuestion(qi, { sequenceItems: next });
  };

  return (
    <div className="space-y-6">
      {hideHeader ? null : (
        <header className="space-y-1">
          <h2 className="font-[family-name:var(--font-display)] text-[length:var(--text-xl)] font-bold tracking-tight text-[var(--color-ink)]">
            {t("title")}
          </h2>
          <p className="text-sm text-[var(--color-ink-2)]">
            {t("description")}
          </p>
        </header>
      )}

      {/* Attach toggle — only shown for standalone procedures, not in training */}
      {!hideAttachToggle && (
        <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
          <input
            id="quiz-attach"
            type="checkbox"
            checked={working.attached}
            disabled={isSaving}
            onChange={(e) => setAttached(e.target.checked)}
            className="mt-1 size-5 accent-[var(--color-brand-600)]"
          />
          <label
            htmlFor="quiz-attach"
            className="flex-1 cursor-pointer space-y-1"
          >
            <span className="block text-sm font-semibold text-[var(--color-ink)]">
              {t("attachedLabel")}
            </span>
            <span className="block text-sm text-[var(--color-ink-2)]">
              {t("attachedHelp")}
            </span>
          </label>
        </div>
      )}

      {/* AI Quiz Generation Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[var(--radius-lg)] border border-[var(--color-brand-tint-2)] bg-[var(--color-brand-tint)] shadow-xs">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="size-8 rounded-lg bg-[var(--color-surface)] text-[var(--color-brand-600)] flex items-center justify-center shrink-0 shadow-xs border border-[var(--color-line)]">
            <LuSparkles className="size-4" />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[var(--color-ink)]">
                {isEs ? "Generar Evaluación con IA" : "AI Quiz Generation"}
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--color-brand-600)] text-white">
                Bilingual
              </span>
            </div>
            <p className="text-xs text-[var(--color-ink-2)] line-clamp-1">
              {sourceType === "chapter"
                ? isEs
                  ? "Crea preguntas bilingües (MCQ y Secuencia) basadas en este capítulo."
                  : "Generate bilingual Multiple Choice and Sequence questions based on this chapter."
                : isEs
                  ? "Crea preguntas bilingües (MCQ y Secuencia) basadas en este procedimiento."
                  : "Generate bilingual Multiple Choice and Sequence questions based on this procedure."}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={isSaving}
          onClick={() => setAiModalOpen(true)}
          className="shrink-0 text-xs gap-2"
        >
          <LuSparkles className="size-4" />
          <span>{isEs ? "Generar con IA" : "Auto-Generate with AI"}</span>
        </Button>
      </div>

      {/* Passing requirement card — lets admin configure passing answers count (e.g. 4 of 6) */}
      {showPassingScore && working.questions.length > 0 && (
        <div className="rounded-xl border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--color-brand-tint-2)] text-[var(--color-brand-600)] shrink-0">
                  <LuTarget className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[var(--color-ink)]">
                  Passing requirement
                </h3>
                <span className="text-xs font-semibold px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--color-ok-tint)] text-[var(--color-ok)] border border-[var(--color-ok-tint-2)] shrink-0">
                  {Math.round(
                    ((working.minCorrectAnswers ??
                      Math.max(1, Math.ceil(working.questions.length * 0.7))) /
                      working.questions.length) *
                      100,
                  )}
                  % required
                </span>
              </div>
              <p className="text-xs text-[var(--color-ink-2)]">
                Employees must answer at least{" "}
                <strong className="text-[var(--color-ink)]">
                  {working.minCorrectAnswers ??
                    Math.max(1, Math.ceil(working.questions.length * 0.7))}{" "}
                  of {working.questions.length} questions
                </strong>{" "}
                correctly to complete this chapter and unlock the next chapter.
              </p>
            </div>

            {/* Stepper controls */}
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <div className="flex items-center rounded-xl border border-[var(--color-line-2)] bg-[var(--color-wash)] p-1">
                <button
                  type="button"
                  disabled={
                    isSaving ||
                    (working.minCorrectAnswers ??
                      Math.max(1, Math.ceil(working.questions.length * 0.7))) <=
                      1
                  }
                  onClick={() =>
                    setMinCorrect(
                      Math.max(
                        1,
                        (working.minCorrectAnswers ??
                          Math.max(
                            1,
                            Math.ceil(working.questions.length * 0.7),
                          )) - 1,
                      ),
                    )
                  }
                  aria-label="Decrease passing score"
                  className="flex size-8 items-center justify-center rounded-lg hover:bg-[var(--color-surface)] disabled:opacity-30 transition-colors text-[var(--color-ink)] cursor-pointer"
                >
                  <LuMinus className="w-4 h-4" />
                </button>
                <div className="px-3 text-center min-w-[72px]">
                  <span className="text-sm font-bold text-[var(--color-ink)]">
                    {working.minCorrectAnswers ??
                      Math.max(1, Math.ceil(working.questions.length * 0.7))}
                  </span>
                  <span className="text-xs text-[var(--color-ink-2)]">
                    {" "}
                    / {working.questions.length}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={
                    isSaving ||
                    (working.minCorrectAnswers ??
                      Math.max(1, Math.ceil(working.questions.length * 0.7))) >=
                      working.questions.length
                  }
                  onClick={() =>
                    setMinCorrect(
                      Math.min(
                        working.questions.length,
                        (working.minCorrectAnswers ??
                          Math.max(
                            1,
                            Math.ceil(working.questions.length * 0.7),
                          )) + 1,
                      ),
                    )
                  }
                  aria-label="Increase passing score"
                  className="flex size-8 items-center justify-center rounded-lg hover:bg-[var(--color-surface)] disabled:opacity-30 transition-colors text-[var(--color-ink)] cursor-pointer"
                >
                  <LuPlus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Question list — each question has the exact bilingual component effect (one gets bigger, one becomes shorter) */}
      <ol className="space-y-6">
        {working.questions.map((q, qi) => {
          const currentActive = getLang(q.id);

          return (
            <li
              id={`quiz-question-${q.id}`}
              key={q.id}
              className="bli-card-group"
            >
              {LANGS.map((lang) => {
                const isActive = currentActive === lang;

                if (isActive) {
                  // Active card: BIGGER (100% width, height auto, full question prompt + all options)
                  return (
                    <div key={lang} className="bli-card is-active">
                      {q.sourceProcedureTitle ? (
                        <div
                          className="border-b border-[var(--color-warn)]/30 bg-[var(--color-warn-tint)] flex items-center"
                          style={{ padding: "8px 16px", gap: "8px" }}
                        >
                          <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-[var(--color-warn)] text-white shrink-0">
                            <LuBookOpen className="w-3 h-3 text-white" />
                          </span>
                          <span className="text-xs font-semibold text-[var(--color-warn-ink)]">
                            From procedure: {q.sourceProcedureTitle}
                          </span>
                        </div>
                      ) : null}
                      <header className="flex items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-wash)] px-4 py-3">
                        <span className="text-sm font-bold text-[var(--color-ink)] shrink-0 select-none pl-1">
                          {qi + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <LocalisedInput
                            id={`q-${q.id}-prompt-${lang}`}
                            lang={lang}
                            value={q.prompt}
                            onText={(nextLang, text) =>
                              updatePrompt(qi, nextLang, text)
                            }
                            showStatus
                            type="text"
                            placeholder={
                              lang === "en"
                                ? q.type === "sequence"
                                  ? "Arrange the following steps in the correct order..."
                                  : t("promptPlaceholder")
                                : q.type === "sequence"
                                  ? "Organiza los siguientes pasos en el orden correcto..."
                                  : "Escribe la pregunta en español..."
                            }
                            disabled={isSaving}
                            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:border-[var(--color-ring)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-tint)]"
                          />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            translate="no"
                            className="font-mono text-xs font-bold text-[var(--color-ink-2)] uppercase tracking-wider notranslate"
                          >
                            {lang.toUpperCase()}
                          </span>
                          <button
                            type="button"
                            onClick={() => deleteQuestion(qi)}
                            disabled={isSaving}
                            aria-label={t("deleteQuestion")}
                            title={t("deleteQuestion")}
                            className="flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--color-ink-3)] hover:bg-[var(--color-bad-tint)] hover:text-[var(--color-bad)] disabled:opacity-50 transition-colors"
                          >
                            <LuTrash2 className="size-4" aria-hidden="true" />
                          </button>
                        </div>
                      </header>

                      <div className="p-4 space-y-4">
                        {/* Question Type Switcher */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-[var(--color-line-2)]/60">
                          <div className="flex items-center gap-1 p-1 bg-[var(--color-wash)] rounded-lg border border-[var(--color-line-2)] text-xs font-medium w-fit">
                            <button
                              type="button"
                              onClick={() =>
                                setQuestionType(qi, "multiple_choice")
                              }
                              className={cn(
                                "flex items-center gap-1   px-3 py-1 rounded-md transition-all cursor-pointer",
                                (q.type || "multiple_choice") ===
                                  "multiple_choice"
                                  ? "bg-[var(--color-surface)] text-[var(--color-ink)] shadow-xs font-semibold"
                                  : "text-[var(--color-ink-3)] hover:text-[var(--color-ink)]",
                              )}
                            >
                              <LuSquareCheck className="size-4" />
                              {t("typeMultipleChoice") || "Multiple Choice"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setQuestionType(qi, "sequence")}
                              className={cn(
                                "flex items-center gap-1 px-3 py-1 rounded-md transition-all cursor-pointer",
                                q.type === "sequence"
                                  ? "bg-[var(--color-surface)] text-[var(--color-ink)] shadow-xs font-semibold"
                                  : "text-[var(--color-ink-3)] hover:text-[var(--color-ink)]",
                              )}
                            >
                              <LuListOrdered className="size-4" />
                              {t("typeSequence") || "Arrange Sequence"}
                            </button>
                          </div>

                          {q.type === "sequence" ? (
                            <span className="text-xs text-[var(--color-ink-3)]">
                              {t("sequenceHelp") ||
                                "Define in correct order. Shuffled for employees."}
                            </span>
                          ) : null}
                        </div>

                        {q.type === "sequence" ? (
                          <SequenceStepList
                            qi={qi}
                            q={q}
                            lang={lang}
                            isSaving={isSaving}
                            t={t}
                            updateSequenceItem={updateSequenceItem}
                            moveSequenceItem={moveSequenceItem}
                            deleteSequenceItem={deleteSequenceItem}
                            addSequenceItem={addSequenceItem}
                            onReorderSteps={reorderSequenceItems}
                          />
                        ) : (
                          /* Multiple Choice Options */
                          <>
                            {q.choices.every(
                              (c) => !(c.label[lang] ?? "").trim(),
                            ) ? null : !q.correctChoiceId ? (
                              <p className="text-sm font-medium text-[var(--color-warn-ink)]">
                                {t("noCorrect")}
                              </p>
                            ) : null}

                            <div className="space-y-2">
                              <span className="block text-xs font-semibold uppercase text-[var(--color-ink-3)] tracking-wider">
                                {lang === "en" ? "Options" : "Opciones"}
                              </span>
                              <ul className="space-y-2">
                                {q.choices.map((c, ci) => {
                                  const isCorrect = q.correctChoiceId === c.id;
                                  return (
                                    <li
                                      key={c.id}
                                      className="flex items-center gap-2"
                                    >
                                      <button
                                        type="button"
                                        onClick={() => setCorrect(qi, ci)}
                                        disabled={isSaving}
                                        aria-pressed={isCorrect}
                                        aria-label={t("markCorrect")}
                                        title={
                                          isCorrect
                                            ? "Correct option"
                                            : "Click to mark as correct"
                                        }
                                        className={cn(
                                          "flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-tint)]",
                                          isCorrect
                                            ? "border-[var(--color-ok)] bg-[var(--color-ok)] text-white shadow-xs"
                                            : "border-[var(--color-line-2)] bg-[var(--color-surface)] hover:border-[var(--color-line-3)]",
                                        )}
                                      >
                                        {isCorrect ? (
                                          <LuCheck
                                            className="size-4 stroke-[3] text-white"
                                            aria-hidden="true"
                                          />
                                        ) : null}
                                      </button>
                                      <div className="flex-1 min-w-0">
                                        <LocalisedInput
                                          lang={lang}
                                          value={c.label}
                                          onText={(nextLang, text) =>
                                            updateChoice(qi, ci, nextLang, text)
                                          }
                                          type="text"
                                          placeholder={
                                            lang === "en"
                                              ? t("choicePlaceholder", {
                                                  n: ci + 1,
                                                })
                                              : `Opción ${ci + 1}`
                                          }
                                          disabled={isSaving}
                                          className={cn(
                                            "w-full rounded-[var(--radius-sm)] border bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)] focus:outline-none focus:ring-2",
                                            isCorrect
                                              ? "border-[var(--color-ok)] focus:border-[var(--color-ok)] focus:ring-[var(--color-ok-tint)]"
                                              : "border-[var(--color-line-2)] focus:border-[var(--color-ring)] focus:ring-[var(--color-brand-tint)]",
                                          )}
                                        />
                                      </div>
                                      {q.choices.length > MIN_CHOICES ? (
                                        <button
                                          type="button"
                                          onClick={() => deleteChoice(qi, ci)}
                                          disabled={isSaving}
                                          aria-label={t("deleteOption")}
                                          title={t("deleteOption")}
                                          className="flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--color-ink-3)] hover:bg-[var(--color-bad-tint)] hover:text-[var(--color-bad)] disabled:opacity-50 transition-colors"
                                        >
                                          <LuTrash2
                                            className="size-4"
                                            aria-hidden="true"
                                          />
                                        </button>
                                      ) : (
                                        <div
                                          className="size-8 shrink-0"
                                          aria-hidden="true"
                                        />
                                      )}
                                    </li>
                                  );
                                })}
                                {q.choices.length < MAX_CHOICES ? (
                                  <li className="pt-2">
                                    <button
                                      type="button"
                                      onClick={() => addChoice(qi)}
                                      disabled={isSaving}
                                      className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-[var(--color-brand-700)] hover:bg-[var(--color-panel)] disabled:opacity-50 transition-colors"
                                    >
                                      <LuPlus
                                        className="size-4"
                                        aria-hidden="true"
                                      />
                                      {t("addOption")}
                                    </button>
                                  </li>
                                ) : null}
                              </ul>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                }

                // Inactive card: SHORTER (height 44px, 92% width, centered, attached directly with no gap)
                return (
                  <div
                    key={lang}
                    role="button"
                    tabIndex={0}
                    onClick={() => setLang(q.id, lang)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setLang(q.id, lang);
                      }
                    }}
                    className="bli-card is-inactive px-4"
                    title={
                      lang === "es"
                        ? "Click to edit in Spanish"
                        : "Click to edit in English"
                    }
                  >
                    <div className="flex w-full items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="truncate text-xs font-normal text-[var(--color-ink-2)]">
                          {q.prompt[lang]?.trim()
                            ? q.prompt[lang]
                            : lang === "es"
                              ? "Ingresa la pregunta del cuestionario..."
                              : "Type the question..."}
                        </span>
                      </div>
                      <span
                        translate="no"
                        className="shrink-0 font-mono text-xs font-bold text-[var(--color-ink-3)] uppercase tracking-wider notranslate"
                      >
                        {lang.toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={addQuestion}
        disabled={isSaving}
        className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)] py-3 text-sm font-semibold text-[var(--color-ink-2)] transition-colors hover:border-[var(--color-line-3)] hover:bg-[var(--color-panel)] hover:text-[var(--color-ink)] disabled:opacity-50"
      >
        <LuPlus className="size-4" aria-hidden="true" />
        {t("addQuestion")}
      </button>

      {/* AI Quiz Generator Modal */}
      <QuizAiModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        sourceType={sourceType}
        procedureId={procedureId}
        procedureContext={procedureContext}
        chapterId={chapterId}
        chapterContext={chapterContext}
        existingQuestionsCount={
          working.questions.filter((q) =>
            Boolean(q.prompt?.en?.trim() || q.prompt?.es?.trim()),
          ).length
        }
        onApplyQuestions={handleApplyAiQuestions}
      />
    </div>
  );
}

function makeBlankQuiz(attached = false): ProcedureQuiz {
  return { questions: [emptyQuestion()], attached };
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `id-${Math.random().toString(36).slice(2, 10)}`;
}
