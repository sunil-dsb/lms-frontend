'use client';

import * as React from 'react';
import type { Token, TokenGroup } from '@/lib/design-tokens';
export const isColor = (v: string): boolean => /^(#|rgb|hsl|oklch)/i.test(v.trim());
export const byPrefix = (groups: TokenGroup[], test: (name: string) => boolean): Token[] =>
  groups.flatMap((g) => g.tokens).filter((t) => test(t.name));

export const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'color', label: 'Colour' },
  { id: 'type', label: 'Type' },
  { id: 'space', label: 'Space and shape' },
  { id: 'layout', label: 'Layout sizes' },
  { id: 'buttons', label: 'Buttons' },
  { id: 'status', label: 'Status' },
  { id: 'inputs', label: 'Inputs' },
  { id: 'selection', label: 'Selection' },
  { id: 'navigation', label: 'Progress' },
  { id: 'feedback', label: 'Empty states' },
  { id: 'overlays', label: 'Overlays' },
  { id: 'cards', label: 'Cards' },
  { id: 'document', label: 'Document' },
] as const;

/* --- the page's own pieces ------------------------------------------------------ */

export function Section({
  id,
  title,
  intro,
  children,
}: {
  id: string;
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section id={id} className="ds-sec" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`} className="ds-h2">
        {title}
      </h2>
      {intro ? <p className="ds-intro">{intro}</p> : null}
      {children}
    </section>
  );
}

/** One component: what it is for, the live thing, and how to use it. */
export function Specimen({
  name,
  from,
  about,
  code,
  children,
  wide = false,
}: {
  name: string;
  from: string;
  about: string;
  code?: string;
  children: React.ReactNode;
  wide?: boolean;
}): React.ReactElement {
  return (
    <article className={wide ? 'ds-spec is-wide' : 'ds-spec'}>
      <header className="ds-spec-head">
        <h3>{name}</h3>
        <code>{from}</code>
      </header>
      <p className="ds-spec-about">{about}</p>
      <div className="ds-stage">{children}</div>
      {code ? (
        <pre className="ds-code">
          <code>{code}</code>
        </pre>
      ) : null}
    </article>
  );
}

export function TokenName({ name }: { name: string }): React.ReactElement {
  return <code className="ds-token">{name}</code>;
}

export function ColorRow({ t }: { t: Token }): React.ReactElement {
  return (
    <li className="ds-color">
      <span className="ds-sw-pair" aria-hidden="true">
        <span className="ds-sw" style={{ background: t.lightResolved }} title="Light" />
        <span className="ds-sw is-dark" style={{ background: t.darkResolved }} title="Dark" />
      </span>
      <span className="ds-color-text">
        <span className="ds-color-name">
          <TokenName name={t.name} />
          <span className="ds-values">
            {t.alias ? `→ ${t.alias}` : t.lightResolved}
            {t.dark ? <span className="ds-dark-val"> · dark {t.darkResolved}</span> : null}
          </span>
        </span>
        {t.note ? <span className="ds-note">{t.note}</span> : null}
      </span>
    </li>
  );
}

export function TokenTable({ tokens, show }: { tokens: Token[]; show?: (t: Token) => React.ReactNode }): React.ReactElement {
  return (
    <div className="ds-table-wrap">
      <table className="ds-table">
        <thead>
          <tr>
            <th scope="col">Token</th>
            <th scope="col">Value</th>
            {show ? <th scope="col">Looks like</th> : null}
            <th scope="col">What it is for</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((t) => (
            <tr key={t.name}>
              <th scope="row">
                <TokenName name={t.name} />
              </th>
              <td className="ds-mono">
                {t.light}
                {t.dark ? <span className="ds-dark-val"> · dark {t.dark}</span> : null}
              </td>
              {show ? <td>{show(t)}</td> : null}
              <td className="ds-note">{t.note ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* --- the page -------------------------------------------------------------------- */

