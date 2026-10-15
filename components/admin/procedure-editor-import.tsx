'use client';

import * as React from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { toast } from '@/components/ui/toast';
import { emptyIngredient, emptyYieldItems, toEditorContent } from '@/lib/procedure-draft';
import type { BilingualValue } from '@/components/ui/bilingual-input';
import type { RecipeIngredientItem } from '@/components/admin/recipe-ingredients-editor';
import type { Procedure, ProcedureBlock, ProcedureYieldItem } from '@/lib/types';

interface ImportMessages {
  loaded: string;
  errorTitle: string;
  errorBody: string;
  fileTypeError: string;
  fileSizeError: string;
}
interface ProcedureImportDependencies {
  initial?: Procedure;
  setTitle: Dispatch<SetStateAction<BilingualValue>>;
  setPurpose: Dispatch<SetStateAction<BilingualValue>>;
  setBlocks: Dispatch<SetStateAction<ProcedureBlock[]>>;
  setIngredients: Dispatch<SetStateAction<RecipeIngredientItem[]>>;
  setYieldItems: Dispatch<SetStateAction<ProcedureYieldItem[]>>;
  setIconImageUrl: Dispatch<SetStateAction<string | null>>;
  setDirty: Dispatch<SetStateAction<boolean>>;
  messages: ImportMessages;
}

export function useProcedureImportFlow({
  initial, setTitle, setPurpose, setBlocks, setIngredients, setYieldItems,
  setIconImageUrl, setDirty, messages,
}: ProcedureImportDependencies) {
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
        toast.success(messages.loaded);
      } catch {
        if (!alive) return;
        setImportError(messages.errorTitle);
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
    if (!okType) return messages.fileTypeError;
    if (file.size > IMPORT_MAX_BYTES) return messages.fileSizeError;
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
      setImportError(messages.errorBody);
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

  return {
    creationMode, setCreationMode, importedId, setImportedId, importedSlug, setImportedSlug,
    importFile, setImportFile, importBannerFile, setImportBannerFile,
    importStep, setImportStep, importing, setImporting, importError, setImportError,
    importDragOver, setImportDragOver, importLoadingId, setImportLoadingId,
    importAbortRef, importInputRef, applyImportedProcedure, IMPORT_ACCEPT,
    startImport, cancelImport, runImport, importElapsed, setImportElapsed,
    formatFileSize, resetToChoiceScreen,
  };
}
