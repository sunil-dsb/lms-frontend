import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A person's initials in a circle. Decorative: the name always sits beside it,
 * so it is hidden from assistive tech.
 *
 * sm 40px for list rows, md 48px where the row is taller. className is for
 * placement only.
 */
export function Avatar({
  initials,
  size = "sm",
  className,
}: {
  initials: string;
  size?: "sm" | "md";
  className?: string;
}): React.ReactElement {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-[var(--color-panel)] font-semibold text-[var(--color-ink)]",
        size === "sm" ? "size-10 text-sm" : "size-12",
        className,
      )}
    >
      {initials}
    </span>
  );
}
