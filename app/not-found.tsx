import * as React from "react";
import { cookies } from "next/headers";
import Link from "next/link";

/**
 * Catch-all 404 for unmatched URLs (e.g. `/en/admin/library/new/2`).
 *
 * Why this file exists separately from the nested boundaries: Next.js only
 * renders segment-level `not-found.tsx` files for explicit `notFound()`
 * calls inside their segment. A URL that matches NO route falls through
 * every nested boundary and lands here — without this file the user gets
 * Next's bare built-in page with no way back.
 *
 * This renders outside the `[locale]` tree (no locale layout, no
 * next-intl provider, no global CSS), so everything is self-contained:
 * locale comes from the `NEXT_LOCALE` cookie, strings are inline en/es,
 * and styling is inline style using the light-theme token values from
 * `app/lms.css` (`--ground #f0efeb`, `--ink #222`, `--brand-600 #c94327`).
 */
const COPY = {
  en: {
    eyebrow: "Page not found",
    title: "We couldn't find that page",
    body: "The link may be mistyped, or the page was moved or deleted.",
    dashboard: "Back to dashboard",
    login: "Go to login",
  },
  es: {
    eyebrow: "Página no encontrada",
    title: "No encontramos esa página",
    body: "El enlace puede estar mal escrito, o la página se movió o eliminó.",
    dashboard: "Volver al panel",
    login: "Ir al inicio de sesión",
  },
} as const;

export default async function RootNotFound(): Promise<React.ReactElement> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const locale = cookieLocale === "es" ? "es" : "en";
  const t = COPY[locale];

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f0efeb",
        padding: "24px",
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      }}
    >
      <article
        style={{
          width: "100%",
          maxWidth: "480px",
          background: "#f2f1ec",
          border: "1px solid #e9e8e5",
          borderRadius: "12px",
          padding: "32px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "13px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#c94327",
          }}
        >
          {t.eyebrow}
        </p>
        <h1
          style={{
            margin: "8px 0 0",
            fontSize: "24px",
            lineHeight: 1.25,
            color: "#222222",
          }}
        >
          {t.title}
        </h1>
        <p
          style={{
            margin: "12px 0 0",
            fontSize: "15px",
            lineHeight: 1.5,
            color: "#515252",
          }}
        >
          {t.body}
        </p>
        <div
          style={{
            marginTop: "24px",
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            href={`/${locale}/admin`}
            style={{
              display: "inline-block",
              padding: "12px 24px",
              borderRadius: "999px",
              background: "#c94327",
              color: "#fff",
              fontSize: "15px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            {t.dashboard}
          </Link>
          <Link
            href={`/${locale}/login`}
            style={{
              display: "inline-block",
              padding: "12px 24px",
              borderRadius: "999px",
              background: "transparent",
              color: "#222222",
              border: "1px solid #e9e8e5",
              fontSize: "15px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            {t.login}
          </Link>
        </div>
      </article>
    </div>
  );
}
