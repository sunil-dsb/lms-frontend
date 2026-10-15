'use client';

// Role-aware chrome: when the viewer is an admin the surrounding AdminShell
// (see /procedures/layout.tsx) already provides the sidebar + sticky top bar,
// so the page skips the employee `<TabBar>` and renders an inline "back"
// link above the article. Employees get the back control in the top bar
// (see EmployeeTopBarBackButton) and the bottom TabBar.
//
// `effectiveRole` and `viewAs` come from the server: they reflect the
// `?as=` query-param override on top of the real session role, so both
// chomes can be demoed without changing the seed session. See lib/view-as.

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { canRead, deleteProcedure, fetchQuizById, getCachedProcedure, getProcedureBySlug, getQuizById, logRestrictedView, logout, updateQuiz } from '@/lib/api';
import { PROCEDURES_QUERY_KEY } from '@/services/library/hooks';
import type { Employee, Procedure, ProcedureBlock } from '@/lib/types';
import { withAs, type ViewAs } from '@/lib/view-as';
import { ProcedureArticleBody } from '@/components/doc/procedure-article-body';
import { TabBar } from '@/components/employee/tab-bar';
import { CookBarAction } from '@/components/doc/cook-bar-action';
import { DocBar } from '@/components/doc';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { recordRecentView } from '@/lib/recent-views';
import { LuArrowLeft, LuArrowUpRight, LuCheck, LuCopy, LuEllipsisVertical, LuLogOut } from 'react-icons/lu';

interface ProcedureViewClientProps {
  slugOrId: string;
  initialProcedure: Procedure | null;
  employee: Employee;
  /** The role the page is rendering as — `?as=` override applied on top of
   *  the session role. Drives chrome (DocBar vs inline back) and back link. */
  effectiveRole: 'admin' | 'employee';
  /** The active view-as override, kept so the back link can carry it forward. */
  viewAs: ViewAs | null;
  locale: string;
  labels: {
    back: string;
    tabHome: string;
    tabProcedures: string;
    tabTraining: string;
    tabSoon: string;
    tabsNav: string;
  };
}

export function ProcedureViewClient({
  slugOrId,
  initialProcedure,
  employee,
  effectiveRole,
  viewAs,
  locale,
  labels,
}: ProcedureViewClientProps): React.ReactElement {
  // First paint comes from whatever list the reader came from: the
  // TanStack browse cache holds every procedure the library or browse
  // pages already fetched, so opening one is instant. The localStorage
  // store is the fallback (seeds/mock-created procedures live there).
  // `canRead` gates it exactly like the API would: a procedure the
  // viewer may not open must not appear from the cache either.
  const queryClient = useQueryClient();
  const cached = React.useMemo(
    () => {
      if (initialProcedure) return initialProcedure;
      const browse = queryClient.getQueryData<Procedure[]>([...PROCEDURES_QUERY_KEY, 'browse']);
      const hit = browse?.find((p) => p.id === slugOrId || p.slug === slugOrId);
      if (hit) return hit;

      const queries = queryClient.getQueriesData<{ procedures?: Procedure[] }>({
        queryKey: ['procedures', 'assigned'],
      });
      for (const [, qData] of queries) {
        const found = qData?.procedures?.find((p) => p.id === slugOrId || p.slug === slugOrId);
        if (found) return found;
      }

      return getCachedProcedure(slugOrId);
    },
    // Only the first paint matters — the mount refetch below takes over.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialProcedure, slugOrId, queryClient],
  );
  const [proc, setProc] = React.useState<Procedure | null>(
    () => (cached && canRead(cached, employee) ? cached : null),
  );
  const [isLoading, setIsLoading] = React.useState(!proc);
  const [notFoundState, setNotFoundState] = React.useState(false);

  const [bannerDismissed, setBannerDismissed] = React.useState(false);
  const [isAttaching, setIsAttaching] = React.useState(false);

  // Always refresh from the API once on mount — the cached copy is a
  // first paint, not the source of truth. A failed refresh only reads
  // as not-found when there was no cached copy to fall back to.
  React.useEffect(() => {
    let isMounted = true;
    async function loadProcedure() {
      try {
        const result = await getProcedureBySlug(slugOrId);
        if (isMounted && result.procedure) {
          setProc(result.procedure);
          setNotFoundState(false);
        }
      } catch {
        if (isMounted && !proc) {
          setNotFoundState(true);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadProcedure();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugOrId]);

  const [, setQuizTick] = React.useState(0);
  React.useEffect(() => {
    if (!proc?.quizId) return;
    let isMounted = true;
    fetchQuizById(proc.quizId).then(() => {
      if (isMounted) setQuizTick((n) => n + 1);
    });
    return () => {
      isMounted = false;
    };
  }, [proc?.quizId]);

  // Remembered on this device, so the home can offer the way back to it.
  React.useEffect(() => {
    if (!proc) return;
    const blocks = (proc?.bodyEn?.blocks?.length ?? 0) > 0 ? proc.bodyEn!.blocks : (proc?.bodyEs?.blocks ?? []);
    const img = blocks.find((b) => b.kind === 'image' && b.src);
    const sub = proc.subcategoryId
      ? proc.category?.subcategories?.find((s) => s.id === proc.subcategoryId) ?? undefined
      : undefined;
    recordRecentView({
      slug: proc.slug,
      titleEn: proc.titleEn,
      titleEs: proc.titleEs,
      cover: img && img.kind === 'image' ? img.src : undefined,
      subcategoryId: proc.subcategoryId ?? undefined,
      subcategory: sub ? { id: sub.id, slug: sub.slug } : undefined,
    });
    // Once per procedure opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proc?.id]);

  // A confidential or master recipe records who opened it, once per visit.
  const protectedId = proc && (proc.protection === 'confidential' || proc.protection === 'master') ? proc.id : null;
  React.useEffect(() => {
    if (protectedId && proc) logRestrictedView(proc, employee);
    // Once per procedure opened, not on every re-render of it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [protectedId, employee.id]);

  const handleAttach = React.useCallback(async () => {
    if (!proc || !proc.quizId) return;
    const quiz = getQuizById(proc.quizId);
    if (!quiz || quiz.attached) return;
    setIsAttaching(true);
    try {
      await updateQuiz(proc.quizId, { attached: true });
      setProc({ ...proc, updatedAt: new Date().toISOString() });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('lms_procedures_updated'));
      }
    } finally {
      setIsAttaching(false);
    }
  }, [proc]);

  // Back navigation: when the user navigates *forward* to a procedure
  // (e.g. from a category detail page), the previous URL is in
  // `document.referrer`. Returning via `router.back()` preserves scroll
  // position and any in-flight filter state on the source page.
  // Deep links (new tab, shared URL) have no referrer — fall back to
  // the role-specific landing.
  const router = useRouter();
  const fallbackHref = withAs(
    effectiveRole === 'admin' ? `/${locale}/admin/library` : `/${locale}/procedures`,
    viewAs,
  );
  const [hasReferrer, setHasReferrer] = React.useState(false);
  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    const ref = document.referrer;
    if (!ref) return;
    try {
      const url = new URL(ref);
      // Same-origin only — a foreign referrer (search engine, share link
      // opened externally) should not hijack the back button.
      if (url.origin === window.location.origin) setHasReferrer(true);
    } catch {
      // Malformed referrer — leave hasReferrer false and use the fallback.
    }
  }, []);
  const onBack = React.useCallback(() => {
    router.back();
  }, [router]);
  const backHref = fallbackHref;

  // Delete modal state — admin only (placed after router so the callback can use it)
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = React.useCallback(async () => {
    if (!proc) return;
    setIsDeleting(true);
    try {
      await deleteProcedure(proc.id);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('lms_procedures_updated'));
      }
      // Navigate away — the procedure no longer exists.
      router.push(`/${locale}/admin/library`);
      router.refresh();
    } catch {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  }, [proc, locale, router]);

  // Admins come in through the AdminShell (see /procedures/layout.tsx) which
  // already supplies the surrounding chrome (sidebar + sticky top bar). They
  // do not need the employee `<TabBar>`; padding matches the shell's main
  // column so the doc sits flush rather than reserving space for a bar that
  // isn't there.
  //
  // The admin branch sits on the bone canvas (--bg-admin, the same ground the
  // AdminShell paints behind every admin page) so the white
  // <article className="doc"> has something to lift off of. The employee
  // branch keeps --bg because the phone shell already runs edge-to-edge
  // white and the doc fills the viewport.
  const isAdmin = effectiveRole === 'admin';

  // The cook-mode CTA in the doc-bar belongs to the page's first recipe block.
  // The body is rendered by `<CookModeLauncher>` further down, but the
  // doc-bar lives here (page chrome), so it needs the block's id to read the
  // same localStorage slot the launcher writes to. Multiple recipes in one
  // procedure would each need their own slot — for now the first one owns
  // the doc-bar CTA; the rest show as side-thumbs only.
  const cookBlockId = React.useMemo<string | null>(() => {
    if (!proc) return null;
    const blocks = (proc?.bodyEn?.blocks?.length ?? 0) > 0 ? proc.bodyEn!.blocks : (proc?.bodyEs?.blocks ?? []);
    const recipe = blocks.find((b): b is Extract<ProcedureBlock, { kind: 'recipe' }> => b.kind === 'recipe');
    if (recipe) return recipe.id ?? `recipe-${recipe.factors?.length ?? 0}`;
    const hasMethod = blocks.some((b) => b.kind === 'method');
    if (hasMethod) return `steps-${proc.id}`;
    return null;
  }, [proc]);

  // ─── Hooks for the page-level menu (share-link + sign-out) ─────────────
  // These must sit alongside the other hook calls — the early returns
  // below (loading / not-found) run after this point, and React requires
  // every render to call the same hooks in the same order.
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const wrapperClass = isAdmin
    ? 'min-h-screen bg-[var(--color-bg)]'
    : 'min-h-screen bg-[var(--color-bg)] pb-20';
  // Loading / 404 use the same canvas as the loaded page so they don't flash
  // white while the procedure resolves.
  const stageClass = 'flex min-h-screen items-center justify-center bg-[var(--color-bg)]';
  const notFoundClass = 'flex min-h-screen flex-col items-center justify-center bg-[var(--color-bg)] p-6 text-center';

  if (isLoading) {
    return (
      <div className={wrapperClass} aria-hidden="true">
        {/* Doc skeleton — mirrors the real page frame (bar, head, cover,
            purpose, body blocks) so the swap to content is a fade, not a
            jump. Only on a cold open; cached opens skip this entirely. */}
        <div className="mx-auto w-full max-w-doc px-4 pt-4 sm:px-6">
          {/* Back bar */}
          <div className="flex items-center justify-between pb-4">
            <div className="animate-pulse h-5 w-24 rounded-[var(--radius-md)] bg-[var(--color-panel-2)]" />
            <div className="animate-pulse size-8 rounded-full bg-[var(--color-panel-2)]" />
          </div>

          <article className="space-y-6">
            {/* Head: title + meta + purpose */}
            <div className="space-y-3 pt-2">
              <div className="animate-pulse h-9 w-3/5 rounded-[var(--radius-md)] bg-[var(--color-panel-2)]" />
              <div className="flex items-center gap-2">
                <div className="animate-pulse h-4 w-28 rounded-[var(--radius-sm)] bg-[var(--color-panel-2)]" />
                <div className="animate-pulse h-4 w-16 rounded-[var(--radius-sm)] bg-[var(--color-panel-2)]" />
                <div className="animate-pulse h-4 w-36 rounded-[var(--radius-sm)] bg-[var(--color-panel-2)]" />
              </div>
              <div className="animate-pulse h-4 w-4/5 rounded-[var(--radius-sm)] bg-[var(--color-panel)]" />
              <div className="animate-pulse h-4 w-2/3 rounded-[var(--radius-sm)] bg-[var(--color-panel)]" />
            </div>

            {/* Cover */}
            <div className="animate-pulse aspect-[16/9] w-full rounded-[var(--radius-lg)] bg-[var(--color-panel-2)]" />

            {/* Body blocks */}
            <div className="space-y-4">
              <div className="animate-pulse h-6 w-40 rounded-[var(--radius-md)] bg-[var(--color-panel-2)]" />
              <div className="animate-pulse h-4 w-full rounded-[var(--radius-sm)] bg-[var(--color-panel)]" />
              <div className="animate-pulse h-4 w-11/12 rounded-[var(--radius-sm)] bg-[var(--color-panel)]" />
              <div className="animate-pulse h-4 w-4/5 rounded-[var(--radius-sm)] bg-[var(--color-panel)]" />
            </div>
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="animate-pulse size-6 shrink-0 rounded-full bg-[var(--color-panel-2)]" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="animate-pulse h-4 w-full rounded-[var(--radius-sm)] bg-[var(--color-panel)]" />
                    <div className="animate-pulse h-4 w-2/3 rounded-[var(--radius-sm)] bg-[var(--color-panel)]" />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>
    );
  }

  if (notFoundState || !proc) {
    return (
      <div className={notFoundClass}>
        <div className="mx-auto max-w-card space-y-4">
          {/* The same words whether it was deleted or is not this person's to
              read: a restricted document must not be known to exist. In the
              reader's language, and without the URL's slug. */}
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--color-ink)]">
            {locale === 'es' ? 'Este procedimiento no está disponible' : 'This procedure isn’t available'}
          </h1>
          <p className="text-base text-[var(--color-ink-2)]">
            {locale === 'es'
              ? 'Puede que se haya quitado o movido. Pregunta a tu gerente si lo necesitas.'
              : 'It may have been removed or moved. Ask your manager if you need it.'}
          </p>
          <div className="pt-4">
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--color-brand-600)] px-5 py-3 text-sm font-semibold text-white shadow-e1 hover:bg-[var(--color-brand-hover)]"
            >
              <LuArrowLeft aria-hidden="true" />
              {labels.back}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSignOut = async () => {
    await logout();
    window.location.href = `/${locale}/login`;
  };

  return (
    <div className={wrapperClass}>
      <ProcedureArticleBody
        proc={proc}
        employee={employee}
        effectiveRole={effectiveRole}
        locale={locale}
        onAttachQuiz={handleAttach}
        isAttaching={isAttaching}
        bannerDismissed={bannerDismissed}
        onDismissBanner={() => setBannerDismissed(true)}
        docBar={
          proc ? (
            <DocBar
              backHref={backHref}
              backLabel={labels.back}
              onBack={onBack}
              title={proc.titleEn || proc.titleEs || ''}
              category={proc.category?.nameEn || proc.category?.nameEs || ''}
              rightSlot={
                <div className="flex items-center gap-2">
                  {cookBlockId ? (
                    <CookBarAction
                      procedureId={proc.id}
                      recipeBlockId={cookBlockId}
                      locale={locale === 'es' ? 'es' : 'en'}
                    />
                  ) : null}
                  <ThemeToggle
                    labels={{
                      toDark: locale === 'es' ? 'Modo oscuro' : 'Dark mode',
                      toLight: locale === 'es' ? 'Modo claro' : 'Light mode',
                    }}
                  />
                  <div className="relative" ref={menuRef}>
                    <button
                      type="button"
                      onClick={() => setMenuOpen((o) => !o)}
                      className="btn btn-ghost btn-icon btn-lg"
                      aria-label="More options"
                      aria-haspopup="menu"
                      aria-expanded={menuOpen}
                    >
                      <LuEllipsisVertical aria-hidden="true" className="i" />
                    </button>
                    {menuOpen && (
                      <div
                        role="menu"
                        className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-2 shadow-e3 z-50 animate-in fade-in zoom-in-95 text-left"
                      >
                        <div className="px-3 py-2 border-b border-[var(--color-line)] mb-1">
                          <p className="text-xs text-[var(--color-ink-3)] font-medium">
                            {locale === 'es' ? 'Sesión iniciada como' : 'Signed in as'}
                          </p>
                          <p className="text-sm font-semibold text-[var(--color-ink)] truncate">
                            {employee.name}
                          </p>
                        </div>

                        <button
                          type="button"
                          role="menuitem"
                          onClick={handleCopyLink}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--color-ink-2)] hover:bg-[var(--color-panel)] hover:text-[var(--color-ink)] transition-colors"
                        >
                          {copied ? (
                            <>
                              <LuCheck aria-hidden="true" className="text-base text-[var(--color-good)]" />
                              <span>{locale === 'es' ? '¡Enlace copiado!' : 'Link copied!'}</span>
                            </>
                          ) : (
                            <>
                              <LuCopy aria-hidden="true" className="text-base" />
                              <span>{locale === 'es' ? 'Copiar enlace' : 'Copy link'}</span>
                            </>
                          )}
                        </button>

                        {employee.role === 'admin' || employee.accessLevel === 'manager' ? (
                          <Link
                            href={`/${locale}/admin`}
                            role="menuitem"
                            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--color-ink-2)] hover:bg-[var(--color-panel)] hover:text-[var(--color-ink)] transition-colors"
                          >
                            <LuArrowUpRight aria-hidden="true" className="text-base" />
                            <span>{locale === 'es' ? 'Administración' : 'Admin library'}</span>
                          </Link>
                        ) : null}

                        <button
                          type="button"
                          role="menuitem"
                          onClick={handleSignOut}
                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--color-bad)] hover:bg-[var(--color-bad-tint)] transition-colors mt-1 border-t border-[var(--color-line)] pt-2"
                        >
                          <LuLogOut aria-hidden="true" className="text-base" />
                          <span>{locale === 'es' ? 'Cerrar sesión' : 'Sign out'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              }
            />
          ) : null
        }
      />

      {isAdmin ? null : (
        <TabBar
          locale={locale}
          active="procedures"
          labels={{
            home: labels.tabHome,
            procedures: labels.tabProcedures,
            training: labels.tabTraining,
            soon: labels.tabSoon,
            nav: labels.tabsNav,
          }}
        />
      )}
    </div>
  );
}
