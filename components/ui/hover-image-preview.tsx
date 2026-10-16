import * as React from "react";
import { cn } from "@/lib/utils";

export function HoverImagePreview({
  src,
  alt,
  className,
  children,
}: {
  src: string;
  alt: string;
  className?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    // The wrapper is its own named group (group/img-preview) so group-hover
    // fires ONLY when the cursor is directly over this image preview wrapper,
    // and NOT when hovering over the procedure row (which has its own .group).
    <span
      className={cn(
        "group/img-preview relative inline-flex shrink-0",
        className,
      )}
    >
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-full top-1/2 z-tooltip ml-3 -translate-y-1/2",
          "rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-e3",
          "size-[400px] overflow-hidden",
          "opacity-0 scale-95 invisible transition-all duration-150 ease-[var(--ease)]",
          "group-hover/img-preview:opacity-100 group-hover/img-preview:scale-100 group-hover/img-preview:visible",
          "group-focus-within/img-preview:opacity-100 group-focus-within/img-preview:scale-100 group-focus-within/img-preview:visible",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="size-full object-cover" />
      </span>
    </span>
  );
}
