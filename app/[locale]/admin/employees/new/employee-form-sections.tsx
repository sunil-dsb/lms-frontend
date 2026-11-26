"use client";

import { useTranslations } from "next-intl";
import { LuLoader } from "react-icons/lu";
import type { ReactNode } from "react";
import { CustomSelect } from "@/components/ui/custom-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelectChips } from "@/components/ui/multi-select-chips";
import { getAllowedInviteRoles } from "@/lib/rbac";
import type {
  AccessLevel,
  LanguagePref,
  Location,
  Role,
  Station,
} from "@/lib/types";
import type { FieldErrors, FormState } from "./new-employee-form";

function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-line-2)] bg-[var(--color-surface)] p-6 shadow-e1 sm:p-8">
      <header className="mb-5">
        <h2 className="text-base font-semibold text-[var(--color-ink)]">
          {title}
        </h2>
        {hint ? (
          <p className="mt-1 text-sm text-[var(--color-ink-2)]">{hint}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}

const field = "flex flex-col gap-2";

export function EmployeeDetailsSection({
  form,
  fieldErrors,
  locations,
  isPending,
  isLoadingLocations,
  onUpdate,
  onLocationChange,
}: {
  form: FormState;
  fieldErrors: FieldErrors;
  locations: Location[];
  isPending: boolean;
  isLoadingLocations: boolean;
  onUpdate: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onLocationChange: (id: string) => void;
}) {
  const t = useTranslations("admin");
  return (
    <FormSection
      title={t("sectionEmployeeDetails")}
      hint={t("sectionEmployeeDetailsHint")}
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 items-start">
        <div className={field}>
          <div className="flex items-center justify-between min-h-5">
            <Label htmlFor="name">{t("nameLabel")}</Label>
            <span className="text-xs font-medium text-[var(--color-ink-3)]">
              {form.name.length}/50
            </span>
          </div>
          <Input
            id="name"
            required
            maxLength={50}
            value={form.name}
            onChange={(e) => onUpdate("name", e.target.value.slice(0, 50))}
            disabled={isPending}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? "name-error" : undefined}
            className={
              fieldErrors.name
                ? "border-[var(--color-bad)] focus-visible:ring-[var(--color-bad)]"
                : ""
            }
          />
          {fieldErrors.name ? (
            <p
              id="name-error"
              role="alert"
              className="text-xs font-medium text-[var(--color-bad)]"
            >
              {fieldErrors.name}
            </p>
          ) : null}
        </div>
        <div className={field}>
          <Label htmlFor="email">{t("emailLabel")}</Label>
          <Input
            id="email"
            type="email"
            maxLength={200}
            placeholder={t("emailPlaceholder")}
            value={form.email}
            onChange={(e) => onUpdate("email", e.target.value)}
            disabled={isPending}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            className={
              fieldErrors.email
                ? "border-[var(--color-bad)] focus-visible:ring-[var(--color-bad)]"
                : ""
            }
          />
          {fieldErrors.email ? (
            <p
              id="email-error"
              role="alert"
              className="text-xs font-medium text-[var(--color-bad)]"
            >
              {fieldErrors.email}
            </p>
          ) : null}
        </div>
        <div className={field}>
          <Label id="locationId-label" htmlFor="locationId">
            {t("locationLabel")}
          </Label>
          <CustomSelect
            id="locationId"
            ariaLabelledBy="locationId-label"
            value={form.locationId}
            onChange={onLocationChange}
            disabled={isPending || isLoadingLocations || locations.length <= 1}
            isLoading={isLoadingLocations}
            options={locations.map((location) => ({
              value: location.id,
              label: location.name,
            }))}
          />
          {fieldErrors.locationId ? (
            <p
              id="locationId-error"
              role="alert"
              className="text-xs font-medium text-[var(--color-bad)]"
            >
              {fieldErrors.locationId}
            </p>
          ) : null}
        </div>
      </div>
    </FormSection>
  );
}

export function EmployeeAccessSection({
  form,
  fieldErrors,
  roles,
  stations,
  supervisors = [],
  managers = [],
  currentUserRole,
  hideAccessLevel = false,
  isPending,
  isLoadingRoles,
  isLoadingStations,
  isLoadingSupervisors = false,
  isLoadingManagers = false,
  stationsBlockedReason,
  onAccessChange,
  onRolesChange,
  onStationsChange,
  onSupervisorsChange,
  onManagersChange,
}: {
  form: FormState;
  fieldErrors: FieldErrors;
  roles: Role[];
  stations: Station[];
  supervisors?: Array<{ id: string; name: string; email: string }>;
  managers?: Array<{ id: string; name: string; email: string }>;
  currentUserRole?: string | null;
  hideAccessLevel?: boolean;
  isPending: boolean;
  isLoadingRoles: boolean;
  isLoadingStations: boolean;
  isLoadingSupervisors?: boolean;
  isLoadingManagers?: boolean;
  stationsBlockedReason?: string;
  onAccessChange: (level: AccessLevel) => void;
  onRolesChange: (ids: string[]) => void;
  onStationsChange: (ids: string[]) => void;
  onSupervisorsChange: (ids: string[]) => void;
  onManagersChange: (ids: string[]) => void;
}) {
  const t = useTranslations("admin");
  const allowedRoles = getAllowedInviteRoles(currentUserRole);

  const getRoleLabel = (level: AccessLevel): string => {
    if (level === "manager") return t("accessLevelManager") || "Manager";
    if (level === "supervisor") return "Supervisor";
    return t("accessLevelEmployee") || "Employee";
  };

  return (
    <FormSection title={t("sectionAccess")} hint={t("sectionAccessHint")}>
      <div className="space-y-6">
        {!hideAccessLevel ? (
          <fieldset className={field}>
            <legend
              id="accessLevel-label"
              className="text-sm font-semibold text-[var(--color-ink)]"
            >
              {t("accessLevelLabel")}
            </legend>
            <p className="text-sm text-[var(--color-ink-2)]">
              {t("accessLevelHint")}
            </p>
            <div
              role="radiogroup"
              aria-labelledby="accessLevel-label"
              className="flex flex-wrap gap-2"
            >
              {allowedRoles.map((level) => {
                const selected = form.accessLevel === level;
                const loading =
                  selected &&
                  (isLoadingRoles ||
                    (level === "manager" && isLoadingStations));
                return (
                  <label
                    key={level}
                    className={`inline-flex min-h-tap-admin cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${selected ? "border-[var(--color-brand-600)] bg-[var(--color-brand-tint)] text-[var(--color-brand-700)]" : "border-[var(--color-line-2)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:bg-[var(--color-panel)]"} ${isPending || isLoadingRoles || isLoadingStations ? "cursor-not-allowed opacity-80" : ""}`}
                  >
                    <input
                      type="radio"
                      name="accessLevel"
                      value={level}
                      checked={selected}
                      disabled={
                        isPending || isLoadingRoles || isLoadingStations
                      }
                      onChange={() => onAccessChange(level)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={`inline-block size-2 rounded-full ${selected ? "bg-[var(--color-brand-600)]" : "bg-[var(--color-line-2)]"}`}
                    />
                    {loading ? (
                      <LuLoader
                        className="size-3 animate-spin text-[var(--color-brand-600)]"
                        aria-hidden="true"
                      />
                    ) : null}
                    {getRoleLabel(level)}
                  </label>
                );
              })}
            </div>
            {fieldErrors.accessLevel ? (
              <p
                role="alert"
                className="text-xs font-medium text-[var(--color-bad)]"
              >
                {fieldErrors.accessLevel}
              </p>
            ) : null}
          </fieldset>
        ) : null}

        {/* Dynamic Reporting Hierarchy Selector */}
        {form.accessLevel === "employee" ? (
          <div className="space-y-2 rounded-xl border border-[var(--color-line-2)] bg-[var(--color-field)]/40 p-4">
            <MultiSelectChips
              id="reportingSupervisors"
              label="Reporting Supervisor(s)"
              hint="Assign one or more supervisors overseeing this employee across shifts and kitchen stations."
              value={form.supervisorIds}
              onChange={onSupervisorsChange}
              options={supervisors.map((s) => ({
                value: s.id,
                label: s.name,
              }))}
              disabled={
                isPending || (supervisors.length === 0 && !isLoadingSupervisors)
              }
              isLoading={isLoadingSupervisors}
              loadingText="Loading supervisors..."
              addLabel="Add Supervisor"
              emptyText="No supervisors registered for this location yet"
            />
            {fieldErrors.supervisorIds ? (
              <p
                role="alert"
                className="text-xs font-medium text-[var(--color-bad)]"
              >
                {fieldErrors.supervisorIds}
              </p>
            ) : null}
          </div>
        ) : null}

        {form.accessLevel === "supervisor" ? (
          <div className="space-y-2 rounded-xl border border-[var(--color-line-2)] bg-[var(--color-field)]/40 p-4">
            <MultiSelectChips
              id="reportingManagers"
              label="Reporting Manager(s)"
              hint="Assign the location manager(s) or general managers this supervisor reports to."
              value={form.managerIds}
              onChange={onManagersChange}
              options={managers.map((m) => ({
                value: m.id,
                label: m.name,
              }))}
              disabled={
                isPending || (managers.length === 0 && !isLoadingManagers)
              }
              isLoading={isLoadingManagers}
              loadingText="Loading managers..."
              addLabel="Add Manager"
              emptyText="No managers registered for this location yet"
            />
            {fieldErrors.managerIds ? (
              <p
                role="alert"
                className="text-xs font-medium text-[var(--color-bad)]"
              >
                {fieldErrors.managerIds}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Kitchen Job Roles & Stations - Relevant ONLY for kitchen employees */}
        {form.accessLevel === "employee" ? (
          <div className="grid gap-5 sm:grid-cols-2 items-start">
            <div>
              <MultiSelectChips
                id="jobRoles"
                label={t("jobRolesLabel")}
                hint={t("jobRolesHint")}
                value={form.roleIds}
                onChange={onRolesChange}
                options={roles.map((role) => ({
                  value: role.id,
                  label: role.name,
                }))}
                disabled={isPending || isLoadingRoles}
                isLoading={isLoadingRoles}
                loadingText="Loading job roles..."
                addLabel={t("jobRolesAdd")}
                emptyText={t("jobRolesPrompt")}
              />
              {fieldErrors.roleIds ? (
                <p
                  role="alert"
                  className="mt-2 text-xs font-medium text-[var(--color-bad)]"
                >
                  {fieldErrors.roleIds}
                </p>
              ) : null}
            </div>
            <div>
              <MultiSelectChips
                id="stations"
                label={t("stationsLabel")}
                hint={t("stationsHint")}
                value={form.stationIds}
                onChange={onStationsChange}
                options={stations.map((station) => ({
                  value: station.id,
                  label: station.name || t("selectPlaceholder"),
                }))}
                disabled={
                  isPending || (stations.length === 0 && !isLoadingStations)
                }
                isLoading={isLoadingStations}
                loadingText="Loading stations..."
                blockedReason={stationsBlockedReason}
                addLabel={t("stationsAdd")}
                emptyText={t("stationsPrompt")}
              />
              {fieldErrors.stationIds ? (
                <p
                  role="alert"
                  className="mt-2 text-xs font-medium text-[var(--color-bad)]"
                >
                  {fieldErrors.stationIds}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </FormSection>
  );
}

export function EmployeeAdditionalSection({
  form,
  fieldErrors,
  isPending,
  onUpdate,
}: {
  form: FormState;
  fieldErrors: FieldErrors;
  isPending: boolean;
  onUpdate: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  const t = useTranslations("admin");
  return (
    <FormSection
      title={t("sectionAdditional")}
      hint={t("sectionAdditionalHint")}
    >
      <div className="grid gap-5 sm:grid-cols-2 items-start">
        <div className={field}>
          <Label htmlFor="employeeCode">{t("employeeCodeLabel")}</Label>
          <Input
            id="employeeCode"
            maxLength={6}
            placeholder={t("employeeCodePlaceholder")}
            value={form.employeeCode}
            onChange={(e) => onUpdate("employeeCode", e.target.value)}
            disabled={isPending}
            aria-invalid={
              Boolean(fieldErrors.employeeCode) ||
              (form.employeeCode.trim().length > 0 &&
                form.employeeCode.trim().length !== 6)
            }
            aria-describedby={
              fieldErrors.employeeCode
                ? "employeeCode-error"
                : "employeeCode-hint"
            }
            className={
              fieldErrors.employeeCode
                ? "border-[var(--color-bad)] focus-visible:ring-[var(--color-bad)]"
                : ""
            }
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
                form.employeeCode.trim().length > 0 &&
                form.employeeCode.trim().length !== 6
                  ? "text-xs font-semibold text-[var(--color-bad)]"
                  : "text-xs text-[var(--color-ink-2)]"
              }
            >
              {form.employeeCode.trim().length > 0 &&
              form.employeeCode.trim().length !== 6
                ? t("errorNeedCode")
                : t("employeeCodeHint")}
            </p>
          )}
        </div>
        <div className={field}>
          <Label id="languagePref-label" htmlFor="languagePref">
            {t("languageLabel")}
          </Label>
          <CustomSelect
            id="languagePref"
            ariaLabelledBy="languagePref-label"
            value={form.languagePref}
            onChange={(value) =>
              onUpdate("languagePref", value as LanguagePref)
            }
            disabled={isPending}
            options={[
              { value: "en", label: "English (EN)" },
              { value: "es", label: "Español (ES)" },
            ]}
          />
        </div>
      </div>
    </FormSection>
  );
}

export function EmployeePersonalSection({
  form,
  fieldErrors,
  isPending,
  onUpdate,
}: {
  form: FormState;
  fieldErrors: FieldErrors;
  isPending: boolean;
  onUpdate: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  return (
    <FormSection
      title="Personal & Contact Details"
      hint="Personal information, residential address, and contact number."
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 items-start">
        <div className={field}>
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <Input
            id="dateOfBirth"
            type="date"
            max={new Date().toISOString().split("T")[0]}
            value={form.dateOfBirth}
            onChange={(e) => onUpdate("dateOfBirth", e.target.value)}
            disabled={isPending}
            aria-invalid={Boolean(fieldErrors.dateOfBirth)}
            aria-describedby={
              fieldErrors.dateOfBirth ? "dateOfBirth-error" : undefined
            }
            className={
              fieldErrors.dateOfBirth
                ? "border-[var(--color-bad)] focus-visible:ring-[var(--color-bad)]"
                : ""
            }
          />
          {fieldErrors.dateOfBirth ? (
            <p
              id="dateOfBirth-error"
              role="alert"
              className="text-xs font-medium text-[var(--color-bad)]"
            >
              {fieldErrors.dateOfBirth}
            </p>
          ) : null}
        </div>

        <div className={field}>
          <Label htmlFor="fathersName">Father&apos;s Name</Label>
          <Input
            id="fathersName"
            maxLength={100}
            placeholder="Father's full name"
            value={form.fathersName}
            onChange={(e) => onUpdate("fathersName", e.target.value)}
            disabled={isPending}
            aria-invalid={Boolean(fieldErrors.fathersName)}
            aria-describedby={
              fieldErrors.fathersName ? "fathersName-error" : undefined
            }
            className={
              fieldErrors.fathersName
                ? "border-[var(--color-bad)] focus-visible:ring-[var(--color-bad)]"
                : ""
            }
          />
          {fieldErrors.fathersName ? (
            <p
              id="fathersName-error"
              role="alert"
              className="text-xs font-medium text-[var(--color-bad)]"
            >
              {fieldErrors.fathersName}
            </p>
          ) : null}
        </div>

        <div className={field}>
          <Label id="gender-label" htmlFor="gender">
            Gender
          </Label>
          <CustomSelect
            id="gender"
            ariaLabelledBy="gender-label"
            value={form.gender}
            onChange={(value) => onUpdate("gender", value as any)}
            disabled={isPending}
            placeholder="Select gender"
            options={[
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
              { value: "other", label: "Other" },
              { value: "prefer_not_to_say", label: "Prefer not to say" },
            ]}
          />
          {fieldErrors.gender ? (
            <p
              id="gender-error"
              role="alert"
              className="text-xs font-medium text-[var(--color-bad)]"
            >
              {fieldErrors.gender}
            </p>
          ) : null}
        </div>

        <div className="sm:col-span-2 flex flex-col gap-2">
          <Label htmlFor="address">Residential Address</Label>
          <Input
            id="address"
            maxLength={300}
            placeholder="Street address, apartment/suite, city, province"
            value={form.address}
            onChange={(e) => onUpdate("address", e.target.value)}
            disabled={isPending}
            aria-invalid={Boolean(fieldErrors.address)}
            aria-describedby={fieldErrors.address ? "address-error" : undefined}
            className={
              fieldErrors.address
                ? "border-[var(--color-bad)] focus-visible:ring-[var(--color-bad)]"
                : ""
            }
          />
          {fieldErrors.address ? (
            <p
              id="address-error"
              role="alert"
              className="text-xs font-medium text-[var(--color-bad)]"
            >
              {fieldErrors.address}
            </p>
          ) : null}
        </div>

        <div className={field}>
          <Label htmlFor="phoneNumber">Personal Phone Number</Label>
          <Input
            id="phoneNumber"
            type="tel"
            maxLength={20}
            placeholder="e.g. 416-555-0199 or +1 416 555 0199"
            value={form.phoneNumber}
            onChange={(e) => onUpdate("phoneNumber", e.target.value)}
            disabled={isPending}
            aria-invalid={Boolean(fieldErrors.phoneNumber)}
            aria-describedby={
              fieldErrors.phoneNumber ? "phoneNumber-error" : undefined
            }
            className={
              fieldErrors.phoneNumber
                ? "border-[var(--color-bad)] focus-visible:ring-[var(--color-bad)]"
                : ""
            }
          />
          {fieldErrors.phoneNumber ? (
            <p
              id="phoneNumber-error"
              role="alert"
              className="text-xs font-medium text-[var(--color-bad)]"
            >
              {fieldErrors.phoneNumber}
            </p>
          ) : (
            <p className="text-xs text-[var(--color-ink-3)]">
              10-15 digits (e.g. 416-555-0199 or +1 416 555 0199)
            </p>
          )}
        </div>
      </div>
    </FormSection>
  );
}

export function EmployeeEmergencySection({
  form,
  fieldErrors,
  isPending,
  onUpdate,
}: {
  form: FormState;
  fieldErrors: FieldErrors;
  isPending: boolean;
  onUpdate: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  return (
    <FormSection
      title="Emergency Contact"
      hint="Primary emergency point of contact in case of workplace incidents."
    >
      <div className="grid gap-5 sm:grid-cols-3 items-start">
        <div className={field}>
          <Label htmlFor="emergencyContactName">Contact Full Name</Label>
          <Input
            id="emergencyContactName"
            maxLength={100}
            placeholder="Emergency contact name"
            value={form.emergencyContactName}
            onChange={(e) => onUpdate("emergencyContactName", e.target.value)}
            disabled={isPending}
            aria-invalid={Boolean(fieldErrors.emergencyContactName)}
            aria-describedby={
              fieldErrors.emergencyContactName
                ? "emergencyContactName-error"
                : undefined
            }
            className={
              fieldErrors.emergencyContactName
                ? "border-[var(--color-bad)] focus-visible:ring-[var(--color-bad)]"
                : ""
            }
          />
          {fieldErrors.emergencyContactName ? (
            <p
              id="emergencyContactName-error"
              role="alert"
              className="text-xs font-medium text-[var(--color-bad)]"
            >
              {fieldErrors.emergencyContactName}
            </p>
          ) : null}
        </div>

        <div className={field}>
          <Label htmlFor="emergencyContactRelation">Relationship</Label>
          <Input
            id="emergencyContactRelation"
            maxLength={50}
            placeholder="e.g. Spouse, Parent, Sibling"
            value={form.emergencyContactRelation}
            onChange={(e) =>
              onUpdate("emergencyContactRelation", e.target.value)
            }
            disabled={isPending}
            aria-invalid={Boolean(fieldErrors.emergencyContactRelation)}
            aria-describedby={
              fieldErrors.emergencyContactRelation
                ? "emergencyContactRelation-error"
                : undefined
            }
            className={
              fieldErrors.emergencyContactRelation
                ? "border-[var(--color-bad)] focus-visible:ring-[var(--color-bad)]"
                : ""
            }
          />
          {fieldErrors.emergencyContactRelation ? (
            <p
              id="emergencyContactRelation-error"
              role="alert"
              className="text-xs font-medium text-[var(--color-bad)]"
            >
              {fieldErrors.emergencyContactRelation}
            </p>
          ) : null}
        </div>

        <div className={field}>
          <Label htmlFor="emergencyContactPhone">Emergency Phone Number</Label>
          <Input
            id="emergencyContactPhone"
            type="tel"
            maxLength={20}
            placeholder="e.g. 416-555-0188"
            value={form.emergencyContactPhone}
            onChange={(e) => onUpdate("emergencyContactPhone", e.target.value)}
            disabled={isPending}
            aria-invalid={Boolean(fieldErrors.emergencyContactPhone)}
            aria-describedby={
              fieldErrors.emergencyContactPhone
                ? "emergencyContactPhone-error"
                : undefined
            }
            className={
              fieldErrors.emergencyContactPhone
                ? "border-[var(--color-bad)] focus-visible:ring-[var(--color-bad)]"
                : ""
            }
          />
          {fieldErrors.emergencyContactPhone ? (
            <p
              id="emergencyContactPhone-error"
              role="alert"
              className="text-xs font-medium text-[var(--color-bad)]"
            >
              {fieldErrors.emergencyContactPhone}
            </p>
          ) : (
            <p className="text-xs text-[var(--color-ink-3)]">
              10-15 digits (e.g. 416-555-0188)
            </p>
          )}
        </div>
      </div>
    </FormSection>
  );
}

export function EmployeePayrollSection({
  form,
  fieldErrors,
  isPending,
  onUpdate,
}: {
  form: FormState;
  fieldErrors: FieldErrors;
  isPending: boolean;
  onUpdate: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  return (
    <FormSection
      title="Employment & Compensation"
      hint="Start date, Social Insurance Number, and base compensation rate."
    >
      <div className="grid gap-5 sm:grid-cols-3 items-start">
        <div className={field}>
          <Label htmlFor="startDate">Start / Joining Date</Label>
          <Input
            id="startDate"
            type="date"
            value={form.startDate}
            onChange={(e) => onUpdate("startDate", e.target.value)}
            disabled={isPending}
            aria-invalid={Boolean(fieldErrors.startDate)}
            aria-describedby={
              fieldErrors.startDate ? "startDate-error" : undefined
            }
            className={
              fieldErrors.startDate
                ? "border-[var(--color-bad)] focus-visible:ring-[var(--color-bad)]"
                : ""
            }
          />
          {fieldErrors.startDate ? (
            <p
              id="startDate-error"
              role="alert"
              className="text-xs font-medium text-[var(--color-bad)]"
            >
              {fieldErrors.startDate}
            </p>
          ) : null}
        </div>

        <div className={field}>
          <Label htmlFor="sinNumber">Social Insurance Number (SIN)</Label>
          <Input
            id="sinNumber"
            maxLength={11}
            placeholder="123-456-789"
            value={form.sinNumber}
            onChange={(e) => onUpdate("sinNumber", e.target.value)}
            disabled={isPending}
            aria-invalid={Boolean(fieldErrors.sinNumber)}
            aria-describedby={
              fieldErrors.sinNumber ? "sinNumber-error" : undefined
            }
            className={
              fieldErrors.sinNumber
                ? "border-[var(--color-bad)] focus-visible:ring-[var(--color-bad)]"
                : ""
            }
          />
          {fieldErrors.sinNumber ? (
            <p
              id="sinNumber-error"
              role="alert"
              className="text-xs font-medium text-[var(--color-bad)]"
            >
              {fieldErrors.sinNumber}
            </p>
          ) : (
            <p className="text-xs text-[var(--color-ink-3)]">
              Canadian 9-digit format (stored securely).
            </p>
          )}
        </div>

        <div className={field}>
          <Label htmlFor="hourlyRate">Per Hour Rate ($)</Label>
          <Input
            id="hourlyRate"
            type="number"
            step="0.01"
            min="0.01"
            max="9999.99"
            placeholder="21.50"
            value={form.hourlyRate}
            onChange={(e) => onUpdate("hourlyRate", e.target.value)}
            disabled={isPending}
            aria-invalid={Boolean(fieldErrors.hourlyRate)}
            aria-describedby={
              fieldErrors.hourlyRate ? "hourlyRate-error" : undefined
            }
            className={
              fieldErrors.hourlyRate
                ? "border-[var(--color-bad)] focus-visible:ring-[var(--color-bad)]"
                : ""
            }
          />
          {fieldErrors.hourlyRate ? (
            <p
              id="hourlyRate-error"
              role="alert"
              className="text-xs font-medium text-[var(--color-bad)]"
            >
              {fieldErrors.hourlyRate}
            </p>
          ) : (
            <p className="text-xs text-[var(--color-ink-3)]">
              Base rate (e.g. $21.50/hr, max $9,999.99)
            </p>
          )}
        </div>
      </div>
    </FormSection>
  );
}
