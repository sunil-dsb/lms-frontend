/**
 * The theme, as one name both sides can use.
 *
 * It lives here rather than in the toggle because the toggle is a client
 * component: a value imported from a `'use client'` module into a server
 * component arrives as a client reference, not as the string — so the layout was
 * reading a cookie called `undefined` and finding nothing, while the cookie it
 * wanted sat right there in the request.
 */
export const THEME_COOKIE = "lms-theme";

/** A year. The choice should outlive the session it was made in. */
export const THEME_MAX_AGE = 60 * 60 * 24 * 365;

export type Theme = "light" | "dark";

export function isTheme(value: string | undefined): value is Theme {
  return value === "light" || value === "dark";
}
