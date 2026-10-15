'use client';

import * as React from 'react';
import type { Token, TokenGroup } from '@/lib/design-tokens';
import { ColorRow, Section, TokenName, TokenTable } from './design-system-primitives';

export function DesignSystemTokenSections({ colorGroups, typeScale, leading, faces, space, radius, elevation, motion, taps, sizes, layers }: {
  colorGroups: TokenGroup[];
  typeScale: Token[];
  leading: Token[];
  faces: Token[];
  space: Token[];
  radius: Token[];
  elevation: Token[];
  motion: Token[];
  taps: Token[];
  sizes: Token[];
  layers: Token[];
}): React.ReactElement {
  return (
    <>
          <Section
            id="color"
            title="Colour"
            intro="Each swatch shows the light theme on the left and the dark theme on the right. A token that points at another shows where it points."
          >
            {colorGroups.map((g) => (
              <div key={g.title} className="ds-group">
                <h3 className="ds-h3">{g.title}</h3>
                {g.intro ? <p className="ds-note ds-group-intro">{g.intro}</p> : null}
                <ul className="ds-colors">
                  {g.tokens.map((t) => (
                    <ColorRow key={t.name} t={t} />
                  ))}
                </ul>
              </div>
            ))}
          </Section>

          {/* ------------------------------------------------------------------ type */}
          <Section
            id="type"
            title="Type"
            intro="Inter for everything read and operated; DM Sans for display only, 28px and up. One scale, base 16px, ratio 1.25."
          >
            <div className="ds-faces">
              <div>
                <span className="ds-face">Guacamole Fresco</span>
                <span className="ds-note">
                  <TokenName name="--font-display" /> DM Sans, display
                </span>
              </div>
              <div>
                <span className="ds-face is-ui">Fold in all of the lime juice straight away.</span>
                <span className="ds-note">
                  <TokenName name="--font-ui" /> Inter, interface and reading
                </span>
              </div>
            </div>
            <ol className="ds-scale">
              {typeScale.map((t) => {
                const px = parseFloat(t.light) * (t.light.endsWith('rem') ? 16 : 1);
                const display = px >= 28;
                return (
                  <li key={t.name}>
                    <span className="ds-scale-meta">
                      <TokenName name={t.name} />
                      <span className="ds-mono">{px}px</span>
                    </span>
                    <span
                      className="ds-scale-sample"
                      style={{
                        fontSize: `var(${t.name})`,
                        fontFamily: display ? 'var(--font-display)' : 'var(--font-ui)',
                        fontWeight: display ? 700 : 400,
                        letterSpacing: display ? 'var(--display-track)' : undefined,
                        lineHeight: display ? 'var(--lh-display)' : 'var(--lh-body)',
                      }}
                    >
                      {display ? 'Cold holding' : 'Probe the centre of the pan'}
                    </span>
                  </li>
                );
              })}
            </ol>
            <h3 className="ds-h3">Line height and tracking</h3>
            <TokenTable tokens={[...leading, ...faces.filter((t) => !/^--font-/.test(t.name))]} />
          </Section>

          {/* ----------------------------------------------------------------- space */}
          <Section
            id="space"
            title="Space and shape"
            intro="Space runs on a 4px base. Corners, lift and motion are few, so they stay recognisable."
          >
            <h3 className="ds-h3">Space</h3>
            <ul className="ds-space">
              {space.map((t) => (
                <li key={t.name}>
                  <TokenName name={t.name} />
                  <span className="ds-bar-sample" style={{ width: `var(${t.name})` }} />
                  <span className="ds-mono">{t.light}</span>
                </li>
              ))}
            </ul>
            <h3 className="ds-h3">Corners</h3>
            <ul className="ds-tiles">
              {radius.map((t) => (
                <li key={t.name}>
                  <span className="ds-radius" style={{ borderRadius: `var(${t.name})` }} />
                  <TokenName name={t.name} />
                  <span className="ds-mono">{t.light}</span>
                </li>
              ))}
            </ul>
            <h3 className="ds-h3">Lift</h3>
            <ul className="ds-tiles">
              {elevation.map((t) => (
                <li key={t.name}>
                  <span className="ds-lift" style={{ boxShadow: `var(${t.name})` }} />
                  <TokenName name={t.name} />
                  {t.note ? <span className="ds-note">{t.note}</span> : null}
                </li>
              ))}
            </ul>
            <h3 className="ds-h3">Motion and touch</h3>
            <TokenTable tokens={[...motion, ...taps]} />
          </Section>

          {/* ---------------------------------------------------------------- layout */}
          <Section
            id="layout"
            title="Layout sizes"
            intro="The width of a region comes from one of these, never from a number typed into the markup."
          >
            <TokenTable tokens={sizes} />
            <h3 className="ds-h3">Layers</h3>
            <TokenTable tokens={layers} />
          </Section>

    </>
  );
}
