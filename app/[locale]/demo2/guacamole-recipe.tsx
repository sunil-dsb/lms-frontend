"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  RiAlertLine,
  RiArrowDownSLine,
  RiArrowLeftLine,
  RiArrowRightSLine,
  RiCommunityLine,
  RiErrorWarningFill,
  RiErrorWarningLine,
  RiFeedbackLine,
  RiFileList3Line,
  RiFocus3Line,
  RiKnifeLine,
  RiMore2Fill,
  RiRestaurantLine,
  RiTempColdLine,
  RiTimeLine,
  RiTimerLine,
} from "react-icons/ri";
import { DocBehaviour } from "@/components/doc/doc-behaviour";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  FACTORS,
  INGREDIENTS,
  PHASES,
  STEPS,
  fmt,
  scale,
  type Qty,
} from "./recipe-data";
import { StepStage } from "./step-stage";
import "./stage.css";

/**
 * The 23-step recipe with its pictures on one stage instead of beside every
 * step: a picture shows only while its step is the one being read.
 *
 * The step being read is the one whose top has passed a line a quarter of the
 * way down the reading area under the stage. Tapping a step makes it that one
 * straight away and brings it up under the stage; it stays chosen until the
 * cook really scrolls again, so a short step does not hand over to its
 * neighbour the moment it arrives.
 *
 * One column on every screen. A computer is mostly where the recipe is read
 * through before a shift, and a picture beside the words sends the eye across
 * the page and back for every step; above them, it is where the eye already is.
 * The page reads the same on a phone and a laptop, so nothing is learnt twice.
 *
 * DocBehaviour still does the bar's title and the rail. The current step it
 * leaves to this page, which knows where its reading line is.
 */

const N = STEPS.length;
/** How far the cook scrolls, after tapping a step, before scrolling takes over again. */
const HOLD_PX = 48;

function Warn({
  children,
  kind = "warn",
}: {
  children: React.ReactNode;
  kind?: "warn" | "allergen";
}): React.ReactElement {
  return (
    <div className={`note-block n-${kind}`}>
      <span className="ico">
        {kind === "allergen" ? (
          <RiErrorWarningFill className="i" aria-hidden="true" />
        ) : (
          <RiAlertLine className="i" aria-hidden="true" />
        )}
      </span>
      <div>
        <span className="label">
          {kind === "allergen" ? "Allergen" : "Warning"}
        </span>
        <p>{children}</p>
      </div>
    </div>
  );
}

function CritLimit(): React.ReactElement {
  return (
    <div className="crit">
      <h3 className="crit-h">
        <RiTempColdLine className="i i-sm" aria-hidden="true" />
        Critical limit
      </h3>
      <div className="crit-b">
        <p className="crit-num">4&nbsp;°C (39&nbsp;°F) or below</p>
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
              <RiErrorWarningLine className="i i-sm" aria-hidden="true" />
              If it is above 4&nbsp;°C
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

const barHeight = (): number =>
  document.querySelector(".doc-bar")?.getBoundingClientRect().height ?? 64;

/**
 * The step being read, from the scroll position, and a way to choose one.
 */
function useReadingStep(
  stageRef: React.RefObject<HTMLDivElement | null>,
): [number, (n: number) => void] {
  const [active, setActive] = React.useState(1);
  // A step the cook tapped: `y` is null while the page is still travelling to it.
  const hold = React.useRef<{ y: number | null } | null>(null);

  React.useEffect(() => {
    let raf = 0;
    let settle = 0;
    const update = (): void => {
      raf = 0;
      const h = hold.current;
      if (h) {
        if (h.y === null || Math.abs(window.scrollY - h.y) < HOLD_PX) return;
        hold.current = null;
      }
      const bar = barHeight();
      const top = Math.max(
        bar,
        stageRef.current?.getBoundingClientRect().bottom ?? bar,
      );
      let line = top + (window.innerHeight - top) * 0.25;
      // Near the foot of the page the last steps can never climb to the line, so
      // over the last half-screen of scrolling the line comes down to meet them.
      const below =
        document.documentElement.scrollHeight -
        (window.scrollY + window.innerHeight);
      const reach = window.innerHeight * 0.5;
      if (below < reach)
        line += (1 - below / reach) * (window.innerHeight - 24 - line);
      let current = 1;
      for (let n = 1; n <= N; n++) {
        const el = document.getElementById(`step-${n}`);
        if (el && el.getBoundingClientRect().top <= line) current = n;
      }
      setActive(current);
    };
    const onScroll = (): void => {
      if (!raf) raf = requestAnimationFrame(update);
      // The page has come to rest: a tapped step now holds from here.
      window.clearTimeout(settle);
      settle = window.setTimeout(() => {
        if (hold.current && hold.current.y === null)
          hold.current.y = window.scrollY;
      }, 140);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.clearTimeout(settle);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [stageRef]);

  const choose = React.useCallback(
    (n: number) => {
      setActive(n);
      const step = document.getElementById(`step-${n}`);
      if (!step) return;
      // The first step of a part comes up with its part's heading above it, so
      // the heading is read rather than sliced under the stage.
      const first = !step.previousElementSibling;
      const el =
        (first
          ? step.closest(".part")?.querySelector<HTMLElement>(".part-h")
          : null) ?? step;
      // Its top just under the stage, once the stage is stuck, clear of the fade.
      const stageH = stageRef.current?.getBoundingClientRect().height ?? 0;
      const target = Math.max(
        0,
        el.getBoundingClientRect().top +
          window.scrollY -
          (barHeight() + stageH + 24),
      );
      const from = window.scrollY;
      if (Math.abs(target - from) < 2) {
        hold.current = { y: from };
        return;
      }
      hold.current = { y: null };
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      window.scrollTo({ top: target, behavior: reduced ? "auto" : "smooth" });
      // At the foot of the page the scroll may stop short, or not start at all.
      window.setTimeout(() => {
        if (hold.current && hold.current.y === null)
          hold.current.y = window.scrollY;
      }, 1200);
    },
    [stageRef],
  );

  return [active, choose];
}

export function GuacamoleRecipe(): React.ReactElement {
  const tApp = useTranslations("app");
  const [factor, setFactor] = React.useState<number>(1);
  const radios = React.useRef<(HTMLButtonElement | null)[]>([]);
  const ctlRef = React.useRef<HTMLDetailsElement>(null);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const [active, choose] = useReadingStep(stageRef);

  const q: Qty = (k) => (
    <b className="qty">
      {scale(INGREDIENTS.find((i) => i.key === k)!.base, factor)}
    </b>
  );

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

  return (
    <main>
      <article className="doc">
        <DocBehaviour markCurrent={false} />

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

        <section className="doc-sec method" id="method">
          <h2>
            Method <span className="count">&middot; {N} steps</span>
          </h2>
          <p className="method-hint">
            The picture follows the step you are reading. Tap a step to see its
            picture; tap the picture to see it whole.
          </p>

          <div className="method-grid">
            <StepStage active={active} stageRef={stageRef} q={q} />

            <div className="method-steps">
              {PHASES.map((ph, k) => (
                <div className="part" key={ph.id}>
                  <h3 className="part-h">
                    <span>
                      Part {k + 1} of {PHASES.length}
                    </span>
                    {ph.name}
                  </h3>
                  {/* One list per part, numbered on from the last: step 5 is still step 5. */}
                  <ol
                    className="steps"
                    start={ph.from}
                    style={{ counterReset: `step ${ph.from - 1}` }}
                  >
                    {STEPS.filter((s) => s.n >= ph.from && s.n <= ph.to).map(
                      (s) => (
                        <li
                          key={s.n}
                          id={`step-${s.n}`}
                          className={[
                            "step",
                            s.crit ? "is-crit" : "",
                            active === s.n ? "is-now" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => choose(s.n)}
                        >
                          <button
                            type="button"
                            className="step-num step-show"
                            aria-current={active === s.n ? "step" : undefined}
                            aria-label={`Step ${s.n}${s.crit ? ", critical" : ""}: show its picture`}
                            onClick={(e) => {
                              e.stopPropagation();
                              choose(s.n);
                            }}
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
                            {s.note ? (
                              <p className="step-note">{s.note}</p>
                            ) : null}
                            {s.warn ? (
                              <Warn kind={s.warn.kind}>{s.warn.body}</Warn>
                            ) : null}
                            {s.crit ? <CritLimit /> : null}
                          </div>
                        </li>
                      ),
                    )}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        </section>

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
    </main>
  );
}
