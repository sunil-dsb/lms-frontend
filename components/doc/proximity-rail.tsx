"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

type Item = {
  id: string;
  kind: "section" | "step";
  n: number;
  critical: boolean;
  label: string;
};

/** How near, in px, the pointer has to be before a line starts to reach. */
const RADIUS = 40;
/** How far left of the lines the pointer counts as near them. */
const REACH = 48;
const SPRING = { stiffness: 320, damping: 34, mass: 0.7 };
const SIZE = {
  section: { base: 22, bump: 30 },
  step: { base: 12, bump: 22 },
} as const;

/** A step's instruction without its controls: the flag, the play chip, a photo. */
function stepText(step: HTMLElement): string {
  const body =
    step.querySelector(".step-body > p") ?? step.querySelector(".step-body");
  if (!body) return "";
  const copy = body.cloneNode(true) as HTMLElement;
  copy
    .querySelectorAll(
      "button, .step-time, .step-flag, figure, .shot, .note-block",
    )
    .forEach((el) => el.remove());
  return (copy.textContent ?? "").replace(/\s+/g, " ").trim();
}

export function ProximityRail(): React.ReactElement | null {
  const t = useTranslations("employee.doc.rail");
  const [items, setItems] = React.useState<Item[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  // Kept after it hides, so the chip fades out with its words rather than empty.
  const [near, setNear] = React.useState<{
    id: string;
    y: number;
    label: string;
    on: boolean;
  } | null>(null);
  const hide = React.useCallback(
    () => setNear((p) => (p?.on ? { ...p, on: false } : p)),
    [],
  );
  const listRef = React.useRef<HTMLDivElement>(null);
  const lines = React.useRef(new Map<string, HTMLSpanElement>());
  const rows = React.useRef(new Map<string, HTMLButtonElement>());
  const pointerY = React.useRef(Number.POSITIVE_INFINITY);
  const physics = React.useRef(new Map<string, { x: number; v: number }>());
  const frame = React.useRef(0);

  /** What the item says now, read from the page. */
  const labelOf = React.useCallback(
    (it: Pick<Item, "id" | "kind" | "n" | "critical">): string => {
      const el = document.getElementById(it.id);
      if (!el) return "";
      if (it.kind === "section") {
        const h2 = el.querySelector("h2");
        // The heading's own words, not its "· 11 steps" count.
        return (h2?.childNodes[0]?.textContent ?? h2?.textContent ?? "").trim();
      }
      const head = it.critical
        ? t("critical", { n: it.n })
        : t("step", { n: it.n });
      const text = stepText(el);
      return text ? `${head} · ${text}` : head;
    },
    [t],
  );

  /* --- what is on the page ----------------------------------------------- */
  React.useEffect(() => {
    const doc = document.querySelector(".doc");
    if (!doc) return;
    const found: Omit<Item, "label">[] = [];
    let stepCount = 0;
    doc.querySelectorAll<HTMLElement>(".doc-sec").forEach((sec, i) => {
      if (sec.querySelector("h2")) {
        if (!sec.id) sec.id = `section-${i + 1}`;
        found.push({ id: sec.id, kind: "section", n: i + 1, critical: false });
      }
      // Numbered as the page numbers them: within their own list, from its
      // start, so a method split into parts goes on counting.
      sec
        .querySelectorAll<HTMLOListElement>(".steps:not(.prep)")
        .forEach((list) => {
          const first = Number(list.getAttribute("start")) || 1;
          list
            .querySelectorAll<HTMLElement>(":scope > .step")
            .forEach((step, n) => {
              stepCount += 1;
              const uniqueStepId = `step-${stepCount}`;
              step.id = uniqueStepId;
              found.push({
                id: uniqueStepId,
                kind: "step",
                n: first + n,
                critical: step.classList.contains("is-crit"),
              });
            });
        });
    });
    // One line is not a map.
    setItems(
      found.length > 1
        ? found.map((it) => ({ ...it, label: labelOf(it) }))
        : [],
    );
  }, [labelOf]);

  /* --- which one you are reading ----------------------------------------- */
  React.useEffect(() => {
    if (!items.length) return;
    let raf = 0;
    const update = (): void => {
      raf = 0;
      const anchor = window.innerHeight * 0.4;
      let current = items[0]!.id;
      for (const it of items) {
        const el = document.getElementById(it.id);
        if (el && el.getBoundingClientRect().top <= anchor) current = it.id;
      }
      setActiveId(current);
    };
    const schedule = (): void => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [items]);

  /* --- the spring --------------------------------------------------------- */
  const kick = React.useCallback(() => {
    if (frame.current) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let last = performance.now();
    const tick = (now: number): void => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      let moving = false;
      for (const it of items) {
        const row = rows.current.get(it.id);
        const line = lines.current.get(it.id);
        if (!row || !line) continue;
        const { base, bump } = SIZE[it.kind];
        const r = row.getBoundingClientRect();
        const d = Math.abs(pointerY.current - (r.top + r.height / 2));
        const target = base + bump * Math.max(0, 1 - d / RADIUS);
        const s = physics.current.get(it.id) ?? { x: base, v: 0 };
        if (reduced) {
          s.x = target;
          s.v = 0;
        } else {
          const a =
            (-SPRING.stiffness * (s.x - target) - SPRING.damping * s.v) /
            SPRING.mass;
          s.v += a * dt;
          s.x += s.v * dt;
          if (Math.abs(s.x - target) > 0.05 || Math.abs(s.v) > 0.05)
            moving = true;
          else s.x = target;
        }
        physics.current.set(it.id, s);
        line.style.width = `${s.x}px`;
      }
      frame.current = moving ? requestAnimationFrame(tick) : 0;
    };
    frame.current = requestAnimationFrame(tick);
  }, [items]);

  React.useEffect(() => () => cancelAnimationFrame(frame.current), []);

  /* --- the pointer -------------------------------------------------------- */
  React.useEffect(() => {
    if (!items.length) return;
    const leave = (): void => {
      if (pointerY.current === Number.POSITIVE_INFINITY) return;
      pointerY.current = Number.POSITIVE_INFINITY;
      hide();
      kick();
    };
    const move = (e: PointerEvent): void => {
      if (e.pointerType === "touch") return;
      const list = listRef.current;
      const box = list?.getBoundingClientRect();
      // Hidden below the wide breakpoint: no box, nothing to reach.
      const inside =
        box &&
        box.width > 0 &&
        e.clientX >= box.left - REACH &&
        e.clientX <= box.right + 8 &&
        e.clientY >= box.top - RADIUS &&
        e.clientY <= box.bottom + RADIUS;
      if (!inside || !box) return leave();
      pointerY.current = e.clientY;
      // The chip follows the nearest line, as long as it is within reach.
      let best: { it: Item; y: number; d: number } | null = null;
      for (const it of items) {
        const row = rows.current.get(it.id);
        if (!row) continue;
        const r = row.getBoundingClientRect();
        const y = r.top + r.height / 2;
        const d = Math.abs(e.clientY - y);
        if (d < RADIUS && (!best || d < best.d)) best = { it, y, d };
      }
      const hit = best;
      if (!hit) hide();
      else
        setNear((p) =>
          p?.on && p.id === hit.it.id
            ? p
            : {
                id: hit.it.id,
                y: hit.y - box.top,
                label: labelOf(hit.it),
                on: true,
              },
        );
      kick();
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("mouseleave", leave);
    window.addEventListener("blur", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("mouseleave", leave);
      window.removeEventListener("blur", leave);
    };
  }, [items, kick, labelOf, hide]);

  function go(id: string): void {
    const el = document.getElementById(id);
    if (!el) return;
    const bar =
      document.querySelector(".doc-bar")?.getBoundingClientRect().height ?? 64;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - bar - 16,
      behavior: reduced ? "auto" : "smooth",
    });
    setActiveId(id);
  }

  if (!items.length) return null;
  const nearItem = near ? items.find((i) => i.id === near.id) : null;

  return (
    <nav aria-label={t("nav")} className="proxrail">
      <div ref={listRef} className="proxrail-list">
        {items.map((it, idx) => (
          <button
            key={`${it.id}-${idx}`}
            ref={(el) => {
              if (el) rows.current.set(it.id, el);
              else rows.current.delete(it.id);
            }}
            type="button"
            className="proxrail-row"
            data-kind={it.kind}
            data-critical={it.critical || undefined}
            aria-current={activeId === it.id ? "location" : undefined}
            aria-label={it.label}
            onClick={() => go(it.id)}
            onFocus={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const top = listRef.current?.getBoundingClientRect().top ?? 0;
              setNear({
                id: it.id,
                y: r.top + r.height / 2 - top,
                label: labelOf(it),
                on: true,
              });
            }}
            onBlur={hide}
          >
            <span
              ref={(el) => {
                if (el) lines.current.set(it.id, el);
                else lines.current.delete(it.id);
              }}
              className="proxrail-line"
              style={{ width: SIZE[it.kind].base }}
            />
          </button>
        ))}
        {/* The nearest line's name, in the chip the step rail used. */}
        <span
          aria-hidden="true"
          className="proxrail-label"
          data-critical={nearItem?.critical || undefined}
          data-on={near?.on ? "" : undefined}
          style={{ top: near?.y ?? 0 }}
        >
          {near?.label}
        </span>
      </div>
    </nav>
  );
}
