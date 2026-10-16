import * as React from "react";
import type { StatusTone } from "@/components/ui/status-pill";
import type {
  FlagLabels,
  ProcedureFlags,
} from "@/components/employee/procedure-row";
import type { Category, Subcategory } from "@/lib/types";
import type { OnboardingSummary } from "@/lib/mock-training";
import { Greeting } from "./Greeting";
import { TrainingCard } from "./TrainingCard";
import { PromoSection } from "./PromoSection";
import { StationSection } from "./StationSection";
import { OnboardingState } from "./OnboardingState";
import { LockedProceduresPreview } from "./LockedProceduresPreview";

/**
 * The employee's home: greeting, training, promos, then station procedures.
 *
 *   greeting · training · promo dishes · station procedures
 *
 * v1 removed: the Ask search box, the "Changed lately" list, the "Back to a
 * half-read recipe" list, and the Promo summary card. The home is now a single
 * scroll: a line, a card, a few promo rows, then the procedures the cook uses
 * today.
 *
 * When `onboarding` is set (orientation not yet complete), the page renders
 * the onboarding-required view instead: greeting → OnboardingState card →
 * LockedProceduresPreview (procedures dimmed + dashed, tap → /employee/training).
 * The toggle next to the greeting switches between this and the regular view.
 */

export interface HomeRow {
  key: string;
  slug: string;
  updatedAt: string;
  href: string;
  cover?: string;
  /** Manager-uploaded per-procedure icon override. Renders between the
   *  recipe photo (when present) and the per-subcategory Phosphor mark. */
  iconImageUrl?: string | null;
  category: Category | null;
  subcategory?: Pick<Subcategory, "id" | "slug"> | null;
  title: string;
  purpose?: string | null;
  meta: string;
  flags: ProcedureFlags;
  /** When true, the row renders dimmed + dashed + a lock glyph, and tapping
   *  pushes to `lockedHref` instead of opening the procedure. */
  locked?: boolean;
  lockedHref?: string;
  lockedReason?: string;
}

export interface TrainingSummary {
  heading: string;
  /** "1 of 4 done". Omit for orientation card — heading + chevron only. */
  doneLine?: string;
  /** "1 overdue", only when something is. */
  overdueLine?: string;
  done: number;
  total: number;
  /** The one thing to do next; absent when everything is done. */
  next?: {
    href: string;
    title: string;
    pill: { tone: StatusTone; text: string };
    when: string;
    action: string;
  };
  caughtUp: string;
  all: { href: string; label: string };
}

export function EmployeeHome({
  greeting,
  name,
  roleName,
  stationName,
  training,
  promo,
  assigned,
  station,
  loading = false,
  flagLabels,
  locale = "en",
  isOnboarding = false,
  greetingTrailing,
}: {
  greeting: string;
  name: string;
  roleName?: string | null;
  stationName?: string | null;
  training: TrainingSummary | null;
  promo: { heading: string; rows: HomeRow[] };
  /** Procedures directly assigned to this person (assignUsers). Rendered
   *  above the station section; null when none. */
  assigned?: { heading: string; rows: HomeRow[] } | null;
  station: {
    heading: string;
    rows: HomeRow[];
    all: { href: string; label: string };
    empty: string;
  };
  /** Procedures query still resolving — greeting/training paint, procedure
   *  rows skeletonize per section. */
  loading?: boolean;
  flagLabels: FlagLabels;
  locale?: string;
  /** When true, renders Scenario A (onboarding pending, locked procedures) */
  isOnboarding?: boolean;
  /** Optional right-aligned slot inside the Greeting — the HomeViewToggle */
  greetingTrailing?: React.ReactNode;
}): React.ReactElement {
  return (
    <>
      <Greeting
        line={greeting}
        name={name}
        roleName={roleName}
        stationName={stationName}
        trailing={greetingTrailing}
        training={training}
        locale={locale}
        isOnboarding={isOnboarding}
      />

      {isOnboarding ? (
        <LockedProceduresPreview
          promo={promo}
          station={station}
          loading={loading}
          lockedHref={`/${locale}/employee/training`}
          lockedReason="Locked until orientation is done"
          flagLabels={flagLabels}
        />
      ) : (
        <>
          <PromoSection
            heading={promo.heading}
            rows={promo.rows.map((r) => ({
              ...r,
              locked: false,
              lockedHref: undefined,
              lockedReason: undefined,
            }))}
            flagLabels={flagLabels}
            loading={loading}
          />
          {assigned && (assigned.rows.length > 0 || loading) ? (
            <StationSection
              id="assigned-h"
              heading={assigned.heading}
              rows={assigned.rows.map((r) => ({
                ...r,
                locked: false,
                lockedHref: undefined,
                lockedReason: undefined,
              }))}
              flagLabels={flagLabels}
              loading={loading}
            />
          ) : null}
          <StationSection
            id="station-h"
            heading={station.heading}
            rows={station.rows.map((r) => ({
              ...r,
              locked: false,
              lockedHref: undefined,
              lockedReason: undefined,
            }))}
            flagLabels={flagLabels}
            all={station.all}
            empty={station.empty}
            loading={loading}
          />
        </>
      )}
    </>
  );
}
