'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  LuArrowLeft,
  LuCalendar,
  LuCheck,
  LuCircleAlert,
  LuClock,
  LuCopy,
  LuMail,
  LuMapPin,
  LuPencil,
} from 'react-icons/lu';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { StatusPill, type StatusTone } from '@/components/ui/status-pill';
import { Meter } from '@/components/ui/meter';
import { ChipStack } from '@/components/admin/chip-stack';
import { FormSection } from '@/components/admin/form-section';
import {
  TrainingSummary,
  summariseTraining,
  trainingStatusTone,
} from '@/components/admin/training-summary';
import { EmployeeRowActions } from '../employee-row-actions';
import { EditRolesModal } from './edit-roles-modal';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchEmployeeById } from '@/services/employees/api';
import { useRoles } from '@/services/jobs/hooks';
import { useStations } from '@/services/stations/hooks';
import { useLocations } from '@/services/locations/hooks';
import { EMPLOYEES_UPDATED_EVENT } from '@/lib/mock-employees';
import type { UpdateEmployeeInput } from '@/lib/mock-employees';
import { getTrainingRowsForEmployee } from '@/lib/mock-training';
import type {
  AdminEmployee,
  TrainingAssignmentRow,
  TrainingAssignmentStatus,
} from '@/lib/types';

interface EmployeeDetailClientProps {
  locale: string;
  id?: string;
}

export function EmployeeDetailClient({
  locale,
  id: propId,
}: EmployeeDetailClientProps): React.ReactElement {
  const params = useParams<{ id: string }>();
  const id = propId ?? params.id;
  const router = useRouter();
  const t = useTranslations('admin');

  // The detail API is the ONE source for this page — called client-side
  // so the request is visible in the Network tab. React Query dedupes
  // StrictMode's double-mount into a single request and caches the
  // result for the session. Always live data: the backend returns the
  // active `inviteUrl` for pending employees, merged here so the banner
  // below can offer it for copy.
  const queryClient = useQueryClient();
  const employeeQuery = useQuery({
    queryKey: ['employee', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<AdminEmployee> => {
      const res = await fetchEmployeeById(id);
      if (res.employee) {
        return res.inviteUrl ? { ...res.employee, inviteUrl: res.inviteUrl } : res.employee;
      }
      throw new Error('Employee not found');
    },
    staleTime: 60_000,
  });
  const employee = employeeQuery.data ?? null;

  React.useEffect(() => {
    if (!id) return;
    const refresh = (): void => {
      void queryClient.invalidateQueries({ queryKey: ['employee', id] });
    };
    window.addEventListener('storage', refresh);
    window.addEventListener(EMPLOYEES_UPDATED_EVENT, refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener(EMPLOYEES_UPDATED_EVENT, refresh);
    };
  }, [id, queryClient]);

  // Label + edit-modal catalogs come from the shared TanStack Query cache
  // (5-min staleTime, provider defaults): one jobs + one stations + one
  // locations call per session, reused across this page, the list page
  // and the modal — no per-mount or per-location reloads.
  const { roles } = useRoles();
  const { data: stations = [] } = useStations();
  const { data: locationsData } = useLocations();
  const locations = locationsData?.locations ?? [];
  const [editOpen, setEditOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function openEdit(): void {
    if (!employee) return;
    setEditOpen(true);
  }

  // Stations come from one shared, cached global list — switching the
  // location in the modal needs no refetch.
  function onLocationChange(): void {}

  function onSaved(next: AdminEmployee, _prior: UpdateEmployeeInput, inviteUrl?: string): void {
    const merged = inviteUrl ? { ...next, inviteUrl } : next;
    if (id) {
      queryClient.setQueryData(['employee', id], merged);
    }
    if (inviteUrl) {
      // The edit modal owns the inline invite panel. Keep it open and avoid
      // a refetch/refresh replacing the fresh link before it can be copied.
      return;
    }
    if (id) {
      // Re-read the row: the PUT response only carries `inviteUrl` when it
      // just re-invited (email change). A pending employee may still hold
      // an older active link that only GET returns — refetch so the banner
      // below converges instead of waiting out the query staleTime.
      void queryClient.invalidateQueries({ queryKey: ['employee', id] });
    }
    router.refresh();
  }

  async function copyInvite(): Promise<void> {
    if (!employee?.inviteUrl) return;
    let ok = false;
    try {
      await navigator.clipboard.writeText(employee.inviteUrl);
      ok = true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = employee.inviteUrl;
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        ta.remove();
      } catch {
        ok = false;
      }
    }
    setCopied(ok);
  }

  // Lookup maps for the role / station chips
  const roleLabel = useMemo(
    () => new Map(roles.map((r) => [r.id, r.name] as const)),
    [roles],
  );
  const stationLabel = useMemo(
    () => new Map(stations.map((s) => [s.id, s.name] as const)),
    [stations],
  );

  // Job / station labels: prefer denormalised names carried by the
  // employee response itself (same shape as GET /auth/me — `jobs` /
  // `stations` arrays of {id, name}). When the backend provides them,
  // no catalog lookup is involved at all; the id→name maps from the
  // cached catalogs stay purely as a fallback for responses that still
  // return bare ids.
  const [roleLabels, stationLabels] = useMemo(() => {
    if (!employee) return [[], []];
    const denormJobs = Array.isArray(employee.jobs) ? employee.jobs : null;
    const denormStations = Array.isArray(employee.stations) ? employee.stations : null;
    const rIds = employee.roleIds ?? (employee as any).jobIds ?? [];
    const sIds = employee.stationIds ?? [];
    const nameFor = (
      xid: string,
      denorm: Array<{ id: string; name: string }> | null,
      map: Map<string, string>,
    ): string | undefined => denorm?.find((d) => d.id === xid)?.name ?? map.get(xid);
    return [
      rIds
        .map((rid: string) => nameFor(rid, denormJobs, roleLabel))
        .filter((s: string | undefined): s is string => Boolean(s)),
      sIds
        .map((sid: string) => nameFor(sid, denormStations, stationLabel))
        .filter((s: string | undefined): s is string => Boolean(s)),
    ];
  }, [employee, roleLabel, stationLabel]);

  // Resolve location name either from employee or loaded locations
  const resolvedLocationName = useMemo(() => {
    if (employee?.locationName) return employee.locationName;
    if (employee?.locationId) {
      const match = locations.find((loc) => loc.id === employee.locationId);
      if (match) return match.name;
    }
    return '';
  }, [employee?.locationName, employee?.locationId, locations]);

  const trainingRows: TrainingAssignmentRow[] = useMemo(() => {
    if (!employee?.id) return [];
    return getTrainingRowsForEmployee(employee.id);
  }, [employee?.id]);
  const trainingSummary = summariseTraining(trainingRows);

  const statusTone: StatusTone =
    employee?.status === 'active'
      ? 'ok'
      : employee?.status === 'pending'
        ? 'warn'
        : 'bad';

  const joinedLabel = employee?.createdAt
    ? new Date(employee.createdAt).toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  return (
    <div className="mx-auto max-w-page space-y-6 pb-12">
      {/* Top navigation chrome: back link on the left, Edit on the right */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/${locale}/admin/employees`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)]"
        >
          <LuArrowLeft className="size-4" aria-hidden="true" />
          <span>{t('backToList')}</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => void openEdit()}
            icon={LuPencil}
            disabled={!employee}
          >
            {t('actionsEdit')}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-start gap-4 p-6 sm:flex-nowrap">
          <Avatar initials={employee?.name ? initials(employee.name) : '—'} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold leading-display tracking-tight text-[var(--color-ink)] min-h-[32px]">
                {employee?.name ?? ''}
              </h1>
              {employee?.status && (
                <StatusPill tone={statusTone}>{t(statusKey(employee.status))}</StatusPill>
              )}
            </div>
            <p className="mt-2 text-sm text-[var(--color-ink-2)] min-h-[20px]">
              {employee
                ? oneLiner({
                    roleLabels:
                      roleLabels.length > 0
                        ? roleLabels
                        : (employee.roleIds?.length || (employee as any).jobIds?.length)
                          ? [t('detailRolesEmpty')]
                          : [],
                    stationLabels:
                      stationLabels.length > 0
                        ? stationLabels
                        : employee.stationIds?.length
                          ? [t('stationsEmpty')]
                          : [],
                    location: resolvedLocationName || null,
                  })
                : ''}
            </p>
          </div>
          <div className="shrink-0">
            {employee && (
              <EmployeeRowActions locale={locale} employee={employee} onEdit={openEdit} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending invite — the backend returns the active magic-link
          `inviteUrl` for pending employees. Offer it for copy for the
          kitchens where email delivery is unreliable. */}
      {employee?.status === 'pending' && employee?.inviteUrl ? (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-4">
          <p className="text-sm font-semibold text-[var(--color-ink)]">
            {t('inviteCreatedHeading')}
          </p>
          <p className="mt-1 text-xs text-[var(--color-ink-2)]">
            {t('inviteEmailSent')}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 break-all rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-panel)] px-3 py-2 text-xs text-[var(--color-ink-2)]">
              {employee.inviteUrl}
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void copyInvite()}
              icon={copied ? LuCheck : LuCopy}
            >
              {copied ? t('copied') : t('copyUrl')}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Employee information. Six facts in the .facts grid. */}
      <FormSection
        icon={LuCircleAlert}
        title={t('detailInfoHeading')}
        subtitle={t('detailInfoHint')}
      >
        <dl className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4 pt-1">
          <div>
            <dt className="text-sm font-medium text-[var(--color-ink-3)]">
              {t('detailFactAccessLevel')}
            </dt>
            <dd className="mt-1">
              {employee ? (
                <StatusPill tone={accessLevelTone(lmsRole(employee))}>
                  {t(accessLevelKey(lmsRole(employee)))}
                </StatusPill>
              ) : (
                <span className="text-sm text-[var(--color-ink-3)]">—</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-[var(--color-ink-3)]">
              {t('detailFactJobRole')}
            </dt>
            <dd className="mt-1 min-w-0">
              <ChipStack
                items={roleLabels}
                emptyText={employee ? t('jobRolesEmpty') : '—'}
              />
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-[var(--color-ink-3)]">
              {t('detailFactStation')}
            </dt>
            <dd className="mt-1 min-w-0">
              <ChipStack
                items={stationLabels}
                tone="station"
                emptyText={employee ? t('stationsEmpty') : '—'}
              />
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink-3)]">
              <LuMapPin className="size-4 shrink-0 text-[var(--color-ink-3)]" aria-hidden="true" />
              <span>{t('detailFactLocation')}</span>
            </dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--color-ink)]">
              {resolvedLocationName || '—'}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink-3)]">
              <LuMail className="size-4 shrink-0 text-[var(--color-ink-3)]" aria-hidden="true" />
              <span>{t('detailFactEmail')}</span>
            </dt>
            <dd className="mt-1 text-sm font-semibold">
              {employee?.email ? (
                <a
                  href={`mailto:${employee.email}`}
                  className="text-[var(--color-brand-600)] underline-offset-2 hover:underline"
                >
                  {employee.email}
                </a>
              ) : (
                <span className="text-sm text-[var(--color-ink-3)]">—</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink-3)]">
              <LuCalendar className="size-4 shrink-0 text-[var(--color-ink-3)]" aria-hidden="true" />
              <span>{t('detailFactJoined')}</span>
            </dt>
            <dd className="mt-1 text-sm font-semibold text-[var(--color-ink)]">{joinedLabel}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-[var(--color-ink-3)]">
              {t('detailFactAccountStatus')}
            </dt>
            <dd className="mt-1">
              {employee?.status ? (
                <StatusPill tone={statusTone}>{t(statusKey(employee.status))}</StatusPill>
              ) : (
                <span className="text-sm text-[var(--color-ink-3)]">—</span>
              )}
            </dd>
          </div>
        </dl>
      </FormSection>

      {/* Training overview */}
      <FormSection
        icon={LuCheck}
        title={t('detailTrainingHeading')}
        subtitle={
          trainingSummary.total > 0
            ? t('detailTrainingCount', {
                done: trainingSummary.complete,
                total: trainingSummary.total,
              })
            : t('detailTrainingHint')
        }
      >
        {trainingSummary.total === 0 ? (
          <p className="text-sm text-[var(--color-ink-2)]">
            {t('detailTrainingEmpty')}
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-6">
            <Meter
              value={trainingSummary.complete}
              total={trainingSummary.total}
              size={64}
              stroke={7}
              tone={trainingSummary.overdue > 0 ? 'warn' : 'ok'}
              label={`${trainingSummary.share}%`}
            />
            <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
              <TrainingCount
                label={t('detailTrainingCompleted')}
                value={trainingSummary.complete}
                tone="ok"
              />
              <TrainingCount
                label={t('detailTrainingInProgress')}
                value={trainingSummary.inProgress}
                tone="neutral"
              />
              <TrainingCount
                label={t('detailTrainingNotStarted')}
                value={trainingSummary.notStarted}
                tone="neutral"
              />
              <TrainingCount
                label={t('detailTrainingOverdue')}
                value={trainingSummary.overdue}
                tone="bad"
              />
            </dl>
          </div>
        )}
      </FormSection>

      {/* Assigned training list */}
      <FormSection
        icon={LuClock}
        title={t('detailAssignedHeading')}
        subtitle={t('detailAssignedHint')}
      >
        {trainingRows.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-2)]">{t('detailAssignedEmpty')}</p>
        ) : (
          <ul className="divide-y divide-[var(--color-line)]">
            {trainingRows.map((row) => (
              <li
                key={row.assignment.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-[family-name:var(--font-ui)] text-base font-semibold text-[var(--color-ink)]">
                    {row.course.titleEn}
                  </p>
                  <p className="mt-0.5 text-sm text-[var(--color-ink-3)]">
                    {row.assignment.status === 'complete'
                      ? t('detailAssignedCompleted', {
                          when: formatDate(
                            row.assignment.acknowledgedAt ??
                              row.assignment.quizPassedAt ??
                              row.assignment.dueAt,
                            locale,
                          ),
                        })
                      : t('detailAssignedDueAt', {
                          when: formatDate(row.assignment.dueAt, locale),
                        })}
                  </p>
                </div>
                <StatusPill tone={trainingStatusTone(row.effectiveStatus)}>
                  {t(trainingStatusKey(row.effectiveStatus))}
                </StatusPill>
              </li>
            ))}
          </ul>
        )}
      </FormSection>

      {/* The Edit modal — mounted only while open. The modal's job→station
          mapping effect fires on mount, so keeping it mounted while closed
          paid a jobs + stations round-trip on every page view. Its draft
          state resets on open anyway, so unmounting on close is safe. */}
      {employee && editOpen && (
        <EditRolesModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          employee={employee}
          roles={roles}
          locations={locations}
          stations={stations}
          onLocationChange={onLocationChange}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Small helpers local to the detail page.
// ----------------------------------------------------------------------------

function statusKey(status: AdminEmployee['status'] | undefined): string {
  if (status === 'active') return 'statusActive';
  if (status === 'pending') return 'statusPending';
  return 'statusDeactivated';
}

type LmsRole = 'admin' | 'manager' | 'employee';

function lmsRole(e: AdminEmployee | null | undefined): LmsRole {
  if (!e) return 'employee';
  if (e.role === 'admin' || (e.role as string) === 'super_admin') return 'admin';
  if (e.accessLevel === 'manager' || (e.role as string) === 'manager') return 'manager';
  return 'employee';
}

function accessLevelKey(role: LmsRole): string {
  if (role === 'admin') return 'accessLevelAdmin';
  if (role === 'manager') return 'accessLevelManager';
  return 'accessLevelEmployee';
}

function accessLevelTone(role: LmsRole): StatusTone {
  if (role === 'admin') return 'info';
  if (role === 'manager') return 'warn';
  return 'neutral';
}

function trainingStatusKey(status: TrainingAssignmentStatus): string {
  switch (status) {
    case 'complete':
      return 'detailAssignedStatusComplete';
    case 'in_progress':
      return 'detailAssignedStatusInProgress';
    case 'due':
      return 'detailAssignedStatusDue';
    case 'overdue':
      return 'detailAssignedStatusOverdue';
  }
}

function initials(name?: string | null): string {
  if (!name) return '—';
  const words = name.trim().split(/\s+/).slice(0, 2);
  return words.map((w) => w.charAt(0).toUpperCase()).join('') || '—';
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function oneLiner({
  roleLabels,
  stationLabels,
  location,
}: {
  roleLabels: string[];
  stationLabels: string[];
  location: string | null;
}): string {
  const parts = [roleLabels[0], stationLabels[0], location].filter(Boolean);
  return parts.join(' · ');
}

function TrainingCount({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'ok' | 'bad' | 'neutral';
}): React.ReactElement {
  const valueClass =
    tone === 'ok'
      ? 'text-[var(--color-ok)]'
      : tone === 'bad'
        ? 'text-[var(--color-bad)]'
        : 'text-[var(--color-ink-2)]';
  return (
    <div>
      <dt className="text-sm text-[var(--color-ink-3)]">{label}</dt>
      <dd className={`mt-0.5 text-md font-semibold tabular-nums ${valueClass}`}>{value}</dd>
    </div>
  );
}
