"use client";

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useTranslations } from "next-intl";
import {
  RiArrowDownSLine,
  RiArrowLeftLine,
  RiArrowRightSLine,
  RiCheckboxCircleFill,
  RiCommunityLine,
  RiErrorWarningFill,
  RiFeedbackLine,
  RiFileList3Line,
  RiFocus3Line,
  RiKnifeLine,
  RiMore2Fill,
  RiPlayFill,
  RiRestaurantLine,
  RiTempColdLine,
  RiTimeLine,
  RiTimerLine,
} from "react-icons/ri";
import { DocBehaviour } from "@/components/doc/doc-behaviour";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  CookMode,
  type CookModeIngredient,
  type CookModeLabels,
  type CookModeRecipe,
} from "@/components/doc/cook-mode";
import {
  TimerChip,
  useNow,
  type Timer,
} from "@/components/doc/procedure-timers";
import type { ProcedureMethodStep } from "@/lib/types";
import {
  FACTORS,
  FULL_VIDEO,
  IMG,
  INGREDIENTS,
  PHASES,
  STEPS,
  fmt,
  phaseOf,
  scale,
  type Media,
  type Qty,
  type RecipeStep,
} from "./recipe-data";

/**
 * /demo3's recipe at the length a real one will have: 23 steps, most with a
 * photo or a clip. Two views of the same steps, so the length stops mattering:
 *
 *   - The overview (this page) is for reading the recipe through. Every step is
 *     one line of the same shape: the number, which is the tick; the words; and
 *     the picture as a thumbnail. Safety stays in the line at full size -- the
 *     knife warning, the allergen, the critical limit -- because nothing about
 *     safety should wait behind a tap. The steps sit in four parts, so 23 reads
 *     as four fives rather than one long list.
 *   - Cook mode is for making it: one step per screen, the picture full size,
 *     and the reason for the step beside it. "Start cooking" opens it at the
 *     top, a thumbnail opens it at that step.
 *
 * The cook-mode modal is the shared `<CookMode>` from `components/doc/cook-mode`
 * — the same modal that powers the production recipe block — driven from this
 * page's bespoke `STEPS` shape via a thin adapter below.
 */

const STORE = "demo3-guacamole-progress";
const N = STEPS.length;

/* ── cook-mode adapter ────────────────────────────────────────────────────
 * The shared `<CookMode>` is data-driven on a `CookModeRecipe` —
 * `ProcedureMethodStep[]` + ingredient rows. Demo3's `STEPS` is bespoke
 * (function-as-text, a `Media` union, inline warns, no phases). We flatten
 * the bespoke shape once at module scope and pass the result in.
 */

import {
  adaptIngredients,
  adaptSteps,
  COOK_LABELS,
  mediaWord,
} from "./cook-mode-adapter";

function Thumb({
  media,
  label,
  onOpen,
}: {
  media: Media;
  label: string;
  onOpen: () => void;
}): React.ReactElement {
  if (media.kind === "compare") {
    return (
      <button
        type="button"
        className="step-thumb is-pair"
        aria-label={label}
        onClick={onOpen}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${IMG}/${media.ok.src}`} alt="" className="ok" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${IMG}/${media.no.src}`} alt="" className="no" />
      </button>
    );
  }
  return (
    <button
      type="button"
      className="step-thumb"
      aria-label={label}
      onClick={onOpen}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${IMG}/${media.src}`}
        alt={media.kind === "clip" ? "" : media.alt}
      />
      {media.kind === "clip" ? (
        <span className="badge">
          <RiPlayFill className="i i-sm" aria-hidden="true" />
          {media.at}
        </span>
      ) : null}
    </button>
  );
}

function Warn({
  kind,
  children,
}: {
  kind: "warn" | "allergen";
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="note-block" data-kind={kind}>
      <div className="ico">
        <RiErrorWarningFill className="i" aria-hidden="true" />
      </div>
      <div>
        <span className="label">{kind === "warn" ? "Safety" : "Allergen"}</span>
        <p>{children}</p>
      </div>
    </div>
  );
}

function CritLimit(): React.ReactElement {
  // Demo3's critical step (probe the pan before service) carries the same
  // shape as the production `<CriticalLimitFull>` block: a value, a how-to,
  // and a breach response. Mirroring the production markup so the document
  // reader and the cook-mode modal both render the same block — the cook
  // never sees a different answer to "what if it's above 4 °C" depending
  // on which surface they opened.
  return (
    <div className="crit">
      <h3 className="crit-h">
        <RiTempColdLine className="i i-sm" aria-hidden="true" />
        Critical limit
      </h3>
      <div className="crit-b">
        <p className="crit-num">4 °C (39 °F) or below</p>
        <p className="crit-sub">
          Into the walk-in within 30 minutes of finishing. Check before service.
        </p>
        <dl className="crit-parts">
          <div className="crit-part">
            <dt className="crit-lbl">How to check</dt>
            <dd>
              Probe the centre of the pan with a sanitised thermometer. Record
              on the Cold Holding Log.
            </dd>
          </div>
          <div className="crit-part breach">
            <dt className="crit-lbl">
              <RiErrorWarningFill className="i i-sm" aria-hidden="true" />
              If it is above 4 °C
            </dt>
            <dd>
              Discard. Guacamole is not reheated, so there is no way to bring it
              back. Tell the chef on duty.
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

/* ── page ───────────────────────────────────────────────────────────────── */

export function GuacamoleRecipe(): React.ReactElement {
  const tApp = useTranslations("app");
  const [factor, setFactor] = React.useState<number>(1);
  const [done, setDone] = React.useState<boolean[]>(() => Array(N).fill(false));
  const [at, setAt] = React.useState(0);
  const [cook, setCook] = React.useState({ open: false, start: 0 });
  const [timers, setTimers] = React.useState<Timer[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const buzzed = React.useRef(new Set<number>());
  const now = useNow(timers.length > 0);
  const radios = React.useRef<(HTMLButtonElement | null)[]>([]);
  const ctlRef = React.useRef<HTMLDetailsElement>(null);

  const q: Qty = (k) => (
    <b className="qty">
      {scale(INGREDIENTS.find((i) => i.key === k)!.base, factor)}
    </b>
  );

  // Where the cook was: the batch, every tick, and the step cook mode was on.
  React.useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) ?? "null") as {
        factor: number;
        steps: boolean[];
        at: number;
        timers?: Timer[];
      } | null;
      if (saved) {
        if ((FACTORS as readonly number[]).includes(saved.factor))
          setFactor(saved.factor);
        if (saved.steps?.length === N) setDone(saved.steps);
        if (Number.isInteger(saved.at) && saved.at >= 0 && saved.at <= N)
          setAt(saved.at);
        if (Array.isArray(saved.timers))
          setTimers(saved.timers.filter((t) => typeof t.endsAt === "number"));
      }
    } catch {
      /* private window: the page simply starts fresh */
    }
    setLoaded(true);
  }, []);
  React.useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(
        STORE,
        JSON.stringify({ factor, steps: done, at, timers }),
      );
    } catch {
      /* nothing to keep it in */
    }
  }, [loaded, factor, done, at, timers]);

  // Run out on a step already ticked, a timer has said what it had to: its red
  // chip goes after 15 seconds, so the header does not stay alarmed.
  React.useEffect(() => {
    if (timers.some((t) => t.endsAt + 15000 <= now && done[t.step - 1])) {
      setTimers((all) =>
        all.filter((t) => !(t.endsAt + 15000 <= now && done[t.step - 1])),
      );
    }
  }, [timers, now, done]);

  // A timer that runs out buzzes once, wherever the cook is on the page.
  React.useEffect(() => {
    timers.forEach((t) => {
      if (t.endsAt > now || buzzed.current.has(t.endsAt)) return;
      buzzed.current.add(t.endsAt);
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {
        /* no vibration on this device */
      }
    });
  }, [timers, now]);

  // Document control ships open, so the page prints its number and approval
  // even without JavaScript; collapsed for reading, opened again for print.
  React.useEffect(() => {
    const ctl = ctlRef.current;
    if (!ctl) return;
    ctl.open = false;
    let wasOpen = false;
    const before = (): void => {
      wasOpen = ctl.open;
      ctl.open = true;
    };
    const after = (): void => {
      ctl.open = wasOpen;
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  function onScalerKey(e: React.KeyboardEvent): void {
    const d = (
      { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<
        string,
        number
      >
    )[e.key];
    if (!d) return;
    e.preventDefault();
    const i = FACTORS.indexOf(factor as (typeof FACTORS)[number]);
    const next = (i + d + FACTORS.length) % FACTORS.length;
    setFactor(FACTORS[next]);
    radios.current[next]?.focus();
  }

  const setStep = (n: number, value: boolean): void =>
    setDone((s) => s.map((v, j) => (j === n - 1 ? value : v)));
  const startTimer = (n: number): void => {
    const t = STEPS[n - 1]!.timer;
    if (!t) return;
    setTimers((all) => [
      ...all.filter((x) => x.step !== n),
      { step: n, label: t.label, endsAt: Date.now() + t.seconds * 1000 },
    ]);
  };
  const clearTimer = (n: number): void =>
    setTimers((all) => all.filter((x) => x.step !== n));
  const openCook = (start: number): void => setCook({ open: true, start });
  const newBatch = (): void => {
    setDone(Array(N).fill(false));
    setAt(0);
  };

  // Back on the page at the step the cook was on, not at the button that opened it.
  function closeCook(where: number): void {
    setAt(where);
    setCook((c) => ({ ...c, open: false }));
    if (!where) return;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const li = document.getElementById(`step-${where}`);
        li?.scrollIntoView({ block: "center" });
        li?.querySelector<HTMLButtonElement>(".step-check")?.focus({
          preventScroll: true,
        });
      }),
    );
  }

  const doneCount = done.filter(Boolean).length;
  const allDone = doneCount === N;
  const resumeAt = !allDone && at >= 1 ? at : 0;
  const ctaLabel = resumeAt
    ? `Continue at step ${resumeAt}`
    : allDone
      ? "Start a new batch"
      : "Start cooking";
  const onCta = (): void => {
    if (allDone) newBatch();
    openCook(allDone ? 0 : resumeAt);
  };
  /** The one main action, in whichever bar this device shows. */
  const cookButton = (className: string): React.ReactElement => (
    <button
      type="button"
      className={`btn ${allDone ? "btn-secondary" : "btn-primary"} ${className}`}
      onClick={onCta}
    >
      {allDone ? null : <RiPlayFill className="i" aria-hidden="true" />}
      {ctaLabel}
    </button>
  );

  const recipe: CookModeRecipe = React.useMemo(
    () => ({
      title: "Guacamole Fresco",
      factors: [...FACTORS],
      ingredients: adaptIngredients(),
      steps: adaptSteps(),
      recipeBlockId: "demo3-guacamole",
    }),
    [],
  );

  return (
    <main>
      <article className="doc">
        <DocBehaviour />

        <div className="doc-bar" id="bar">
          <a
            className="btn btn-ghost btn-icon btn-lg"
            href="#"
            aria-label="Back to Recipes"
          >
            <RiArrowLeftLine className="i" aria-hidden="true" />
          </a>
          <div className="where">
            <b lang="es">Guacamole Fresco</b>
            <span>Recipes</span>
          </div>
          {/* The way in, on a tablet or a computer. */}
          <TimerChip
            timers={timers}
            now={now}
            onClear={clearTimer}
            onOpen={(n) => openCook(n)}
          />
          {cookButton("cook-bar-btn")}
          <ThemeToggle
            labels={{
              toDark: tApp("themeToDark"),
              toLight: tApp("themeToLight"),
            }}
          />
          <button
            className="btn btn-ghost btn-icon btn-lg"
            type="button"
            aria-label="More options"
          >
            <RiMore2Fill className="i" aria-hidden="true" />
          </button>
        </div>

        <header className="doc-head">
          <div className="doc-icon">
            <RiRestaurantLine className="i" aria-hidden="true" />
          </div>
          <div className="doc-crumb">Recipes</div>
          <h1 className="doc-title display" id="title">
            <span lang="es">Guacamole Fresco</span>
          </h1>
        </header>

        <div className="allergen" role="note">
          <RiErrorWarningFill className="i i-lg" aria-hidden="true" />
          <div>
            <b>Contains sesame</b>
            <p>
              In the finishing oil, step 17. Check the ticket before it leaves
              the pass.
            </p>
          </div>
        </div>

        <p className="doc-purpose">
          To make guacamole that holds its colour and texture through a full
          service.
        </p>

        <dl className="facts">
          <div>
            <dt>
              <RiCommunityLine className="i i-sm" aria-hidden="true" />
              Station
            </dt>
            <dd>Cold station</dd>
          </div>
          <div>
            <dt>
              <RiTimeLine className="i i-sm" aria-hidden="true" />
              Time
            </dt>
            <dd>35 min</dd>
          </div>
          <div>
            <dt>
              <RiTimerLine className="i i-sm" aria-hidden="true" />
              Keeps
            </dt>
            <dd>48 hours</dd>
          </div>
          <div>
            <dt>
              <RiKnifeLine className="i i-sm" aria-hidden="true" />
              You need
            </dt>
            <dd>Knife certification</dd>
          </div>
        </dl>

        {/* Where the cook is, under the facts, once there is anything to say.
            The button for it is in the bar. */}
        {resumeAt || allDone ? (
          <div className="cook-status" data-state={allDone ? "done" : "resume"}>
            <p className="cook-status-text">
              {allDone ? (
                <>
                  <b>
                    <RiCheckboxCircleFill className="i" aria-hidden="true" />
                    All {N} steps done
                  </b>
                  <span>The next batch starts again from step 1.</span>
                </>
              ) : (
                <>
                  <b>
                    {doneCount} of {N} steps done
                  </b>
                  <span>You stopped at step {resumeAt}.</span>
                </>
              )}
            </p>
            {resumeAt ? (
              <span className="cook-status-bar" aria-hidden="true">
                <i style={{ width: `${(doneCount / N) * 100}%` }} />
              </span>
            ) : null}
          </div>
        ) : null}

        <section className="doc-sec" id="yield">
          <h2>Yield</h2>
          <div className="scaler">
            <span className="lbl" id="batch-lbl">
              Batch
            </span>
            <div
              className="choices"
              role="radiogroup"
              aria-labelledby="batch-lbl"
              onKeyDown={onScalerKey}
            >
              {FACTORS.map((f, i) => (
                <button
                  key={f}
                  ref={(el) => {
                    radios.current[i] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={factor === f}
                  tabIndex={factor === f ? 0 : -1}
                  data-factor={f}
                  onClick={() => setFactor(f)}
                >
                  {f}&times;
                </button>
              ))}
            </div>
          </div>

          <dl className="yield">
            <div>
              <dt>Batch weight</dt>
              <dd>{fmt(2.4 * factor)} kg</dd>
            </div>
            <div>
              <dt>Portions</dt>
              <dd>{fmt(12 * factor)}</dd>
            </div>
            <div>
              <dt>Portion size</dt>
              <dd>200 g</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>35 min</dd>
            </div>
          </dl>

          <table className={factor === 1 ? "ing is-base" : "ing"}>
            <caption className="vh">
              Ingredients, at the base batch and at the selected batch size
            </caption>
            <thead>
              <tr>
                <th scope="col">Ingredient</th>
                <th scope="col" className="num">
                  1&times;
                </th>
                <th scope="col" className="num adj">
                  {factor}&times;
                </th>
              </tr>
            </thead>
            <tbody>
              {INGREDIENTS.map((ing) => (
                <tr key={ing.key}>
                  <th scope="row">
                    {ing.name}
                    {ing.allergen ? (
                      <>
                        {" "}
                        <span className="flag">
                          <RiErrorWarningFill
                            className="i i-sm"
                            aria-hidden="true"
                          />
                          Allergen
                        </span>
                      </>
                    ) : null}
                    {ing.form ? <span className="form">{ing.form}</span> : null}
                  </th>
                  <td className="num">{ing.base}</td>
                  <td className="num adj">{scale(ing.base, factor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="doc-sec" id="method">
          <h2>
            Method <span className="count">&middot; {N} steps</span>
          </h2>
          {doneCount > 0 ? (
            <p className="method-progress" role="status">
              <span>
                {doneCount} of {N} done
              </span>
              <button type="button" className="method-reset" onClick={newBatch}>
                Start a new batch
              </button>
            </p>
          ) : null}

          {/* The whole video, as one more line of the same shape. */}
          <div className="video-row">
            <button
              type="button"
              className="step-thumb"
              aria-label={`Play the whole recipe, ${FULL_VIDEO.len}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={FULL_VIDEO.src} alt="" loading="lazy" />
              <span className="badge">
                <RiPlayFill className="i i-sm" aria-hidden="true" />
                {FULL_VIDEO.len}
              </span>
            </button>
            <p>
              <b>The whole recipe on video</b>
              <span>
                Watch it once before you start. Each step&apos;s part plays on
                its own in cook mode.
              </span>
            </p>
          </div>
        </section>

        {PHASES.map((ph, k) => {
          const total = ph.to - ph.from + 1;
          const ticked = done.slice(ph.from - 1, ph.to).filter(Boolean).length;
          return (
            <section className="doc-sec phase" id={ph.id} key={ph.id}>
              <p className="phase-part">
                Part {k + 1} of {PHASES.length}
              </p>
              {/* How far through this part, once it is started. */}
              <h2>
                {ph.name}{" "}
                <span className="count">
                  &middot;{" "}
                  {ticked === total
                    ? "all done"
                    : ticked
                      ? `${ticked} of ${total} done`
                      : `${total} steps`}
                </span>
              </h2>
              {/* One list per part, numbered on from the last: step 5 is still step 5. */}
              <ol
                className="steps compact"
                start={ph.from}
                style={{ counterReset: `step ${ph.from - 1}` }}
              >
                {STEPS.filter((s) => s.n >= ph.from && s.n <= ph.to).map(
                  (s) => {
                    const isDone = done[s.n - 1];
                    return (
                      <li
                        key={s.n}
                        id={`step-${s.n}`}
                        className={[
                          "step",
                          s.crit ? "is-crit" : "",
                          isDone ? "is-done" : "",
                          s.media ? "has-media" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <button
                          type="button"
                          className="step-num step-check"
                          aria-pressed={isDone}
                          aria-label={`Step ${s.n}${s.crit ? ", critical" : ""}: ${isDone ? "done, tap to undo" : "mark done"}`}
                          onClick={() => setStep(s.n, !isDone)}
                        />
                        <div className="step-body">
                          {s.crit ? (
                            <span className="step-flag">
                              <RiFocus3Line
                                className="i i-sm"
                                aria-hidden="true"
                              />
                              Critical step
                            </span>
                          ) : null}
                          <p className="step-line">{s.text(q)}</p>
                        </div>
                        {s.media ? (
                          <Thumb
                            media={s.media}
                            label={`Step ${s.n}: open ${mediaWord(s.media)} in cook mode`}
                            onOpen={() => openCook(s.n)}
                          />
                        ) : null}
                        {s.warn || s.crit ? (
                          <div className="step-extra">
                            {s.warn ? (
                              <Warn kind={s.warn.kind}>{s.warn.body}</Warn>
                            ) : null}
                            {s.crit ? <CritLimit /> : null}
                          </div>
                        ) : null}
                      </li>
                    );
                  },
                )}
              </ol>
            </section>
          );
        })}

        <section className="doc-sec" id="related">
          <h2>Related procedures</h2>
          <div className="chapters">
            <a className="chapter" href="#related">
              <span className="idx">
                <RiFileList3Line className="i i-sm" aria-hidden="true" />
              </span>
              <div>
                <div className="title">Cooling and cold holding</div>
                <div className="meta">Food safety</div>
              </div>
              <span className="tail">
                <RiArrowRightSLine className="i" aria-hidden="true" />
              </span>
            </a>
            <a className="chapter" href="#related">
              <span className="idx">
                <RiFileList3Line className="i i-sm" aria-hidden="true" />
              </span>
              <div>
                <div className="title">Allergen handling</div>
                <div className="meta">Front of house</div>
              </div>
              <span className="tail">
                <RiArrowRightSLine className="i" aria-hidden="true" />
              </span>
            </a>
          </div>
        </section>

        <div className="doc-acts">
          <button className="btn btn-ghost btn-lg" type="button">
            <RiFeedbackLine className="i" aria-hidden="true" />
            Report a problem
          </button>
        </div>

        <details className="doc-ctl" id="ctl" open ref={ctlRef}>
          <summary>
            Document control
            <RiArrowDownSLine className="i" aria-hidden="true" />
          </summary>
          <dl>
            <dt>Document</dt>
            <dd>REC-014</dd>
            <dt>Version</dt>
            <dd>5</dd>
            <dt>Effective</dt>
            <dd>12 Aug 2026</dd>
            <dt>Supersedes</dt>
            <dd>Version 4, 2 Jun 2026</dd>
            <dt>Owner</dt>
            <dd>Chef Raúl Medina</dd>
            <dt>Approved by</dt>
            <dd>Chef Raúl Medina, 12 Aug 2026</dd>
            <dt>Next review</dt>
            <dd>12 Aug 2027</dd>
            <dt>Records kept</dt>
            <dd>Cold Holding Log, 1 year</dd>
          </dl>
        </details>
      </article>

      {/* The way in, on a phone: always there, under the thumb. */}
      <div className="cook-dock">
        <TimerChip
          timers={timers}
          now={now}
          onClear={clearTimer}
          onOpen={(n) => openCook(n)}
        />
        {cookButton("btn-lg")}
      </div>

      <CookMode
        open={cook.open}
        start={cook.start}
        factor={factor}
        onFactor={setFactor}
        done={done}
        onDone={setStep}
        timers={timers}
        onTimer={startTimer}
        onClearTimer={clearTimer}
        recipe={recipe}
        locale="en"
        labels={COOK_LABELS}
        onClose={closeCook}
      />
    </main>
  );
}
