import * as React from "react";
import { useState, useMemo } from "react";
import { fetchJobStations } from "@/services/jobs/api";
import type { Role, Station } from "@/lib/types";

interface UseDynamicStationsProps {
  roleIds: string[];
  locationId: string;
  roles: Role[];
  stations: Station[];
  setStationIds: React.Dispatch<React.SetStateAction<string[]>>;
  needRoleMessage: string;
  stationsEmptyMessage: string;
}

export function useDynamicStations({
  roleIds,
  locationId,
  roles,
  stations,
  setStationIds,
  needRoleMessage,
  stationsEmptyMessage,
}: UseDynamicStationsProps) {
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

  const [dynamicStations, setDynamicStations] = useState<Station[] | null>(
    null,
  );

  React.useEffect(() => {
    if (roleIds.length === 0) {
      setDynamicStations([]);
      setStationIds([]);
      return;
    }
    let cancelled = false;
    void fetchJobStations(roleIds)
      .then((res) => {
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
          setStationIds((prev) =>
            prev.filter((id) => mapped.some((m) => m.id === id)),
          );
        } else {
          setDynamicStations([]);
          setStationIds([]);
        }
      })
      .catch(() => {
        if (!cancelled) setDynamicStations(null);
      });
    return () => {
      cancelled = true;
    };
  }, [roleIds, locationId, setStationIds]);

  const availableStations = useMemo<Station[]>(() => {
    if (roleIds.length === 0) return [];
    if (dynamicStations !== null) return dynamicStations;
    return stations.filter((s) => stationsCoveredByRoles.has(s.id));
  }, [roleIds.length, stations, dynamicStations, stationsCoveredByRoles]);

  const stationsBlockedReason = useMemo<string | undefined>(() => {
    if (roleIds.length === 0) return needRoleMessage;
    if (availableStations.length === 0) return stationsEmptyMessage;
    return undefined;
  }, [
    roleIds.length,
    availableStations.length,
    needRoleMessage,
    stationsEmptyMessage,
  ]);

  return {
    availableStations,
    stationsBlockedReason,
  };
}
