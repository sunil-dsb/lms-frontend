import * as React from "react";
import type { IconType } from "react-icons";
import { Icon } from "@/components/ui/icon";
import { IconTile } from "@/components/ui/icon-tile";

/**
 * A place where something will be, and is not yet.
 *
 * Nineteen files drew this by hand — the same dashed card, at five different
 * paddings, with the heading at 14px in some and 16px in others, and the icon
 * sometimes in a circle and sometimes not. It is one thing, so it is one
 * component.
 *
 * Two jobs, and the difference matters: nothing has been made yet (`action` is
 * the way to make the first one), or nothing matched (`action` clears the
 * filter). Both read the same, because from the reader's side both are an empty
 * list with one way out.
 *
 * Dashed, because a solid card claims the space is finished. The dashes say the
 * shape is real and the contents are not here yet.
 */
export function EmptyState({
  icon,
  title,
  body,
  action,
  compact = false,
}: {
  /** One mark for what is missing. Optional: a short note inside a panel needs none. */
  icon?: IconType | string;
  title: string;
  /** One sentence. What is missing, or why nothing matched. */
  body?: string;
  /** The one way out of here — make the first one, or clear the filter. */
  action?: React.ReactNode;
  /** Inside a panel rather than in place of a page's list: half the height. */
  compact?: boolean;
}): React.ReactElement {
  return (
    <article
      className={[
        "flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)]",
        "border border-dashed border-[var(--color-line-2)] bg-[var(--color-surface)]",
        "px-6 text-center",
        compact ? "py-8" : "py-16",
      ].join(" ")}
    >
      {icon ? (
        <IconTile size="lg" icon={icon} tone="quiet" shape="circle" />
      ) : null}

      <div className="space-y-1">
        <h3 className="font-[family-name:var(--font-ui)] text-base font-semibold leading-heading text-[var(--color-ink)]">
          {title}
        </h3>
        {body ? (
          <p className="max-w-note text-sm leading-body text-[var(--color-ink-2)]">
            {body}
          </p>
        ) : null}
      </div>

      {action ? <div className="pt-1">{action}</div> : null}
    </article>
  );
}
