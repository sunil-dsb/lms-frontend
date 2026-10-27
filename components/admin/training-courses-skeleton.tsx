import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for the courses explorer list.
 * Mirrors the real loaded row (IconTile + Title + StatusPills + Purpose + Meta + Assign Button + Menu) exactly.
 */
export function TrainingCoursesListSkeleton({
  count = 5,
}: {
  count?: number;
}): React.ReactElement {
  return (
    <ul
      aria-busy="true"
      aria-label="Loading courses"
      className="divide-y divide-[var(--color-line)] rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] shadow-xs"
    >
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="flex flex-col justify-between gap-4 px-4 py-5 md:flex-row md:items-center"
        >
          <div className="flex min-w-0 flex-1 items-start gap-4">
            {/* Course icon tile (mirrors IconTile size="lg" 48x48) */}
            <Skeleton
              className="shrink-0 rounded-[var(--radius-md)]"
              style={{ width: "48px", height: "48px" }}
            />

            <div className="min-w-0 flex-1">
              {/* Row 1: Course title + Status pills (rectangles with rounded-md, not pills!) */}
              <div
                className="flex flex-wrap items-center"
                style={{ gap: "10px" }}
              >
                {/* Course Title skeleton */}
                <Skeleton
                  className="rounded-md"
                  style={{
                    width: i % 2 === 0 ? "260px" : "210px",
                    height: "20px",
                  }}
                />

                {/* Status pill skeleton (e.g. "• Unassigned") */}
                <Skeleton
                  className="rounded-md"
                  style={{ width: "88px", height: "20px" }}
                />

                {/* Secondary pill skeleton (e.g. "No quiz") */}
                <Skeleton
                  className="rounded-md"
                  style={{ width: "62px", height: "20px" }}
                />
              </div>

              {/* Row 2: Purpose line (short description, ~50-65% width) */}
              <Skeleton
                className="rounded-md"
                style={{
                  width: i % 2 === 0 ? "58%" : "48%",
                  height: "15px",
                  marginTop: "8px",
                }}
              />

              {/* Row 3: Meta info (e.g. "0 assigned · Updated Oct 27, 2026") */}
              <Skeleton
                className="rounded-md"
                style={{ width: "190px", height: "13px", marginTop: "8px" }}
              />
            </div>
          </div>

          {/* Right side: Assign button + Kebab actions menu */}
          <div
            className="flex shrink-0 items-center self-start md:self-center"
            style={{ gap: "8px" }}
          >
            {/* Assign button skeleton (mirrors Button variant="neutral" size="sm") */}
            <Skeleton
              className="rounded-[var(--radius-md)]"
              style={{ width: "84px", height: "32px" }}
            />

            {/* Three-dots menu skeleton */}
            <Skeleton
              className="rounded-full"
              style={{ width: "32px", height: "32px" }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Full page skeleton for route transitions in /admin/training.
 */
export function TrainingCoursesPageSkeleton(): React.ReactElement {
  return (
    <div
      className="mx-auto max-w-page space-y-6"
      aria-busy="true"
      aria-label="Loading training courses"
    >
      {/* Page Header skeleton — "Courses" title + "New course +" button */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-2">
        <Skeleton
          className="rounded-md"
          style={{ width: "180px", height: "36px" }}
        />
        <Skeleton
          className="rounded-full"
          style={{ width: "130px", height: "40px" }}
        />
      </div>

      {/* Filter chips skeleton (All / Assigned / Unassigned / Archived) */}
      <div className="flex flex-wrap items-center" style={{ gap: "8px" }}>
        <Skeleton
          className="rounded-full"
          style={{ width: "64px", height: "32px" }}
        />
        <Skeleton
          className="rounded-full"
          style={{ width: "105px", height: "32px" }}
        />
        <Skeleton
          className="rounded-full"
          style={{ width: "120px", height: "32px" }}
        />
        <Skeleton
          className="rounded-full"
          style={{ width: "100px", height: "32px" }}
        />
      </div>

      {/* Search input bar + count skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton
          className="rounded-[var(--radius-md)]"
          style={{ width: "280px", height: "38px" }}
        />
        <Skeleton
          className="rounded-md"
          style={{ width: "95px", height: "16px" }}
        />
      </div>

      {/* Course list rows */}
      <TrainingCoursesListSkeleton count={5} />
    </div>
  );
}
