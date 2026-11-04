"use client";

import * as React from "react";
import { useState, useTransition, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LuChefHat, LuShield } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CustomSelect } from "@/components/ui/custom-select";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { MultiSelectDropdown } from "@/components/ui/multi-select-dropdown";
import {
  fetchEmployeeById,
  resendInvite,
  updateEmployee,
  type UpdateEmployeeRequest,
} from "@/services/employees/api";
import type { UpdateEmployeeInput } from "@/services/employees/types";
import { ApiException } from "@/lib/errors";
import type { AdminEmployee, Role, Station } from "@/lib/types";
import { useDynamicStations } from "./use-dynamic-stations";
import { EditRolesInviteBox } from "./edit-roles-invite-box";

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
  onSaved: (
    next: AdminEmployee,
    prior: UpdateEmployeeInput,
    inviteUrl?: string,
  ) => void;
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
  const t = useTranslations("admin");
  const isEs = useLocale() === "es";
  const [pending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  // Fresh magic-link invite returned when saving re-invites a pending
  // employee (email change). Shown in place of the form with a copy
  // button — email delivery can't be relied on in every kitchen.
  const [savedInvite, setSavedInvite] = useState<string | null>(null);
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
  type Tier = "manager" | "employee";

  const [name, setName] = useState<string>(employee.name);
  const [email, setEmail] = useState<string>(employee.email ?? "");
  const [locationId, setLocationId] = useState<string>(employee.locationId);
  const initialTier: Tier =
    employee.accessLevel ??
    (employee.role === "manager" ? "manager" : "employee");
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
    setEmail(employee.email ?? "");
    setLocationId(employee.locationId);
    setTier(
      employee.accessLevel ??
        (employee.role === "manager" ? "manager" : "employee"),
    );
    setRoleIds(employee.roleIds);
    setStationIds(employee.stationIds);
    setSaveError(null);
    setSavedInvite(null);
    setInviteFresh(false);
    setInviteEmpty(false);
    setInviteLoading(false);
  }, [open, employee.id]);

  // Stations are location-scoped. Drop any already-selected stations that
  // don't exist at the new location so the save payload never carries an
  // orphan id (same rule as the invite form).
  React.useEffect(() => {
    setStationIds((prev) =>
      prev.filter((id) => stations.some((s) => s.id === id)),
    );
  }, [stations]);

  const { availableStations, stationsBlockedReason } = useDynamicStations({
    roleIds,
    locationId,
    roles,
    stations,
    setStationIds,
    needRoleMessage: t("detailEditRolesNeedRole"),
    stationsEmptyMessage: t("stationsEmptyForRoles"),
  });

  function onTierChange(next: Tier): void {
    if (next === "manager") {
      setTier("manager");
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
    name.trim().length > 0 && locationId !== "" && roleIds.length > 0;

  const dirty =
    name.trim() !== employee.name ||
    email.trim() !== (employee.email ?? "") ||
    locationId !== employee.locationId ||
    tier !==
      (employee.accessLevel ??
        (employee.role === "manager" ? "manager" : "employee")) ||
    JSON.stringify(roleIds) !== JSON.stringify(employee.roleIds) ||
    JSON.stringify(stationIds) !== JSON.stringify(employee.stationIds);

  function onSave(): void {
    if (!canSave || pending) return;
    setSaveError(null);
    // The backend validates PUT against the full create schema (minus
    // employeeCode): every field travels, including the current status and
    // language (an omitted status would default back to `pending`).
    const effectiveEmail = email.trim() || employee.email || "";
    if (!effectiveEmail) {
      setSaveError(t("errorNeedEmail"));
      return;
    }
    const prior: UpdateEmployeeInput = {
      name: employee.name,
      email: employee.email ?? null,
      locationId: employee.locationId,
      accessLevel:
        employee.accessLevel ??
        (employee.role === "manager" ? "manager" : "employee"),
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
      role:
        employee.role === "super_admin"
          ? "super_admin"
          : tier === "manager"
            ? "manager"
            : "employee",
      jobIds: [...roleIds],
      stationIds: [...stationIds],
      languagePref: employee.languagePref ?? "en",
      status: employee.status,
    };
    startTransition(async () => {
      try {
        const { employee: updated, inviteUrl } = await updateEmployee(
          employee.id,
          payload,
        );
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
          return;
        }
        onSaved(updated, prior);
        // No fresh link in the PUT response (email unchanged, or the row
        // was already invited): a pending employee may still hold an
        // active link that only GET returns. Re-read (side-effect free)
        // and surface it instead of closing silently.
        if (updated.status === "pending") {
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
        setSaveError(
          err instanceof ApiException
            ? err.message
            : err instanceof Error
              ? err.message
              : String(err),
        );
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
          onSaved(
            { ...employee, inviteUrl: invite.url },
            {
              name: employee.name,
              email: employee.email ?? null,
              locationId: employee.locationId,
              accessLevel: employee.accessLevel ?? "employee",
              role: employee.role,
              roleIds: [...employee.roleIds],
              stationIds: [...employee.stationIds],
            },
            invite.url,
          );
          setSavedInvite(invite.url);
          setInviteFresh(true);
          setInviteEmpty(false);
        } else {
          setSaveError(
            isEs
              ? "No se pudo generar el enlace."
              : "Could not generate the link.",
          );
        }
      } catch (err) {
        setSaveError(
          err instanceof ApiException
            ? err.message
            : err instanceof Error
              ? err.message
              : String(err),
        );
      } finally {
        setInviteLoading(false);
      }
    });
  }

  // When the link box appears it can sit below the fold of the
  // scrollable modal body — bring it into view so the link + copy
  // button are never hidden behind the footer.
  React.useEffect(() => {
    if (!savedInvite) return;
    inviteBoxRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [savedInvite]);

  return (
    <Modal open={open} onClose={closeModal} size="2xl">
      <ModalHeader
        title={t("detailEditProfileHeading")}
        description={employee.name}
        onClose={closeModal}
        closeLabel={t("detailEditRolesCancel")}
      />
      <ModalBody className="space-y-4 p-5 sm:p-6">
        {/* ===== Profile: Name & Email on row 1, Location on row 2 ===== */}
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">{t("nameLabel")}</Label>
              <Input
                id="edit-name"
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">{t("emailLabel")}</Label>
              <Input
                id="edit-email"
                type="email"
                maxLength={200}
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label id="edit-locationId-label" htmlFor="edit-locationId">
              {t("locationLabel")}
            </Label>
            <CustomSelect
              id="edit-locationId"
              ariaLabelledBy="edit-locationId-label"
              value={locationId}
              onChange={onLocationChangeLocal}
              options={locations.map((l) => ({
                value: l.id,
                label: l.name,
              }))}
            />
          </div>
        </div>

        {/* ===== Access level ===== */}
        <div className="border-t border-[var(--color-line)] pt-4">
          <fieldset className="grid gap-2 pb-1">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <LuShield
                  className="size-4 text-[var(--color-ink-2)]"
                  aria-hidden="true"
                />
                <legend
                  id="edit-accessLevel-label"
                  className="text-sm font-semibold text-[var(--color-ink)]"
                >
                  {t("accessLevelLabel")}
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
              {(["manager", "employee"] as Tier[]).map((opt) => {
                const selected = tier === opt;
                return (
                  <label
                    key={opt}
                    className={[
                      "inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                      selected
                        ? "border-[var(--color-brand-600)] bg-[var(--color-brand-600)] text-white shadow-xs"
                        : "border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-panel)]",
                    ].join(" ")}
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
                        "inline-block size-2 shrink-0 rounded-full",
                        selected ? "bg-white" : "bg-[var(--color-line-2)]",
                      ].join(" ")}
                    />
                    <span>
                      {opt === "manager"
                        ? t("accessLevelManager")
                        : t("accessLevelEmployee")}
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
              <LuChefHat
                className="size-4 text-[var(--color-ink-2)]"
                aria-hidden="true"
              />
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
              label={t("jobRolesLabel")}
              value={roleIds}
              onChange={onRolesChange}
              options={roles.map((r) => ({ value: r.id, label: r.name }))}
              placeholder={t("jobRolesPrompt")}
            />

            <MultiSelectDropdown
              id="edit-stations"
              label={t("stationsLabel")}
              value={stationIds}
              onChange={setStationIds}
              options={availableStations.map((s) => ({
                value: s.id,
                label: s.name,
              }))}
              disabled={roleIds.length === 0}
              blockedReason={stationsBlockedReason}
              placeholder={t("stationsPrompt")}
            />
          </div>
        </div>

        {/* Fresh invite link box */}
        <EditRolesInviteBox
          inviteLoading={inviteLoading}
          savedInvite={savedInvite}
          inviteEmpty={inviteEmpty}
          inviteFresh={inviteFresh}
          isEs={isEs}
          inviteBoxRef={inviteBoxRef}
          onResendInvite={onResendInvite}
          labels={{
            inviteCreatedHeading: t("inviteCreatedHeading"),
            inviteUrlLabel: t("inviteUrlLabel"),
            inviteEmailSent: t("inviteEmailSent"),
            copied: t("copied"),
            copyUrl: t("copyUrl"),
            submitting: t("submitting"),
          }}
        />
      </ModalBody>
      <ModalFooter>
        {/* Cancel first per the focus rule (DESIGN.md §3.6). */}
        <Button
          type="button"
          variant="neutral"
          onClick={closeModal}
          disabled={pending}
        >
          {t("detailEditRolesCancel")}
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {saveError ? (
            <p
              role="alert"
              className="min-w-0 flex-1 text-left text-xs font-medium text-[var(--color-bad)]"
            >
              {saveError}
            </p>
          ) : null}
          <Button
            type="button"
            variant="primary"
            onClick={onSave}
            disabled={!canSave || !dirty || pending}
          >
            {t("detailEditRolesSave")}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
