"use client";

import { useTranslations } from "next-intl";
import { LuLoader } from "react-icons/lu";
import type { ReactNode } from "react";
import { CustomSelect } from "@/components/ui/custom-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelectChips } from "@/components/ui/multi-select-chips";
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

const field = "flex flex-col gap-1.5";

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
            <span className="text-[11px] font-medium text-[var(--color-ink-3)]">
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
  isPending,
  isLoadingRoles,
  isLoadingStations,
  stationsBlockedReason,
  onAccessChange,
  onRolesChange,
  onStationsChange,
}: {
  form: FormState;
  fieldErrors: FieldErrors;
  roles: Role[];
  stations: Station[];
  isPending: boolean;
  isLoadingRoles: boolean;
  isLoadingStations: boolean;
  stationsBlockedReason?: string;
  onAccessChange: (level: AccessLevel) => void;
  onRolesChange: (ids: string[]) => void;
  onStationsChange: (ids: string[]) => void;
}) {
  const t = useTranslations("admin");
  return (
    <FormSection title={t("sectionAccess")} hint={t("sectionAccessHint")}>
      <div className="space-y-5">
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
            {(["employee", "manager"] as const).map((level) => {
              const selected = form.accessLevel === level;
              const loading =
                selected &&
                (isLoadingRoles || (level === "manager" && isLoadingStations));
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
                    disabled={isPending || isLoadingRoles || isLoadingStations}
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
                  {level === "manager"
                    ? t("accessLevelManager")
                    : t("accessLevelEmployee")}
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
              disabled={isPending || !form.accessLevel || isLoadingRoles}
              isLoading={isLoadingRoles}
              loadingText="Loading job roles..."
              addLabel={t("jobRolesAdd")}
              emptyText={t("jobRolesPrompt")}
            />
            {fieldErrors.roleIds ? (
              <p
                role="alert"
                className="mt-1.5 text-xs font-medium text-[var(--color-bad)]"
              >
                {fieldErrors.roleIds}
              </p>
            ) : null}
          </div>
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
        </div>
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
