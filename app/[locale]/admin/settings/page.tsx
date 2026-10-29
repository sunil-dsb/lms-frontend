import * as React from "react";
import { cookies } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  listLocations,
  listRoles,
  listStations,
  ApiException,
} from "@/lib/api";
import type { Location, Role, Station } from "@/lib/types";
import { PageHeader } from "@/components/admin/page-header";
import { FilterChips } from "@/components/ui/filter-chips";
import { SettingsView } from "./settings-view";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function SettingsPage({
  params,
}: PageProps): Promise<React.ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  let stations: Station[] = [];
  let roles: Role[] = [];
  let locations: Location[] = [];
  let loadError: string | null = null;

  await Promise.all([
    listRoles(cookieHeader)
      .then((r) => {
        roles = r.roles;
      })
      .catch((err: unknown) => {
        if (err instanceof ApiException) loadError = err.code;
        else loadError = "UNKNOWN";
      }),
    listLocations(cookieHeader)
      .then((r) => {
        locations = r.locations;
      })
      .catch((err: unknown) => {
        if (err instanceof ApiException) loadError = err.code;
        else loadError = "UNKNOWN";
      }),
    listStations(undefined, cookieHeader)
      .then((r) => {
        stations = r.stations;
      })
      .catch((err: unknown) => {
        if (err instanceof ApiException) loadError = err.code;
        else loadError = "UNKNOWN";
      }),
  ]);

  const t = await getTranslations("admin");

  return (
    <>
      <PageHeader
        title={t("settingsHeading")}
        subtitle={t("settingsSubtitle")}
      />

      {loadError ? (
        <p role="alert" className="text-sm text-[var(--color-bad)]">
          {loadError}
        </p>
      ) : null}

      <SettingsView
        stations={stations}
        roles={roles}
        locations={locations}
        labels={{
          stationsHeading: t("settingsTabStations"),
          rolesHeading: t("settingsTabRoles"),
          locationsHeading: t("settingsTabLocations"),
          addStation: t("settingsAddStation"),
          addRole: t("settingsAddRole"),
          addLocation: t("settingsAddLocation"),
          emptyStations: t("stationsEmpty"),
          emptyRoles: t("rolesEmpty"),
          emptyLocations: t("locationsEmpty"),
          employeesPlaceholder: t("settingsPanelEmployeesPlaceholder"),
          drawerClose: t("drawerClose"),
          stationName: t("stationsFieldName"),
          stationCreateHeading: t("stationsCreateHeading"),
          stationCreate: t("stationsCreate"),
          stationCreating: t("stationsCreating"),
          stationCancel: t("actionsCancel"),
          stationSave: t("actionsSave"),
          stationDelete: t("actionsDelete"),
          stationEdit: t("actionsEdit"),
          errorGeneric: t("errorGeneric"),
          errorNotFound: t("errorNotFound"),
          roleCreateHeading: t("rolesCreateHeading"),
          roleCreate: t("rolesCreate"),
          roleCreating: t("rolesCreating"),
          roleCancel: t("actionsCancel"),
          roleSave: t("actionsSave"),
          roleName: t("rolesFieldName"),
          roleStations: t("rolesFieldStations"),
          roleStationsHint: t("rolesFieldStationsHint"),
          roleStationsEmpty: t("rolesFieldStationsEmpty"),
          roleDelete: t("actionsDelete"),
          roleEdit: t("actionsEdit"),
          roleErrorInUse: t("rolesErrorInUse"),
          locationCreateHeading: t("locationsCreateHeading"),
          locationCreate: t("locationsCreate"),
          locationCreating: t("locationsCreating"),
          locationCancel: t("actionsCancel"),
          locationSave: t("actionsSave"),
          locationName: t("locationsFieldName"),
          locationDelete: t("actionsDelete"),
          locationEdit: t("actionsEdit"),
          locationErrorInUse: t("locationsErrorInUse"),
          rowActionsLabel: t("rowActionsLabel"),
        }}
      />
    </>
  );
}
