"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  RiAlertLine,
  RiArrowDownSLine,
  RiArrowLeftLine,
  RiArrowRightSLine,
  RiCheckLine,
  RiCloseLine,
  RiCommunityLine,
  RiErrorWarningFill,
  RiErrorWarningLine,
  RiFeedbackLine,
  RiFileList3Line,
  RiFocus3Line,
  RiKnifeLine,
  RiMore2Fill,
  RiPlayFill,
  RiQrCodeLine,
  RiRestaurantLine,
  RiTempColdLine,
  RiTimeLine,
  RiTimerLine,
} from "react-icons/ri";
import { DocBehaviour } from "@/components/doc/doc-behaviour";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import "./recipe.css";

/**
 * The recipe template, "Guacamole Fresco", reworked for someone making it for
 * the first time, phone in one hand and a knife in the other.
 *
 * Started as a copy of /sop-recipe-format.html (same markup and classes, so
 * app/lms.css draws it), then changed where following along was hard:
 *
 *   - Every step that uses an ingredient says how much, at the batch chosen.
 *     The cook no longer scrolls four screens back to the table with gloves on.
 *   - The batch opens at 1x. It opened at 2x, and a cook who did not notice
 *     made a double batch.
 *   - The method's steps tick off, like the prep list, and the ticks survive a
 *     reload: a ticket comes in, the cook comes back, and the page says where
 *     they were.
 *   - The label step says the discard time, where the label is written.
 *   - The facts are the cook's (station, time, how long it keeps, what you need)
 *     rather than the document's owner and review dates, which stay in document
 *     control. "Who this is for" and the equipment line folded into them and into
 *     the prep list; the step-2 warning is said once, at step 2; each step's
 *     video moment sits beside the step instead of under it.
 *
 * DocBehaviour adds the bar's title on scroll, the step you are on, and the
 * proximity rail. /demo2 keeps its own copy, in the original shape.
 */

const IMG = "/demo/guacamole";
const STORE = "demo1-guacamole-progress";

type IngredientKey =
  "avocado" | "lime" | "onion" | "cilantro" | "serrano" | "salt" | "sesame";

const INGREDIENTS: {
  key: IngredientKey;
  name: string;
  form?: string;
  base: string;
  allergen?: boolean;
}[] = [
  {
    key: "avocado",
    name: "Avocado, Hass",
    form: "Whole fruit, about 2 kg of flesh. Ripe: gives slightly at the neck",
    base: "2.8 kg",
  },
  { key: "lime", name: "Lime juice", form: "Fresh, strained", base: "100 ml" },
  {
    key: "onion",
    name: "White onion",
    form: "Small dice, 5 mm",
    base: "200 g",
  },
  {
    key: "cilantro",
    name: "Cilantro",
    form: "Leaves and fine stem, chopped",
    base: "30 g",
  },
  {
    key: "serrano",
    name: "Serrano chilli",
    form: "Seeded, minced",
    base: "20 g",
  },
  { key: "salt", name: "Salt, kosher", base: "20 g" },
  {
    key: "sesame",
    name: "Sesame finishing oil",
    base: "15 ml",
    allergen: true,
  },
];

const FACTORS = [1, 2, 4] as const;
const PREP_COUNT = 4;
const METHOD_COUNT = 11;

/** Two decimals is finer than any kitchen scale; no trailing zeros. */
const fmt = (n: number): string => String(Math.round(n * 100) / 100);
function scale(amount: string, f: number): string {
  const m = /^([0-9.]+)\s*(.*)$/.exec(amount.trim());
  return m ? fmt(parseFloat(m[1]) * f) + (m[2] ? ` ${m[2]}` : "") : amount;
}

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

function Shot({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption?: string;
}): React.ReactElement {
  return (
    <figure className="shot">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${IMG}/${src}`}
        width={1200}
        height={900}
        loading="lazy"
        alt={alt}
      />
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

/** One method step. The number is the tick; the video moment sits beside the text. */
function Step({
  n,
  watch,
  text,
  crit,
  done,
  onToggle,
  children,
}: {
  n: number;
  watch: string;
  text: React.ReactNode;
  crit?: boolean;
  done: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}): React.ReactElement {
  return (
    <li
      className={["step", crit ? "is-crit" : "", done ? "is-done" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className="step-num step-check"
        aria-pressed={done}
        aria-label={`Step ${n}${crit ? ", critical" : ""}: ${done ? "done, tap to undo" : "mark done"}`}
        onClick={onToggle}
      />
      <div className="step-body">
        {crit ? (
          <span className="step-flag">
            <RiFocus3Line className="i i-sm" aria-hidden="true" />
            Critical step
          </span>
        ) : null}
        <p className="step-line">
          {text}
          <button
            className="step-play"
            type="button"
            aria-label={`Watch step ${n} in the video, at ${watch}`}
          >
            <RiPlayFill className="i i-sm" aria-hidden="true" />
            {watch}
          </button>
        </p>
        {children}
      </div>
    </li>
  );
}

export function GuacamoleRecipe(): React.ReactElement {
  const tApp = useTranslations("app");
  const [factor, setFactor] = React.useState<number>(1);
  const [prepDone, setPrepDone] = React.useState<boolean[]>(() =>
    Array(PREP_COUNT).fill(false),
  );
  const [stepDone, setStepDone] = React.useState<boolean[]>(() =>
    Array(METHOD_COUNT).fill(false),
  );
  const [loaded, setLoaded] = React.useState(false);
  const radios = React.useRef<(HTMLButtonElement | null)[]>([]);
  const ctlRef = React.useRef<HTMLDetailsElement>(null);

  /** An ingredient's amount at the chosen batch, as the step says it. */
  const q = (k: IngredientKey): React.ReactElement => (
    <b className="qty">
      {scale(INGREDIENTS.find((i) => i.key === k)!.base, factor)}
    </b>
  );

  // Where the cook was: the batch and every tick, kept on this device.
  React.useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) ?? "null") as {
        factor: number;
        prep: boolean[];
        steps: boolean[];
      } | null;
      if (saved) {
        if ((FACTORS as readonly number[]).includes(saved.factor))
          setFactor(saved.factor);
        if (saved.prep?.length === PREP_COUNT) setPrepDone(saved.prep);
        if (saved.steps?.length === METHOD_COUNT) setStepDone(saved.steps);
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
        JSON.stringify({ factor, prep: prepDone, steps: stepDone }),
      );
    } catch {
      /* nothing to keep it in */
    }
  }, [loaded, factor, prepDone, stepDone]);

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

  // One stop in the tab order, arrow keys between the options.
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

  const doneCount = stepDone.filter(Boolean).length;
  const step = (n: number): { done: boolean; onToggle: () => void } => ({
    done: stepDone[n - 1],
    onToggle: () => setStepDone((s) => s.map((v, j) => (j === n - 1 ? !v : v))),
  });

  const prep: { id: string; label: React.ReactNode; body?: React.ReactNode }[] =
    [
      { id: "prep-1", label: "Wash your hands." },
      {
        id: "prep-2",
        label: (
          <>
            Sanitise the <span lang="es">molcajete</span>, the board and the
            bench.
          </>
        ),
      },
      {
        id: "prep-3",
        label: (
          <>
            Put out the tools: <span lang="es">molcajete</span> and{" "}
            <span lang="es">tejolote</span>, bench scraper, quarter pan, digital
            scale, probe thermometer.
          </>
        ),
        body: (
          <Shot
            src="equipment.jpg"
            alt="Everything needed laid out: four Hass avocados, two limes, half a white onion, a bunch of cilantro, two serrano chillies, a stone molcajete and tejolote, a digital scale, a stainless quarter pan and a bench scraper."
            caption="Everything on the bench before you start."
          />
        ),
      },
      {
        id: "prep-4",
        label:
          "Prep every ingredient as the table says: dice, chop, seed, juice, strain.",
        body: (
          <>
            <p className="step-note">
              Do all of it before you open an avocado. Cut avocado starts
              browning within minutes.
            </p>
            <Shot
              src="step-5-dice.jpg"
              alt="A pile of finely diced white onion beside a steel ruler, one cube held against the scale showing five millimetres."
              caption="Onion at 5 mm. Bigger than this and it reads as raw onion, not seasoning."
            />
          </>
        ),
      },
    ];

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
          {/* Light or dark, the app's own control, before the menu. */}
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
          <div className="qr print-only" aria-hidden="true">
            <span className="code">QR</span>
            <span>
              Scan to open this procedure on a phone: photos, video, and the
              current version.
            </span>
          </div>
        </header>

        <div className="allergen" role="note">
          <RiErrorWarningFill className="i i-lg" aria-hidden="true" />
          <div>
            <b>Contains sesame</b>
            <p>
              In the finishing oil, step 8. Check the ticket before it leaves
              the pass.
            </p>
          </div>
        </div>

        <p className="doc-purpose">
          To make guacamole that holds its colour and texture through a full
          service.
        </p>

        {/* The cook's facts. Owner and review dates are the document's, and live
            in document control at the foot. */}
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
            <dd>20 min</dd>
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
              <dd>20 min</dd>
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

        <section className="doc-sec" id="before">
          <h2>Before you start</h2>
          <ul className="steps prep">
            {prep.map((p, i) => (
              <li className="step" key={p.id}>
                <input
                  type="checkbox"
                  className="tick"
                  id={p.id}
                  checked={prepDone[i]}
                  onChange={() =>
                    setPrepDone((s) => s.map((v, j) => (j === i ? !v : v)))
                  }
                />
                <div className="step-body">
                  <label htmlFor={p.id}>{p.label}</label>
                  {p.body}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="doc-sec" id="method">
          <h2>
            Method <span className="count">&middot; 11 steps</span>
          </h2>
          {/* How far along, and a way to begin a new batch. */}
          {doneCount > 0 ? (
            <p className="method-progress" role="status">
              <span>
                {doneCount} of {METHOD_COUNT} done
              </span>
              <button
                type="button"
                className="method-reset"
                onClick={() => {
                  setStepDone(Array(METHOD_COUNT).fill(false));
                  setPrepDone(Array(PREP_COUNT).fill(false));
                }}
              >
                Start a new batch
              </button>
            </p>
          ) : null}
          <p className="print-only qr-note">
            <RiQrCodeLine className="i i-sm" aria-hidden="true" /> Step photos
            and the video are on the phone. Scan the code on this sheet.
          </p>

          <figure className="shot video">
            <div className="media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${IMG}/video-cover.jpg`}
                width={1200}
                height={900}
                loading="lazy"
                alt="Finished guacamole in a stone molcajete, surrounded by avocados, limes, onion, cilantro and serrano chillies."
              />
              <button
                className="play"
                type="button"
                aria-label="Play the full procedure, 1 minute 34 seconds"
              >
                <RiPlayFill className="i i-lg" aria-hidden="true" />
              </button>
              <span className="dur">1:34</span>
            </div>
            <figcaption>
              Full procedure, 1:34. The play mark beside each step jumps to its
              moment.
            </figcaption>
          </figure>

          <ol className="steps">
            <Step
              n={1}
              watch="0:04"
              {...step(1)}
              text={
                <>
                  Cut each avocado ({q("avocado")} in all) lengthwise, all the
                  way round the stone. Twist the halves apart.
                </>
              }
            />

            <Step
              n={2}
              watch="0:12"
              {...step(2)}
              text="Strike the stone with the heel of the knife, the corner nearest the handle. Twist to lift it out."
            >
              <Shot
                src="step-1-stone.jpg"
                alt="A chef's knife blade resting against the stone of a halved avocado, one hand steadying the fruit and the other on the handle, ready to strike."
              />
              <Warn>
                A blade that slips off a stone goes into your hand. Strike once
                with the heel, then twist. A second strike at a stone that is
                already loose is how the blade slips.
              </Warn>
            </Step>

            <Step
              n={3}
              watch="0:19"
              {...step(3)}
              text={
                <>
                  Scoop the flesh into the <span lang="es">molcajete</span>.
                  Scrape the skin clean; the flesh nearest the skin is the
                  greenest.
                </>
              }
            />

            <Step
              n={4}
              watch="0:31"
              {...step(4)}
              text="Mash to a coarse texture. Stop while pieces are still visible."
            >
              <div className="compare">
                <figure className="ok">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${IMG}/step-3-correct.jpg`}
                    width={1200}
                    height={900}
                    loading="lazy"
                    alt="Avocado in a molcajete mashed coarsely, with distinct pieces still visible through the mixture."
                  />
                  <figcaption>
                    <RiCheckLine className="i i-sm" aria-hidden="true" />
                    Correct
                  </figcaption>
                </figure>
                <figure className="no">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${IMG}/step-3-overmashed.jpg`}
                    width={1200}
                    height={900}
                    loading="lazy"
                    alt="Avocado in a molcajete mashed to a smooth, uniform purée with no pieces remaining."
                  />
                  <figcaption>
                    <RiCloseLine className="i i-sm" aria-hidden="true" />
                    Over-mashed
                  </figcaption>
                </figure>
              </div>
            </Step>

            <Step
              n={5}
              watch="0:48"
              {...step(5)}
              text={
                <>
                  Fold in all of the lime juice ({q("lime")}) straight away.
                  Without it, the avocado browns within minutes.
                </>
              }
            />

            <Step
              n={6}
              watch="0:55"
              {...step(6)}
              text={
                <>
                  Fold in the onion ({q("onion")}), cilantro ({q("cilantro")})
                  and serrano ({q("serrano")}).
                </>
              }
            />

            <Step
              n={7}
              watch="1:05"
              {...step(7)}
              text={
                <>
                  Add the salt ({q("salt")}). Taste with a clean spoon, and use
                  a fresh spoon every time you taste again.
                </>
              }
            />

            <Step
              n={8}
              watch="1:12"
              {...step(8)}
              text={
                <>
                  Add the sesame oil ({q("sesame")}). Fold once, so it streaks
                  rather than blends.
                </>
              }
            >
              <Warn kind="allergen">
                Sesame enters here. Anything plated for an allergy ticket is
                made without it, in a clean molcajete.
              </Warn>
            </Step>

            <Step
              n={9}
              watch="1:18"
              {...step(9)}
              text="Transfer to a quarter pan. Press film onto the surface so no air touches the guacamole."
            >
              <Shot
                src="step-8-film.jpg"
                alt="Both hands pressing cling film flat onto the surface of guacamole in a stainless quarter pan, with no air trapped between the film and the food."
                caption="Film touching the guacamole everywhere. Any trapped air browns it."
              />
            </Step>

            <Step
              n={10}
              watch="1:24"
              {...step(10)}
              text={
                <>
                  Label the pan with today&apos;s date, the time, and the
                  discard time: <b>48 hours later</b>. Colour is not the test.
                  The label is.
                </>
              }
            />

            <Step
              n={11}
              watch="1:28"
              crit
              {...step(11)}
              text="Refrigerate. Before service, probe the centre of the pan and record the reading."
            >
              <Shot
                src="step-8-label.jpg"
                alt="A labelled stainless quarter pan of guacamole showing prep date and time, with a digital probe thermometer reading 4.0 degrees Celsius inserted into the centre."
                caption="Probed at the centre: 4.0 °C."
              />
              <div className="crit">
                <h3 className="crit-h">
                  <RiTempColdLine className="i i-sm" aria-hidden="true" />
                  Critical limit
                </h3>
                <div className="crit-b">
                  <p className="crit-num">4&nbsp;°C (39&nbsp;°F) or below</p>
                  <p className="crit-sub">
                    Into the walk-in within 30 minutes of finishing. Check
                    before service.
                  </p>
                  <dl className="crit-parts">
                    <div className="crit-part">
                      <dt className="crit-lbl">How to check</dt>
                      <dd>
                        Probe the centre of the pan with a sanitised
                        thermometer. Record on the Cold Holding Log.
                      </dd>
                    </div>
                    <div className="crit-part breach">
                      <dt className="crit-lbl">
                        <RiErrorWarningLine
                          className="i i-sm"
                          aria-hidden="true"
                        />
                        If it is above 4&nbsp;°C
                      </dt>
                      <dd>
                        Discard. Guacamole is not reheated, so there is no way
                        to bring it back. Tell the chef on duty.
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </Step>
          </ol>
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
            <dd>4</dd>
            <dt>Effective</dt>
            <dd>12 Aug 2026</dd>
            <dt>Supersedes</dt>
            <dd>Version 3, 2 Jun 2026</dd>
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
