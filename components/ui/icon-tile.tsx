import * as React from "react";
import type { IconType } from "react-icons";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export type IconTileSize = "xs" | "sm" | "md" | "lg";

const SIZE: Record<IconTileSize, string> = {
  xs: "size-6 rounded-[var(--radius-sm)] text-sm",
  sm: "size-8 rounded-[var(--radius-md)] text-base",
  md: "size-10 rounded-[var(--radius-md)] text-lg",
  lg: "size-12 rounded-[var(--radius-lg)] text-xl",
};

const TONE = {
  neutral: "bg-[var(--color-panel)] text-[var(--color-ink-2)]",
  quiet: "bg-[var(--color-wash)] text-[var(--color-ink-3)]",
} as const;

export type IconTileProps = {
  icon?: IconType | string;
  art?: React.ReactNode;
  image?: { src: string; alt?: string };
  size?: IconTileSize;
  tone?: keyof typeof TONE;
  shape?: "square" | "circle";
  className?: string;
};

export function IconTile({
  icon,
  art,
  image,
  size = "md",
  tone = "neutral",
  shape = "square",
  className,
}: IconTileProps): React.ReactElement {
  // Priority: user-uploaded image > custom art > lucide icon.
  const inner = image ? (
    <img
      src={image.src}
      alt={image.alt ?? ""}
      className="size-full object-cover"
    />
  ) : art ? (
    art
  ) : icon ? (
    <Icon icon={icon} />
  ) : null;

  return (
    <span
      aria-hidden={image ? undefined : "true"}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden transition-colors",
        SIZE[size],
        TONE[tone],
        shape === "circle" && "rounded-full",
        className,
      )}
    >
      {inner}
    </span>
  );
}
