"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { LuLock, LuCircleCheck } from "react-icons/lu";

/**
 * The demo toggle that flips between the onboarding-pending and the completed home view.
 */
export function HomeViewToggle({
  value,
  aria,
  className,
}: {
  value: "onboarding" | "regular";
  /** Localised aria-label for the button */
  aria?: string;
  className?: string;
}): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setView = (target: "onboarding" | "regular") => {
    if (typeof document !== "undefined") {
      document.cookie = `lms_demo_view=${target}; path=/; max-age=31536000; SameSite=Lax`;
    }
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("view", target);
    router.push(`${pathname}?${params.toString()}`);
    router.refresh();
  };

  const isOnboarding = value === "onboarding";

  return (
    <div
      role="group"
      aria-label={aria || "Demo view switcher"}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 4px",
        gap: "4px",
        borderRadius: "9999px",
        backgroundColor: "var(--color-panel)",
        border: "1px solid var(--color-line-2)",
      }}
    >
      <button
        type="button"
        onClick={() => setView("onboarding")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          padding: "5px 10px",
          borderRadius: "9999px",
          fontSize: "12px",
          fontWeight: 600,
          lineHeight: "1",
          cursor: "pointer",
          border: "none",
          backgroundColor: isOnboarding ? "var(--color-ink)" : "transparent",
          color: isOnboarding ? "var(--color-surface)" : "var(--color-ink-2)",
          transition: "all 0.15s ease",
        }}
        title="Show onboarding pending scenario (locked UI)"
      >
        <LuLock style={{ fontSize: "13px" }} />
        <span>Pending</span>
      </button>

      <button
        type="button"
        onClick={() => setView("regular")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          padding: "5px 10px",
          borderRadius: "9999px",
          fontSize: "12px",
          fontWeight: 600,
          lineHeight: "1",
          cursor: "pointer",
          border: "none",
          backgroundColor: !isOnboarding ? "#16a34a" : "transparent",
          color: !isOnboarding ? "#ffffff" : "var(--color-ink-2)",
          transition: "all 0.15s ease",
        }}
        title="Show completed onboarding scenario (unlocked UI)"
      >
        <LuCircleCheck style={{ fontSize: "13px" }} />
        <span>Completed</span>
      </button>
    </div>
  );
}
