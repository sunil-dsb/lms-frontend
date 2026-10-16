"use client";

import * as React from "react";
import { flushSync } from "react-dom";
import { LuMoon, LuSun } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { THEME_COOKIE, THEME_MAX_AGE } from "@/lib/theme";

export function ThemeToggle({
  labels,
  className,
}: {
  labels: { toDark: string; toLight: string };
  className?: string;
}): React.ReactElement {
  const [dark, setDark] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const root = document.documentElement;
    let pinned = root.getAttribute("data-theme");

    if (!pinned) {
      try {
        const legacy = localStorage.getItem(THEME_COOKIE);
        if (legacy === "dark" || legacy === "light") {
          document.cookie = `${THEME_COOKIE}=${legacy}; path=/; max-age=${THEME_MAX_AGE}; samesite=lax`;
          root.setAttribute("data-theme", legacy);
          pinned = legacy;
        }
        localStorage.removeItem(THEME_COOKIE);
      } catch {}
    }

    setDark(
      pinned
        ? pinned === "dark"
        : window.matchMedia("(prefers-color-scheme: dark)").matches,
    );
  }, []);

  function toggle(): void {
    const next = !dark;
    const apply = (): void => {
      document.documentElement.setAttribute(
        "data-theme",
        next ? "dark" : "light",
      );
      // Inside a view transition the DOM change has to be synchronous, or the
      // browser snapshots the old page twice and nothing appears to happen.
      flushSync(() => setDark(next));
    };
    // A cookie rather than localStorage: the server has to be able to read it,
    // or the first paint of every navigation is the wrong theme.
    document.cookie = `${THEME_COOKIE}=${next ? "dark" : "light"}; path=/; max-age=${THEME_MAX_AGE}; samesite=lax`;
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => unknown;
    };
    // One crossfade of the whole page, on the compositor. Where the API is
    // missing the theme simply switches, which is what it did before.
    if (typeof doc.startViewTransition === "function")
      doc.startViewTransition(apply);
    else apply();
  }

  const label = dark ? labels.toLight : labels.toDark;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-tap-admin shrink-0 items-center justify-center rounded-full",
        "text-[var(--color-ink-2)]",
        "transition-[background-color,color,transform] duration-[var(--dur-press)] ease-[var(--ease)]",
        "active:scale-[var(--press)]",
        "hover:bg-[var(--color-panel)] hover:text-[var(--color-ink)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2",
        className,
      )}
    >
      {/* One box, two marks, stacked: the button's width never moves, and the
          mark that is leaving turns out while the one arriving turns in. Until
          the browser has told us which theme is on, neither is drawn. */}
      <span className="relative block size-6" aria-hidden="true">
        <LuMoon
          className={cn(
            "absolute inset-0 size-6 transition-[opacity,transform] duration-[var(--dur)] ease-[var(--ease)]",
            dark === false ? "rotate-0 opacity-100" : "-rotate-90 opacity-0",
          )}
        />
        <LuSun
          className={cn(
            "absolute inset-0 size-6 transition-[opacity,transform] duration-[var(--dur)] ease-[var(--ease)]",
            dark ? "rotate-0 opacity-100" : "rotate-90 opacity-0",
          )}
        />
      </span>
    </button>
  );
}
