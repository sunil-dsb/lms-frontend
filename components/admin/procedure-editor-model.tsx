'use client';


import * as React from "react";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";


import { toast } from "@/components/ui/toast";




import { type BilingualValue } from "@/components/ui/bilingual-input";









import { type RecipeIngredientItem } from "@/components/admin/recipe-ingredients-editor";



import { isTranslating, subscribeTranslations } from "@/lib/use-bilingual-translation";

import { fetchQuizById, getQuizById, listEmployees, listStations } from "@/lib/api";
import { emptyIngredient, emptyYieldItems, toEditorContent } from "@/lib/procedure-draft";
import { backendSlug, categorySlugsMatch } from "@/services/categories/api";
import type { AdminEmployee, Category, Procedure, ProcedureAudience, ProcedureBlock, ProcedureProtection, ProcedureQuiz, ProcedureYieldItem, Role, Station } from "@/lib/types";
import { validateProcedureForm as validateProcedureInput, type ValidationErrorResult } from "./procedure-editor-validation";
import { createProcedureSaveHandler } from "./procedure-editor-save";
import { useProcedureEditorDerivedData } from "./procedure-editor-derived";
import { createProcedureNavigationHandlers } from "./procedure-editor-navigation";
import { useProcedureImportFlow } from "./procedure-editor-import";




const EVERYONE: ProcedureAudience = { mode: "everyone", stationIds: [], roleIds: [], employeeIds: [] };

export type WizardStepId = "details" | "quiz" | "access" | "review";

export interface ProcedureEditorProps {
  locale: string;
  categories: Category[];
  initial?: Procedure;
}


export function useProcedureEditorModel({
  locale,
  categories: initialCategories,
  initial,
}: ProcedureEditorProps) {

  const t = useTranslations("admin.library.editor");
  const tErr = useTranslations("admin.library.new.errors");
  const tStep = useTranslations("admin.library.new.stepper");
  const tQuizDesc = useTranslations("admin.library.new.quiz");
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = Boolean(initial);
  const isEs = locale === "es";

  /* ---------------------------------------------------------- reference -- */

  const [categories, setCategories] =
    React.useState<Category[]>(initialCategories ?? []);

  // Sync state whenever initialCategories updates from loader
  React.useEffect(() => {
    if (initialCategories && initialCategories.length > 0) {
      setCategories(initialCategories);
    }
  }, [initialCategories]);

  const [stations, setStations] = React.useState<Station[]>([]);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [people, setPeople] = React.useState<AdminEmployee[]>([]);
  const [accessDataLoaded, setAccessDataLoaded] = React.useState(false);

  /* ------------------------------------------------------------ content -- */

  const start = React.useMemo(
    () => (initial ? toEditorContent(initial) : null),
    [initial],
  );
  const [lang, setLang] = React.useState<"en" | "es">(isEs ? "es" : "en");
  const [title, setTitle] = React.useState<BilingualValue>({
    en: initial?.titleEn ?? "",
    es: initial?.titleEs ?? "",
  });
  const [purpose, setPurpose] = React.useState<BilingualValue>({
    en: initial?.purposeEn ?? "",
    es: initial?.purposeEs ?? "",
  });
  const [categoryId, setCategoryId] = React.useState<string>(
    initial?.category?.id ?? "",
  );
  const [subcategoryId, setSubcategoryId] = React.useState<string>(
    initial?.subcategoryId ?? "",
  );
  const [blocks, setBlocks] = React.useState<ProcedureBlock[]>(
    start?.blocks ?? [],
  );
  const [ingredients, setIngredients] = React.useState<RecipeIngredientItem[]>(
    start?.ingredients ?? [emptyIngredient()],
  );
  const [yieldItems, setYieldItems] = React.useState<ProcedureYieldItem[]>(
    start?.yieldItems ?? emptyYieldItems(),
  );
  const [batch, setBatch] = React.useState(1);
  const [iconImageUrl, setIconImageUrl] = React.useState<string | null>(
    initial?.iconImageUrl ?? null,
  );

  const savedQuiz = initial?.quizId ? getQuizById(initial.quizId) : null;
  const [quiz, setQuiz] = React.useState<ProcedureQuiz | null>(
    savedQuiz
      ? { questions: savedQuiz.questions, attached: savedQuiz.attached }
      : null,
  );

  React.useEffect(() => {
    if (initial?.quizId && !savedQuiz) {
      fetchQuizById(initial.quizId).then((loaded) => {
        if (loaded) {
          setQuiz({ questions: loaded.questions, attached: loaded.attached ?? true });
        }
      });
    }
  }, [initial?.quizId, savedQuiz]);
  const [audience, setAudience] = React.useState<ProcedureAudience>(
    initial?.audience ?? {
      ...EVERYONE,
      // On edit, surface the saved station scope so the Access step lands
      // on the same chips the manager picked last time. New procedures
      // default to EVERYONE until the URL prefill (opened from a
      // station-tied category card) overrides `stationIds`.
      stationIds: initial?.stationScope?.stationIds ?? [],
    },
  );
  const [protection, setProtection] = React.useState<ProcedureProtection>(
    initial?.protection ?? "standard",
  );

  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const importFlow = useProcedureImportFlow({
    initial,
    setTitle,
    setPurpose,
    setBlocks,
    setIngredients,
    setYieldItems,
    setIconImageUrl,
    setDirty,
    messages: {
      loaded: t('importLoaded'),
      errorTitle: t('importErrorTitle'),
      errorBody: t('importErrorBody'),
      fileTypeError: t('importFileTypeError'),
      fileSizeError: t('importFileSizeError'),
    },
  });
  const {
    creationMode, setCreationMode, importedId, setImportedId, importedSlug, setImportedSlug,
    importFile, setImportFile, importBannerFile, setImportBannerFile,
    importStep, setImportStep, importing, setImporting, importError, setImportError,
    importDragOver, setImportDragOver, importLoadingId, setImportLoadingId,
    importAbortRef, importInputRef, applyImportedProcedure, IMPORT_ACCEPT,
    startImport, cancelImport, runImport, importElapsed, setImportElapsed,
    formatFileSize, resetToChoiceScreen,
  } = importFlow;

  const [titleError, setTitleError] = React.useState<string | null>(null);
  const [purposeError, setPurposeError] = React.useState<string | null>(null);
  const [blockErrors, setBlockErrors] = React.useState<Record<string, string>>({});
  const [stationsError, setStationsError] = React.useState<boolean>(false);
  const [pending, startTransition] = React.useTransition();
  // A translation scheduled or in flight blocks Save — `save()` reads state
  // captured at render time, so saving mid-translation would persist the
  // pre-translation values. Once this flips false the render already carries
  // the translated text.
  const translating = React.useSyncExternalStore(
    subscribeTranslations,
    isTranslating,
    () => false,
  );
  // Ref to the stations section in the Access step. Publish-time
  // validation scrolls here (not to top) so the manager sees the inline
  // error next to the picker they need to touch, instead of having to
  // scroll up from the sticky footer.
  const stationsSectionRef = React.useRef<HTMLElement | null>(null);
  /* The four steps of the new-procedure wizard, in build order. The category
     and subcategory selects used to sit at the top of step 1 — they were
     lifted out so the writer meets "what is this and what does it say" before
     being asked where to file it; that level of bookkeeping belongs to the
     library, not the editor. State stays here so URL-prefilled values from a
     category deep-link still flow into the saved record. */
  const STEPS = [
    { id: "details", label: tStep("stepContent"), num: 1 },
    { id: "quiz", label: tStep("stepQuiz"), num: 2 },
    { id: "access", label: tStep("stepAccess"), num: 3 },
    { id: "review", label: tStep("stepReview"), num: 4 },
  ] as const;
  type WizardStepId = (typeof STEPS)[number]["id"];
  const [step, setStep] = React.useState<WizardStepId>("details");
  const stepIdx = STEPS.findIndex((s) => s.id === step);
  const isFirstStep = stepIdx === 0;
  const isLastStep = stepIdx === STEPS.length - 1;

  // Always start at top of page on mount / navigation
  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    const rafId = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    });
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Deep-link from the library's Publish action: when a procedure isn't
  // placed yet (categorized but no station attached), the click lands here
  // on the Access step with the inline station error on — attach a station
  // (or file it under General), then publish from the editor.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('publishBlocked') !== '1') return;
    setStep('access');
    setStationsError(true);
    toast.error(t('stationsRequired'));
    const rafId = requestAnimationFrame(() => {
      stationsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    let alive = true;
    void Promise.all([
      listStations(),
      listEmployees({ status: "active" }),
    ])
      .then(([s, e]) => {
        if (!alive) return;
        if (s?.stations) setStations(s.stations);
        if (e?.employees) setPeople(e.employees);
        setAccessDataLoaded(true);
      })
      .catch(() => {
        /* the pickers show their empty text */
      });
    return () => {
      alive = false;
    };
  }, []);

  // Edit mode only, one time, once the live stations land: the saved station
  // ids may belong to a dead catalog (mock seed handles such as `stn-gm`
  // vs live backend UUIDs). Exact live matches are kept; otherwise the
  // handle's tail (`stn-gm` → `gm`) is matched against live slugs, applied
  // only on a single unambiguous hit. Anything still unresolvable is
  // dropped — MultiSelectChips hides unknown ids anyway, and dead ids must
  // not travel into the PUT payload. Runs through the raw setter (not the
  // `edit()` wrapper) so reconciliation alone never marks the form dirty.
  const stationsReconciled = React.useRef(false);
  React.useEffect(() => {
    if (!initial || stationsReconciled.current || stations.length === 0) return;
    stationsReconciled.current = true;
    setAudience((prev) => {
      if (prev.stationIds.length === 0) return prev;
      const liveIds = new Set(stations.map((s) => s.id));
      const normLive = (name: string): string =>
        backendSlug(name).replace(/-/g, "");
      const next: string[] = [];
      for (const savedId of prev.stationIds) {
        if (liveIds.has(savedId)) {
          if (!next.includes(savedId)) next.push(savedId);
          continue;
        }
        const tail = savedId
          .replace(/^(stn|role|loc|sub|cat)-/i, "")
          .replace(/[^a-z0-9]/gi, "")
          .toLowerCase();
        if (tail.length < 2) continue;
        const matches = stations.filter((s) =>
          normLive(s.name).includes(tail),
        );
        if (matches.length === 1 && !next.includes(matches[0].id)) {
          next.push(matches[0].id);
        }
      }
      return next.length === prev.stationIds.length &&
        next.every((v, i) => v === prev.stationIds[i])
        ? prev
        : { ...prev, stationIds: next };
    });
  }, [initial, stations]);

  // Opened from a category page ("Add procedure" on Cleaning → Dishwashing),
  // the URL names where it goes: ?category=<slug>&subcategory=<slug>. Stations
  // are no longer pre-filled from the categories page — the wizard's Access
  // step is where the manager attaches them. The kind of the chosen category
  // decides the default: general procedures broadcast to every station
  // (all stationIds pre-selected), station-tied ones start blank so the
  // manager picks.
  const prefilled = React.useRef(false);
  React.useEffect(() => {
    if (prefilled.current || initial || !categories.length) return;
    prefilled.current = true;
    const q = new URLSearchParams(window.location.search);
    const cat = categories.find((c) => c.slug === q.get("category"));
    if (!cat) return;
    setCategoryId(cat.id);
    const sub = cat.subcategories?.find((s) => s.slug === q.get("subcategory"));
    if (sub) setSubcategoryId(sub.id);
  }, [categories, initial]);

  // Sync categoryId from initial or subcategoryId when categories load
  React.useEffect(() => {
    if (!categoryId && initial) {
      if (initial.category?.id) {
        setCategoryId(initial.category.id);
      } else if ((initial as { categoryId?: string }).categoryId) {
        setCategoryId((initial as { categoryId?: string }).categoryId!);
      }
    }
    if (!categoryId && subcategoryId && categories.length > 0) {
      const parentCat = categories.find((c) =>
        c.subcategories?.some((s) => s.id === subcategoryId || s.slug === subcategoryId)
      );
      if (parentCat) {
        setCategoryId(parentCat.id);
      }
    }
  }, [categoryId, initial, subcategoryId, categories]);

  // Edit mode only, one time, once the live catalog lands: the saved
  // category / subcategory ids may be mock handles (`cat-recipes` /
  // `sub-plating`) that exist in no live row. An exact live subcategory hit
  // adopts its parent; otherwise the saved subcategory's own slug + names
  // (carried on `initial`) are matched against live rows, applied only on a
  // single unambiguous hit. A dead subcategory that cannot be mapped is
  // cleared so the manager re-picks instead of carrying a stale id into
  // SUBCATEGORY_NOT_FOUND at save time.
  const catalogReconciled = React.useRef(false);
  React.useEffect(() => {
    if (!initial || catalogReconciled.current || categories.length === 0) return;
    const liveSubs = categories.flatMap((c) =>
      (c.subcategories ?? []).map((s) => ({ sub: s, parentId: c.id })),
    );
    const exact = liveSubs.find((s) => s.sub.id === subcategoryId);
    if (exact) {
      catalogReconciled.current = true;
      if (exact.parentId !== categoryId) setCategoryId(exact.parentId);
      return;
    }
    const savedSub = initial.category?.subcategories?.find(
      (s) => s.id === subcategoryId || s.slug === subcategoryId,
    );
    if (!savedSub) {
      catalogReconciled.current = true;
      if (subcategoryId) setSubcategoryId("");
      return;
    }
    const normName = (v: string | undefined): string =>
      (v || "").trim().toLowerCase();
    const hits = liveSubs.filter(
      ({ sub }) =>
        (savedSub.slug &&
          categorySlugsMatch(backendSlug(sub.nameEn), savedSub.slug)) ||
        (savedSub.nameEn &&
          normName(sub.nameEn) === normName(savedSub.nameEn)),
    );
    catalogReconciled.current = true;
    if (hits.length === 1) {
      setCategoryId(hits[0].parentId);
      setSubcategoryId(hits[0].sub.id);
    } else if (subcategoryId) {
      setSubcategoryId("");
    }
  }, [initial, categories, categoryId, subcategoryId]);

  // Every edit marks the page dirty; one wrapper instead of a line per field.
  const edit =
    <T,>(set: React.Dispatch<React.SetStateAction<T>>) =>
      (v: T): void => {
        set(v);
        setDirty(true);
      };

  // Leaving with unsaved work asks first.
  React.useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent): void => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const isPristineNew =
    !initial &&
    !importedId &&
    title.en.trim() === '' &&
    title.es.trim() === '' &&
    purpose.en.trim() === '' &&
    purpose.es.trim() === '' &&
    blocks.length === 0;
  const showEntryCards = step === 'details' && creationMode === null && isPristineNew;

  // Revoke any blob URL we created so the browser frees the memory.
  React.useEffect(() => {
    return () => {
      if (iconImageUrl && iconImageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(iconImageUrl);
      }
    };
  }, [iconImageUrl]);

  /* ------------------------------------------------------------ derived -- */

  const {
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
    quizCount,
  } = useProcedureEditorDerivedData({
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
  });

  const whoSummary = (() => {
    if (audience.mode === "everyone") return t("whoEveryone");
    const names = [
      ...audience.stationIds.map(
        (id) => stations.find((s) => s.id === id)?.name,
      ),
      ...audience.roleIds.map((id) => roles.find((r) => r.id === id)?.name),
      ...audience.employeeIds.map(
        (id) => people.find((p) => p.id === id)?.name,
      ),
    ].filter(Boolean);
    return names.length
      ? t("whoSummarySome", { list: names.join(", ") })
      : t("whoSummaryNobody");
  })();

  const validateProcedureForm = (
    scope: 'details' | 'access' | 'all',
    status: 'draft' | 'published',
  ): ValidationErrorResult | null =>
    validateProcedureInput({
      scope,
      status,
      title,
      purpose,
      blocks,
      audience,
      isEs,
      titleRequiredMessage: t('titleRequired'),
      purposeRequiredMessage: t('purposeRequired'),
      stationsSection: stationsSectionRef.current,
    });


  /* ----------------------------------------------------------------- save -- */

  const {
    scrollToTarget,
    applyValidationError,
    handleNext,
    handleSelectStep,
  } = createProcedureNavigationHandlers({
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
    steps: STEPS,
    stationsSectionRef,
  });

  const save = createProcedureSaveHandler({
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
  });


  const published = initial?.status === "published";

  /* --------------------------------------------------------------- render -- */

  
  return {
    locale,
    initial,
    t,
    tErr,
    tStep,
    tQuizDesc,
    router,
    queryClient,
    isEdit,
    isEs,
    categories,
    setCategories,
    stations,
    setStations,
    roles,
    setRoles,
    people,
    setPeople,
    accessDataLoaded,
    setAccessDataLoaded,
    start,
    lang,
    setLang,
    title,
    setTitle,
    purpose,
    setPurpose,
    categoryId,
    setCategoryId,
    subcategoryId,
    setSubcategoryId,
    blocks,
    setBlocks,
    ingredients,
    setIngredients,
    yieldItems,
    setYieldItems,
    batch,
    setBatch,
    iconImageUrl,
    setIconImageUrl,
    savedQuiz,
    quiz,
    setQuiz,
    audience,
    setAudience,
    protection,
    setProtection,
    previewOpen,
    setPreviewOpen,
    dirty,
    setDirty,
    error,
    setError,
    creationMode,
    setCreationMode,
    importedId,
    setImportedId,
    importedSlug,
    setImportedSlug,
    importFile,
    setImportFile,
    importBannerFile,
    setImportBannerFile,
    importStep,
    setImportStep,
    importing,
    setImporting,
    importError,
    setImportError,
    importDragOver,
    setImportDragOver,
    importLoadingId,
    setImportLoadingId,
    importAbortRef,
    importInputRef,
    titleError,
    setTitleError,
    purposeError,
    setPurposeError,
    blockErrors,
    setBlockErrors,
    stationsError,
    setStationsError,
    pending,
    startTransition,
    translating,
    stationsSectionRef,
    STEPS,
    step,
    setStep,
    stepIdx,
    isFirstStep,
    isLastStep,
    stationsReconciled,
    prefilled,
    catalogReconciled,
    edit,
    applyImportedProcedure,
    IMPORT_ACCEPT,
    startImport,
    cancelImport,
    runImport,
    importElapsed,
    setImportElapsed,
    formatFileSize,
    resetToChoiceScreen,
    isPristineNew,
    showEntryCards,
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
    quizCount,
    whoSummary,
    scrollToTarget,
    validateProcedureForm,
    applyValidationError,
    handleNext,
    handleSelectStep,
    save,
    published,
  };
}

export type ProcedureEditorModel = ReturnType<typeof useProcedureEditorModel>;
