"use client";

import * as React from "react";
import {
  RiCheckLine,
  RiCloseLine,
  RiFridgeLine,
  RiFullscreenLine,
  RiHandSanitizerLine,
  RiPlayFill,
  RiRestaurantLine,
} from "react-icons/ri";
import {
  IMG,
  PHASES,
  STEPS,
  phaseOf,
  type Qty,
  type RecipeStep,
} from "./recipe-data";

/**
 * The photo stage: one frame that shows the picture of the step being read.
 *
 * It sits at the head of the method, across the column, and sticks under the
 * bar while the method scrolls beneath it -- on a phone and on a computer
 * alike, so the picture is always just above the words it belongs to. As the
 * cook reads on, the next step's picture fades in over the last; a long step
 * keeps its picture until the next step takes over; past the last step the
 * stage scrolls away with the method. Its height never changes, so nothing on
 * the page moves when the picture does -- which is why the pictures live here
 * and not inside each step, where opening one and closing another would jolt
 * the text being read.
 *
 * The frame is wider than the photographs, so it crops them. A tap opens the
 * picture whole, on a dark screen of its own.
 *
 * Along its foot, the method's four parts, filled as far as the cook has read:
 * where they are in the recipe, not only in the list.
 */

const N = STEPS.length;

const srcsOf = (s: RecipeStep | undefined): string[] => {
  const m = s?.media;
  if (!m || m.kind === "glyph") return [];
  return m.kind === "compare" ? [m.ok.src, m.no.src] : [m.src];
};

function preload(src: string): void {
  const img = new Image();
  img.src = `${IMG}/${src}`;
}

const GLYPHS = {
  wash: RiHandSanitizerLine,
  taste: RiRestaurantLine,
  cold: RiFridgeLine,
} as const;

/** One step's picture. `whole` is the full-screen view: nothing cropped. */
function Picture({
  step,
  whole = false,
}: {
  step: RecipeStep;
  whole?: boolean;
}): React.ReactElement {
  const m = step.media;
  if (!m || m.kind === "glyph") {
    // No photograph: a sign of the action, never the last step's picture left up.
    const Glyph = m ? GLYPHS[m.glyph] : null;
    return (
      <div className="stage-glyph">
        {Glyph ? (
          <Glyph className="stage-glyph-i" aria-hidden="true" />
        ) : (
          <b>{step.n}</b>
        )}
        <span>{m ? m.label : phaseOf(step.n).name}</span>
      </div>
    );
  }
  if (m.kind === "compare") {
    return (
      <div className="stage-pair">
        {(["ok", "no"] as const).map((k) => (
          <figure key={k} className={k}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${IMG}/${m[k].src}`}
              alt={m[k].alt}
              width={1200}
              height={900}
            />
            <figcaption>
              {k === "ok" ? (
                <RiCheckLine className="i i-sm" aria-hidden="true" />
              ) : (
                <RiCloseLine className="i i-sm" aria-hidden="true" />
              )}
              {k === "ok" ? "Correct" : "Over-mashed"}
            </figcaption>
          </figure>
        ))}
      </div>
    );
  }
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="stage-img"
        src={`${IMG}/${m.src}`}
        alt={m.alt}
        width={1200}
        height={900}
      />
      {m.kind === "clip" ? (
        <span className="stage-clip">
          <RiPlayFill className="i i-sm" aria-hidden="true" />
          Clip &middot; {m.len}
        </span>
      ) : m.caption && !whole ? (
        <span className="stage-cap">{m.caption}</span>
      ) : null}
    </>
  );
}

/** The picture whole, on its own dark screen. A tap anywhere, or Escape, closes it. */
function Viewer({
  step,
  q,
  onClose,
}: {
  step: RecipeStep;
  q: Qty;
  onClose: () => void;
}): React.ReactElement {
  const ref = React.useRef<HTMLDialogElement>(null);
  React.useEffect(() => {
    const d = ref.current;
    // The dialog gives focus back to whatever had it when it opened, and focusing
    // the stage -- a sticky element -- scrolls the page to where the stage would
    // sit unstuck, at the top of the method. So the opener lets go of focus
    // first, and takes it back afterwards without the page moving.
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    opener?.blur();
    // Not overflow: hidden on the page to hold it still -- on a phone that sends
    // it back to the top. The viewer keeps the page's scrolling to itself (see
    // the CSS), and the page is put back exactly where it was, in case.
    const y = window.scrollY;
    if (d && !d.open) d.showModal();
    return () => {
      if (d?.open) d.close();
      if (Math.abs(window.scrollY - y) > 1)
        window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
      opener?.focus({ preventScroll: true });
    };
  }, []);
  const m = step.media;
  const caption = m && m.kind === "photo" ? m.caption : undefined;
  return (
    <dialog
      ref={ref}
      className="viewer"
      aria-label={`Step ${step.n}, full size`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={onClose}
    >
      <button
        type="button"
        className="viewer-close"
        aria-label="Close"
        onClick={onClose}
      >
        <RiCloseLine className="i" aria-hidden="true" />
      </button>
      <div className="viewer-pic">
        <Picture step={step} whole />
      </div>
      <div className="viewer-text">
        <b className="viewer-label">
          {step.crit ? "Critical step" : "Step"} {step.n}
        </b>
        <p>{step.text(q)}</p>
        {caption ? <p className="viewer-cap">{caption}</p> : null}
      </div>
    </dialog>
  );
}

export function StepStage({
  active,
  stageRef,
  q,
}: {
  active: number;
  stageRef: React.Ref<HTMLDivElement>;
  q: Qty;
}): React.ReactElement {
  // The picture on show, and the one it is fading in over.
  const [layers, setLayers] = React.useState<
    { key: number; step: RecipeStep }[]
  >(() => [{ key: 0, step: STEPS[active - 1]! }]);
  const [viewing, setViewing] = React.useState<RecipeStep | null>(null);
  const seq = React.useRef(0);

  React.useEffect(() => {
    const step = STEPS[active - 1];
    if (!step) return;
    setLayers((ls) =>
      ls[ls.length - 1]?.step.n === step.n
        ? ls
        : [...ls.slice(-1), { key: ++seq.current, step }],
    );
    // The pictures either side, so scrolling on or back never waits for one.
    [...srcsOf(STEPS[active]), ...srcsOf(STEPS[active - 2])].forEach(preload);
  }, [active]);

  // Without motion there is no fade to wait for: the old picture goes at once.
  React.useEffect(() => {
    if (
      layers.length > 1 &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setLayers((ls) => ls.slice(-1));
    }
  }, [layers.length]);

  const step = STEPS[active - 1]!;
  const phase = phaseOf(step.n);
  const canOpen = Boolean(step.media && step.media.kind !== "glyph");

  return (
    <div className="stage" ref={stageRef}>
      <div className="stage-frame">
        {layers.map((l, i) => {
          const top = i === layers.length - 1;
          return (
            <div
              key={l.key}
              className={
                top && layers.length > 1 ? "stage-layer is-in" : "stage-layer"
              }
              aria-hidden={!top || undefined}
              onAnimationEnd={
                top ? () => setLayers((ls) => ls.slice(-1)) : undefined
              }
            >
              <Picture step={l.step} />
            </div>
          );
        })}

        {/* The whole frame opens the picture; the button is its name and its focus. */}
        {canOpen ? (
          <button
            type="button"
            className="stage-open"
            aria-label={`Step ${step.n}: see the picture full size`}
            onClick={() => setViewing(step)}
          >
            <span className="stage-open-i">
              <RiFullscreenLine className="i i-sm" aria-hidden="true" />
            </span>
          </button>
        ) : null}

        <span className={step.crit ? "stage-chip is-crit" : "stage-chip"}>
          {step.crit ? "Critical step" : "Step"} {step.n}
          <span> of {N}</span>
          {/* The part's heading has gone under the stage; the chip says it. */}
          {step.crit ? null : (
            <span className="stage-chip-part"> &middot; {phase.name}</span>
          )}
        </span>

        {/* The four parts, each filled as far as the cook has read into it. */}
        <span className="stage-parts" aria-hidden="true">
          {PHASES.map((ph) => {
            const size = ph.to - ph.from + 1;
            const read = Math.max(0, Math.min(size, step.n - ph.from + 1));
            return (
              <span key={ph.id} style={{ flexGrow: size }}>
                <i style={{ width: `${(read / size) * 100}%` }} />
              </span>
            );
          })}
        </span>
      </div>

      {viewing ? (
        <Viewer step={viewing} q={q} onClose={() => setViewing(null)} />
      ) : null}
    </div>
  );
}
