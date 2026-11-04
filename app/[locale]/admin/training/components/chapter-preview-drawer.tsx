"use client";

import * as React from "react";
import { Drawer } from "@/components/ui/drawer";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { DocHead, DocPurpose } from "@/components/doc/chrome";
import { BlockRenderer } from "@/components/doc/block-renderer";
import type { Procedure, ProcedureBlock, ProcedureQuiz } from "@/lib/types";
import type { BilingualValue } from "@/components/ui/bilingual-input";
import { cn } from "@/lib/utils";
import { LuBookOpen, LuCheck, LuSparkles, LuTarget } from "react-icons/lu";

interface ChapterPreviewDrawerProps {
  open: boolean;
  onClose: () => void;
  isEs: boolean;
  courseName: string;
  chapterNumber: number;
  title: BilingualValue;
  purpose: BilingualValue;
  blocks: ProcedureBlock[];
  linkedProceduresMap: Record<string, Procedure>;
  quiz: ProcedureQuiz | null;
}

export function ChapterPreviewDrawer({
  open,
  onClose,
  isEs,
  courseName,
  chapterNumber,
  title,
  purpose,
  blocks,
  linkedProceduresMap,
  quiz,
}: ChapterPreviewDrawerProps): React.ReactElement {
  const [previewLang, setPreviewLang] = React.useState<"en" | "es">(
    isEs ? "es" : "en",
  );

  const chapterTitle =
    (previewLang === "es" ? title.es || title.en : title.en || title.es) ||
    (isEs ? `Capítulo ${chapterNumber}` : `Chapter ${chapterNumber}`);

  const chapterPurpose =
    previewLang === "es" ? purpose.es || purpose.en : purpose.en || purpose.es;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEs ? "Vista previa del capítulo" : "Chapter preview"}
      closeLabel={isEs ? "Cerrar" : "Close"}
      size="lg"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-line-2)]">
          <span className="text-xs font-semibold text-[var(--color-ink-2)]">
            {isEs ? "Idioma de vista previa" : "Preview language"}
          </span>
          <SegmentedControl
            label={isEs ? "Idioma" : "Language"}
            value={previewLang}
            onChange={(v) => setPreviewLang(v as "en" | "es")}
            segments={[
              { value: "en", label: "EN" },
              { value: "es", label: "ES" },
            ]}
          />
        </div>

        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-xs p-4 sm:p-6 space-y-6">
          {/* Chapter Header */}
          <DocHead
            category={courseName}
            title={chapterTitle}
            withCover={false}
          />
          {chapterPurpose ? <DocPurpose>{chapterPurpose}</DocPurpose> : null}

          {/* Chapter Content Blocks */}
          {blocks.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--color-ink-3)]">
              {isEs
                ? "No hay bloques de contenido aún."
                : "No content blocks yet."}
            </p>
          ) : (
            <div className="space-y-6">
              {blocks.map((block, idx) => {
                if (block.kind === "linked_procedures") {
                  if (!block.procedureIds || block.procedureIds.length === 0)
                    return null;

                  return (
                    <div key={block.id || idx} className="space-y-6 my-4">
                      {block.procedureIds.map((procId) => {
                        const proc =
                          linkedProceduresMap[procId] ||
                          Object.values(linkedProceduresMap).find(
                            (p) => p.id === procId || p.slug === procId,
                          );
                        if (!proc) {
                          return (
                            <div
                              key={procId}
                              className="p-4 rounded-xl border border-[var(--color-line-2)] bg-[var(--color-wash)]/40 text-xs text-[var(--color-ink-3)]"
                            >
                              {isEs
                                ? "Cargando procedimiento..."
                                : "Loading procedure..."}
                            </div>
                          );
                        }

                        const categoryLabel = proc.category
                          ? previewLang === "es"
                            ? proc.category.nameEs || proc.category.nameEn
                            : proc.category.nameEn || proc.category.nameEs
                          : "Recipes";

                        const procTitle =
                          (previewLang === "es"
                            ? proc.titleEs || proc.titleEn
                            : proc.titleEn || proc.titleEs) ||
                          (isEs ? "Procedimiento" : "Procedure");

                        const procPurpose =
                          previewLang === "es"
                            ? proc.purposeEs || proc.purposeEn
                            : proc.purposeEn || proc.purposeEs;

                        const rawBlocks =
                          (previewLang === "es"
                            ? proc.bodyEs?.blocks
                            : proc.bodyEn?.blocks) ||
                          proc.bodyEn?.blocks ||
                          [];

                        const procBlocks = rawBlocks.filter((b, bIdx) => {
                          if (
                            bIdx === 0 &&
                            b.kind === "heading" &&
                            b.level === 1
                          )
                            return false;
                          return true;
                        });

                        return (
                          <div
                            key={procId}
                            id={`preview-proc-${procId}`}
                            className="rounded-2xl border border-[var(--color-line-2)] bg-[var(--color-surface)] p-5 sm:p-6 shadow-xs space-y-4"
                          >
                            <DocHead
                              category={categoryLabel}
                              title={procTitle}
                              withCover={false}
                            />
                            {procPurpose ? (
                              <DocPurpose>{procPurpose}</DocPurpose>
                            ) : null}
                            {procBlocks.length > 0 ? (
                              <BlockRenderer
                                blocks={procBlocks}
                                locale={previewLang}
                              />
                            ) : (
                              <p className="py-2 text-xs text-[var(--color-ink-3)]">
                                {isEs
                                  ? "Sin contenido de procedimiento."
                                  : "No procedure content."}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                }

                // Normal chapter blocks: text, images, videos, checklists, etc.
                return (
                  <div key={block.id || idx}>
                    <BlockRenderer blocks={[block]} locale={previewLang} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Knowledge check / Quiz preview at the bottom of the chapter */}
          {quiz && quiz.questions && quiz.questions.length > 0 ? (
            <div className="mt-10 pt-8 border-t border-[var(--color-line-2)] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--color-line-2)]">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-950)] text-[var(--color-brand-600)]">
                    <LuSparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--color-ink)]">
                      {previewLang === "es"
                        ? "Evaluación de conocimientos"
                        : "Knowledge check"}
                    </h3>
                    <p className="text-xs text-[var(--color-ink-2)]">
                      {quiz.questions.length}{" "}
                      {quiz.questions.length === 1
                        ? previewLang === "es"
                          ? "pregunta"
                          : "question"
                        : previewLang === "es"
                          ? "preguntas"
                          : "questions"}
                    </p>
                  </div>
                </div>

                {/* Passing requirement badge */}
                <span className="inline-flex items-center rounded-[var(--radius-sm)] text-xs font-semibold bg-[var(--color-ok-tint)] text-[var(--color-ok-700)] border border-[var(--color-ok)]/40 shrink-0 shadow-xs px-3 py-1 gap-2">
                  <LuTarget className="w-4 h-4 text-[var(--color-ok-700)] shrink-0" />
                  <span>
                    {quiz.minCorrectAnswers ??
                      Math.max(1, Math.ceil(quiz.questions.length * 0.7))}{" "}
                    of {quiz.questions.length} correct required to pass
                  </span>
                </span>
              </div>

              <div className="space-y-5">
                {quiz.questions.map((q, qIdx) => {
                  const prompt =
                    typeof q.prompt === "string"
                      ? q.prompt
                      : (previewLang === "es"
                          ? q.prompt?.es || q.prompt?.en
                          : q.prompt?.en || q.prompt?.es) || "";

                  return (
                    <div
                      key={q.id || qIdx}
                      className="rounded-2xl border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-xs space-y-4 p-5 sm:p-6"
                    >
                      {/* Linked procedure badge */}
                      {q.sourceProcedureTitle ? (
                        <div className="inline-flex items-center rounded-[var(--radius-sm)] text-xs font-semibold bg-[var(--color-warn-tint)] text-[var(--color-warn-ink)] border border-[var(--color-warn)]/40 shadow-xs px-3 py-1 gap-2">
                          <LuBookOpen className="w-4 h-4 text-[var(--color-warn-ink)] shrink-0" />
                          <span>
                            {previewLang === "es"
                              ? "Del procedimiento:"
                              : "From procedure:"}{" "}
                            <strong>{q.sourceProcedureTitle}</strong>
                          </span>
                        </div>
                      ) : null}

                      {/* Question Eyebrow & Prompt */}
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-brand-600)]">
                          {previewLang === "es"
                            ? `Pregunta ${qIdx + 1}`
                            : `Question ${qIdx + 1}`}
                        </span>
                        <h4 className="mt-1 text-base font-semibold text-[var(--color-ink)] leading-snug">
                          {prompt ||
                            (previewLang === "es"
                              ? "Pregunta sin título"
                              : "Untitled question")}
                        </h4>
                      </div>

                      {/* Choices vertical list */}
                      <div className="flex flex-col space-y-3 pt-2">
                        {(
                          q.choices ||
                          (q as unknown as { options?: unknown[] }).options ||
                          []
                        ).map((c: unknown, cIdx: number) => {
                          const choice = c as {
                            id?: string;
                            label?: string | { en?: string; es?: string };
                          };
                          const label =
                            typeof choice.label === "string"
                              ? choice.label
                              : (previewLang === "es"
                                  ? choice.label?.es || choice.label?.en
                                  : choice.label?.en || choice.label?.es) || "";
                          const isCorrect = choice.id === q.correctChoiceId;
                          const letter = String.fromCharCode(65 + cIdx); // A, B, C, D

                          return (
                            <div
                              key={choice.id || cIdx}
                              className={cn(
                                "flex items-center justify-between rounded-xl border transition-all p-3.5 gap-3",
                                isCorrect
                                  ? "border-[var(--color-ok)] bg-[var(--color-ok-tint)] text-[var(--color-ink)] shadow-xs"
                                  : "border-[var(--color-line-2)] bg-[var(--color-wash)]/40 text-[var(--color-ink)]",
                              )}
                            >
                              <div className="flex items-center min-w-0 flex-1">
                                <span
                                  className={cn(
                                    "flex w-8 h-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold mr-3",
                                    isCorrect
                                      ? "bg-[var(--color-ok)] text-white shadow-xs"
                                      : "bg-[var(--color-panel-2)] text-[var(--color-ink-2)] border border-[var(--color-line-2)]",
                                  )}
                                >
                                  {letter}
                                </span>
                                <span className="text-sm font-medium text-[var(--color-ink)] leading-snug break-words">
                                  {label ||
                                    (previewLang === "es"
                                      ? `Opción ${letter}`
                                      : `Option ${letter}`)}
                                </span>
                              </div>

                              {isCorrect && (
                                <span className="shrink-0 inline-flex items-center rounded-full text-xs font-semibold bg-[var(--color-surface)] text-[var(--color-ok-700)] border border-[var(--color-ok)]/40 shadow-xs px-3 py-1 gap-1.5">
                                  <LuCheck className="w-4 h-4 stroke-[2.5] text-[var(--color-ok-700)]" />
                                  <span>
                                    {previewLang === "es"
                                      ? "Respuesta correcta"
                                      : "Correct answer"}
                                  </span>
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Drawer>
  );
}
