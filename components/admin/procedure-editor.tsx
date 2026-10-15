"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { PROCEDURES_QUERY_KEY } from "@/services/library/hooks";
import {
  LuArrowLeft,
  LuCheck,
  LuChevronRight,
  LuCircle,
  LuClock,
  LuEye,
  LuFileText,
  LuImagePlus,
  LuLayoutGrid,
  LuLoader,
  LuFilePen,
  LuFileUp,
  LuRotateCw,
  LuSearch,
  LuSignature,
  LuSparkles,
  LuTrash2,
  LuUpload,
  LuUsers,
  LuX,
  LuTriangleAlert,
} from "react-icons/lu";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { MultiSelectChips } from "@/components/ui/multi-select-chips";
import { Drawer } from "@/components/ui/drawer";
import { BilingualInput, type BilingualValue } from "@/components/ui/bilingual-input";
import { WizardStepper } from "@/components/ui/wizard-stepper";
import { getAllStepProgress } from "@/lib/getStepProgress";
import { StatusPill } from "@/components/ui/status-pill";
import { PageHeader } from "@/components/admin/page-header";
import { FormSection } from "@/components/admin/form-section";
import { IconTile } from "@/components/ui/icon-tile";

import { getCategoryIcon, getProcedureGlyphForSubcategory } from "@/lib/category-icons";
import { QuizEditor } from "@/components/admin/quiz-editor";
import { type RecipeIngredientItem } from "@/components/admin/recipe-ingredients-editor";
import { BlockRenderer } from "@/components/doc/block-renderer";
import { Cover, DocHead, DocPurpose } from "@/components/doc";
import { NotionBlockList } from "@/app/[locale]/admin/library/new/notion-block-list";
import {
  isTranslating,
  subscribeTranslations,
  waitForTranslations,
} from "@/lib/use-bilingual-translation";
import { cn } from "@/lib/utils";
import {
  ApiException,
  createProcedure,
  createQuiz,
  deleteQuiz,
  fetchQuizById,
  getQuizById,
  listEmployees,
  listRoles,
  listStations,
  updateProcedure,
  updateQuiz,
  uploadMedia,
} from "@/lib/api";
import {
  buildBody,
  emptyIngredient,
  emptyYieldItems,
  isBlockEmpty,
  toEditorContent,
} from "@/lib/procedure-draft";
import { backendSlug, categorySlugsMatch } from "@/services/categories/api";
import type {
  AdminEmployee,
  Category,
  CreateProcedureInput,
  Procedure,
  ProcedureAudience,
  ProcedureBlock,
  ProcedureProtection,
  ProcedureQuiz,
  ProcedureYieldItem,
  Role,
  Station,
} from "@/lib/types";



import { AssignBlock, CategoryAccordion, initialsOf, ProcedureIconPicker } from './procedure-editor-fields';
const EVERYONE: ProcedureAudience = {
  mode: "everyone",
  stationIds: [],
  roleIds: [],
  employeeIds: [],
};

export function ProcedureEditor({
  locale,
  categories: initialCategories,
  initial,
}: {
  locale: string;
  categories: Category[];
  /** The procedure being edited; absent for a new one. */
  initial?: Procedure;
}): React.ReactElement {
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
  /* ------------------------------- doc import (new wizard only) -------- */
  // Entry choice on step 1: null = show the two cards (pristine form only),
  // 'manual' = blank form, 'upload' = file panel. Any typing auto-dismisses
  // the cards because they only render while the form is pristine.
  const [creationMode, setCreationMode] = React.useState<'manual' | 'upload' | null>(null);
  // Server-created draft id from POST /procedures/import — save() UPDATEs
  // this row instead of POSTing a new one.
  const [importedId, setImportedId] = React.useState<string | null>(null);
  const [importedSlug, setImportedSlug] = React.useState<string | null>(null);
  const [importFile, setImportFile] = React.useState<File | null>(null);
  const [importBannerFile, setImportBannerFile] = React.useState<string | null>(null);
  const [importStep, setImportStep] = React.useState<0 | 1 | 2 | 3>(0);
  const [importing, setImporting] = React.useState(false);
  const [importError, setImportError] = React.useState<string | null>(null);
  const [importDragOver, setImportDragOver] = React.useState(false);
  const [importLoadingId, setImportLoadingId] = React.useState<string | null>(null);
  const importAbortRef = React.useRef<AbortController | null>(null);
  const importInputRef = React.useRef<HTMLInputElement | null>(null);
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

  /* ------------------------- import: prefill + upload ------------------ */

  // Fold a server-returned procedure into the wizard's editable state.
  const applyImportedProcedure = React.useCallback((p: Procedure) => {
    const content = toEditorContent(p);
    setTitle({ en: p.titleEn ?? '', es: p.titleEs ?? '' });
    setPurpose({ en: p.purposeEn ?? '', es: p.purposeEs ?? '' });
    setBlocks(content.blocks);
    setIngredients(content.ingredients);
    setYieldItems(content.yieldItems);
    if (p.iconImageUrl) setIconImageUrl(p.iconImageUrl);
    setImportedId(p.id);
    setImportedSlug(p.slug ?? null);
    setCreationMode('manual');
    setDirty(true);
  }, []);

  // Different-page auto-fill: /admin/library/new?importId=<id|slug> loads the
  // server-created draft and prefills this same wizard for review + edit.
  React.useEffect(() => {
    if (initial || importedId) return;
    const q = new URLSearchParams(window.location.search);
    const importId = q.get('importId');
    if (!importId) return;
    let alive = true;
    setImportLoadingId(importId);
    void (async () => {
      try {
        const { fetchProcedureById } = await import('@/services/library/api');
        const p = await fetchProcedureById(importId, true);
        if (!alive) return;
        applyImportedProcedure(p);
        toast.success(t('importLoaded'));
      } catch {
        if (!alive) return;
        setImportError(t('importErrorTitle'));
      } finally {
        if (alive) setImportLoadingId(null);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const IMPORT_ACCEPT = '.doc,.docx,.pdf,.txt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,text/plain';
  const IMPORT_MAX_BYTES = 10 * 1024 * 1024;

  /** Why a file cannot be imported, or null when it can. */
  function importFileProblem(file: File): string | null {
    const name = file.name.toLowerCase();
    const okType =
      /\.(doc|docx|pdf|txt)$/.test(name) ||
      ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/pdf', 'text/plain'].includes(file.type);
    if (!okType) return t('importFileTypeError');
    if (file.size > IMPORT_MAX_BYTES) return t('importFileSizeError');
    return null;
  }

  /**
   * Choosing the file IS the decision to upload: the card opens the picker,
   * and the file it returns goes straight up. A file that cannot be read says
   * so where it was chosen, and nothing else changes.
   */
  function startImport(file: File | null | undefined): void {
    if (!file || importing) return;
    const problem = importFileProblem(file);
    if (problem) {
      setImportError(problem);
      return;
    }
    setImportError(null);
    setImportFile(file);
    setCreationMode('upload');
    void runImport(file);
  }

  /** Stop an upload in flight and go back to the two cards. */
  function cancelImport(): void {
    importAbortRef.current?.abort();
    setImporting(false);
    setImportLoadingId(null);
    setImportStep(0);
    setImportError(null);
    setImportFile(null);
    setCreationMode(null);
  }

  async function runImport(fileArg?: File): Promise<void> {
    const file = fileArg ?? importFile;
    if (!file || importing) return;
    setImportError(null);
    setImportStep(0);
    const capturedName = file.name;
    setImporting(true);
    const ctrl = new AbortController();
    importAbortRef.current = ctrl;
    try {
      const { importProcedure } = await import('@/services/library/api');
      const p = await importProcedure(file, { signal: ctrl.signal });
      applyImportedProcedure(p);
      setImportBannerFile(capturedName);
      setImportFile(null);
      setImportStep(0);
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      });
      setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      }, 100);
    } catch (err) {
      if (err instanceof Error && err.name === 'CanceledError') return;
      if (ctrl.signal.aborted) return;
      console.warn('[import] failed', err);
      setImportError(t('importErrorBody'));
    } finally {
      importAbortRef.current = null;
      setImporting(false);
    }
  }

  // Seconds since the upload started: the one honest number the wait has.
  const [importElapsed, setImportElapsed] = React.useState(0);
  React.useEffect(() => {
    if (!importing) { setImportElapsed(0); return; }
    const started = Date.now();
    const id = setInterval(() => setImportElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(id);
  }, [importing]);

  // Advance the import progress stepper cosmetically while uploading.
  // The backend is a single request; this timer makes the wait feel purposeful.
  React.useEffect(() => {
    if (!importing) { setImportStep(0); return; }
    const DELAYS: number[] = [1200, 4000, 9500]; // ms to next step
    let step = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    function scheduleNext(idx: number): void {
      if (idx >= DELAYS.length) return;
      const id = setTimeout(() => {
        step = idx + 1;
        setImportStep(step as 0 | 1 | 2 | 3);
        scheduleNext(idx + 1);
      }, DELAYS[idx]);
      timers.push(id);
    }
    scheduleNext(0);
    return () => { timers.forEach(clearTimeout); };
  }, [importing]);

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function resetToChoiceScreen(): void {
    setCreationMode(null);
    setImportFile(null);
    setImportError(null);
    setImportBannerFile(null);
    setImportedId(null);
    setImportedSlug(null);
    setTitle({ en: '', es: '' });
    setPurpose({ en: '', es: '' });
    setBlocks([]);
    setIngredients([emptyIngredient()]);
    setYieldItems(emptyYieldItems());
    setDirty(false);
  }

  // The entry cards only exist on a pristine new form — the first keystroke
  // (or a loaded import) removes them with no extra handler.
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

  const category = categories.find((c) => c.id === categoryId);
  const subcategory = category?.subcategories?.find(
    (s) => s.id === subcategoryId,
  );


  const isRecipe = Boolean(
    category && /recipe/i.test(`${category.slug} ${category.nameEn}`),
  );
  const nameOf = (c: { nameEn: string; nameEs?: string }): string =>
    isEs ? c.nameEs || c.nameEn : c.nameEn;

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

  // Per-step fill ratio, recomputed on every keystroke so the stepper reads
  // as live progress rather than "you are on step 2". The rules live in
  // lib/getStepProgress.ts so they are easy to read and easy to change.
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
    if (!quiz || !quiz.questions || quiz.questions.length === 0) return false;
    return quiz.questions.some((q) => {
      const promptHasText = Boolean(
        (q.prompt?.en && q.prompt.en.trim().length > 0) ||
        (q.prompt?.es && q.prompt.es.trim().length > 0)
      );
      const choicesHaveText = q.choices?.some(
        (c) =>
          Boolean(
            (c.label?.en && c.label.en.trim().length > 0) ||
            (c.label?.es && c.label.es.trim().length > 0)
          )
      );
      return promptHasText || choicesHaveText;
    });
  }, [quiz]);

  const quizQuestionMissingAnswer = React.useMemo(() => {
    if (!quiz || !hasQuizContent) return null;
    return quiz.questions.find((question) => {
      const authored = Boolean(
        question.prompt?.en?.trim() ||
        question.prompt?.es?.trim() ||
        question.choices?.some((choice) => choice.label?.en?.trim() || choice.label?.es?.trim()),
      );
      if (!authored) return false;
      return !question.choices?.some(
        (choice) =>
          choice.id === question.correctChoiceId &&
          Boolean(choice.label?.en?.trim() || choice.label?.es?.trim()),
      );
    }) ?? null;
  }, [quiz, hasQuizContent]);

  const quizCount = quiz?.questions.length ?? 0;
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



  /* ----------------------------------------------------------------- save -- */

  /* ----------------------------------------------------------------- save -- */

  function scrollToTarget(target: string | HTMLElement | null): void {
    if (!target) return;
    const tryScroll = (attemptsLeft = 6) => {
      let el: HTMLElement | null = null;
      if (typeof target === 'string') {
        el = document.getElementById(target);
      } else {
        el = target;
      }
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const input = el.querySelector(
          'input:not([type=hidden]):not([type=file]):not([disabled]), textarea:not([disabled])',
        ) as HTMLInputElement | HTMLTextAreaElement | null;
        if (input) {
          setTimeout(() => input.focus(), 350);
        }
        el.classList.add('ring-2', 'ring-[var(--color-warn)]/60', 'ring-offset-2', 'transition-all');
        setTimeout(() => {
          el?.classList.remove('ring-2', 'ring-[var(--color-warn)]/60', 'ring-offset-2');
        }, 3000);
      } else if (attemptsLeft > 0) {
        setTimeout(() => tryScroll(attemptsLeft - 1), 50);
      }
    };
    requestAnimationFrame(() => tryScroll());
  }

  interface ValidationErrorResult {
    message: string;
    target: string | HTMLElement | null;
    step: WizardStepId;
    field?: 'title' | 'purpose' | 'stations';
    blockId?: string;
  }

  function validateProcedureForm(
    scope: 'details' | 'access' | 'all',
    status: 'draft' | 'published',
  ): ValidationErrorResult | null {
    // 1. Details validation (Title, Purpose, Content Blocks)
    if (scope === 'details' || scope === 'all') {
      const titleEn = title.en.trim();
      const titleEs = title.es.trim();
      if (!titleEn && !titleEs) {
        return {
          message: t('titleRequired') || 'Please enter a procedure title.',
          target: 'field-title',
          step: 'details',
          field: 'title',
        };
      }
      if (titleEn.length > 200 || titleEs.length > 200) {
        return {
          message: 'Procedure title must not exceed 200 characters.',
          target: 'field-title',
          step: 'details',
          field: 'title',
        };
      }
      const purposeEn = purpose.en.trim();
      const purposeEs = purpose.es.trim();
      if (!purposeEn && !purposeEs) {
        return {
          message: t('purposeRequired'),
          target: 'field-purpose',
          step: 'details',
          field: 'purpose',
        };
      }

      // Empty text blocks and empty drafts do NOT error.
      // Only when publishing, verify that there is at least one block with actual content.
      if (status === 'published') {
        const hasAnyContent = blocks.some((b) => !isBlockEmpty(b));
        if (!hasAnyContent) {
          return {
            message: 'Please add content to at least one block before publishing.',
            target: blocks.length > 0 ? `block-${blocks[0].id}` : 'proc-content',
            step: 'details',
            blockId: blocks[0]?.id,
          };
        }
      }

      // Check blocks
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];

        // An empty text block NEVER gives an error
        if (b.kind === 'text') {
          continue;
        }

        // An empty heading block is dropped on save, no error
        if (b.kind === 'heading') {
          continue;
        }

        if (b.kind === 'table') {
          if (!b.headers || b.headers.length === 0) {
            return {
              message: 'Table must contain at least one column header.',
              target: `block-${b.id}`,
              step: 'details',
              blockId: b.id,
            };
          }
          const emptyHeaderIdx = b.headers.findIndex(
            (h) => !h?.en?.trim() && !h?.es?.trim()
          );
          if (emptyHeaderIdx !== -1) {
            return {
              message: `Please enter a name for Table column ${emptyHeaderIdx + 1}.`,
              target: `block-${b.id}`,
              step: 'details',
              blockId: b.id,
            };
          }
        }

        if (b.kind === 'recipe') {
          const hasIngredients = b.ingredients?.some((ing) => ing.name?.trim());
          const hasStepText = b.steps?.some(
            (s) => s.body?.en?.trim() || s.body?.es?.trim()
          );
          if (hasIngredients && !hasStepText) {
            return {
              message: 'Recipe must include at least one instruction step.',
              target: `block-${b.id}`,
              step: 'details',
              blockId: b.id,
            };
          }
          const namelessIng = b.ingredients?.some(
            (ing) => !ing.name?.trim() && (ing.amounts?.some((a) => a?.trim()) || ing.unit?.trim())
          );
          if (namelessIng) {
            return {
              message: 'Please enter a name for all recipe ingredients.',
              target: `block-${b.id}`,
              step: 'details',
              blockId: b.id,
            };
          }
        }

        if (b.kind === 'method') {
          if (b.steps?.length > 1) {
            const emptyStepIdx = b.steps.findIndex(
              (s) => !s.body?.en?.trim() && !s.body?.es?.trim() && !s.imageSrc && !s.videoSrc
            );
            if (emptyStepIdx !== -1) {
              return {
                message: `Please enter instructions for step ${emptyStepIdx + 1}.`,
                target: `block-${b.id}`,
                step: 'details',
                blockId: b.id,
              };
            }
          }
        }

        if (b.kind === 'warning') {
          if (status === 'published' && !b.body?.en?.trim() && !b.body?.es?.trim()) {
            return {
              message: 'Warning/Callout block text cannot be empty.',
              target: `block-${b.id}`,
              step: 'details',
              blockId: b.id,
            };
          }
        }

        if (b.kind === 'attachment') {
          const hasTitle = b.title?.en?.trim() || b.title?.es?.trim();
          if (hasTitle && !b.href?.trim()) {
            return {
              message: 'Attachment block requires a file link or URL.',
              target: `block-${b.id}`,
              step: 'details',
              blockId: b.id,
            };
          }
        }

        if (b.kind === 'video') {
          if (!b.src?.trim() && (b.caption?.en?.trim() || b.caption?.es?.trim())) {
            return {
              message: 'Video block requires a video URL.',
              target: `block-${b.id}`,
              step: 'details',
              blockId: b.id,
            };
          }
        }
      }
    }

    // 2. Access validation on publish — every procedure needs at least
    // one station assigned before going live.
    if ((scope === 'access' || scope === 'all') && status === 'published') {
      if (audience.stationIds.length === 0) {
        return {
          message: isEs
            ? 'Por favor, selecciona al menos una estación antes de publicar.'
            : 'Please select at least one station before publishing.',
          target: stationsSectionRef.current || 'proc-stations',
          step: 'access',
          field: 'stations',
        };
      }
    }

    return null;
  }

  function applyValidationError(valErr: ValidationErrorResult): void {
    if (valErr.field === 'title') {
      setTitleError(valErr.message);
    } else if (valErr.field === 'purpose') {
      setPurposeError(valErr.message);
    } else if (valErr.blockId) {
      setBlockErrors({ [valErr.blockId]: valErr.message });
    }
    if (valErr.step !== step) {
      setStep(valErr.step);
    }
    if (valErr.step === 'access' || valErr.field === 'stations') {
      setStationsError(true);
    }
    toast.error(valErr.message);
    scrollToTarget(valErr.target);
  }

  function handleNext(): void {
    if (step === 'quiz' && quizQuestionMissingAnswer) {
      toast.error(tQuizDesc('answerRequiredForPublish'));
      document.getElementById(`quiz-question-${quizQuestionMissingAnswer.id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      return;
    }
    let valErr: ValidationErrorResult | null = null;
    if (step === 'details') {
      valErr = validateProcedureForm('details', 'draft');
    }

    if (valErr) {
      applyValidationError(valErr);
      return;
    }

    setTitleError(null);
    setPurposeError(null);
    setBlockErrors({});
    setStationsError(false);
    if (stepIdx < STEPS.length - 1) {
      setStep(STEPS[stepIdx + 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function handleSelectStep(newStepId: WizardStepId): void {
    if (
      step === 'quiz' &&
      STEPS.findIndex((item) => item.id === newStepId) > STEPS.findIndex((item) => item.id === 'quiz') &&
      quizQuestionMissingAnswer
    ) {
      toast.error(tQuizDesc('answerRequiredForPublish'));
      document.getElementById(`quiz-question-${quizQuestionMissingAnswer.id}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      return;
    }
    if (step === 'details' && newStepId !== 'details') {
      const valErr = validateProcedureForm('details', 'draft');
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function save(status: 'draft' | 'published'): void {
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
  }

  const published = initial?.status === "published";

  /* --------------------------------------------------------------- render -- */

  return (
    <div>
      <div className="mx-auto max-w-page">
        {showEntryCards ? (
          /* On the choose screen the sidebar already leads back to Procedures,
             so there is no eyebrow: the page opens straight on its question. */
          <PageHeader title={t('importChooseTitle')} subtitle={t('importChooseSubtitle')} />
        ) : (
          <PageHeader
            eyebrow={(creationMode === 'manual' || creationMode === 'upload') && !initial && !importedId ? t("importBack") : t("back")}
            eyebrowHref={(creationMode === 'manual' || creationMode === 'upload') && !initial && !importedId ? undefined : `/${locale}/admin/library`}
            onEyebrowClick={(creationMode === 'manual' || creationMode === 'upload') && !initial && !importedId ? () => (creationMode === 'upload' ? cancelImport() : resetToChoiceScreen()) : undefined}
            title={isEdit ? t("titleEdit") : t("titleNew")}
          />
        )}
      </div>

      {!showEntryCards && creationMode !== 'upload' ? (
        <div className="sticky top-[56px] z-10 -mx-4 bg-[var(--color-bg-admin)]/95 px-4 py-2.5 backdrop-blur-md transition-all sm:-mx-6 sm:px-6 lg:top-[75px] lg:-mx-10 lg:px-10">
          <div className="mx-auto max-w-page">
            <WizardStepper
              className="my-0"
              ariaLabel={tStep("ariaLabel")}
              current={step}
              steps={STEPS.map((s) => ({
                id: s.id,
                label: s.label,
                progress: stepProgress[s.id],
              }))}
              onSelect={(id) => handleSelectStep(id as WizardStepId)}
            />
          </div>
        </div>
      ) : null}


      {!showEntryCards && !importing && !importLoadingId && creationMode !== 'upload' ? (
        <div className="pointer-events-none fixed bottom-[90px] right-5 z-30 lg:right-6">
          <Button
            type="button"
            variant="surface"
            icon={LuEye}
            onClick={() => setPreviewOpen(true)}
            className="pointer-events-auto shadow-e2"
          >
            {t("preview")}
          </Button>
        </div>
      ) : null}

      <div className="mx-auto max-w-page mt-4 space-y-4 pb-20">
        {/* ── State 1: Entry choice — clean cards with full-card click, no bottom CTA line ── */}
        {showEntryCards ? (
          <div
            className="py-4"
            style={{ animation: 'proc-fadein 200ms ease both' }}
          >
            {/* Options grid with full card clickability */}
            <div
              className="grid w-full gap-6 sm:grid-cols-2"
              role="group"
              aria-label={t('importChooseTitle')}
            >
              {/* The two ways in. Each card answers what a manager weighs before
                  choosing: what happens, how long it takes, and where the tap
                  goes -- the time on the left of its foot, the action on the right,
                  so a phone (no hover) still shows it is a button. The icon says
                  which is which: writing a document, or sending one up to be
                  drafted, with a spark for the drafting. Text is the admin
                  card's (20px title, 14px text); the 64px tile is this page's
                  one picture, and hover marks the
                  card the way every admin card does: edge and a breath of
                  shadow, no lift. */}
              {([
                {
                  id: 'entry-manual',
                  mode: 'manual' as const,
                  Icon: LuFilePen,
                  spark: false,
                  title: t('importManualTitle'),
                  body: t('importManualBody'),
                  hint: t('importManualHint'),
                  cta: t('importManualCta'),
                },
                {
                  id: 'entry-upload',
                  mode: 'upload' as const,
                  Icon: LuFileUp,
                  spark: true,
                  title: t('importUploadTitle'),
                  body: t('importUploadBody'),
                  hint: t('importUploadHint'),
                  cta: t('importUploadCardCta'),
                },
              ]).map((card) => (
                <button
                  key={card.id}
                  type="button"
                  id={card.id}
                  onClick={() => (card.mode === 'upload' ? importInputRef.current?.click() : setCreationMode('manual'))}
                  onDragOver={card.mode === 'upload' ? (e) => { e.preventDefault(); setImportDragOver(true); } : undefined}
                  onDragLeave={card.mode === 'upload' ? () => setImportDragOver(false) : undefined}
                  onDrop={card.mode === 'upload' ? (e) => { e.preventDefault(); setImportDragOver(false); startImport(e.dataTransfer.files?.[0]); } : undefined}
                  data-drag={card.mode === 'upload' && importDragOver ? '' : undefined}
                  className="group flex cursor-pointer flex-col items-start rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-6 text-left transition-colors duration-200 hover:border-[var(--color-line-hover)] hover:shadow-e1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] data-[drag]:border-[var(--color-brand-600)] data-[drag]:bg-[var(--color-brand-tint)]"
                >
                  <span className="relative mb-5 flex size-16 shrink-0 items-center justify-center rounded-[var(--radius-xl)] bg-[var(--color-panel)] text-[var(--color-ink)] transition-colors duration-200 group-hover:bg-[var(--color-panel-2)]">
                    <card.Icon aria-hidden="true" className="size-6" strokeWidth={1.5} />
                    {card.spark ? (
                      <span className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-brand-600)] text-[var(--color-white)]">
                        <LuSparkles aria-hidden="true" className="size-3" />
                      </span>
                    ) : null}
                  </span>
                  <span className="block text-md font-semibold tracking-snug text-[var(--color-ink)]">{card.title}</span>
                  <span className="mb-5 mt-1 block text-sm text-[var(--color-ink-2)]">{card.body}</span>

                  <span className="mt-auto flex w-full flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] pt-3">
                    <span className="inline-flex items-center gap-2 text-sm text-[var(--color-ink-3)]">
                      <LuClock aria-hidden="true" className="size-4 shrink-0 text-[var(--color-ink-3)]" />
                      {card.hint}
                    </span>
                    <span className="text-sm font-semibold text-[var(--color-brand-700)]">
                      {card.cta}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            {importError && creationMode === null ? (
              <p role="alert" className="mt-4 flex items-start gap-2 text-sm font-semibold text-[var(--color-bad)]">
                <LuTriangleAlert aria-hidden="true" className="mt-0_5 size-4 shrink-0" />
                {importError}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* One file input for the whole import flow: the upload card and the
            failed screen's "Choose another file" both open it. Reset after
            each pick so choosing the same file again still fires. */}
        {!initial ? (
          <input
            ref={importInputRef}
            type="file"
            accept={IMPORT_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              startImport(file);
            }}
          />
        ) : null}

        {/* ── State 2b: Upload panel & In-content loading (shown while creationMode === 'upload') ── */}
        {step === 'details' && creationMode === 'upload' && !initial ? (
          <div className="space-y-4" style={{ animation: 'proc-fadein 180ms ease both' }}>
            {/* While the draft is built, and when it could not be: the wizard's
                own section card, full width, so these two screens are a step of
                the form rather than a box of their own. */}
            {(importing || importLoadingId) ? (
              <div role="status" aria-live="polite" aria-label={t('importLoadingTitle')}>
                <FormSection
                  icon={LuFileUp}
                  title={t('importLoadingTitle')}
                  subtitle={importElapsed >= 60 ? t('importSlow') : t('importLoadingSubtitle')}
                  headerAction={
                    <Button type="button" variant="neutral" onClick={cancelImport}>
                      {t('importLoadingCancel')}
                    </Button>
                  }
                >
                  {importBannerFile || importFile ? (
                    <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-wash)] px-4 py-3">
                      <LuFileText aria-hidden="true" className="size-4 shrink-0 text-[var(--color-ink-3)]" />
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--color-ink)]">{importBannerFile ?? importFile?.name}</p>
                      {importFile?.size ? (
                        <span className="shrink-0 text-sm text-[var(--color-ink-3)]">{formatFileSize(importFile.size)}</span>
                      ) : null}
                    </div>
                  ) : null}

                  {/* The step being worked on spins; the server is one request and
                      cannot say how far it has got, so nothing claims a percentage. */}
                  <ol className="space-y-3">
                    {[
                      t('importProgressStep1'),
                      t('importProgressStep2'),
                      t('importProgressStep3'),
                      t('importProgressStep4'),
                    ].map((label, idx) => {
                      const done = idx < importStep;
                      const active = idx === importStep;
                      return (
                        <li key={idx} className="flex items-center gap-3">
                          <span className="flex size-5 shrink-0 items-center justify-center" aria-hidden="true">
                            {done ? (
                              <span className="flex size-5 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-[var(--color-white)]">
                                <LuCheck className="size-3" />
                              </span>
                            ) : active ? (
                              <LuLoader className="size-5 animate-spin text-[var(--color-brand-600)]" />
                            ) : (
                              <span className="size-5 rounded-full border border-[var(--color-line-3)]" />
                            )}
                          </span>
                          <span
                            className={cn(
                              'text-sm',
                              active ? 'font-semibold text-[var(--color-ink)]' : done ? 'text-[var(--color-ink-2)]' : 'text-[var(--color-ink-3)]',
                            )}
                          >
                            {label}
                          </span>
                        </li>
                      );
                    })}
                  </ol>

                  <p className="flex items-center gap-2 border-t border-[var(--color-line)] pt-4 text-sm text-[var(--color-ink-2)]">
                    <LuSparkles aria-hidden="true" className="size-4 shrink-0 text-[var(--color-brand-600)]" />
                    {t('importProgressHint')}
                  </p>
                </FormSection>
              </div>
            ) : importError ? (
              /* The upload failed. The file is kept, so trying again is one tap;
                 another file, or writing it by hand, are the other ways on. */
              <div role="alert">
                <FormSection icon={LuTriangleAlert} title={t('importErrorTitle')} subtitle={importError}>
                  {importFile ? (
                    <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-wash)] px-4 py-3">
                      <LuFileText aria-hidden="true" className="size-4 shrink-0 text-[var(--color-ink-3)]" />
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--color-ink)]">{importFile.name}</p>
                      <span className="shrink-0 text-sm text-[var(--color-ink-3)]">{formatFileSize(importFile.size)}</span>
                    </div>
                  ) : null}

                  {/* Actions bottom right, the primary last; stacked on a phone,
                      the primary on top. */}
                  <div className="flex flex-col-reverse gap-2 border-t border-[var(--color-line)] pt-4 sm:flex-row sm:items-center sm:justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setCreationMode('manual');
                        setImportFile(null);
                        setImportError(null);
                      }}
                    >
                      {t('importErrorManual')}
                    </Button>
                    <Button type="button" variant="neutral" icon={LuUpload} onClick={() => importInputRef.current?.click()}>
                      {t('importChooseAnother')}
                    </Button>
                    {importFile ? (
                      <Button type="button" variant="primary" icon={LuRotateCw} onClick={() => void runImport()}>
                        {t('importErrorRetry')}
                      </Button>
                    ) : null}
                  </div>
                </FormSection>
              </div>
            ) : null}
          </div>
        ) : null}



        {/* ── State 4: Persistent review banner after doc import ──────── */}
        {importBannerFile && step === 'details' ? (
          <div
            role="status"
            className="flex flex-wrap items-start justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] px-5 py-4"
            style={{ animation: 'proc-fadein 220ms ease both' }}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-tint)] text-[var(--color-brand-700)]">
                <LuCheck aria-hidden="true" className="size-3" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  {t('importBannerText', { file: importBannerFile })}
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-ink-3)]">Fields marked below were filled in automatically.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="neutral"
                size="sm"
                onClick={() => resetToChoiceScreen()}
              >
                {t('importBannerCta')}
              </Button>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setImportBannerFile(null)}
                className="flex size-7 items-center justify-center rounded-lg text-[var(--color-ink-3)] transition-colors hover:bg-[var(--color-line-2)] hover:text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              >
                <LuX aria-hidden="true" className="size-3.5" />
              </button>
            </div>
          </div>
        ) : null}

        {/* ── Step 1 form — only rendered once a method is chosen ─────── */}
        {step === "details" && (creationMode === 'manual' || initial) ? (
          <>
            <FormSection
              id="proc-details"
              icon={LuFileText}
              title={t("detailsTitle")}
            >
              <div className="space-y-5">
                <div id="field-title" className="rounded-[var(--radius-md)]">
                  <BilingualInput
                    label={t("fieldTitle")}
                    required
                    maxLength={100}
                    value={title}
                    onChange={(next) => {
                      setTitleError(null);
                      edit(setTitle)(next);
                    }}
                    placeholder={{
                      en: "Enter the procedure title...",
                      es: "Ingresa el título del procedimiento...",
                    }}
                  />
                  {titleError ? (
                    <p
                      role="alert"
                      className="mt-1.5 flex items-center gap-2 text-xs font-normal text-[var(--color-warn-ink)] animate-in fade-in"
                    >
                      <LuTriangleAlert className="size-[13px] shrink-0 text-[var(--color-warn)]" />
                      <span>{titleError}</span>
                    </p>
                  ) : null}
                </div>

                <div id="field-purpose" className="rounded-[var(--radius-md)]">
                  <BilingualInput
                    label={t("fieldPurpose")}
                    required
                    multiline
                    maxLength={500}
                    value={purpose}
                    onChange={(next) => {
                      setPurposeError(null);
                      edit(setPurpose)(next);
                    }}
                    placeholder={{
                      en: "Enter the purpose of this procedure...",
                      es: "Ingresa el propósito de este procedimiento...",
                    }}
                  />
                  {purposeError ? (
                    <p
                      role="alert"
                      className="mt-1.5 flex items-center gap-2 text-xs font-normal text-[var(--color-warn-ink)] animate-in fade-in"
                    >
                      <LuTriangleAlert className="size-[13px] shrink-0 text-[var(--color-warn)]" />
                      <span>{purposeError}</span>
                    </p>
                  ) : null}
                </div>
              </div>
            </FormSection>

            {/* ── What it says ─────────────────────────────────────────── */}
            <FormSection
              id="proc-content"
              icon={LuLayoutGrid}
              title={t("contentTitle")}
              subtitle={
                isRecipe ? t("contentSubtitleRecipe") : t("contentSubtitle")
              }
              headerAction={
                <span className="inline-flex items-center rounded-full border border-[var(--color-line-2)] bg-[var(--color-wash)] px-3 py-1 text-xs font-semibold text-[var(--color-ink-2)]">
                  {t("contentBlocksCount", { count: blocks.length })}
                </span>
              }
            >
              <NotionBlockList
                blocks={blocks}
                errors={blockErrors}
                onChange={(next) => {
                  setBlockErrors({});
                  edit(setBlocks)(next);
                }}
              />
            </FormSection>
          </>
        ) : null}

        {/* ── Step 2 — knowledge check ──────────────────────────────── */}
        {step === "quiz" ? (
          <FormSection
            id="proc-quiz"
            icon={LuSparkles}
            title={t("quizTitle")}
            subtitle={tQuizDesc("description")}
          >
            {/* The quiz author needs a question on screen the moment they
                land on this step — no Drawer gate, no Add button. Passing
                `null` lets the editor seed one blank question (attached
                off, four empty options) so the "Attach" toggle and Question 1
                are visible immediately. On first edit the parent state
                catches up through `edit(setQuiz)`. */}
            <QuizEditor
              value={quiz}
              hideHeader
              onChange={(next) => {
                if (!quiz) setQuiz(next);
                else edit(setQuiz)(next);
              }}
            />
          </FormSection>
        ) : null}

        {/* ── Step 3 — Categories accordion + Station row + Assign block ── */}
        {step === "access" ? (
          <div className="space-y-6">
            {/* Block 1 — pick the category & subcategory. The accordion shows
                one parent category at a time; the chosen subcategory drives
                what shows below (station row for station-specific
                subcategories, employee list always). */}
            <FormSection
              id="proc-categories"
              icon={LuLayoutGrid}
              title={t("categoriesTitle")}
              subtitle={t("categoriesSubtitle")}
            >
              <CategoryAccordion
                categories={categories}
                selectedSubcategoryId={subcategoryId}
                onSelectSubcategory={(catId, subId) => {
                  edit(setCategoryId)(catId);
                  edit(setSubcategoryId)(subId);
                }}
                locale={locale}
              />
            </FormSection>

            {/* Block 2 — Stations. Always shown: general procedures broadcast to
                every station (chips come pre-selected), station-specific
                ones start blank so the manager picks. The picker is the
                place where exactly-one-station-attached is enforced at
                publish time, so it has to be visible regardless of kind.
                When publish-time validation fails, the section swaps to a
                red border and renders an inline error here (not just in
                the top banner) so the manager sees the problem next to
                the control they need to touch. */}
            {category ? (
              <section
                ref={stationsSectionRef}
                id="proc-stations"
                aria-invalid={stationsError}
                className={cn(
                  "rounded-[var(--radius-lg)] border bg-[var(--color-surface)] p-6 transition-colors",
                  stationsError
                    ? "border-[var(--color-bad)] ring-2 ring-[var(--color-bad-tint)]"
                    : "border-[var(--color-line)]",
                )}
              >
                <div className="flex items-center gap-2">
                  <IconTile size="xs" icon={LuLayoutGrid} />
                  <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                    {t("stationsRowTitle")}
                  </h3>
                  <StatusPill
                    tone={stationsError ? "bad" : "info"}
                    withDot={stationsError}
                  >
                    {audience.stationIds.length === 0
                      ? t("stationsRowNone")
                      : t("stationsRowCount", {
                        count: audience.stationIds.length,
                      })}
                  </StatusPill>
                </div>
                <p className="mt-2 text-xs leading-meta text-[var(--color-ink-3)]">
                  {t("stationsHintStationSpecific")}
                </p>
                {stationsError ? (
                  <p
                    role="alert"
                    className="mt-3 rounded-[var(--radius-md)] bg-[var(--color-bad-tint)] px-3 py-2 text-xs font-semibold text-[var(--color-bad)]"
                  >
                    {t("stationsRequired")}
                  </p>
                ) : null}
                <div className="mt-3">
                  <MultiSelectChips
                    id="who-stations"
                    label={t("stationsAddTitle")}
                    value={audience.stationIds}
                    onChange={(v) => {
                      if (v.length > 0) setStationsError(false);
                      edit(setAudience)({ ...audience, stationIds: v });
                    }}
                    options={stations.map((s) => ({
                      value: s.id,
                      label: s.name,
                    }))}
                    addLabel={t("whoAdd")}
                    emptyText={t("stationsEmpty")}
                  />
                </div>
              </section>
            ) : null}

            {/* Block 3 — Assign. Lists employees filtered by the chosen
                stations (or everyone, when no stations are filtered).
                The block supplies its own header bar (icon + title + picked
                chip on the left, search on the right) so it sits in a plain
                card instead of a FormSection — the header would otherwise
                repeat itself. */}
            <section
              id="proc-assign"
              className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6"
            >
              <AssignBlock
                people={people}
                stations={stations}
                roles={roles}
                filterStationIds={
                  audience.stationIds.length > 0
                    ? audience.stationIds
                    : null
                }
                selected={audience.employeeIds}
                onToggle={(id) => {
                  const next = audience.employeeIds.includes(id)
                    ? audience.employeeIds.filter((x) => x !== id)
                    : [...audience.employeeIds, id];
                  edit(setAudience)({ ...audience, employeeIds: next });
                }}
                isEs={isEs}
              />
            </section>
          </div>
        ) : null}

        {/* ── Step 4 — review before publishing ─────────────────────── */}
        {step === "review" ? (
          <div className="space-y-6">
            {/* Preview card — what the procedure looks like at a glance.
               The Drawer already holds the full read-through; this card just
               gives the manager the title, the purpose, and a way to jump
               back into the preview without scrolling the wizard. */}
            <section
              id="proc-review-preview"
              className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--color-ink-3)]">
                    {t("reviewPreviewLabel")}
                  </p>
                  <p className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold leading-tight tracking-tight text-[var(--color-ink)]">
                    {(isEs ? title.es || title.en : title.en || title.es) ||
                      t("previewUntitled")}
                  </p>
                  <p className="mt-2 text-sm text-[var(--color-ink-2)]">
                    {(title.en || title.es) && (purpose.en || purpose.es)
                      ? isEs
                        ? purpose.es || purpose.en
                        : purpose.en || purpose.es
                      : t("reviewPreviewEmpty")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="neutral"
                  size="sm"
                  icon={LuEye}
                  onClick={() => setPreviewOpen(true)}
                >
                  {t("reviewPreviewCta")}
                </Button>
              </div>
            </section>

            {/* Summary card — every other fact about the procedure. */}
            <section
              id="proc-review-summary"
              className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6"
            >
              <div className="flex items-center gap-2">
                <IconTile size="xs" icon={LuFileText} />
                <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                  {t("reviewSummaryHeading")}
                </h3>
              </div>
              <p className="mt-1 text-sm text-[var(--color-ink-2)]">
                {t("reviewSummarySubtitle")}
              </p>

              <ul className="mt-5 grid gap-5 sm:grid-cols-2">
                {/* Where it lives — category + subcategory */}
                <li className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-wash)] p-4">
                  <div className="flex items-center gap-2">
                    <IconTile size="xs" icon={LuLayoutGrid} />
                    <p className="text-sm font-semibold text-[var(--color-ink-3)]">
                      {t("reviewWhereLabel")}
                    </p>
                  </div>
                  {category ? (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-[var(--color-ink-3)]">
                        {t("reviewWhereCategory")}
                      </p>
                      <p className="text-sm font-semibold text-[var(--color-ink)]">
                        {nameOf(category)}
                      </p>
                      {subcategory ? (
                        <>
                          <p className="mt-2 text-sm text-[var(--color-ink-3)]">
                            {t("reviewWhereSubcategory")}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-[var(--color-ink)]">
                              {nameOf(subcategory)}
                            </p>
                            <StatusPill
                              tone={
                                category?.kind === "station-tied" ? "info" : "neutral"
                              }
                            >
                              {category?.kind === "station-tied"
                                ? t("reviewStationsStationSpecific")
                                : t("reviewStationsGeneral")}
                            </StatusPill>
                          </div>
                        </>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-[var(--color-ink-2)]">
                      {t("reviewWhereEmpty")}
                    </p>
                  )}
                </li>

                {/* Stations — list of chosen station names, or "All stations" */}
                <li className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-wash)] p-4">
                  <div className="flex items-center gap-2">
                    <IconTile size="xs" icon={LuLayoutGrid} />
                    <p className="text-sm font-semibold text-[var(--color-ink-3)]">
                      {t("reviewStationsLabel")}
                    </p>
                  </div>
                  {audience.stationIds.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {audience.stationIds.map((id) => {
                        const station = stations.find((s) => s.id === id);
                        return (
                          <li key={id}>
                            <span className="inline-flex items-center rounded-full border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-1 text-sm font-semibold text-[var(--color-ink)]">
                              {station?.name ?? id}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-[var(--color-ink-2)]">
                      {t("reviewStationsNone")}
                    </p>
                  )}
                </li>

                {/* People assigned */}
                <li className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-wash)] p-4">
                  <div className="flex items-center gap-2">
                    <IconTile size="xs" icon={LuUsers} />
                    <p className="text-sm font-semibold text-[var(--color-ink-3)]">
                      {t("reviewAssignLabel")}
                    </p>
                    {audience.mode === "everyone" ? null : (
                      <span className="text-sm font-normal text-[var(--color-ink-3)]">
                        {t("assignPicked", { count: audience.employeeIds.length })}
                      </span>
                    )}
                  </div>
                  {audience.mode === "everyone" ? (
                    <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                      {t("reviewAssignEveryone")}
                    </p>
                  ) : audience.employeeIds.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {audience.employeeIds.map((id) => {
                        const person = people.find((p) => p.id === id);
                        if (!person) return null;
                        const personStationList = (person.stationIds ?? [])
                          .map((sid) => stations.find((s) => s.id === sid)?.name)
                          .filter(Boolean)
                          .join(" · ");
                        return (
                          <li
                            key={id}
                            className="flex items-center gap-2 rounded-full border border-[var(--color-brand-600)] bg-[var(--color-brand-tint)] px-2.5 py-1"
                          >
                            <span className="flex size-5 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-[10px] font-bold text-[var(--color-surface)]">
                              {initialsOf(person.name)}
                            </span>
                            <span className="text-sm font-semibold text-[var(--color-brand-700)]">
                              {person.name}
                            </span>
                            {personStationList ? (
                              <span className="text-xs font-normal text-[var(--color-brand-700)] opacity-80">
                                · {personStationList}
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-[var(--color-ink-2)]">
                      {t("reviewAssignEmpty")}
                    </p>
                  )}
                </li>

                {/* Quiz */}
                <li className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-wash)] p-4">
                  <div className="flex items-center gap-2">
                    <IconTile size="xs" icon={LuSparkles} />
                    <p className="text-sm font-semibold text-[var(--color-ink-3)]">
                      {t("reviewQuizLabel")}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      {quizCount
                        ? t("reviewQuizSummary", { count: quizCount })
                        : t("quizNone")}
                    </p>
                    {quizCount > 0 ? (
                      <StatusPill tone={quiz?.attached ? "ok" : "neutral"}>
                        {quiz?.attached
                          ? t("reviewQuizAttached")
                          : t("reviewQuizDetached")}
                      </StatusPill>
                    ) : null}
                  </div>
                </li>

                {/* Protection */}
                <li className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-wash)] p-4 sm:col-span-2">
                  <div className="flex items-center gap-2">
                    <IconTile size="xs" icon={LuSignature} />
                    <p className="text-sm font-semibold text-[var(--color-ink-3)]">
                      {t("reviewProtectionLabel")}
                    </p>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[var(--color-ink)]">
                    {t(
                      protection === "master"
                        ? "protectionMaster"
                        : protection === "confidential"
                          ? "protectionConfidential"
                          : "protectionStandard",
                    )}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-ink-2)]">
                    {t("protectionHint")}
                  </p>
                </li>

                {/* The picker card. The picker resolves the default glyph itself
                    from PROCEDURE_ICON_MAP (slug -> IconType), shows the
                    uploaded file's name when an image is set, and offers
                    Upload / Replace / Remove. No "category" or "mark" wording
                    shows up here. */}
                <li className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-wash)] p-4 sm:col-span-2">
                  <div className="flex items-center gap-2">
                    <IconTile size="xs" icon={LuImagePlus} />
                    <p className="text-sm font-semibold text-[var(--color-ink-3)]">
                      {t("reviewCoverLabel")}
                    </p>
                  </div>
                  <div className="mt-3">
                    <ProcedureIconPicker
                      subcategorySlug={subcategory?.slug ?? null}
                      imageUrl={iconImageUrl}
                      onChange={(next) => edit(setIconImageUrl)(next)}
                    />
                  </div>
                </li>
              </ul>
            </section>

            {/* Ready to go live — the publishing reassurance, plus the
               notification count. Lives outside the summary card so it can
               stretch edge-to-edge with the rocket icon, like the sketch. */}
            <section
              id="proc-review-ready"
              className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6"
            >
              <div className="flex items-start gap-3">
                <IconTile size="sm" icon={LuSparkles} tone="quiet" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-semibold text-[var(--color-ink)]">
                    {isEdit ? t("saveTitle") : t("reviewReadyHeading")}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--color-ink-2)]">
                    {isEdit ? t("publishDescription") : t("reviewReadyBody")}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-start gap-2 text-sm text-[var(--color-ink-2)]">
                <LuFileText
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-[var(--color-ink-3)]"
                />
                <p>
                  {audience.mode === "everyone"
                    ? t("reviewReadyNotifyEveryone")
                    : audience.employeeIds.length > 0
                      ? t("reviewReadyNotify", {
                        count: audience.employeeIds.length,
                      })
                      : t("reviewReadyNotifyNobody")}
                </p>
              </div>
            </section>
          </div>
        ) : null}
      </div>

      {/* ── Sticky wizard footer (hidden on the choose screen and while a
          document is being drafted: there is nothing to save or move on to) ── */}
      {!showEntryCards && creationMode !== 'upload' ? (
        <div className="fixed bottom-0 left-0 right-0 z-sticky flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 shadow-e2 sm:px-6">
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink-2)]">
            <StatusPill tone={published ? "ok" : "neutral"} withDot>
              {published ? t("statusPublished") : t("statusDraft")}
            </StatusPill>
            {dirty ? (
              <span className="text-[var(--color-warn-ink)]">{t("unsaved")}</span>
            ) : null}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {!isFirstStep ? (
              <Button
                type="button"
                variant="neutral"
                icon={LuArrowLeft}
                onClick={() => setStep(STEPS[stepIdx - 1].id)}
              >
                {t("wizardBack")}
              </Button>
            ) : (
              <Link href={`/${locale}/admin/library`}>
                <Button type="button" variant="ghost">
                  {t("cancel")}
                </Button>
              </Link>
            )}

            {/* When in edit mode for a published procedure, allow "Save changes" from intermediate steps */}
            {isEdit && published && !isLastStep ? (
              <Button
                type="button"
                variant="surface"
                disabled={pending || translating}
                onClick={() => save("published")}
              >
                {t("saveChanges")}
              </Button>
            ) : !published ? (
              <Button
                type="button"
                variant="surface"
                disabled={pending || translating}
                onClick={() => save("draft")}
              >
                {t("saveDraft")}
              </Button>
            ) : null}

            {isLastStep ? (
              <Button
                type="button"
                disabled={pending || translating}
                onClick={() => save("published")}
              >
                {published ? t("saveChanges") : t("publishNow")}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleNext}
              >
                {step === "quiz" && !hasQuizContent
                  ? t("wizardSkip")
                  : t("wizardNext")}
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {/* ── What a cook will see ─────────────────────────────────────── */}
      <Drawer
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={t("preview")}
        closeLabel={t("cancel")}
        size="lg"
      >
        <div className="space-y-4">
          <SegmentedControl
            label={t("language")}
            value={lang}
            onChange={(v) => setLang(v as "en" | "es")}
            segments={[
              { value: "en", label: "EN" },
              { value: "es", label: "ES" },
            ]}
          />
          {(() => {
            const { cover, rest } = splitCover(body.blocks);
            const headingTitle =
              (lang === "en" ? title.en || title.es : title.es || title.en) ||
              t("previewUntitled");
            const headingPurpose =
              lang === "en" ? purpose.en || purpose.es : purpose.es || purpose.en;
            const categoryLabel = category
              ? lang === "es"
                ? category.nameEs || category.nameEn
                : category.nameEn || category.nameEs
              : "Recipes";

            return (
              <div className="doc overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-xs">
                {cover ? <Cover src={cover.src} alt={cover.alt} /> : null}
                <div className="px-4 py-3 sm:px-6">
                  <DocHead
                    icon={subcategory?.slug ? `procedure-${subcategory.slug}` : "file-text"}
                    iconImageUrl={iconImageUrl}
                    category={categoryLabel}
                    title={headingTitle}
                    withCover={Boolean(cover)}
                  />
                  {headingPurpose ? <DocPurpose>{headingPurpose}</DocPurpose> : null}
                  {rest.length ? (
                    <BlockRenderer blocks={rest} locale={lang} />
                  ) : (
                    <p className="py-4 text-[var(--color-ink-3)]">{t("previewEmpty")}</p>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </Drawer>
    </div>
  );
}

function splitCover(blocks: ProcedureBlock[]): {
  cover?: { src: string; alt: string };
  rest: ProcedureBlock[];
} {
  const i = blocks.findIndex((b, idx) => b.kind === "image" && Boolean(b.src) && idx === 0);
  if (i === -1) return { rest: blocks };
  const b = blocks[i] as Extract<ProcedureBlock, { kind: "image" }>;
  return {
    cover: { src: b.src, alt: b.alt?.en || b.alt?.es || "" },
    rest: blocks.filter((_, n) => n !== i),
  };
}

/* ---------------------------------------------------------------- helpers -- */

