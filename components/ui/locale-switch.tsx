"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const LOCALES = ["en", "es"] as const;

/**
 * EN / ES toggle. Lives in the admin chrome on desktop and is mirrored into
 * the sidebar / mobile drawer by the shells that host it. On auth screens
 * the same component is pinned to the top-right of the viewport so a user
 * who landed on /es/login but reads English (or vice versa) does not have to
 * hunt for it.
 *
 * `notranslate` / `translate="no"` are intentional: Chrome's "translate this
 * page" prompt eats the EN / ES labels otherwise. The code is also written in
 * caps rather than set with text-transform so a screen reader says "E S", not
 * "es".
 */
export function LocaleSwitch({
  locale,
  label,
  className,
}: {
  locale: string;
  label: string;
  className?: string;
}): React.ReactElement {
  const pathname = usePathname();
  const rest = pathname.split("/").slice(2).join("/");
  // The query goes with you: switching language on a filtered list should change
  // the language, not clear the filter.
  const query = useSearchParams().toString();
  const suffix = query ? `?${query}` : "";

  return (
    <div
      className={`segbar notranslate ${className ?? ""}`.trim()}
      translate="no"
      role="group"
      aria-label={label}
    >
      {LOCALES.map((code) => {
        const current = code === locale;
        return (
          <Link
            key={code}
            href={`/${code}${rest ? `/${rest}` : ""}${suffix}`}
            aria-current={current ? "true" : undefined}
            translate="no"
            className="notranslate"
          >
            {code.toUpperCase()}
          </Link>
        );
      })}
    </div>
  );
}
