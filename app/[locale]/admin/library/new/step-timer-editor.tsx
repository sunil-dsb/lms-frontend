'use client';

import * as React from 'react';
import { LuClock, LuTriangleAlert, LuX } from 'react-icons/lu';

type StepTimer = { seconds: number; label: string };
type TimerUnit = 'sec' | 'min' | 'hrs';

const TIMER_PRESETS = [
  { label: '30s', seconds: 30, unit: 'sec' as const },
  { label: '1m', seconds: 60, unit: 'min' as const },
  { label: '2m', seconds: 120, unit: 'min' as const },
  { label: '5m', seconds: 300, unit: 'min' as const },
  { label: '10m', seconds: 600, unit: 'min' as const },
  { label: '15m', seconds: 900, unit: 'min' as const },
  { label: '30m', seconds: 1800, unit: 'min' as const },
  { label: '1h', seconds: 3600, unit: 'hrs' as const },
  { label: '2h', seconds: 7200, unit: 'hrs' as const },
];

export function StepTimerEditor({
  timer,
  onChange,
  onRemove,
}: {
  timer: StepTimer;
  onChange: (next: StepTimer) => void;
  onRemove: () => void;
}): React.ReactElement {
  const [unit, setUnit] = React.useState<TimerUnit>(() => {
    if (timer.seconds >= 3600 && timer.seconds % 3600 === 0) return 'hrs';
    if (timer.seconds >= 60) return 'min';
    return 'sec';
  });
  const value = unit === 'hrs'
    ? String(Math.max(1, Math.round(timer.seconds / 3600)))
    : unit === 'min'
      ? String(Math.max(1, Math.round(timer.seconds / 60)))
      : String(Math.max(1, Math.round(timer.seconds)));

  const setValue = (rawValue: string): void => {
    if (rawValue === '') {
      onChange({ ...timer, seconds: 1 });
      return;
    }
    const raw = parseInt(rawValue, 10);
    if (Number.isNaN(raw) || raw < 1) return;
    onChange({ ...timer, seconds: raw * (unit === 'hrs' ? 3600 : unit === 'min' ? 60 : 1) });
  };

  return (
    <div className="flex flex-col gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-wash)]/70 p-3 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <LuClock className="size-4 shrink-0 text-[var(--color-ink-3)]" strokeWidth={1.75} />
        <div className="relative flex-1 sm:max-w-[220px]">
          <input
            type="text"
            maxLength={50}
            value={timer.label ?? ''}
            onChange={(event) => onChange({ ...timer, label: event.target.value })}
            placeholder="Label (optional), e.g. Simmer sauce"
            className="h-8 sm:h-9 w-full rounded-[var(--radius-sm)] border border-[var(--color-line-2)] bg-[var(--color-surface)] pl-3 pr-14 text-xs font-medium text-[var(--color-ink)] placeholder:text-[var(--color-ink-3)]/60 focus:border-[var(--color-ink)] focus:outline-none"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] text-[var(--color-ink-3)] pointer-events-none select-none">
            {(timer.label ?? '').length} / 50
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <input
            type="number"
            min={1}
            step={1}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="h-8 sm:h-9 w-[64px] min-w-[64px] rounded-[var(--radius-sm)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-2 text-center text-xs font-mono font-bold text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:outline-none"
          />
          <div className="inline-flex h-8 sm:h-9 items-stretch rounded-[var(--radius-sm)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-0.5 shadow-2xs">
            {(['sec', 'min', 'hrs'] as const).map((nextUnit) => {
              const selected = unit === nextUnit;
              return (
                <button
                  key={nextUnit}
                  type="button"
                  onClick={() => {
                    setUnit(nextUnit);
                    const current = parseInt(value, 10) || 1;
                    onChange({
                      ...timer,
                      seconds: current * (nextUnit === 'hrs' ? 3600 : nextUnit === 'min' ? 60 : 1),
                    });
                  }}
                  className={`w-11 sm:w-12 flex items-center justify-center rounded-[var(--radius-xs)] text-xs font-semibold transition-all cursor-pointer ${selected ? 'bg-[var(--color-ink)] text-[var(--color-surface)] shadow-2xs' : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)] hover:bg-[var(--color-wash)]'}`}
                >
                  {nextUnit}
                </button>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove timer"
          title="Remove timer"
          className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-ink-3)] hover:bg-[var(--color-bad-tint)] hover:text-[var(--color-bad)] transition-colors cursor-pointer"
        >
          <LuX className="size-4 shrink-0 text-current" strokeWidth={1.75} />
        </button>
      </div>

      {timer.seconds > 14400 ? (
        <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-bad)]">
          <LuTriangleAlert className="size-4 shrink-0 text-current" strokeWidth={1.75} />
          <span>Timer duration exceeds 4 hours</span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[var(--color-line-2)]/60">
        <span className="text-xs font-semibold text-[var(--color-ink-3)] mr-1 shrink-0">Presets:</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {TIMER_PRESETS.map((preset) => {
            const selected = unit === preset.unit && timer.seconds === preset.seconds;
            return (
              <button
                key={preset.label}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setUnit(preset.unit);
                  onChange({ ...timer, seconds: preset.seconds });
                }}
                className={`inline-flex min-h-[32px] items-center justify-center rounded-full px-3 text-xs font-medium transition-all cursor-pointer border ${selected ? 'border-[var(--color-ink)] bg-[var(--color-wash)] text-[var(--color-ink)] font-semibold shadow-2xs ring-1 ring-[var(--color-ink)]/20' : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink-2)] hover:border-[var(--color-line-3)] hover:text-[var(--color-ink)] hover:bg-[var(--color-wash)]'}`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
