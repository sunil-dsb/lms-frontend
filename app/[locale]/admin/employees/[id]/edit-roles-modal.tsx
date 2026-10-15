'use client';

import * as React from 'react';
import { useState, useTransition, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { LuChefHat, LuCheck, LuCopy, LuLoader, LuShield } from 'react-icons/lu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CustomSelect } from '@/components/ui/custom-select';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/modal';
import { MultiSelectDropdown } from '@/components/ui/multi-select-dropdown';
import {
  fetchEmployeeById,
  resendInvite,
  updateEmployee,
  type UpdateEmployeeRequest,
} from '@/services/employees/api';
import type { UpdateEmployeeInput } from '@/services/employees/types';
import { ApiException } from '@/lib/errors';
import { fetchJobStations } from '@/services/jobs/api';
import type { AdminEmployee, Role, Station } from '@/lib/types';

interface EditRolesModalProps {
  open: boolean;
  onClose: () => void;
  employee: AdminEmployee;
  /** Roles catalog (small, fetched once on first open). */
  roles: Role[];
  /** Locations catalog for the location select. */
  locations: Array<{ id: string; name: string }>;
  /** Stations at the current working location — the page reloads these
   *  every time the user changes location inside the modal. */
  stations: Station[];
  /** Page-owned hook so the modal can ask for a fresh station list when
   *  the working location changes. */
  onLocationChange: (locationId: string) => Promise<void> | void;
  /** Called after a successful save. The detail page uses this to refresh
   *  the local employee state and call `router.refresh()`. The toast is a
   *  separate later UI task that captures `prior` for an Undo. `inviteUrl`
   *  arrives when the backend re-invited a pending employee (email change)
   *  so the detail page can surface the fresh link. */
  onSaved: (next: AdminEmployee, prior: UpdateEmployeeInput, inviteUrl?: string) => void;
}

/**
 * Full edit modal for an existing employee. Lets the admin change name,
 * email, location, access tier (Manager / Employee), kitchen job role(s),
 * and station(s) in one save.
 *
 * Behaviour parity with the invite form (`new/new-employee-form.tsx`):
 *   - Job roles first.
 *   - Stations gated until at least one role is picked.
 *   - Stations scoped to the selected location (re-fetched on change).
 *   - Save disabled until name, location, access level, and ≥1 role.
 *
 * Access level is exposed as a Manager / Employee radio. Admin is a seeded
 * role (Raúl) and is not editable here — the picker cannot move anyone
 * into or out of the Admin tier; it only moves Manager ⇄ Employee inside
 * the standard 'employee' role bucket.
 *
 * Focus on open lands on Cancel, not Save (DESIGN.md §3.6). The body's
 * first interactive control is the Name input — so a sighted user can
 * keep typing rather than losing their place. The Cancel `autoFocus`
 * covers the keyboard path.
 */
export function EditRolesModal({
  open,
  onClose,
  employee,
  roles,
  locations,
  stations,
  onLocationChange,
  onSaved,
}: EditRolesModalProps): React.ReactElement {
  const t = useTranslations('admin');
  const isEs = useLocale() === 'es';
  const [pending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  // Fresh magic-link invite returned when saving re-invites a pending
  // employee (email change). Shown in place of the form with a copy
  // button — email delivery can't be relied on in every kitchen.
  const [savedInvite, setSavedInvite] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteFresh, setInviteFresh] = useState(false);
  const [inviteEmpty, setInviteEmpty] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const inviteBoxRef = React.useRef<HTMLDivElement | null>(null);
  const deferredInviteSave = React.useRef<{
    employee: AdminEmployee;
    prior: UpdateEmployeeInput;
    inviteUrl: string;
  } | null>(null);

  function closeModal(): void {
    const deferred = deferredInviteSave.current;
    if (deferred) {
      deferredInviteSave.current = null;
      onSaved(deferred.employee, deferred.prior, deferred.inviteUrl);
    }
    onClose();
  }

  // Working form state — mirrors the invite form's shape, plus email-as-string
  // (the type carries `null` for "no email" which we materialise as '').
  // Access is a two-way Manager / Employee choice — Admin is a seeded role
  // only and is not exposed as a destination; anyone already an admin keeps
  // their tier (the radio just won't let you change to / away from it).
  type Tier = 'manager' | 'employee';

  const [name, setName] = useState<string>(employee.name);
  const [email, setEmail] = useState<string>(employee.email ?? '');
  const [locationId, setLocationId] = useState<string>(employee.locationId);
  const initialTier: Tier = employee.accessLevel ?? (employee.role === 'manager' ? 'manager' : 'employee');
  const [tier, setTier] = useState<Tier>(initialTier);
  const [roleIds, setRoleIds] = useState<string[]>(employee.roleIds);
  const [stationIds, setStationIds] = useState<string[]>(employee.stationIds);

  // Reset the working state whenever the modal opens — a previous edit's
  // draft must not leak into the next one. The invite box starts hidden:
  // it appears only as a result of pressing Save (fresh link from the
  // PUT, or the active link re-read for a pending employee).
  React.useEffect(() => {
    if (!open) return;
    setName(employee.name);
    setEmail(employee.email ?? '');
    setLocationId(employee.locationId);
    setTier(employee.accessLevel ?? (employee.role === 'manager' ? 'manager' : 'employee'));
    setRoleIds(employee.roleIds);
    setStationIds(employee.stationIds);
    setSaveError(null);
    setSavedInvite(null);
    setCopied(false);
    setInviteFresh(false);
    setInviteEmpty(false);
    setInviteLoading(false);
  }, [open, employee.id]);

  // Stations are location-scoped. Drop any already-selected stations that
  // don't exist at the new location so the save payload never carries an
  // orphan id (same rule as the invite form).
  React.useEffect(() => {
    setStationIds((prev) => prev.filter((id) => stations.some((s) => s.id === id)));
  }, [stations]);

  // Job→station mapping: each Role carries the stations it works on
  // (Line Cook → gm/grill/expo, Prep Cook → prep, Dishwasher → dish).
  // Manager bypasses the filter and shows every station at the location.
  const roleById = useMemo<Map<string, Role>>(
    () => new Map(roles.map((r) => [r.id, r])),
    [roles],
  );

  const stationsCoveredByRoles = useMemo<Set<string>>(() => {
    const covered = new Set<string>();
    for (const roleId of roleIds) {
      const role = roleById.get(roleId);
      if (!role) continue;
      if (role.stationIds.length === 0) {
        return new Set(stations.map((s) => s.id));
      }
      for (const stationId of role.stationIds) covered.add(stationId);
    }
    return covered;
  }, [roleIds, roleById, stations]);

  const [dynamicStations, setDynamicStations] = useState<Station[] | null>(null);

  React.useEffect(() => {
    if (roleIds.length === 0) {
      setDynamicStations([]);
      setStationIds([]);
      return;
    }
    let cancelled = false;
    void fetchJobStations(roleIds).then((res) => {
      if (cancelled) return;
      if (res.stations.length > 0) {
        const mapped = res.stations.map((s, idx) => ({
          id: s.id,
          name: s.name,
          locationId,
          sortOrder: idx + 1,
          isArchived: false,
        }));
        setDynamicStations(mapped);
        // Automatically drop stations that are no longer valid for the remaining roleIds
        setStationIds((prev) => prev.filter((id) => mapped.some((m) => m.id === id)));
      } else {
        setDynamicStations([]);
        setStationIds([]);
      }
    }).catch(() => {
      if (!cancelled) setDynamicStations(null);
    });
    return () => {
      cancelled = true;
    };
  }, [roleIds, locationId]);

  const availableStations = useMemo<Station[]>(() => {
    if (roleIds.length === 0) return [];
    if (dynamicStations !== null) return dynamicStations;
    return stations.filter((s) => stationsCoveredByRoles.has(s.id));
  }, [roleIds.length, stations, dynamicStations, stationsCoveredByRoles]);

  const stationsBlockedReason = useMemo<string | undefined>(() => {
    if (roleIds.length === 0) return t('detailEditRolesNeedRole');
    if (availableStations.length === 0) return t('stationsEmptyForRoles');
    return undefined;
  }, [roleIds.length, availableStations.length, t]);

  function onTierChange(next: Tier): void {
    if (next === 'manager') {
      setTier('manager');
      setRoleIds(roles.map((r) => r.id));
      setStationIds(stations.map((s) => s.id));
      return;
    }
    setTier(next);
    setRoleIds([]);
    setStationIds([]);
  }

  function onRolesChange(next: string[]): void {
    setRoleIds(next);
  }

  function onLocationChangeLocal(newLocationId: string): void {
    setLocationId(newLocationId);
    // Stations reload happens in the page (parent owns the catalog).
    void onLocationChange(newLocationId);
  }

  const canSave =
    name.trim().length > 0 &&
    locationId !== '' &&
    roleIds.length > 0;

  // Compare against the persisted employee to decide whether Save is even
  // meaningful — disabled when nothing changed keeps the action honest.
  const priorSnapshot = JSON.stringify({
    name: employee.name,
    email: employee.email ?? '',
    locationId: employee.locationId,
    role: employee.role,
    accessLevel: employee.accessLevel,
    roleIds: employee.roleIds,
    stationIds: employee.stationIds,
  });
  const nextSnapshot = JSON.stringify({
    name: name.trim(),
    email: email.trim(),
    locationId,
    role: employee.role,
    accessLevel: tier,
    roleIds,
    stationIds,
  });
  const dirty = priorSnapshot !== nextSnapshot;

  function onSave(): void {
    if (!canSave || pending) return;
    setSaveError(null);
    // The backend validates PUT against the full create schema (minus
    // employeeCode): every field travels, including the current status and
    // language (an omitted status would default back to `pending`).
    const effectiveEmail = email.trim() || employee.email || '';
    if (!effectiveEmail) {
      setSaveError(t('errorNeedEmail'));
      return;
    }
    const prior: UpdateEmployeeInput = {
      name: employee.name,
      email: employee.email ?? null,
      locationId: employee.locationId,
      accessLevel: employee.accessLevel ?? (employee.role === 'manager' ? 'manager' : 'employee'),
      role: employee.role,
      roleIds: [...employee.roleIds],
      stationIds: [...employee.stationIds],
    };
    const payload: UpdateEmployeeRequest = {
      name: name.trim(),
      email: effectiveEmail,
      locationId,
      // Backend role enum is super_admin | manager | employee. Admins keep
      // their tier; everyone else follows the Manager ⇄ Employee picker.
      role: employee.role === 'super_admin' ? 'super_admin' : tier === 'manager' ? 'manager' : 'employee',
      jobIds: [...roleIds],
      stationIds: [...stationIds],
      languagePref: employee.languagePref ?? 'en',
      status: employee.status,
    };
    startTransition(async () => {
      try {
        const { employee: updated, inviteUrl } = await updateEmployee(employee.id, payload);
        if (inviteUrl) {
          // Fresh link, just mailed to the new address: show it and stay
          // open — the admin copies it here and closes the modal themself.
          deferredInviteSave.current = {
            employee: { ...updated, inviteUrl },
            prior,
            inviteUrl,
          };
          setSavedInvite(inviteUrl);
          setInviteFresh(true);
          setInviteEmpty(false);
          setCopied(false);
          return;
        }
        onSaved(updated, prior);
        // No fresh link in the PUT response (email unchanged, or the row
        // was already invited): a pending employee may still hold an
        // active link that only GET returns. Re-read (side-effect free)
        // and surface it instead of closing silently.
        if (updated.status === 'pending') {
          setInviteLoading(true);
          try {
            const refetched = await fetchEmployeeById(employee.id);
            if (refetched.inviteUrl) {
              onSaved(
                { ...refetched.employee, inviteUrl: refetched.inviteUrl },
                prior,
                refetched.inviteUrl,
              );
              setSavedInvite(refetched.inviteUrl);
              setInviteFresh(false);
              setInviteEmpty(false);
              setCopied(false);
              return;
            }
          } catch {
            // Read failed — fall through to the empty state below, which
            // offers an explicit resend instead of closing silently.
          } finally {
            setInviteLoading(false);
          }
          // Pending, saved, but no active link anywhere (usually expired):
          // stay open on an explicit resend offer — never close silently.
          setInviteEmpty(true);
          return;
        }
        // Close on save only when there is no link on screen. A visible
        // link means the admin is here to copy it — they close the modal
        // themself.
        if (!savedInvite) onClose();
      } catch (err) {
        setSaveError(err instanceof ApiException ? err.message : err instanceof Error ? err.message : String(err));
      }
    });
  }

  // Last resort for a pending save with no link: mint a fresh invite
  // (explicit admin tap — this mails the employee).
  function onResendInvite(): void {
    setSaveError(null);
    setInviteLoading(true);
    startTransition(async () => {
      try {
        const { invite } = await resendInvite(employee.id);
        if (invite.url) {
          onSaved({ ...employee, inviteUrl: invite.url }, {
            name: employee.name,
            email: employee.email ?? null,
            locationId: employee.locationId,
            accessLevel: employee.accessLevel ?? 'employee',
            role: employee.role,
            roleIds: [...employee.roleIds],
            stationIds: [...employee.stationIds],
          }, invite.url);
          setSavedInvite(invite.url);
          setInviteFresh(true);
          setInviteEmpty(false);
          setCopied(false);
        } else {
          setSaveError(isEs ? 'No se pudo generar el enlace.' : 'Could not generate the link.');
        }
      } catch (err) {
        setSaveError(err instanceof ApiException ? err.message : err instanceof Error ? err.message : String(err));
      } finally {
        setInviteLoading(false);
      }
    });
  }

  async function copyInvite(): Promise<void> {
    if (!savedInvite) return;
    let ok = false;
    try {
      await navigator.clipboard.writeText(savedInvite);
      ok = true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = savedInvite;
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

  // When the link box appears it can sit below the fold of the
  // scrollable modal body — bring it into view so the link + copy
  // button are never hidden behind the footer.
  React.useEffect(() => {
    if (!savedInvite) return;
    inviteBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [savedInvite]);

  const locationOptions = locations;

  return (
    <Modal open={open} onClose={closeModal} size="2xl">
      <ModalHeader
        title={t('detailEditProfileHeading')}
        description={employee.name}
        onClose={closeModal}
        closeLabel={t('detailEditRolesCancel')}
      />
      <ModalBody className="space-y-4 p-5 sm:p-6">
        {/* ===== Profile: Name & Email on row 1, Location on row 2 ===== */}
        <div className="grid gap-3.5">
          <div className="grid gap-3.5 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-name">{t('nameLabel')}</Label>
              <Input
                id="edit-name"
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-email">{t('emailLabel')}</Label>
              <Input
                id="edit-email"
                type="email"
                maxLength={200}
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label id="edit-locationId-label" htmlFor="edit-locationId">
              {t('locationLabel')}
            </Label>
            <CustomSelect
              id="edit-locationId"
              ariaLabelledBy="edit-locationId-label"
              value={locationId}
              onChange={onLocationChangeLocal}
              options={locationOptions.map((l) => ({ value: l.id, label: l.name }))}
            />
          </div>
        </div>

        {/* ===== Access level ===== */}
        <div className="border-t border-[var(--color-line)] pt-4">
          <fieldset className="grid gap-2 pb-1">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <LuShield className="size-4 text-[var(--color-ink-2)]" aria-hidden="true" />
                <legend
                  id="edit-accessLevel-label"
                  className="text-sm font-semibold text-[var(--color-ink)]"
                >
                  {t('accessLevelLabel')}
                </legend>
              </div>
              <p className="mt-0.5 text-xs text-[var(--color-ink-2)]">
                Controls permissions in the LMS.
              </p>
            </div>
            <div
              role="radiogroup"
              aria-labelledby="edit-accessLevel-label"
              className="mt-3 flex flex-wrap items-center gap-3"
            >
              {(['manager', 'employee'] as Tier[]).map((opt) => {
                const selected = tier === opt;
                return (
                  <label
                    key={opt}
                    className={[
                      'inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                      selected
                        ? 'border-[var(--color-brand-600)] bg-[var(--color-brand-600)] text-white shadow-xs'
                        : 'border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-panel)]',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="edit-accessLevel"
                      value={opt}
                      checked={selected}
                      onChange={() => onTierChange(opt)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={[
                        'inline-block size-2 shrink-0 rounded-full',
                        selected
                          ? 'bg-white'
                          : 'bg-[var(--color-line-2)]',
                      ].join(' ')}
                    />
                    <span>
                      {opt === 'manager'
                        ? t('accessLevelManager')
                        : t('accessLevelEmployee')}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>

        {/* ===== Kitchen assignment ===== */}
        <div className="border-t border-[var(--color-line)] pt-4 pb-3 sm:pb-4">
          <div className="mb-3 flex flex-col">
            <div className="flex items-center gap-2">
              <LuChefHat className="size-4 text-[var(--color-ink-2)]" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-[var(--color-ink)]">
                Kitchen assignment
              </h3>
            </div>
            <p className="mt-0.5 text-xs text-[var(--color-ink-2)]">
              Station and role assignments in the kitchen.
            </p>
          </div>

          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <MultiSelectDropdown
              id="edit-job-roles"
              label={t('jobRolesLabel')}
              value={roleIds}
              onChange={onRolesChange}
              options={roles.map((r) => ({ value: r.id, label: r.name }))}
              placeholder={t('jobRolesPrompt')}
            />

            <MultiSelectDropdown
              id="edit-stations"
              label={t('stationsLabel')}
              value={stationIds}
              onChange={setStationIds}
              options={availableStations.map((s) => ({ value: s.id, label: s.name }))}
              disabled={roleIds.length === 0}
              blockedReason={stationsBlockedReason}
              placeholder={t('stationsPrompt')}
            />
          </div>
        </div>

        {/* Fresh invite link, appended last: saving re-invites a pending
            employee when their email changes (or the reads above find
            their active link). Stays in this same modal with a copy
            button — email delivery can't be relied on in every kitchen.
            While the link is being fetched the box reads as generating,
            never as a sent link with nothing under it. */}
        {inviteLoading || savedInvite || inviteEmpty ? (
          <div ref={inviteBoxRef} className="border-t border-[var(--color-line)] pt-4">
            {savedInvite ? (
              <>
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  {inviteFresh ? t('inviteCreatedHeading') : t('inviteUrlLabel')}
                </p>
                {inviteFresh ? (
                  <p className="mt-0.5 text-xs text-[var(--color-ink-2)]">
                    {t('inviteEmailSent')}
                  </p>
                ) : null}
                <p className="mt-2 break-all rounded-[var(--radius-md)] border border-[var(--color-line-2)] bg-[var(--color-panel)] px-3 py-2 text-xs text-[var(--color-ink-2)]">
                  {savedInvite}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void copyInvite()}
                  icon={copied ? LuCheck : LuCopy}
                  className="mt-2"
                >
                  {copied ? t('copied') : t('copyUrl')}
                </Button>
              </>
            ) : inviteEmpty ? (
              <>
                <p className="text-sm font-semibold text-[var(--color-ink)]">
                  {t('inviteUrlLabel')}
                </p>
                <p className="mt-0.5 text-xs text-[var(--color-ink-2)]">
                  {isEs
                    ? 'No hay ningún enlace activo. Genera uno nuevo para este empleado pendiente.'
                    : 'There is no active link. Generate a fresh one for this pending employee.'}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onResendInvite}
                  icon={LuCopy}
                  className="mt-2"
                  disabled={inviteLoading}
                >
                  {isEs ? 'Generar enlace' : 'Generate link'}
                </Button>
              </>
            ) : (
              <p className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-ink-2)]">
                <LuLoader className="size-4 animate-spin text-[var(--color-brand-600)]" aria-hidden="true" />
                <span>{t('submitting')}</span>
              </p>
            )}
          </div>
        ) : null}
      </ModalBody>
      <ModalFooter>
        {/* Cancel first per the focus rule (DESIGN.md §3.6). */}
        <Button type="button" variant="neutral" onClick={closeModal} disabled={pending}>
          {t('detailEditRolesCancel')}
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {saveError ? (
            <p role="alert" className="min-w-0 flex-1 text-left text-xs font-medium text-[var(--color-bad)]">
              {saveError}
            </p>
          ) : null}
          <Button
            type="button"
            variant="primary"
            onClick={onSave}
            disabled={!canSave || !dirty || pending}
          >
            {t('detailEditRolesSave')}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
