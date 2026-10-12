'use client';

import * as React from 'react';
import { useState, useTransition, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomSelect } from '@/components/ui/custom-select';
import { MultiSelectChips } from '@/components/ui/multi-select-chips';
import { PageHeader } from '@/components/admin/page-header';
import { LuUserPlus, LuLoader } from 'react-icons/lu';
import { createEmployee } from '@/services/employees/api';
import { toast } from '@/components/ui/toast';
import { fetchLocations } from '@/services/locations/api';
import { fetchJobs, fetchRoles, fetchJobStations } from '@/services/jobs/api';
import { fetchStations } from '@/services/stations/api';
import { ApiException } from '@/lib/api';
import type {
  AccessLevel,
  Employee,
  InviteResult,
  LanguagePref,
  Location,
  Role,
  Station,
} from '@/lib/types';
import { InviteResultCard } from './invite-result';

interface NewEmployeeFormProps {
  locale: string;
  locations: Location[];
  roles: Role[];
}

interface FormState {
  name: string;
  email: string;
  locationId: string;
  accessLevel: AccessLevel | '';
  roleIds: string[];
  stationIds: string[];
  employeeCode: string;
  languagePref: LanguagePref;
}

const ACCESS_LEVELS: AccessLevel[] = ['employee', 'manager'];

const initialState = (defaultLocationId: string): FormState => ({
  name: '',
  email: '',
  locationId: defaultLocationId,
  accessLevel: '',
  roleIds: [],
  stationIds: [],
  employeeCode: '',
  languagePref: 'en',
});

interface FieldErrors {
  name?: string;
  email?: string;
  locationId?: string;
  accessLevel?: string;
  roleIds?: string;
  employeeCode?: string;
}

const MAX_NAME_LENGTH = 50;
const MIN_NAME_LENGTH = 2;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewEmployeeForm({
  locale,
  locations: initialLocations,
  roles: initialRoles,
}: NewEmployeeFormProps): React.ReactElement {
  const t = useTranslations('admin');

  // Filter out any mock 'loc-main' id from initial locations
  const validInitialLocations = initialLocations.filter((l) => l.id !== 'loc-main');
  const [locations, setLocations] = useState<Location[]>(validInitialLocations);
  const [roles, setRoles] = useState<Role[]>(initialRoles);

  const defaultLocationId = validInitialLocations[0]?.id ?? '';
  const [form, setForm] = useState<FormState>(initialState(defaultLocationId));

  const [allStations, setAllStations] = useState<Station[]>([]);
  const [availableStations, setAvailableStations] = useState<Station[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isLoadingLocations, setIsLoadingLocations] = useState<boolean>(false);
  const [isLoadingRoles, setIsLoadingRoles] = useState<boolean>(false);
  const [isLoadingStations, setIsLoadingStations] = useState<boolean>(false);
  const [result, setResult] = useState<{ employee: Employee; invite: InviteResult } | null>(null);
  const [isPending, startTransition] = useTransition();
  const hasLoadedRef = React.useRef(false);
  // Role→stations fetches race when roles are toggled quickly: a slow
  // response for an older selection must not overwrite the newer one
  // (stale role sets re-add stations the manager just removed).
  const roleFetchSeq = React.useRef(0);

  // Load real locations from the API on mount (do NOT load jobs or stations yet)
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    async function loadInitial() {
      setIsLoadingLocations(true);
      try {
        const locsRes = await fetchLocations();
        if (locsRes.locations.length > 0) {
          setLocations(locsRes.locations);
          setForm((f) => ({
            ...f,
            locationId: !f.locationId || f.locationId === 'loc-main' ? locsRes.locations[0].id : f.locationId,
          }));
        }
      } catch {
        // keep fallback
      } finally {
        setIsLoadingLocations(false);
      }
    }

    void loadInitial();
  }, []);

  function clearFieldError(field: keyof FieldErrors): void {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((f) => ({ ...f, [key]: value }));
    clearFieldError(key as keyof FieldErrors);
    if (error) setError(null);
  }

  function onLocationChange(newLocationId: string): void {
    setForm((f) => ({ ...f, locationId: newLocationId }));
    clearFieldError('locationId');
    if (error) setError(null);
  }

  // Handle access level toggle:
  // When Employee is selected: fetch jobs from jobs API; keep selections empty until user selects role
  // When Manager is selected: fetch jobs and send all jobs to get all stations; preselect all jobs and all stations
  async function setAccessLevel(next: AccessLevel | ''): Promise<void> {
    clearFieldError('accessLevel');
    if (error) setError(null);

    if (next === 'manager') {
      setIsLoadingRoles(true);
      setIsLoadingStations(true);
      try {
        const { jobs: fetchedJobs } = await fetchJobs();
        const currentRoles: Role[] = fetchedJobs.map((j) => ({
          id: j.id,
          name: j.name,
          clearanceLevel: 'general',
          stationIds: [],
          createdAt: j.createdAt || new Date().toISOString(),
        }));
        setRoles(currentRoles);

        const allJobIds = fetchedJobs.map((j) => j.id);
        const { stations: fetchedStations } = await fetchJobStations(allJobIds);
        const uniqueStations: Station[] = fetchedStations.map((s, idx) => ({
          id: s.id,
          name: s.name,
          locationId: form.locationId,
          sortOrder: idx + 1,
          isArchived: false,
        }));

        setAllStations(uniqueStations);
        setAvailableStations(uniqueStations);

        // Preselect ALL job roles and ALL stations for Manager
        setForm((f) => ({
          ...f,
          accessLevel: 'manager',
          roleIds: currentRoles.map((r) => r.id),
          stationIds: uniqueStations.map((s) => s.id),
        }));
        clearFieldError('roleIds');
      } catch (err) {
        const msg =
          err instanceof ApiException && err.message
            ? err.message
            : err instanceof Error && err.message
              ? err.message
              : t('errorGeneric');
        toast.error(msg);
        setAvailableStations(allStations);
        setForm((f) => ({
          ...f,
          accessLevel: 'manager',
          roleIds: roles.map((r) => r.id),
          stationIds: allStations.map((s) => s.id),
        }));
        clearFieldError('roleIds');
      } finally {
        setIsLoadingRoles(false);
        setIsLoadingStations(false);
      }
      return;
    }

    if (next === 'employee') {
      setIsLoadingRoles(true);
      try {
        const { jobs: fetchedJobs } = await fetchJobs();
        const currentRoles: Role[] = fetchedJobs.map((j) => ({
          id: j.id,
          name: j.name,
          clearanceLevel: 'general',
          stationIds: [],
          createdAt: j.createdAt || new Date().toISOString(),
        }));
        setRoles(currentRoles);
      } catch (err) {
        const msg =
          err instanceof ApiException && err.message
            ? err.message
            : err instanceof Error && err.message
              ? err.message
              : t('errorGeneric');
        toast.error(msg);
      } finally {
        setIsLoadingRoles(false);
      }

      setAvailableStations([]);
      setForm((f) => ({
        ...f,
        accessLevel: 'employee',
        roleIds: [],
        stationIds: [],
      }));
      return;
    }

    // Switched to none
    setAvailableStations([]);
    setForm((f) => ({
      ...f,
      accessLevel: '',
      roleIds: [],
      stationIds: [],
    }));
  }

  // Handle role selection change:
  // When a role is selected/removed, call /api/v1/jobs/stations for the selected jobs.
  // If jobs are cancelled, remove stations per their job.
  async function handleRoleIdsChange(nextRoleIds: string[]): Promise<void> {
    if (nextRoleIds.length > 0) {
      clearFieldError('roleIds');
    }

    if (nextRoleIds.length === 0) {
      setAvailableStations([]);
      setForm((f) => ({
        ...f,
        roleIds: [],
        stationIds: [],
      }));
      return;
    }

    const seq = ++roleFetchSeq.current;
    setIsLoadingStations(true);
    try {
      const { stations: fetchedStations } = await fetchJobStations(nextRoleIds);
      // A newer role change already fired — this response is stale, drop it.
      if (seq !== roleFetchSeq.current) return;
      const newAvailableStations: Station[] = fetchedStations.map((s, idx) => ({
        id: s.id,
        name: s.name,
        locationId: form.locationId,
        sortOrder: idx + 1,
        isArchived: false,
      }));

      const availableStationIdSet = new Set(newAvailableStations.map((s) => s.id));

      setAvailableStations(newAvailableStations);
      setForm((f) => ({
        ...f,
        roleIds: nextRoleIds,
        // Automatically remove any stations that belonged to the cancelled/deselected job
        stationIds: f.stationIds.filter((id) => availableStationIdSet.has(id)),
      }));
    } catch (err) {
      // Surface the backend message — a stuck "Loading stations..." with
      // only a console line left the manager guessing.
      const msg =
        err instanceof ApiException && err.message
          ? err.message
          : err instanceof Error && err.message
            ? err.message
            : t('errorGeneric');
      toast.error(msg);
      setForm((f) => ({
        ...f,
        roleIds: nextRoleIds,
      }));
    } finally {
      // Only the latest request owns the flag: a stale response must not
      // clear a newer request's loading state (or the spinner flaps), and
      // a newer request must not leave a stale one spinning.
      if (seq === roleFetchSeq.current) setIsLoadingStations(false);
    }
  }

  function handleStationIdsChange(nextStationIds: string[]): void {
    setForm((f) => ({
      ...f,
      stationIds: nextStationIds,
    }));
  }

  const stationsBlockedReason = useMemo<string | undefined>(() => {
    if (!form.accessLevel || form.roleIds.length === 0) return t('stationsEmptyNeedRole');
    if (availableStations.length === 0) return t('stationsEmptyForRoles');
    return undefined;
  }, [form.accessLevel, form.roleIds.length, availableStations.length, t]);

  function reset(): void {
    setForm(initialState(locations[0]?.id ?? ''));
    setAvailableStations([]);
    setError(null);
    setFieldErrors({});
  }

  function validate(): { isValid: boolean; errors: FieldErrors; firstError: string | null } {
    const errs: FieldErrors = {};
    let firstErr: string | null = null;

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      errs.name = t('errorNeedName');
      firstErr = firstErr ?? errs.name;
    } else if (trimmedName.length < MIN_NAME_LENGTH || trimmedName.length > MAX_NAME_LENGTH) {
      errs.name = t('errorNameLength') || `Employee name must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters.`;
      firstErr = firstErr ?? errs.name;
    }

    const trimmedEmail = form.email.trim();
    if (!trimmedEmail) {
      errs.email = t('errorNeedEmail');
      firstErr = firstErr ?? errs.email;
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errs.email = t('errorInvalidEmail');
      firstErr = firstErr ?? errs.email;
    }

    if (!form.locationId) {
      errs.locationId = t('errorNeedLocation');
      firstErr = firstErr ?? errs.locationId;
    }

    if (!form.accessLevel) {
      errs.accessLevel = t('errorNeedAccessLevel');
      firstErr = firstErr ?? errs.accessLevel;
    }

    if (form.roleIds.length === 0) {
      errs.roleIds = t('errorNeedJobRole');
      firstErr = firstErr ?? errs.roleIds;
    }

    const trimmedCode = form.employeeCode.trim();
    if (trimmedCode && trimmedCode.length !== 6) {
      errs.employeeCode = t('errorNeedCode');
      firstErr = firstErr ?? errs.employeeCode;
    }

    return {
      isValid: Object.keys(errs).length === 0,
      errors: errs,
      firstError: firstErr,
    };
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setError(null);

    const { isValid, errors: validationErrors, firstError } = validate();
    if (!isValid) {
      setFieldErrors(validationErrors);
      if (firstError) {
        setError(firstError);
        toast.error(firstError);
      }
      const firstInvalidKey = Object.keys(validationErrors)[0];
      if (firstInvalidKey) {
        const el = document.getElementById(firstInvalidKey);
        el?.focus();
      }
      return;
    }

    startTransition(async () => {
      try {
        // Send EXACTLY what's checked — and only what's still offered for
        // the current roles. Anything checked but no longer available (e.g.
        // roles changed while a stations fetch failed) is dropped rather
        // than silently persisted.
        const offered = new Set(availableStations.map((s) => s.id));
        const selectedStationIds =
          offered.size > 0
            ? form.stationIds.filter((id) => offered.has(id))
            : [...form.stationIds];
        const res = await createEmployee({
          name: form.name.trim(),
          email: form.email.trim(),
          locationId: form.locationId,
          accessLevel: form.accessLevel as AccessLevel,
          roleIds: form.roleIds,
          stationIds: selectedStationIds,
          employeeCode: form.employeeCode.trim() || null,
          languagePref: form.languagePref,
        });
        // Server-truth check: the backend must echo exactly what we sent.
        // If it ever stores extras, say so loudly instead of looking saved.
        const saved = new Set(res.employee.stationIds ?? []);
        const extras = selectedStationIds.filter((id) => !saved.has(id));
        const added = [...saved].filter((id) => !selectedStationIds.includes(id));
        if (extras.length > 0 || added.length > 0) {
          toast.warning(
            `Stations mismatch: sent ${selectedStationIds.length}, saved ${saved.size}.`,
          );
        }
        toast.success(t('inviteCreatedHeading') || 'Employee invite generated successfully');
        setResult(res);
      } catch (err) {
        // Surface the backend's own message field (ApiException.message is
        // the server text) in both the inline alert and a toast — same
        // pattern as the invite-accept flow. Falls back to generic strings
        // only when the server sent no text.
        const msg =
          err instanceof ApiException && err.message
            ? err.message
            : err instanceof Error && err.message
              ? err.message
              : t('errorGeneric');
        setError(msg);
        toast.error(msg);

        // Map backend errors to inline field errors
        const newFieldErrors: FieldErrors = {};

        if (err instanceof ApiException) {
          if (err.code === 'EMAIL_TAKEN' || /email/i.test(msg)) {
            newFieldErrors.email = msg;
          }
          if (
            err.code === 'EMPLOYEE_CODE_TAKEN' ||
            /employee code/i.test(msg) ||
            /code.*taken/i.test(msg) ||
            /code.*already/i.test(msg)
          ) {
            newFieldErrors.employeeCode = msg;
          }
          if (err.code === 'LOCATION_NOT_FOUND' || /location/i.test(msg)) {
            newFieldErrors.locationId = msg;
          }
          if (err.code === 'JOB_NOT_FOUND' || /job/i.test(msg)) {
            newFieldErrors.roleIds = msg;
          }
          if (Array.isArray(err.details) && err.details.length > 0) {
            for (const d of err.details) {
              if (d.path) {
                const fieldKey = (d.path === 'jobIds' ? 'roleIds' : d.path) as keyof FieldErrors;
                newFieldErrors[fieldKey] = d.message;
              }
            }
          }
        } else if (err instanceof Error) {
          if (/email/i.test(err.message)) {
            newFieldErrors.email = err.message;
          } else if (/employee code|code/i.test(err.message)) {
            newFieldErrors.employeeCode = err.message;
          }
        }

        if (Object.keys(newFieldErrors).length > 0) {
          setFieldErrors((prev) => ({ ...prev, ...newFieldErrors }));
        }
      }
    });
  }

  if (result) {
    return (
      <InviteResultCard
        locale={locale}
        invite={result.invite}
        employeeName={result.employee.name}
        onCreateAnother={() => {
          setResult(null);
          reset();
        }}
      />
    );
  }

  const field = 'flex flex-col gap-1.5';

  return (
    <div className="mx-auto max-w-[760px] w-full space-y-6">
      <PageHeader
        title={t('newHeading')}
        subtitle={t('newDescription')}
        actions={
          <Link href={`/${locale}/admin/employees`}>
            <Button type="button" variant="neutral">
              {t('cancel')}
            </Button>
          </Link>
        }
      />

      <form onSubmit={onSubmit} noValidate className="space-y-6">
        {/* ===== Employee details ===== */}
        <FormSection
          title={t('sectionEmployeeDetails')}
          hint={t('sectionEmployeeDetailsHint')}
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 items-start">
            <div className={field}>
              <div className="flex items-center justify-between min-h-5">
                <Label htmlFor="name">{t('nameLabel')}</Label>
                <span className="text-[11px] font-medium text-[var(--color-ink-3)]">
                  {form.name.length}/{MAX_NAME_LENGTH}
                </span>
              </div>
              <Input
                id="name"
                required
                maxLength={MAX_NAME_LENGTH}
                value={form.name}
                onChange={(e) => update('name', e.target.value.slice(0, MAX_NAME_LENGTH))}
                disabled={isPending}
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                className={fieldErrors.name ? 'border-[var(--color-bad)] focus-visible:ring-[var(--color-bad)]' : ''}
              />
              {fieldErrors.name ? (
                <p id="name-error" role="alert" className="text-xs font-medium text-[var(--color-bad)]">
                  {fieldErrors.name}
                </p>
              ) : null}
            </div>

            <div className={field}>
              <div className="flex items-center justify-between min-h-5">
                <Label htmlFor="email">{t('emailLabel')}</Label>
              </div>
              <Input
                id="email"
                type="email"
                maxLength={200}
                placeholder={t('emailPlaceholder')}
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                disabled={isPending}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                className={fieldErrors.email ? 'border-[var(--color-bad)] focus-visible:ring-[var(--color-bad)]' : ''}
              />
              {fieldErrors.email ? (
                <p id="email-error" role="alert" className="text-xs font-medium text-[var(--color-bad)]">
                  {fieldErrors.email}
                </p>
              ) : null}
            </div>

            <div className={field}>
              <div className="flex items-center justify-between min-h-5">
                <Label id="locationId-label" htmlFor="locationId">
                  {t('locationLabel')}
                </Label>
              </div>
              <CustomSelect
                id="locationId"
                ariaLabelledBy="locationId-label"
                value={form.locationId}
                onChange={onLocationChange}
                disabled={isPending || isLoadingLocations || locations.length <= 1}
                isLoading={isLoadingLocations}
                options={locations.map((l) => ({ value: l.id, label: l.name }))}
              />
              {fieldErrors.locationId ? (
                <p id="locationId-error" role="alert" className="text-xs font-medium text-[var(--color-bad)]">
                  {fieldErrors.locationId}
                </p>
              ) : null}
            </div>
          </div>
        </FormSection>

        {/* ===== Access & job assignment ===== */}
        <FormSection
          title={t('sectionAccess')}
          hint={t('sectionAccessHint')}
        >
          <div className="space-y-5">
            <fieldset className={field}>
              <legend
                id="accessLevel-label"
                className="text-sm font-semibold text-[var(--color-ink)]"
              >
                {t('accessLevelLabel')}
              </legend>
              <p className="text-sm text-[var(--color-ink-2)]">
                {t('accessLevelHint')}
              </p>
              <div
                role="radiogroup"
                aria-labelledby="accessLevel-label"
                className="flex flex-wrap gap-2"
              >
                {ACCESS_LEVELS.map((level) => {
                  const selected = form.accessLevel === level;
                  const isLevelLoading = selected && (isLoadingRoles || (level === 'manager' && isLoadingStations));
                  return (
                    <label
                      key={level}
                      className={[
                        'inline-flex min-h-tap-admin cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                        selected
                          ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-tint)] text-[var(--color-brand-700)]'
                          : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-panel)]',
                        isPending || isLoadingRoles || isLoadingStations ? 'cursor-not-allowed opacity-80' : '',
                      ].join(' ')}
                    >
                      <input
                        type="radio"
                        name="accessLevel"
                        value={level}
                        checked={selected}
                        disabled={isPending || isLoadingRoles || isLoadingStations}
                        onChange={() => void setAccessLevel(level)}
                        className="sr-only"
                      />
                      {isLevelLoading ? (
                        <LuLoader className="size-3 animate-spin text-[var(--color-brand-600)]" aria-hidden="true" />
                      ) : (
                        <span
                          aria-hidden="true"
                          className={[
                            'inline-block size-2 rounded-full',
                            selected
                              ? 'bg-[var(--color-brand-600)]'
                              : 'bg-[var(--color-line-2)]',
                          ].join(' ')}
                        />
                      )}
                      {level === 'manager'
                        ? t('accessLevelManager')
                        : t('accessLevelEmployee')}
                    </label>
                  );
                })}
              </div>
              {fieldErrors.accessLevel ? (
                <p role="alert" className="text-xs font-medium text-[var(--color-bad)]">
                  {fieldErrors.accessLevel}
                </p>
              ) : null}
            </fieldset>

            <div className="grid gap-5 sm:grid-cols-2 items-start">
              <div>
                <MultiSelectChips
                  id="jobRoles"
                  label={t('jobRolesLabel')}
                  hint={t('jobRolesHint')}
                  value={form.roleIds}
                  onChange={(ids) => void handleRoleIdsChange(ids)}
                  options={roles.map((r) => ({ value: r.id, label: r.name }))}
                  disabled={isPending || !form.accessLevel || isLoadingRoles}
                  isLoading={isLoadingRoles}
                  loadingText="Loading job roles..."
                  addLabel={t('jobRolesAdd')}
                  emptyText={t('jobRolesPrompt')}
                />
                {fieldErrors.roleIds ? (
                  <p role="alert" className="mt-1.5 text-xs font-medium text-[var(--color-bad)]">
                    {fieldErrors.roleIds}
                  </p>
                ) : null}
              </div>

              <MultiSelectChips
                id="stations"
                label={t('stationsLabel')}
                hint={t('stationsHint')}
                value={form.stationIds}
                onChange={handleStationIdsChange}
                options={availableStations.map((s) => ({
                  value: s.id,
                  label: s.name || t('selectPlaceholder'),
                }))}
                disabled={isPending || (availableStations.length === 0 && !isLoadingStations)}
                isLoading={isLoadingStations}
                loadingText="Loading stations..."
                blockedReason={stationsBlockedReason}
                addLabel={t('stationsAdd')}
                emptyText={t('stationsPrompt')}
              />
            </div>
          </div>
        </FormSection>

        {/* ===== Additional details ===== */}
        <FormSection
          title={t('sectionAdditional')}
          hint={t('sectionAdditionalHint')}
        >
          <div className="grid gap-5 sm:grid-cols-2 items-start">
            <div className={field}>
              <div className="flex items-center justify-between min-h-5">
                <Label htmlFor="employeeCode">{t('employeeCodeLabel')}</Label>
              </div>
              <Input
                id="employeeCode"
                maxLength={6}
                placeholder={t('employeeCodePlaceholder')}
                value={form.employeeCode}
                onChange={(e) => update('employeeCode', e.target.value)}
                disabled={isPending}
                aria-invalid={
                  Boolean(fieldErrors.employeeCode) ||
                  (form.employeeCode.trim().length > 0 && form.employeeCode.trim().length !== 6)
                }
                aria-describedby={fieldErrors.employeeCode ? 'employeeCode-error' : 'employeeCode-hint'}
                className={fieldErrors.employeeCode ? 'border-[var(--color-bad)] focus-visible:ring-[var(--color-bad)]' : ''}
              />
              {fieldErrors.employeeCode ? (
                <p
                  id="employeeCode-error"
                  role="alert"
                  className="text-xs font-medium text-[var(--color-bad)]"
                >
                  {fieldErrors.employeeCode}
                </p>
              ) : (
                <p
                  id="employeeCode-hint"
                  className={
                    form.employeeCode.trim().length > 0 && form.employeeCode.trim().length !== 6
                      ? 'text-xs font-semibold text-[var(--color-bad)]'
                      : 'text-xs text-[var(--color-ink-2)]'
                  }
                >
                  {form.employeeCode.trim().length > 0 && form.employeeCode.trim().length !== 6
                    ? t('errorNeedCode')
                    : t('employeeCodeHint')}
                </p>
              )}
            </div>

            <div className={field}>
              <div className="flex items-center justify-between min-h-5">
                <Label id="languagePref-label" htmlFor="languagePref">
                  {t('languageLabel')}
                </Label>
              </div>
              <CustomSelect
                id="languagePref"
                ariaLabelledBy="languagePref-label"
                value={form.languagePref}
                onChange={(val) => update('languagePref', val as LanguagePref)}
                disabled={isPending}
                options={[
                  { value: 'en', label: 'English (EN)' },
                  { value: 'es', label: 'Español (ES)' },
                ]}
              />
            </div>
          </div>
        </FormSection>

        {error ? (
          <p role="alert" className="text-sm font-medium text-[var(--color-bad)]">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-3 rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-6 py-4 shadow-e1 sm:px-8">
          <Button
            type="submit"
            disabled={isPending || isLoadingLocations || isLoadingRoles || isLoadingStations}
            icon={LuUserPlus}
          >
            {isPending ? t('submitting') : t('submit')}
          </Button>
        </div>
      </form>
    </div>
  );
}

function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] px-6 py-6 shadow-e1 sm:px-8 sm:py-7">
      <header className="mb-5">
        <h2 className="text-base font-semibold text-[var(--color-ink)]">{title}</h2>
        {hint ? (
          <p className="mt-1 text-sm text-[var(--color-ink-2)]">{hint}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
