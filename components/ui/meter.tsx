import * as React from "react";

/**
 * A radial meter: one ratio against its whole, drawn as an arc on a track of the
 * same ramp a step lighter.
 *
 * Not a donut. A two-slice donut is a chart of one number pretending to be a
 * comparison; a meter says "this much of that" and reads at 44px. It appears only
 * where both halves are real — 5 published of 7, 5 joined of 7 — and never where
 * a number would have to be invented to fill it.
 *
 * The ring is decoration over text that already states the same thing, so it is
 * hidden from assistive tech and the tile's own words carry the meaning.
 */
export function Meter({
  value,
  total,
  size = 44,
  stroke = 6,
  tone = "ok",
  label,
}: {
  value: number;
  total: number;
  size?: number;
  stroke?: number;
  /** Shown in the middle of the ring. The ring is the shape; this is the reading. */
  label?: string;
  /** ok for a completion share, warn when the remainder is what needs attention. */
  tone?: "ok" | "warn";
}): React.ReactElement | null {
  if (!Number.isFinite(total) || total <= 0) return null;
  const share = Math.max(0, Math.min(1, value / total));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  const ring = (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      className="shrink-0"
      role="presentation"
    >
      {/* the track: the same colour family, a step lighter */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--color-panel-2)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={tone === "warn" ? "var(--color-warn)" : "var(--color-ok-fill)"}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${c * share} ${c}`}
        // 12 o'clock start, clockwise
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );

  if (!label) return ring;
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      {ring}
      <span className="absolute text-md font-semibold leading-display tracking-tight text-[var(--color-ink)]">
        {label}
      </span>
    </span>
  );
}
