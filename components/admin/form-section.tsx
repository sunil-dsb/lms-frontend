import * as React from 'react';
import type { IconType } from 'react-icons';
import { Icon } from '@/components/ui/icon';
import { IconTile } from '@/components/ui/icon-tile';

/**
 * One step of a builder: a card with a mark, a heading, the line that says what
 * the step is for, a hairline, and the fields.
 *
 * It lived inside the procedure wizard and the course builder grew its own,
 * squarer version — same job, two implementations, and the two creation flows
 * stopped looking like one product. This is the one.
 */
export function FormSection({
  id,
  icon,
  title,
  subtitle,
  headerAction,
  children,
}: {
  id?: string;
  /** A component, or a name the icon registry resolves. */
  icon?: IconType | string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section
      id={id}
      className="scroll-mt-6 space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 sm:p-6"
    >
      {/* Wraps on a phone. The header's action is a search field and two arrows
          at their natural width; beside a title at 390px they pushed the section
          78px past the screen and the whole page scrolled sideways. */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-line)] pb-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {icon && (
            <IconTile size="md" icon={icon} />
          )}
          <div className="min-w-0">
            <h2 className="font-[family-name:var(--font-ui)] text-md font-semibold tracking-snug text-[var(--color-ink)]">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 text-sm text-[var(--color-ink-2)]">{subtitle}</p>}
          </div>
        </div>
        {headerAction}
      </header>
      <div className="space-y-4 pt-1">{children}</div>
    </section>
  );
}
