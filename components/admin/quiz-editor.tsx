"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { ProcedureQuiz, ProcedureQuizQuestion } from "@/lib/types";
import { LocalisedInput } from "@/components/ui/localised-input";
import { LuCheck, LuPlus, LuTrash2 } from "react-icons/lu";

const MIN_CHOICES = 2;
const MAX_CHOICES = 6;
const LANGS: Array<"en" | "es"> = ["en", "es"];

function emptyQuestion(): ProcedureQuizQuestion {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `q-${Math.random().toString(36).slice(2, 10)}`,
    prompt: { en: "", es: "" },
    choices: Array.from({ length: 4 }, () => ({
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `c-${Math.random().toString(36).slice(2, 10)}`,
      label: { en: "", es: "" },
    })),
    correctChoiceId: "",
  };
}

interface QuizEditorProps {
  value?: ProcedureQuiz | null;
  quiz?: ProcedureQuiz | null;
  onChange: (next: ProcedureQuiz | null) => void;
  isSaving?: boolean;
  hideHeader?: boolean;
  hideAttachToggle?: boolean;
  onDetach?: () => void;
}

export function QuizEditor({
  value,
  quiz,
  onChange,
  isSaving,
  hideHeader,
  hideAttachToggle = false,
  onDetach,
}: QuizEditorProps): React.ReactElement {
  const t = useTranslations("admin.library.new.quiz");
  const [questionLangs, setQuestionLangs] = React.useState<
    Record<string, "en" | "es">
  >({});

  const initialValue = value ?? quiz ?? null;

  const [working, setWorking] = React.useState<ProcedureQuiz>(() => {
    if (!initialValue) return makeBlankQuiz(hideAttachToggle);
    return {
      attached: hideAttachToggle ? true : Boolean(initialValue.attached),
      questions: initialValue.questions.map((q) => ({
        id: q.id || makeId(),
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
        choices: (q.choices || []).map((c) => ({
          id: c.id || makeId(),
          label: {
            en: typeof c.label === "string" ? c.label : (c.label?.en ?? ""),
            es: typeof c.label === "string" ? c.label : (c.label?.es ?? ""),
          },
        })),
        correctChoiceId: q.correctChoiceId ?? "",
      })),
    };
  });

  const getLang = (qId: string): "en" | "es" => questionLangs[qId] ?? "en";
  const setLang = (qId: string, l: "en" | "es"): void =>
    setQuestionLangs((prev) => ({ ...prev, [qId]: l }));

  const update = (next: ProcedureQuiz): void => {
    const hasQuestions = next.questions?.some((q) => {
      const p = q.prompt as unknown;
      const promptText =
        typeof p === "string"
          ? p
          : (p as { en?: string; es?: string })?.en ||
            (p as { en?: string; es?: string })?.es ||
            "";
      if (promptText.trim()) return true;
      return q.choices?.some((c) => {
        const l = c.label as unknown;
        const labelText =
          typeof l === "string"
            ? l
            : (l as { en?: string; es?: string })?.en ||
              (l as { en?: string; es?: string })?.es ||
              "";
        return Boolean(labelText.trim());
      });
    });
    const enriched: ProcedureQuiz = {
      ...next,
      attached: hideAttachToggle ? true : hasQuestions ? true : next.attached,
    };
    setWorking(enriched);
    onChange(enriched);
  };

  const setAttached = (next: boolean): void =>
    update({ ...working, attached: next });

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
            className="flex-1 cursor-pointer space-y-0.5"
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
                                ? t("promptPlaceholder")
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
                        {q.choices.every(
                          (c) => !(c.label[lang] ?? "").trim(),
                        ) ? null : !q.correctChoiceId ? (
                          <p className="text-sm font-medium text-[var(--color-warn-ink)]">
                            {t("noCorrect")}
                          </p>
                        ) : null}

                        {/* Options in active language */}
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
                              <li className="pt-1.5">
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
                      <div className="flex items-center gap-2.5 min-w-0">
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
