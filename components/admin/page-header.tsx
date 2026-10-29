import * as React from "react";
import Link from "next/link";

export function PageHeader({
  eyebrow,
  eyebrowHref,
  onEyebrowClick,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  eyebrowHref?: string;
  onEyebrowClick?: () => void;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}): React.ReactElement {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 pb-2">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-sm font-semibold text-[var(--color-ink-2)]">
            {onEyebrowClick ? (
              <button
                type="button"
                onClick={onEyebrowClick}
                className="inline-flex items-center gap-1.5 underline-offset-4 hover:text-[var(--color-ink)] hover:underline cursor-pointer"
              >
                <span aria-hidden="true">&larr;</span>
                <span>{eyebrow}</span>
              </button>
            ) : eyebrowHref ? (
              <Link
                href={eyebrowHref}
                className="inline-flex items-center gap-1.5 underline-offset-4 hover:text-[var(--color-ink)] hover:underline"
              >
                <span aria-hidden="true">&larr;</span>
                <span>{eyebrow}</span>
              </Link>
            ) : (
              eyebrow
            )}
          </p>
        ) : null}
        <h1 className="font-[family-name:var(--font-display)] text-xl sm:text-2xl font-bold leading-snug sm:leading-display tracking-tight text-[var(--color-ink)]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-3 max-w-prose text-base leading-body text-[var(--color-ink-2)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-3">{actions}</div>
      ) : null}
    </header>
  );
}
