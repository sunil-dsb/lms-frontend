import * as React from "react";

/**
 * Resolves a category slug to its default illustration under
 * `/public/category-art/{slug}.{svg|png}`.
 *
 * The component renders a `<picture>` that tries SVG first and falls back to
 * PNG, so a designer can supply either format per category — no code change
 * required. Unknown slugs fall back to `general.{svg|png}`. Replacement
 * happens in place: drop a file at `public/category-art/{slug}.svg` (or
 * `.png`) and it renders.
 */
const SLUG_FOR: Readonly<Record<string, string>> = {
  cleaning: "cleaning",
  "cleaning-schedules": "cleaning",
  "food-safety": "food-safety",
  safety: "food-safety",
  "kitchen-operations": "kitchen-operations",
  station: "kitchen-operations",
  "station-procedures": "kitchen-operations",
  "opening-closing": "opening-closing",
  equipment: "equipment",
  "equipment-handling": "equipment",
  recipes: "recipes",
  recipe: "recipes",
  onboarding: "onboarding",
  delivery: "delivery",
  "delivery-receiving": "delivery",
  admin: "general",
  general: "general",
  "general-procedures": "general",
};

export function categoryArtBase(slug: string | null | undefined): string {
  const key = (slug || "").toLowerCase();
  const file = SLUG_FOR[key] ?? "general";
  return `/category-art/${file}`;
}

export function CategoryArt({
  slug,
  className,
}: {
  slug: string | null | undefined;
  className?: string;
}): React.ReactElement {
  const base = categoryArtBase(slug);
  return (
    <picture aria-hidden="true">
      <source srcSet={`${base}.svg`} type="image/svg+xml" />
      <img
        src={`${base}.png`}
        alt=""
        className={className ?? "size-full object-cover"}
      />
    </picture>
  );
}
