import * as React from "react";
import type { IconType } from "react-icons";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

/**
 * Status pill — DESIGN.md §3.3.
 *
 *   - Shape: small rectangle (rounded-md), not pill.
 *   - Six tones: ok, warn, bad, neutral (panel), info (ink-2), active (ok).
 *   - Tight, single line — a column widens, never truncates.
 */
export type StatusTone =
  "ok" | "warn" | "bad" | "neutral" | "info" | "progress";

const toneClasses: Record<StatusTone, string> = {
  ok: "bg-[var(--color-ok-tint)] text-[var(--color-ok)]",
  warn: "bg-[var(--color-warn-tint)] text-[var(--color-warn-ink)]",
  bad: "bg-[var(--color-bad-tint)] text-[var(--color-bad)]",
  neutral: "bg-[var(--color-panel-2)] text-[var(--color-ink-2)]",
  info: "bg-[var(--color-panel)] text-[var(--color-ink-2)]",
  progress: "bg-[var(--color-panel)] text-[var(--color-ink)]",
};

export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
  /** Optional dot icon to the left. */
  withDot?: boolean;
  /** A mark before the label, where the badge warns rather than states. */
  icon?: IconType | string;
}

export function StatusPill({
  tone = "neutral",
  withDot,
  icon,
  className,
  children,
  ...rest
}: StatusPillProps): React.ReactElement {
  return (
    <span
      data-slot="status-pill"
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-md text-xs font-medium",
        toneClasses[tone],
        className,
      )}
      style={{
        paddingTop: "2px",
        paddingBottom: "2px",
        paddingLeft: "6px",
        paddingRight: "6px",
        gap: "3px",
      }}
      {...rest}
    >
      {withDot ? (
        <span
          aria-hidden="true"
          className="inline-block rounded-full bg-current"
          style={{ width: "6px", height: "6px", flexShrink: 0 }}
        />
      ) : null}
      {icon ? <Icon icon={icon} /> : null}
      {children}
    </span>
  );
}

/**
 * A count beside a heading: "Needs attention 3".
 *
 * Round, where a status badge is a rectangle. The rectangle rule exists so a
 * badge that reads as a word — Published, Draft — is never mistaken for a pill
 * button. A count has no word in it and never exceeds its own height, so a circle
 * reads as a tally rather than as something to press.
 */
export function CountBadge({
  tone = "warn",
  className,
  children,
}: {
  tone?: StatusTone;
  className?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <span
      data-slot="count-badge"
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-full",
        "text-sm font-semibold tabular-nums",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
