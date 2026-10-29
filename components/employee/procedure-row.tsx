import * as React from "react";
import Link from "next/link";
import { LuChevronRight, LuLock } from "react-icons/lu";
import { Icon } from "@/components/ui/icon";
import { HoverImagePreview } from "@/components/ui/hover-image-preview";
import {
  getCategoryIcon,
  getProcedureIcon,
  getSubcategoryIcon,
} from "@/lib/category-icons";
import { LockedRowShell } from "@/components/employee/locked-row-shell";
import type { Category, Subcategory } from "@/lib/types";

export interface ProcedureFlags {
  allergens: string[];
  hasCriticalStep: boolean;
  notInYourLanguage: boolean;
}

export interface FlagLabels {
  allergen: (list: string) => string;
  critical: string;
  english: string;
}

export function ProcedureRow({
  href,
  cover,
  iconImageUrl,
  category,
  subcategory,
  title,
  purpose,
  meta,
  flags,
  flagLabels,
  locked,
  lockedReason,
  lockedHref,
}: {
  href: string;
  cover?: string;
  iconImageUrl?: string | null;
  category?: Category | null;
  /** Slim subcategory — id and slug are all the icon resolver needs. */
  subcategory?: Pick<Subcategory, "id" | "slug"> | null;
  title: string;
  purpose?: string | null;
  meta: string;
  flags?: ProcedureFlags;
  flagLabels?: FlagLabels;
  /** When true, renders dimmed + dashed + a lock glyph, and tapping pushes
   *  the cook to `lockedHref` (typically /employee/training) instead of
   *  opening the procedure. The onboarding gate uses this to grey out the
   *  library while orientation is pending. */
  locked?: boolean;
  lockedReason?: string;
  lockedHref?: string;
}): React.ReactElement {
  const isRenderable = (u?: string | null): u is string =>
    typeof u === "string" && u.length > 0 && !u.startsWith("blob:");
  const photo = isRenderable(cover) ? cover : null;
  const override = isRenderable(iconImageUrl) ? iconImageUrl : null;

  /*
   * IMPORTANT: use explicit inline pixel values for ALL thumbnail sizing.
   * Tailwind v4 resets --spacing-*: initial, so size-16 / w-16 / h-16
   * produce no CSS and images render at their natural width, breaking layout.
   */
  const THUMB_PX = 64;
  const thumbStyle: React.CSSProperties = {
    width: `${THUMB_PX}px`,
    height: `${THUMB_PX}px`,
    minWidth: `${THUMB_PX}px`,
    flexShrink: 0,
  };

  const thumbContent = photo ? (
    <HoverImagePreview src={photo} alt="">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo}
        alt=""
        className="block rounded-lg object-cover object-top"
        style={thumbStyle}
        loading="lazy"
      />
    </HoverImagePreview>
  ) : override ? (
    <HoverImagePreview src={override} alt="">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={override}
        alt=""
        className="block rounded-lg bg-[var(--color-panel)] object-contain p-2"
        style={thumbStyle}
        loading="lazy"
      />
    </HoverImagePreview>
  ) : (
    <span
      aria-hidden="true"
      className="flex items-center justify-center rounded-lg bg-[var(--color-panel)] text-[var(--color-ink-2)]"
      style={thumbStyle}
    >
      <Icon
        icon={getProcedureIcon(
          { iconImageUrl: null, subcategoryId: subcategory?.id ?? null },
          subcategory ?? null,
        )}
        className="text-2xl"
      />
    </span>
  );

  // The row's body is identical between locked and unlocked — only the
  // wrapper (Link vs LockedRowShell) and the title/meta colours change.
  const titleColor = locked
    ? "text-[var(--color-ink-3)]"
    : "text-[var(--color-ink)]";
  const metaColor = locked
    ? "text-[var(--color-ink-3)]"
    : "text-[var(--color-ink)]";
  const thumbWrapStyle: React.CSSProperties = locked ? { opacity: 0.5 } : {};
  const body = (
    <>
      {/* Thumbnail — explicit inline 64×64 px */}
      <span
        className="relative shrink-0 overflow-hidden rounded-lg"
        style={{
          width: `${THUMB_PX}px`,
          minWidth: `${THUMB_PX}px`,
          height: `${THUMB_PX}px`,
        }}
      >
        <span style={thumbWrapStyle} className="block">
          {thumbContent}
        </span>
        {locked ? (
          <span
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center bg-black/40 text-white"
          >
            <LuLock className="text-xl drop-shadow" />
          </span>
        ) : null}
      </span>

      {/* Text content */}
      <span
        className="min-w-0 flex-1"
        style={{ paddingTop: "10px", paddingBottom: "10px" }}
      >
        <span
          className={`block text-sm font-semibold leading-snug ${titleColor}`}
        >
          {title}
        </span>
        {purpose ? (
          <span
            className={`block text-xs font-normal leading-normal line-clamp-1 ${locked ? "text-[var(--color-ink-3)]" : "text-[var(--color-ink-2)]"}`}
            style={{ marginTop: "2px" }}
          >
            {purpose}
          </span>
        ) : null}
        <span
          className={`block text-xs font-semibold leading-normal ${metaColor}`}
          style={{ marginTop: "2px" }}
        >
          {meta}
        </span>
      </span>

      {/* Chevron */}
      <span className="flex shrink-0 items-center justify-center self-center text-[var(--color-ink-3)] group-hover:text-[var(--color-ink)]">
        <LuChevronRight
          aria-hidden="true"
          className="text-lg transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </span>
    </>
  );

  if (locked) {
    return (
      <LockedRowShell href={lockedHref ?? href}>
        <div
          className="flex w-full items-center justify-between gap-3 overflow-hidden"
          style={{ minHeight: "64px" }}
        >
          {/* Blurred procedure content */}
          <div
            className="flex flex-1 items-center gap-3 overflow-hidden"
            style={{
              filter: "blur(3px)",
              opacity: 0.5,
              userSelect: "none",
              pointerEvents: "none",
            }}
            aria-hidden="true"
          >
            {/* Thumbnail — explicit inline 64×64 px */}
            <span
              className="relative shrink-0 overflow-hidden rounded-lg"
              style={{
                width: `${THUMB_PX}px`,
                minWidth: `${THUMB_PX}px`,
                height: `${THUMB_PX}px`,
              }}
            >
              <span style={thumbWrapStyle} className="block">
                {thumbContent}
              </span>
            </span>

            {/* Text content */}
            <span
              className="min-w-0 flex-1"
              style={{ paddingTop: "10px", paddingBottom: "10px" }}
            >
              <span
                className={`block text-sm font-semibold leading-snug ${titleColor}`}
              >
                {title}
              </span>
              {purpose ? (
                <span
                  className={`block text-xs font-normal leading-normal line-clamp-1 ${locked ? "text-[var(--color-ink-3)]" : "text-[var(--color-ink-2)]"}`}
                  style={{ marginTop: "2px" }}
                >
                  {purpose}
                </span>
              ) : null}
              <span
                className={`block text-xs font-semibold leading-normal ${metaColor}`}
                style={{ marginTop: "2px" }}
              >
                {meta}
              </span>
            </span>
          </div>

          {/* Crisp unblurred lock icon at the side */}
          <span className="flex shrink-0 items-center justify-center self-center text-[var(--color-ink-3)]">
            <LuLock aria-hidden="true" className="text-lg" />
          </span>
        </div>
      </LockedRowShell>
    );
  }

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] transition-all duration-200 hover:border-[var(--color-line-2)] hover:shadow-xs active:scale-[0.995]"
      style={{ paddingRight: "12px" }}
    >
      {body}
    </Link>
  );
}

export { getCategoryIcon, getProcedureIcon, getSubcategoryIcon };
