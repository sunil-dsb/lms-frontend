"use client";

import * as React from "react";

/**
 * The reader's name and the time, faint across the whole page, on confidential
 * and master recipes (PROJECT_OVERVIEW §02: "a visible watermark showing the
 * viewer's name and the time, repositioned periodically").
 *
 * It cannot stop a photo of the screen; it makes the photo say whose screen it
 * was. It moves every minute so it cannot be cropped out of the same spot twice,
 * ignores the pointer so the page works under it, and is hidden from assistive
 * tech, which would otherwise read the name out dozens of times.
 */
export function Watermark({
  name,
  locale,
}: {
  name: string;
  locale: string;
}): React.ReactElement {
  const [now, setNow] = React.useState<Date | null>(null);
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    // Set after mount: a server-rendered time would never match the browser's.
    setNow(new Date());
    const id = window.setInterval(() => {
      setNow(new Date());
      setStep((s) => (s + 1) % 4);
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (!now) return <></>;
  const stamp = `${name} · ${new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(now)}`;
  const offsets = ["0px, 0px", "120px, 60px", "60px, 140px", "180px, 20px"];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-sticky select-none overflow-hidden print:hidden"
    >
      <div
        className="absolute -inset-full flex flex-col justify-center gap-16 transition-transform duration-[var(--dur)] ease-[var(--ease)]"
        style={{ transform: `rotate(-24deg) translate(${offsets[step]})` }}
      >
        {Array.from({ length: 40 }, (_, row) => (
          <p
            key={row}
            className="whitespace-nowrap text-md font-semibold text-[var(--color-ink)] opacity-[0.07]"
            style={{ paddingLeft: row % 2 ? "140px" : "0px" }}
          >
            {Array.from({ length: 14 }, () => stamp).join("   ")}
          </p>
        ))}
      </div>
    </div>
  );
}
