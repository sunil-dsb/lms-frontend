import * as React from "react";
import { LuCheck, LuLock } from "react-icons/lu";
import type {
  OnboardingChapter,
  OnboardingChapterKey,
} from "@/lib/mock-training";

/**
 * The three-tile row inside OnboardingState that shows where the cook is in
 * the orientation programme. Three tiles, one per chapter, in order. Each
 * tile renders a check / arrow / lock glyph and a title beneath.
 *
 * Tiles have no tap target — they are a status row, not a navigation. The
 * next CTA button below does the navigation.
 */
export function ChapterIndicator({
  chapters,
  locale = "en",
}: {
  chapters: OnboardingChapter[];
  locale?: string;
}): React.ReactElement {
  const isEs = locale === "es";
  // The "current" chapter is the first one that isn't complete.
  const currentKey: OnboardingChapterKey | null =
    chapters.find((c) => c.status !== "complete")?.key ?? null;

  return (
    <ol
      role="list"
      style={{
        display: "flex",
        gap: "10px",
        alignItems: "stretch",
      }}
    >
      {chapters.map((c) => {
        const isCurrent = c.key === currentKey;
        const isComplete = c.status === "complete";
        const isLocked = c.status === "locked";
        const label = isEs ? c.titleEs : c.titleEn;
        return (
          <li
            key={c.key}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              aria-current={isCurrent ? "step" : undefined}
              aria-label={`${label}${isComplete ? " · done" : isLocked ? " · locked" : isCurrent ? " · current" : ""}`}
              className={
                isComplete
                  ? "flex items-center justify-center rounded-2xl bg-[var(--color-ok-tint)] text-[var(--color-ok)]"
                  : isCurrent
                    ? "flex items-center justify-center rounded-2xl border-2 border-[var(--color-brand-600)] bg-[var(--color-brand-tint)] text-[var(--color-brand-700)]"
                    : "flex items-center justify-center rounded-2xl border border-dashed border-[var(--color-line-2)] bg-[var(--color-panel)] text-[var(--color-ink-3)]"
              }
              style={{ width: "56px", height: "56px" }}
            >
              {isComplete ? (
                <LuCheck aria-hidden="true" className="text-2xl" />
              ) : isLocked ? (
                <LuLock aria-hidden="true" className="text-2xl" />
              ) : (
                <span
                  aria-hidden="true"
                  className="font-[family-name:var(--font-display)] text-xl font-bold"
                >
                  →
                </span>
              )}
            </span>
            <span className="text-center text-xs font-semibold text-[var(--color-ink)]">
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
