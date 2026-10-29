"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Allergen,
  Cover,
  DocControl,
  DocHead,
  DocPurpose,
  Facts,
} from "@/components/doc";
import { DocBehaviour } from "@/components/doc/doc-behaviour";
import { BlockRenderer, findAllergen } from "@/components/doc/block-renderer";
import { CookModeLauncher } from "@/components/doc/cook-mode-launcher";
import { QuizAttachBanner, QuizReader } from "@/components/doc/quiz-reader";
import { Watermark } from "@/components/doc/watermark";
import { getQuizById } from "@/lib/api";
import type { Employee, Procedure, ProcedureBlock } from "@/lib/types";

interface ProcedureArticleBodyProps {
  proc: Procedure;
  employee?: Employee;
  effectiveRole: "admin" | "employee";
  locale: string;
  hideQuiz?: boolean;
  /** Admin-only: wires the QuizAttachBanner attach button. */
  onAttachQuiz?: () => void;
  isAttaching?: boolean;
  bannerDismissed?: boolean;
  onDismissBanner?: () => void;
  docBar?: React.ReactNode;
}

function splitCover(blocks: ProcedureBlock[]): {
  cover?: { src: string; alt: string };
  rest: ProcedureBlock[];
} {
  const i = blocks.findIndex(
    (b, idx) => b.kind === "image" && Boolean(b.src) && idx === 0,
  );
  if (i === -1) return { rest: blocks };
  const b = blocks[i] as Extract<ProcedureBlock, { kind: "image" }>;
  return {
    cover: { src: b.src, alt: b.alt?.en || b.alt?.es || "" },
    rest: blocks.filter((_, n) => n !== i),
  };
}

/**
 * The body of a procedure page: cover, header, allergen, purpose, facts (admin),
 * body blocks, quiz reader, and doc-control (admin). Both the cook read page
 * (`/procedures/[id]`) and the admin detail page (`/admin/library/[id]`) render
 * this — only their surrounding chrome differs.
 *
 * Pulled out of `procedure-view-client.tsx` so the read body has exactly one
 * source of truth. Role-aware chrome (DocBar vs back link, TabBar, wrapper
 * background) stays at the call site; this component renders the same thing
 * for both roles, gating the admin-only blocks on `effectiveRole`.
 */
export function ProcedureArticleBody({
  proc,
  employee,
  effectiveRole,
  locale,
  hideQuiz,
  onAttachQuiz,
  isAttaching,
  bannerDismissed,
  onDismissBanner,
  docBar,
}: ProcedureArticleBodyProps): React.ReactElement {
  const t = useTranslations("employee.doc");
  const labels = {
    updatedOn: t.raw("updatedOn") as string,
    uncategorised: t("uncategorised"),
    factCategory: t("factCategory"),
    factStatus: t("factStatus"),
    factUpdated: t("factUpdated"),
    factLanguages: t("factLanguages"),
    published: t("published"),
    draft: t("draft"),
    englishOnly: t("englishOnly"),
    ctlReference: t("ctlReference"),
    ctlUpdated: t("ctlUpdated"),
    ctlStatus: t("ctlStatus"),
    ctlLanguages: t("ctlLanguages"),
  };

  const isAdmin = effectiveRole === "admin";
  const isEs = locale === "es";

  const title = isEs
    ? proc.titleEs || proc.titleEn
    : proc.titleEn || proc.titleEs;
  const purpose = isEs
    ? proc.purposeEs || proc.purposeEn
    : proc.purposeEn || proc.purposeEs;
  const bodyEsBlocks = proc.bodyEs?.blocks ?? [];
  const bodyEnBlocks = proc.bodyEn?.blocks ?? [];
  const chosen = isEs && bodyEsBlocks.length > 0 ? proc.bodyEs : proc.bodyEn;
  const { cover, rest } = splitCover(chosen?.blocks ?? []);
  const hoisted = findAllergen(rest);
  const allergen = hoisted?.allergen;

  const cat = proc.category;
  const rawSub = (proc as any).subcategory;
  const categoryLabel = cat
    ? isEs
      ? cat.nameEs || cat.nameEn
      : cat.nameEn || cat.nameEs
    : rawSub
      ? isEs
        ? rawSub.nameEs || rawSub.nameEn
        : rawSub.nameEn || rawSub.nameEs
      : labels.uncategorised;
  const procSub =
    cat?.subcategories?.find(
      (s) => s.id && proc.subcategoryId && s.id === proc.subcategoryId,
    ) ??
    rawSub ??
    null;
  const iconName = proc.iconImageUrl
    ? "file-text"
    : procSub?.slug
      ? `procedure-${procSub.slug}`
      : "file-text";

  let updated = "";
  try {
    const rawDate = proc.updatedAt || proc.createdAt;
    if (rawDate) {
      updated = new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(rawDate));
    }
  } catch {
    updated = "";
  }

  const languages = [
    proc.titleEn?.trim() ? "EN" : null,
    bodyEsBlocks.length > 0 ? "ES" : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const englishOnly = isEs && bodyEsBlocks.length === 0;

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Quiz attach banner: shown to admins when the procedure has a quiz but
  // neither `quiz.attached` nor `attachedToTraining` is on. The read side
  // resolves `procedure.quizId` to its quiz row via `getQuizById` on every
  // render. We gate this on `mounted` so SSR and initial client hydration
  // match identically, preventing hydration mismatch when quiz is stored in
  // client-only localStorage.
  const rawQuiz = mounted && proc.quizId ? getQuizById(proc.quizId) : null;
  // A procedure page must ONLY render quizzes whose type is 'procedure' (never 'course' quizzes)
  const quiz =
    rawQuiz && (!rawQuiz.quizType || rawQuiz.quizType === "procedure")
      ? rawQuiz
      : null;
  const quizExists = Boolean(quiz && quiz.questions.length > 0);
  const quizVisible = Boolean(
    quiz && (quiz.attached || proc.attachedToTraining),
  );
  const showAttachBanner = isAdmin && quizExists && !quizVisible;
  return (
    <article className="doc" suppressHydrationWarning>
      <DocBehaviour />
      {docBar}
      {proc.protection === "confidential" || proc.protection === "master" ? (
        <Watermark name={employee?.name || "Staff"} locale={locale} />
      ) : null}
      {showAttachBanner && !bannerDismissed ? (
        <div className="mx-auto w-full max-w-doc px-4 pt-6 sm:px-6">
          <QuizAttachBanner
            onAttach={onAttachQuiz ?? ((): void => {})}
            onDismiss={onDismissBanner ?? ((): void => {})}
            isAttaching={Boolean(isAttaching)}
          />
        </div>
      ) : null}

      {cover ? <Cover src={cover.src} alt={cover.alt} /> : null}

      {/* For a cook: the category once, with when it last changed, and no tile.
          The status, the languages and the document control are the manager's
          facts; they stay on the admin's view. */}
      <DocHead
        icon={isAdmin ? iconName : undefined}
        iconImageUrl={proc.iconImageUrl}
        category={
          isAdmin
            ? categoryLabel
            : `${categoryLabel} · ${labels.updatedOn.replace("{date}", updated)}`
        }
        title={title || "Untitled Procedure"}
        withCover={Boolean(cover)}
      />

      {allergen ? (
        <Allergen
          summary={allergen.summary}
          detail={allergen.detail}
          selectedAllergens={allergen.selectedAllergens}
          locale={isEs ? "es" : "en"}
        />
      ) : null}

      {purpose ? <DocPurpose>{purpose}</DocPurpose> : null}

      {englishOnly ? (
        <p className="doc-sec">
          <span className="pill pill-due">{labels.englishOnly}</span>
        </p>
      ) : null}

      {/* One cook-mode launcher per recipe block. The launcher owns the block's
       *  full body (allergen banner, Yield section, Method list with side
       *  thumbnails, modal) and exposes a CTA inside the Yield section. We
       *  collect the consumed recipe ids so `<BlockRenderer>` can skip them
       *  below — otherwise the same recipe body would render twice. */}
      {(() => {
        const recipeBlocks = (rest ?? []).filter(
          (b): b is Extract<ProcedureBlock, { kind: "recipe" }> =>
            b.kind === "recipe",
        );
        if (recipeBlocks.length > 0) {
          return recipeBlocks.map((b) => (
            <CookModeLauncher
              key={b.id ?? "recipe"}
              block={b}
              procedureId={proc.id}
              procedureTitle={title || "Recipe"}
              locale={isEs ? "es" : "en"}
              skipAllergen={Boolean(
                allergen && (hoisted?.id === b.id || !hoisted?.id),
              )}
            />
          ));
        }

        // Discrete blocks: ingredients + numbered steps (method)
        const methodBlocks = (rest ?? []).filter(
          (b): b is Extract<ProcedureBlock, { kind: "method" }> =>
            b.kind === "method",
        );
        if (methodBlocks.length > 0) {
          const ingBlock = (rest ?? []).find(
            (b): b is Extract<ProcedureBlock, { kind: "ingredients" }> =>
              b.kind === "ingredients",
          );
          const allSteps = methodBlocks.flatMap((b) => b.steps);
          return (
            <CookModeLauncher
              key={`cook-steps-${proc.id}`}
              block={{
                id: `steps-${proc.id}`,
                factors: ingBlock?.factors ?? [1],
                yieldItems: ingBlock?.yieldItems ?? [],
                ingredients: ingBlock?.ingredients ?? [],
                steps: allSteps,
                allergen: ingBlock?.allergen,
              }}
              procedureId={proc.id}
              procedureTitle={title || "Procedure"}
              locale={isEs ? "es" : "en"}
              modalOnly
            />
          );
        }

        return null;
      })()}

      <BlockRenderer
        blocks={rest}
        locale={isEs ? "es" : "en"}
        hoistedAllergenId={hoisted?.id}
        consumedRecipeIds={
          new Set(
            (rest ?? [])
              .filter(
                (b): b is Extract<ProcedureBlock, { kind: "recipe" }> =>
                  b.kind === "recipe",
              )
              .map((b) => b.id ?? ""),
          )
        }
      />

      {/* Quiz: visible when manually attached OR when the procedure is part of
       *  training, unless hideQuiz is set (e.g. inside course chapter learn view). */}
      {!hideQuiz && quiz && (quiz.attached || proc.attachedToTraining) ? (
        <QuizReader quiz={quiz} locale={isEs ? "es" : "en"} />
      ) : null}
    </article>
  );
}
