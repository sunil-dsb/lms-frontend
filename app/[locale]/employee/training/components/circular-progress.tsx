"use client";

import * as React from "react";

interface CircularProgressProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

/**
 * Circular percentage progress ring component matching reference design:
 * - Subtle neutral background track
 * - Brand terracotta / OK-green progress arc
 * - Centered bold percentage text (e.g. "60%")
 */
export function CircularProgress({
  percent,
  size = 46,
  strokeWidth = 4,
  className = "",
}: CircularProgressProps): React.ReactElement {
  const clampedPercent = Math.max(0, Math.min(100, Math.round(percent)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (clampedPercent / 100) * circumference;

  const isComplete = clampedPercent === 100;
  const strokeColor = isComplete
    ? "var(--color-ok, #166534)"
    : "var(--color-brand-600, #C94327)";

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
      aria-label={`Progress: ${clampedPercent}%`}
      role="progressbar"
      aria-valuenow={clampedPercent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shrink-0 -rotate-90 transform"
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-panel-2, #E6E3DB)"
          strokeWidth={strokeWidth}
        />
        {/* Progress fill */}
        {clampedPercent > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-out"
          />
        )}
      </svg>

      {/* Percentage in center */}
      <span
        className="absolute font-[family-name:var(--font-ui)] font-bold text-[var(--color-ink)]"
        style={{
          fontSize: clampedPercent === 100 ? "11px" : "12px",
          lineHeight: "1",
        }}
      >
        {clampedPercent}%
      </span>
    </div>
  );
}
