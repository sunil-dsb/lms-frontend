import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Base pulsing placeholder. Every page skeleton builds on this one block
 * so the pulse colour/radius live in exactly one place — per page you
 * only pass the shape (size + roundedness) via className.
 */
export function Skeleton({
  className,
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={cn(
        "animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-panel-2)]",
        className,
      )}
      {...props}
    />
  );
}
