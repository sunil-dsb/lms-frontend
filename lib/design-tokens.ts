import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * The design tokens, read out of app/lms.css itself.
 *
 * The /design-system page shows these, so it can never disagree with the code:
 * change a value or a note in lms.css and the page changes with it. Nothing
 * here is a second copy of a token.
 *
 * How lms.css is written, which is what this reads:
 *   - Tokens are declared once, light, in the `:root, .theme-light` block, and
 *     again, dark, in `:root[data-theme="dark"]` (the media-query block repeats it).
 *   - A comment after a blank line starts a group; its first sentence names it.
 *   - A comment right under a declaration says what that token is for. One that
 *     opens with a capital letter is written above the token it describes.
 */

export type Token = {
  name: string;
  light: string;
  /** Only when dark differs from light. */
  dark?: string;
  /** The value with every var() followed through, for drawing a swatch. */
  lightResolved: string;
  darkResolved: string;
  /** Another token this one is defined as, when it is an alias. */
  alias?: string;
  note?: string;
};

export type TokenGroup = { title: string; intro?: string; tokens: Token[] };

function block(css: string, selector: RegExp): string {
  const m = selector.exec(css);
  if (!m) return "";
  let depth = 0;
  const start = css.indexOf("{", m.index);
  for (let i = start; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return css.slice(start + 1, i);
  }
  return "";
}

const clean = (comment: string): string =>
  comment
    .replace(/^\/\*|\*\/$/g, "")
    .split("\n")
    .map((l) => l.trim())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

/** Every `--name: value;` in a block, with no comments. */
function declarations(body: string): Map<string, string> {
  const out = new Map<string, string>();
  const bare = body.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of bare.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g))
    out.set(m[1]!, m[2]!.trim());
  return out;
}

function resolve(
  value: string,
  table: Map<string, string>,
  fallback: Map<string, string>,
  depth = 0,
): string {
  if (depth > 8) return value;
  return value.replace(/var\((--[\w-]+)\)/g, (_, name: string) => {
    const next = table.get(name) ?? fallback.get(name);
    return next ? resolve(next, table, fallback, depth + 1) : `var(${name})`;
  });
}

export async function readDesignTokens(): Promise<TokenGroup[]> {
  const css = await readFile(
    path.join(process.cwd(), "app", "lms.css"),
    "utf8",
  );
  const lightBody = block(css, /:root,\s*\.theme-light\s*\{/);
  const darkBody = block(css, /:root\[data-theme="dark"\]\s*\{/);
  const light = declarations(lightBody);
  const dark = declarations(darkBody);

  const groups: TokenGroup[] = [];
  let group: TokenGroup = { title: "Tokens", tokens: [] };
  let last: Token | null = null;
  let pendingNote: string[] = [];
  let blankBefore = true;

  // Walk the light block in order: comments, declarations and blank lines.
  const parts =
    lightBody.match(/\/\*[\s\S]*?\*\/|--[\w-]+\s*:[^;]+;|\n\s*\n/g) ?? [];
  for (const part of parts) {
    if (/^\n\s*\n$/.test(part)) {
      blankBefore = true;
      continue;
    }
    if (part.startsWith("/*")) {
      const text = clean(part);
      if (blankBefore) {
        // A new group: its first sentence is the title, the rest its intro.
        if (group.tokens.length) groups.push(group);
        const [first, ...rest] = text.split(/(?<=\.)\s+/);
        group = {
          title: first!.replace(/[.:]$/, ""),
          intro: rest.join(" ") || undefined,
          tokens: [],
        };
        last = null;
      } else if (!group.tokens.length && !last) {
        // A second paragraph of the group's heading.
        group.intro = [group.intro, text].filter(Boolean).join(" ");
      } else if (last && /^[a-z0-9]/.test(text)) {
        last.note = [last.note, text].filter(Boolean).join(" ");
      } else {
        pendingNote.push(text);
      }
      blankBefore = false;
      continue;
    }
    const m = /^(--[\w-]+)\s*:\s*([^;]+);$/.exec(part.trim());
    if (!m) continue;
    const name = m[1]!;
    const value = m[2]!.trim();
    const darkValue = dark.get(name);
    const alias = /^var\((--[\w-]+)\)$/.exec(value)?.[1];
    const token: Token = {
      name,
      light: value,
      dark: darkValue && darkValue !== value ? darkValue : undefined,
      lightResolved: resolve(value, light, light),
      darkResolved: resolve(darkValue ?? value, dark, light),
      alias,
      note: pendingNote.length ? pendingNote.join(" ") : undefined,
    };
    pendingNote = [];
    group.tokens.push(token);
    last = token;
    blankBefore = false;
  }
  if (group.tokens.length) groups.push(group);
  return groups;
}
