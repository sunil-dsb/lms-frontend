export type ViewAs = "admin" | "employee";

export function parseAsParam(
  raw: string | string[] | undefined | null,
): ViewAs | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "admin" || value === "employee") return value;
  return null;
}

export function withAs(href: string, current: ViewAs | null): string {
  if (!current) return href;
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}as=${current}`;
}
