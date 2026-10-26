'use client';

import * as React from 'react';
import { LuCheck } from 'react-icons/lu';
import { cn } from '@/lib/utils';

export interface WizardStep {
  id: string;
  label: string;
  progress: number;
}


export function WizardStepper({
  steps,
  current,
  ariaLabel,
  onSelect,
  className,
}: {
  steps: WizardStep[];
  current: string;
  ariaLabel: string;
  onSelect?: (stepId: string) => void;
  className?: string;
}): React.ReactElement {
  const rawIdx = steps.findIndex((s) => s.id === current);
  const activeIdx = rawIdx >= 0 ? rawIdx : 0;

  const [maxVisited, setMaxVisited] = React.useState(activeIdx);
  React.useEffect(() => {
    setMaxVisited((prev) => Math.max(prev, activeIdx));
  }, [activeIdx]);

  const [reducedMotion, setReducedMotion] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const motion = reducedMotion ? '' : 'transition-all duration-[400ms] ease-out';

  return (
    <nav aria-label={ariaLabel} className={cn('w-full', className ?? 'my-6')}>
      <div className="py-2">
        <ol className="flex w-full items-center justify-between">
          {steps.map((step, idx) => {
            const isPast = idx < activeIdx;
            const isActive = step.id === current;
            const isFuture = idx > activeIdx;
            const isComplete = isPast || (idx <= maxVisited && step.progress >= 1);
            const isStarted = !isPast && !isComplete && idx <= maxVisited && step.progress > 0;
            const percent = Math.round(step.progress * 100);

            // Connector line after this step
            let linePercent = 0;
            if (isPast) {
              linePercent = 100;
            } else if (isActive) {
              linePercent = Math.min(percent, 100);
            } else {
              linePercent = 0;
            }

            const circleStyle: React.CSSProperties =
              isActive || isComplete
                ? {
                    backgroundColor: 'var(--color-brand-600)',
                    color: '#ffffff',
                  }
                : isStarted
                  ? {
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-brand-700)',
                    }
                  : {
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-ink-3)',
                    };

            if (isActive) {
              circleStyle.boxShadow =
                '0 0 0 4px var(--color-brand-tint), 0 1px 2px rgb(34 34 34 / 0.06)';
              circleStyle.transform = 'scale(1.05)';
            } else {
              circleStyle.boxShadow = '0 1px 2px rgb(34 34 34 / 0.06)';
            }

            const labelStyle: React.CSSProperties = isActive
              ? { color: 'var(--color-brand-700)' }
              : isComplete
                ? { color: 'var(--color-ink)' }
                : isStarted
                  ? { color: 'var(--color-ink-2)' }
                  : { color: 'var(--color-ink-3)' };

            const ringClass = isActive
              ? ''
              : isComplete
                ? ''
                : isStarted
                  ? 'ring-2 ring-inset ring-[var(--color-brand-600)]'
                  : 'ring-1 ring-inset ring-[var(--color-line-3)]';

            const circleClass = cn(
              'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
              motion,
              ringClass,
            );

            const labelClass = cn(
              'text-sm font-semibold',
              motion,
            );

   
            const labelVisibility = 'hidden sm:inline-block';

            return (
              <React.Fragment key={step.id}>
                <li className="flex shrink-0 items-center">
                  <button
                    type="button"
                    onClick={() => onSelect?.(step.id)}
                    aria-current={isActive ? 'step' : undefined}
                    aria-label={`${step.label}, ${percent}% complete`}
                    className="group flex items-center sm:gap-3 focus-visible:outline-none cursor-pointer"
                  >
                    <span
                      className={circleClass}
                      style={circleStyle}
                      aria-hidden="true"
                    >
                      {isComplete && !isActive ? (
                        <LuCheck className="text-sm font-semibold" />
                      ) : (
                        idx + 1
                      )}
                    </span>
                    <span
                      className={cn(labelVisibility, labelClass)}
                      style={labelStyle}
                    >
                      {step.label}
                    </span>
                  </button>
                </li>

                {idx < steps.length - 1 && (
                  <div
                    className="mx-1.5 sm:mx-3 h-0.5 min-w-3 sm:min-w-8 flex-1 overflow-hidden rounded-full bg-[var(--color-line-2)]"
                    aria-hidden="true"
                  >
                    <div
                      className={cn(
                        'h-full bg-[var(--color-brand-600)]',
                        motion,
                      )}
                      style={{ width: `${linePercent}%` }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </ol>

        {/* On mobile screens (< 640px), show clean step indicator below the balanced row */}
        {steps[activeIdx] && (
          <div className="mt-2.5 flex items-center justify-between px-1 text-xs sm:hidden">
            <span className="font-semibold text-[var(--color-brand-700)]">
              {activeIdx + 1} / {steps.length} · {steps[activeIdx].label}
            </span>
            <span className="text-[11px] font-medium text-[var(--color-ink-3)]">
              {Math.round(steps[activeIdx].progress * 100)}%
            </span>
          </div>
        )}
      </div>
    </nav>
  );
}
