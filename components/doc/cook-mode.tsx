"use client";

import * as React from "react";
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCheckboxCircleLine,
  RiCheckLine,
  RiCloseLine,
  RiErrorWarningFill,
  RiFocus3Line,
  RiListCheck2,
  RiPlayFill,
  RiPriceTag3Line,
  RiTempColdLine,
  RiTimerLine,
} from "react-icons/ri";
import type { ProcedureMethodStep } from "@/lib/types";
import {
  TimerChip,
  fmtLeft,
  fmtLength,
  useNow,
  type Timer,
} from "./procedure-timers";
import { formatDiscardAt } from "./discard-time";
import { cn } from "@/lib/utils";
import {
  amountFor,
  BigMedia,
  CritLimitBlock,
  mediaFor,
  type StepMedia,
} from "./cook-mode-media";

/**
 * Cook mode: the method one step at a time, full screen, for the cook with a
 * knife in one hand. The overview is for reading the recipe; this is for making
 * it. Its photo is full width, its text is large, and the two buttons that
 * matter sit under the thumb.
 *
 *   - "Done, next" ticks the step (the same tick as the overview) and moves on,
 *     with a short buzz. A swipe or an arrow key only moves: looking ahead is
 *     not doing.
 *   - Under each step, the one after it, so the cook is ready for it: lime
 *     juice goes in straight after the mash, not after a hunt for it.
 *   - A step with a clock starts a timer that keeps running while the cook moves
 *     on. The soonest one is always in the header, and buzzes when it runs out.
 *   - "All steps" lists the method, ticks and all, so the cook can jump to any
 *     step without swiping through the ones between.
 *   - The screen stays on while this is open (Screen Wake Lock), so the phone
 *     does not lock with gloves on.
 *   - The critical step's button says what was checked, not just "Done".
 *   - The label step works out the discard time, so nobody adds 48 hours in
 *     their head.
 *   - Closing it returns to the overview at the step you were on.
 *
 * A native <dialog>, shown modal: it keeps focus inside and closes on Escape.
 * Screen 0 is the batch and the weigh-out; 1..N are the steps; LAST is the
 * summary. On a wide screen held sideways — a tablet on its stand — the photo
 * and the words sit side by side.
 *
 * Data-driven: a CookModeRecipe narrows a `recipe` block + the procedure title
 * to the fields the modal needs. Demo3 (which has its own STEPS / PHASES /
 * INGREDIENTS shape) adapts to this in a thin wrapper.
 */

export type CookModeIngredient = {
  /** Ingredient name in the cook's locale. */
  name: string;
  /** Per-factor amounts, indexed by `factors.indexOf(factor)`. */
  amounts: string[];
  /** Allergen flag — surfaces on the weigh-out list. */
  allergen?: boolean;
};

export type CookModeRecipe = {
  /** Procedure title in the active locale, used for the modal's accessible name. */
  title: string;
  /** Factors the cook can batch against (e.g. [1, 2, 4]). */
  factors: number[];
  /** Per-ingredient row used on the weigh-out screen. */
  ingredients: CookModeIngredient[];
  /** The recipe block's steps, in order. */
  steps: ProcedureMethodStep[];
  /** A unique block id used to namespace localStorage. */
  recipeBlockId: string;
};

export type CookModeLabels = {
  /** Sentence on the intro screen — "X steps, about Y minutes." The total count
   *  is replaced by the live `steps.length`. */
  introSub: (steps: number) => string;
  /** Title of the weigh-out section on the intro screen. */
  weighOut: string;
  /** Critical-step badge text. */
  critical: string;
  /** First-line label for the "what's next" peek-ahead. */
  upNext: (n: number) => string;
  /** Discard-time line. */
  discard: (when: string) => string;
  /** Coming-up phase eyebrow, used when the step is not critical and we have
   *  nothing else to say. */
  phaseFallback: string;
  /** Allergen pill on the weigh-out row. */
  allergen: string;
  /** Wake-lock reassurance. */
  wakeHint: string;
  /** "Start" / "Continue" button on the intro screen. */
  startBtn: (continueAt: number) => string;
  /** "Done, next" variants for the step footer. */
  done: { normal: string; critical: string; final: string; next: string };
  /** "Back to the recipe" on the summary screen. */
  backToRecipe: string;
  /** Tick-chip line — "X of N done" or "All done". */
  summaryHead: (done: number, total: number) => string;
  /** Summary screen sub-line — left steps or closing line. */
  summaryLeftSub: string;
  /** Summary screen sub-line — all done. */
  summaryAllDoneSub: string;
  /** "Back to step X" pill on the list view. */
  listBack: (where: string) => string;
  /** Where line shown in the modal header. */
  where: (view: "intro" | { n: number; total: number } | "summary") => string;
  /** Accessible label on the modal <dialog>. */
  modalAria: string;
  /** Close button aria-label. */
  closeAria: string;
  /** "All steps" toggle aria-label and pressed state. */
  listToggle: { label: (open: boolean) => string; ariaAll: string };
  /** "All steps" nav label. */
  listNavAria: string;
  /** Aria for the step toggle. */
  stepTick: (arg: { n: number; done: boolean }) => string;
};

const buzz = (pattern: number | number[]): void => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* no vibration on this device */
  }
};

/** Format an ingredient amount for the current factor, falling back to the
 *  first slot when factor index is out of range (defensive — should never
 *  happen with a sane factors/amounts pairing). */
export function CookMode({
  open,
  start,
  factor,
  onFactor,
  done,
  onDone,
  timers,
  onTimer,
  onClearTimer,
  recipe,
  locale,
  labels,
  onClose,
}: {
  open: boolean;
  start: number;
  factor: number;
  onFactor: (f: number) => void;
  done: boolean[];
  onDone: (n: number, value: boolean) => void;
  timers: Timer[];
  onTimer: (n: number) => void;
  onClearTimer: (n: number) => void;
  recipe: CookModeRecipe;
  locale: "en" | "es";
  labels: CookModeLabels;
  onClose: (at: number) => void;
}): React.ReactElement {
  const STEPS = recipe.steps;
  const N = STEPS.length;
  const LAST = N + 1;

  const ref = React.useRef<HTMLDialogElement>(null);
  const mainRef = React.useRef<HTMLDivElement>(null);
  const [i, setI] = React.useState(start);
  const [dir, setDir] = React.useState<"next" | "back" | null>(null);
  const [list, setList] = React.useState(false);
  const [canWake, setCanWake] = React.useState(false);
  const swipe = React.useRef<{ x: number; y: number } | null>(null);
  const radios = React.useRef<(HTMLButtonElement | null)[]>([]);
  const now = useNow(open && timers.length > 0);

  const factorIdx = Math.max(0, recipe.factors.indexOf(factor));

  /* --- open and close ----------------------------------------------------- */
  React.useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
    };
  }, [open]);

  React.useEffect(() => {
    if (!open || !("wakeLock" in navigator)) return;
    setCanWake(true);
    let lock: WakeLockSentinel | null = null;
    let alive = true;
    const hold = async (): Promise<void> => {
      if (document.visibilityState !== "visible") return;
      try {
        const got = await navigator.wakeLock.request("screen");
        if (alive) lock = got;
        else void got.release();
      } catch {
        /* low battery, or not allowed: the phone just behaves as usual */
      }
    };
    void hold();
    const onVisible = (): void => void hold();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => undefined);
    };
  }, [open]);

  /* --- moving ------------------------------------------------------------- */
  function go(to: number): void {
    const next = Math.max(0, Math.min(LAST, to));
    setDir(next > i ? "next" : next < i ? "back" : null);
    setI(next);
    setList(false);
  }

  function tick(n: number, value: boolean): void {
    onDone(n, value);
    if (value) buzz(12);
  }

  // Each screen starts at its top, and the next photo is fetched before it is needed.
  React.useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
    const m = mediaFor(STEPS[i] ?? ({} as ProcedureMethodStep), locale);
    if (!m) return;
    const srcs =
      m.kind === "compare"
        ? [m.ok.src, m.no.src]
        : m.kind === "gallery"
          ? m.photos.map((p) => p.src)
          : [m.src];
    srcs.forEach((s) => {
      if (!s) return;
      const img = new Image();
      img.src = s;
    });
  }, [i, STEPS, locale]);

  React.useEffect(() => {
    if (!list) return;
    mainRef.current
      ?.querySelector('[aria-current="step"]')
      ?.scrollIntoView({ block: "center" });
  }, [list]);

  // Reset to the caller's `start` whenever the modal opens. Without this, a
  // page that closes cook mode at step 5 and reopens with `start={9}` would
  // land the cook on step 5 again — the internal `i` survives open/close
  // because the dialog only hides, it doesn't unmount.
  React.useEffect(() => {
    if (open) setI(start);
  }, [open, start]);

  function close(): void {
    onClose(i >= 1 && i <= N ? i : i === LAST ? N : 0);
  }

  function onKey(e: React.KeyboardEvent): void {
    if (e.defaultPrevented || list) return;
    if (e.key === "ArrowRight") go(i + 1);
    else if (e.key === "ArrowLeft") go(i - 1);
    else return;
    e.preventDefault();
  }

  function onPointerDown(e: React.PointerEvent): void {
    if (e.pointerType === "mouse" || list) return;
    swipe.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerUp(e: React.PointerEvent): void {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    go(dx < 0 ? i + 1 : i - 1);
  }

  function onScalerKey(e: React.KeyboardEvent): void {
    const d = (
      { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<
        string,
        number
      >
    )[e.key];
    if (!d) return;
    e.preventDefault();
    const at = factorIdx;
    const next = (at + d + recipe.factors.length) % recipe.factors.length;
    onFactor(recipe.factors[next]!);
    radios.current[next]?.focus();
  }

  const doneCount = done.filter(Boolean).length;
  const step = i >= 1 && i <= N ? STEPS[i - 1]! : null;
  const firstOpen = done.findIndex((d) => !d) + 1;

  /* --- what is on the screen ---------------------------------------------- */
  let screen: React.ReactNode = null;
  let foot: React.ReactNode = null;

  if (list) {
    screen = (
      <nav className="cook-list" aria-label={labels.listNavAria}>
        <ol start={1}>
          {STEPS.map((s, k) => (
            <li key={k}>
              <button
                type="button"
                aria-current={k + 1 === i ? "step" : undefined}
                onClick={() => go(k + 1)}
              >
                <span
                  className={[
                    "step-num",
                    done[k] ? "is-on" : "",
                    s.critical ? "is-crit" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {done[k] ? null : k + 1}
                </span>
                <span className="cook-list-text">{s.body[locale]}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>
    );
    const where = step
      ? labels.listBack(`step ${step.body[locale].slice(0, 24)}`)
      : labels.listBack("the start");
    foot = (
      <button
        type="button"
        className="btn btn-secondary btn-lg cook-go"
        onClick={() => setList(false)}
      >
        {where}
      </button>
    );
  } else if (i === 0) {
    screen = (
      <div className="cook-pad cook-intro">
        <h2 className="cook-title">{recipe.title}</h2>
        <p className="cook-sub">{labels.introSub(N)}</p>

        <div className="scaler">
          <span className="lbl" id="cook-batch-lbl">
            Batch
          </span>
          <div
            className="choices"
            role="radiogroup"
            aria-labelledby="cook-batch-lbl"
            onKeyDown={onScalerKey}
          >
            {recipe.factors.map((f, k) => (
              <button
                key={f}
                ref={(el) => {
                  radios.current[k] = el;
                }}
                type="button"
                role="radio"
                aria-checked={factor === f}
                tabIndex={factor === f ? 0 : -1}
                onClick={() => onFactor(f)}
              >
                {f}&times;
              </button>
            ))}
          </div>
        </div>

        <h3 className="cook-h3">{labels.weighOut}</h3>
        <ul className="cook-weigh">
          {recipe.ingredients.map((ing, k) => (
            <li key={k}>
              <span>
                {ing.name}
                {ing.allergen ? (
                  <span className="flag">
                    <RiErrorWarningFill className="i i-sm" aria-hidden="true" />
                    {labels.allergen}
                  </span>
                ) : null}
              </span>
              <b className="qty">{amountFor(ing, factorIdx, recipe.factors)}</b>
            </li>
          ))}
        </ul>
        {canWake ? <p className="cook-hint">{labels.wakeHint}</p> : null}
      </div>
    );
    foot = (
      <button
        type="button"
        className="btn btn-primary btn-lg cook-go"
        onClick={() => go(doneCount > 0 && firstOpen > 0 ? firstOpen : 1)}
      >
        {doneCount > 0 && firstOpen > 0
          ? labels.startBtn(firstOpen)
          : labels.startBtn(0)}
        <RiArrowRightSLine className="i" aria-hidden="true" />
      </button>
    );
  } else if (step) {
    const isDone = done[i - 1] ?? false;
    const upNext = STEPS[i];
    const discard = step.discardAt
      ? formatDiscardAt(step.discardAtHours ?? 48)
      : null;
    const running = step.timer ? timers.find((t) => t.step === i) : undefined;
    const media = mediaFor(step, locale);
    const phase =
      step.phase?.[locale] || step.phase?.en || step.phase?.es || "";
    screen = (
      <div className={media ? "cook-step has-media" : "cook-step"}>
        {media ? <BigMedia media={media} /> : null}
        <div className="cook-pad">
          <div className="cook-stepline">
            <button
              type="button"
              className={["step-num", "step-check", isDone ? "is-on" : ""]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={isDone}
              aria-label={labels.stepTick({ n: i, done: isDone })}
              onClick={() => tick(i, !isDone)}
            >
              {isDone ? null : i}
            </button>
            {step.critical ? (
              <span className="step-flag">
                <RiFocus3Line className="i i-sm" aria-hidden="true" />
                {labels.critical}
              </span>
            ) : phase ? (
              <span className="cook-phase">
                <span className="cook-phase-n">{i}</span>
                <span className="cook-phase-sep" aria-hidden="true">
                  ·
                </span>
                <span className="cook-phase-name">{phase}</span>
              </span>
            ) : (
              <span className="cook-phase">{labels.phaseFallback}</span>
            )}
          </div>
          <p className="cook-line">{step.body[locale]}</p>
          {step.note ? (
            <p className="cook-note">{step.note.body[locale]}</p>
          ) : null}

          {step.timer ? (
            running ? (
              <div
                className="cook-timer"
                data-over={running.endsAt <= now || undefined}
              >
                <RiTimerLine className="i" aria-hidden="true" />
                <b>
                  {running.endsAt <= now
                    ? "Time is up"
                    : fmtLeft(running.endsAt - now)}
                </b>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => onClearTimer(i)}
                >
                  {running.endsAt <= now ? "Clear" : "Stop"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-secondary btn-lg cook-timer-start"
                onClick={() => onTimer(i)}
              >
                <RiTimerLine className="i" aria-hidden="true" />
                Start the {fmtLength(step.timer.seconds)} timer
              </button>
            )
          ) : null}

          {discard ? (
            <p className="cook-discard">
              <RiPriceTag3Line className="i" aria-hidden="true" />
              <span>{labels.discard(discard)}</span>
            </p>
          ) : null}

          {upNext ? (
            <div className="cook-next">
              <span className="cook-next-lbl">{labels.upNext(i + 1)}</span>
              <p>{upNext.body[locale]}</p>
            </div>
          ) : null}
        </div>
      </div>
    );
    const label = isDone
      ? labels.done.next
      : step.critical
        ? labels.done.critical
        : i === N
          ? labels.done.final
          : labels.done.normal;
    foot = (
      <>
        <button
          type="button"
          className="btn btn-secondary btn-lg btn-icon cook-back"
          aria-label="Previous step"
          onClick={() => go(i - 1)}
        >
          <RiArrowLeftSLine className="i" aria-hidden="true" />
        </button>
        <button
          type="button"
          className={
            step.critical && !isDone
              ? "btn btn-primary btn-lg cook-go is-crit"
              : "btn btn-primary btn-lg cook-go"
          }
          onClick={() => {
            if (!isDone) tick(i, true);
            go(i + 1);
          }}
        >
          {isDone ? null : <RiCheckLine className="i" aria-hidden="true" />}
          {label}
          {isDone ? (
            <RiArrowRightSLine className="i" aria-hidden="true" />
          ) : null}
        </button>
      </>
    );
  } else if (i === LAST) {
    const left: number[] = [];
    done.forEach((d, k) => {
      if (!d) left.push(k + 1);
    });
    screen = (
      <div className="cook-pad cook-end">
        <RiCheckboxCircleLine className="cook-end-mark" aria-hidden="true" />
        <h2 className="cook-title">{labels.summaryHead(N - left.length, N)}</h2>
        {left.length ? (
          <>
            <p className="cook-sub">{labels.summaryLeftSub}</p>
            <div className="cook-left">
              {left.map((n) => (
                <button
                  key={n}
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => go(n)}
                >
                  Step {n}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="cook-sub">{labels.summaryAllDoneSub}</p>
        )}
      </div>
    );
    foot = (
      <button
        type="button"
        className="btn btn-primary btn-lg cook-go"
        onClick={close}
      >
        {labels.backToRecipe}
      </button>
    );
  }

  const where = list
    ? labels.listBack("list")
    : step
      ? `Step ${i} of ${N}`
      : i === 0
        ? "Before you start"
        : "Finished";

  return (
    <dialog
      ref={ref}
      className="cook"
      aria-label={labels.modalAria}
      onCancel={(e) => {
        e.preventDefault();
        if (list) setList(false);
        else close();
      }}
      onKeyDown={onKey}
    >
      {open ? (
        <>
          <header className="cook-top">
            <button
              type="button"
              className="btn btn-ghost btn-icon btn-lg"
              aria-label={labels.closeAria}
              onClick={close}
            >
              <RiCloseLine className="i" aria-hidden="true" />
            </button>
            <div className="cook-where">
              <p aria-live="polite">
                <b>{where}</b>
                {timers.length ? null : (
                  <span>
                    {doneCount} of {N} done
                  </span>
                )}
              </p>
              <TimerChip
                timers={timers}
                now={now}
                onOpen={(n) => go(n)}
                onClear={onClearTimer}
              />
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-icon btn-lg"
              aria-label={
                list
                  ? labels.listToggle.label(true)
                  : labels.listToggle.label(false)
              }
              aria-pressed={list}
              onClick={() => setList((v) => !v)}
            >
              <RiListCheck2 className="i" aria-hidden="true" />
            </button>
            <span className="cook-bar" aria-hidden="true">
              <i style={{ width: `${(Math.min(i, N) / N) * 100}%` }} />
            </span>
          </header>
          <div
            ref={mainRef}
            className="cook-main"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={() => (swipe.current = null)}
          >
            <div
              key={list ? "list" : i}
              className="cook-screen"
              data-dir={list ? undefined : (dir ?? undefined)}
            >
              {screen}
            </div>
          </div>
          <footer className="cook-foot">{foot}</footer>
        </>
      ) : null}
    </dialog>
  );
}
