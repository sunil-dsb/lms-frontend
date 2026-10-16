"use client";

import * as React from "react";
import type { IconType } from "react-icons";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

export interface Segment {
  value: string;
  label: string;
  icon?: IconType | string;
}

export function SegmentedControl({
  label,
  segments,
  value,
  onChange,
  className,
}: {
  /** The question, for a screen reader: "Title language", "View". */
  label: string;
  segments: Segment[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}): React.ReactElement {
  const trayRef = React.useRef<HTMLDivElement>(null);
  const [ready, setReady] = React.useState(false);

  const place = React.useCallback((): void => {
    const tray = trayRef.current;
    if (!tray) return;
    const seat = tray.querySelector<HTMLElement>('[aria-current="true"]');
    if (!seat) return;
    tray.style.setProperty("--seg-w", `${seat.offsetWidth}px`);
    tray.style.setProperty("--seg-x", `${seat.offsetLeft}px`);
    setReady(true);
  }, []);

  React.useLayoutEffect(() => {
    place();
  }, [place, value, segments]);

  React.useEffect(() => {
    // The seats are sized by their words, so the pill has to be re-measured
    // whenever they are: a language change, a font arriving, a resize.
    const tray = trayRef.current;
    if (!tray || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(place);
    ro.observe(tray);
    return () => ro.disconnect();
  }, [place]);

  return (
    <div
      ref={trayRef}
      className={cn("segbar", className)}
      role="group"
      aria-label={label}
      data-sliding=""
      data-ready={ready ? "" : undefined}
    >
      {segments.map((seg) => (
        <button
          key={seg.value}
          type="button"
          aria-current={seg.value === value ? "true" : undefined}
          onClick={() => onChange(seg.value)}
          translate="no"
          className="notranslate"
        >
          {seg.icon ? <Icon icon={seg.icon} /> : null}
          {seg.label}
        </button>
      ))}
    </div>
  );
}
