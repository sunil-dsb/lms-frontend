"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LuSearch, LuFileText, LuUser } from "react-icons/lu";
import { listEmployees, listProcedures } from "@/lib/api";
import { fold } from "@/lib/utils";
import type { AdminEmployee, Procedure } from "@/lib/types";

type Hit =
  | { kind: "procedure"; id: string; title: string; meta: string; href: string }
  | { kind: "person"; id: string; title: string; meta: string; href: string };

const MAX_PER_GROUP = 4;

export function AdminSearch({
  locale,
  labels,
}: {
  locale: string;
  labels: {
    label: string;
    placeholder: string;
    procedures: string;
    people: string;
    empty: string;
    hint: string;
    results: (n: number) => string;
  };
}): React.ReactElement {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const [data, setData] = React.useState<{
    procedures: Procedure[];
    people: AdminEmployee[];
  } | null>(null);
  const loading = React.useRef(false);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(() => {
    if (data || loading.current) return;
    loading.current = true;
    void Promise.all([listProcedures({}), listEmployees({})])
      .then(([p, e]) =>
        setData({ procedures: p.procedures, people: e.employees }),
      )
      // A failed fetch leaves the field a plain field: it still submits, and the
      // pages it submits to do their own filtering.
      .catch(() => setData({ procedures: [], people: [] }));
  }, [data]);

  // "/" focuses the field, the way every library search does — but not while the
  // manager is typing into something else.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable)
      )
        return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    const onDown = (e: MouseEvent): void => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const hits = React.useMemo<{ procedures: Hit[]; people: Hit[] }>(() => {
    const needle = fold(query.trim());
    if (needle.length < 2 || !data) return { procedures: [], people: [] };

    const titleOf = (p: Procedure): string =>
      locale === "es" ? p.titleEs || p.titleEn : p.titleEn || p.titleEs;

    const procedures: Hit[] = data.procedures
      .filter((p) => fold(`${titleOf(p)} ${p.slug}`).includes(needle))
      .slice(0, MAX_PER_GROUP)
      .map((p) => ({
        kind: "procedure",
        id: p.id,
        title: titleOf(p),
        meta: p.category
          ? locale === "es"
            ? p.category.nameEs || p.category.nameEn
            : p.category.nameEn || p.category.nameEs
          : "",
        href: `/${locale}/procedures/${p.slug}`,
      }));

    const people: Hit[] = data.people
      .filter((e) => fold(`${e.name} ${e.employeeCode ?? ""}`).includes(needle))
      .slice(0, MAX_PER_GROUP)
      .map((e) => ({
        kind: "person",
        id: e.id,
        title: e.name,
        meta: e.employeeCode ?? "",
        // There is no page for one person yet, so a hit opens the list filtered
        // to them rather than pretending to open a profile.
        href: `/${locale}/admin/employees?q=${encodeURIComponent(e.name)}`,
      }));

    return { procedures, people };
  }, [query, data, locale]);

  const flat = [...hits.procedures, ...hits.people];
  const showPanel = open && query.trim().length >= 2;

  const go = (hit: Hit): void => {
    setOpen(false);
    setQuery("");
    router.push(hit.href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Escape") {
      // First Escape clears what was typed, second one leaves the field. Clearing
      // is the thing wanted nine times out of ten, and the OS clear button is
      // hidden, so this is how the field is emptied.
      if (query) {
        setQuery("");
        setActive(0);
        return;
      }
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (flat.length === 0) return;
      e.preventDefault();
      setActive((i) =>
        e.key === "ArrowDown"
          ? (i + 1) % flat.length
          : (i - 1 + flat.length) % flat.length,
      );
      return;
    }
    if (e.key === "Enter") {
      const hit = flat[active] ?? flat[0];
      if (hit) {
        e.preventDefault();
        go(hit);
      }
    }
  };

  const optionId = (index: number): string => `admin-find-opt-${index}`;

  const row = (hit: Hit, index: number): React.ReactElement => (
    // The wrappers are presentation: a listbox owns options, and an li that is
    // neither makes the tree announce as a list of nothing.
    <li key={`${hit.kind}-${hit.id}`} role="presentation">
      <button
        type="button"
        id={optionId(index)}
        role="option"
        aria-selected={index === active}
        onMouseEnter={() => setActive(index)}
        onClick={() => go(hit)}
        className="hit"
      >
        {hit.kind === "procedure" ? (
          <LuFileText aria-hidden="true" className="i" />
        ) : (
          <LuUser aria-hidden="true" className="i" />
        )}
        <span className="min-w-0 flex-1">
          <b>{hit.title}</b>
          {hit.meta ? <span>{hit.meta}</span> : null}
        </span>
      </button>
    </li>
  );

  return (
    <div ref={boxRef} className="find" role="search">
      <LuSearch aria-hidden="true" className="i" />
      <label className="sr-only" htmlFor="admin-find">
        {labels.label}
      </label>
      <input
        id="admin-find"
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="admin-find-results"
        aria-activedescendant={
          showPanel && flat.length > 0 ? optionId(active) : undefined
        }
        aria-autocomplete="list"
        autoComplete="off"
        value={query}
        placeholder={labels.placeholder}
        onFocus={() => {
          load();
          setOpen(true);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      {/* The shortcut, while there is room and nothing typed. */}
      {query ? null : (
        <kbd className="hidden xl:block" title={labels.hint}>
          /
        </kbd>
      )}

      {showPanel ? (
        <div className="find-results">
          {/* The listbox is always here, empty or not: aria-controls on the field
              points at it, and a reference that dangles on the empty state is a
              field that appears to control nothing. */}
          <ul id="admin-find-results" role="listbox" aria-label={labels.label}>
            {hits.procedures.length > 0 ? (
              <li role="group" aria-label={labels.procedures}>
                <p className="grp">{labels.procedures}</p>
                <ul role="presentation">
                  {hits.procedures.map((h, i) => row(h, i))}
                </ul>
              </li>
            ) : null}
            {hits.people.length > 0 ? (
              <li role="group" aria-label={labels.people}>
                <p className="grp">{labels.people}</p>
                <ul role="presentation">
                  {hits.people.map((h, i) =>
                    row(h, hits.procedures.length + i),
                  )}
                </ul>
              </li>
            ) : null}
          </ul>
          {flat.length === 0 ? <p className="none">{labels.empty}</p> : null}
          {/* Said, not only shown: how many answers there are. */}
          <p className="sr-only" aria-live="polite">
            {flat.length === 0 ? labels.empty : labels.results(flat.length)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
