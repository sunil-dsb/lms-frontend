"use client";

import * as React from "react";
import { ProximityRail } from "./proximity-rail";

/**
 * The document's three behaviours, ported from /lms.js so the React pages act
 * like the prototypes they were designed in:
 *
 *   1. The rail — a map of the sections and steps in the right margin on a wide
 *      screen, which reaches toward the pointer. See ProximityRail.
 *   2. Which step you are on. A cook looks at the pan and looks back; the band is
 *      a slice across the middle of the screen, not a line, so a step stays
 *      current while it is being read.
 *   3. The bar's title, revealed only once the real title has scrolled away.
 *
 * Without any of this the page is still complete and still prints — it is added
 * to the DOM after mount, and removed on unmount.
 */
export function DocBehaviour({
  markCurrent = true,
}: {
  /** Off for a page that marks the current step itself: /demo2 reads it from a
   *  line under its photo stage, not from the middle of the screen. */
  markCurrent?: boolean;
} = {}): React.ReactElement {
  React.useEffect(() => {
    const doc = document.querySelector<HTMLElement>(".doc");
    if (!doc) return;
    const cleanups: (() => void)[] = [];

    /* --- the bar's title ------------------------------------------------- */
    const bar = doc.querySelector<HTMLElement>(".doc-bar");
    const title = doc.querySelector<HTMLElement>(".doc-title");
    if (bar && title && "IntersectionObserver" in window) {
      bar.classList.add("can-reveal");
      const frame = requestAnimationFrame(() => bar.classList.add("is-ready"));
      const barH = bar.getBoundingClientRect().height || 64;
      const watch = new IntersectionObserver(
        (entries) => {
          const last = entries[entries.length - 1]!;
          bar.classList.toggle("is-scrolled", !last.isIntersecting);
        },
        { rootMargin: `-${barH}px 0px 0px 0px` },
      );
      watch.observe(title);
      cleanups.push(() => {
        cancelAnimationFrame(frame);
        watch.disconnect();
        bar.classList.remove("can-reveal", "is-ready", "is-scrolled");
      });
    }

    /* --- which step is current ------------------------------------------- */
    const steps = markCurrent
      ? Array.from(doc.querySelectorAll<HTMLElement>(".steps:not(.prep) .step"))
      : [];
    if (steps.length && "IntersectionObserver" in window) {
      const watcher = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            (e.target as HTMLElement).dataset.inBand = e.isIntersecting
              ? "1"
              : "";
          });
          const now = steps.find((s) => s.dataset.inBand);
          steps.forEach((s) => s.classList.toggle("is-now", s === now));
        },
        { rootMargin: "-30% 0px -45% 0px" },
      );
      steps.forEach((s) => watcher.observe(s));
      cleanups.push(() => {
        watcher.disconnect();
        steps.forEach((s) => s.classList.remove("is-now"));
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, [markCurrent]);

  return <ProximityRail />;
}
