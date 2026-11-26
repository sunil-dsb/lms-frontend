import * as React from "react";
import { useState, useMemo } from "react";
import { fetchJobStations } from "@/services/jobs/api";
import type { Role, Station } from "@/lib/types";

interface UseDynamicStationsProps {
  roleIds: string[];
  locationId: string;
  roles: Role[];
  stations: Station[];
  initialStations?: Array<{ id: string; name: string }>;
  setStationIds: React.Dispatch<React.SetStateAction<string[]>>;
  needRoleMessage: string;
  stationsEmptyMessage: string;
}

export function useDynamicStations({
  roleIds,
  locationId,
  roles,
  stations,
  initialStations = [],
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
  const [isLoading, setIsLoading] = useState(false);
  const isInitialMount = React.useRef(true);
  const prevRoleIdsRef = React.useRef<string[]>([]);

  React.useEffect(() => {
    // If roleIds is empty, clear stations
    if (roleIds.length === 0) {
      setDynamicStations([]);
      // Only clear selected stationIds if this is not the initial mount or if user explicitly removed all roles
      if (!isInitialMount.current) {
        setStationIds([]);
      }
      setIsLoading(false);
      prevRoleIdsRef.current = [];
      return;
    }

    // Determine if roles actually changed after initial mount
    const rolesChanged =
      !isInitialMount.current &&
      (prevRoleIdsRef.current.length !== roleIds.length ||
        prevRoleIdsRef.current.some((id, idx) => id !== roleIds[idx]));

    prevRoleIdsRef.current = [...roleIds];

    let cancelled = false;
    setIsLoading(true);
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
          // Only filter out invalid station IDs if user explicitly changed roles
          if (rolesChanged) {
            setStationIds((prev) =>
              prev.filter((id) => mapped.some((m) => m.id === id)),
            );
          }
        } else {
          setDynamicStations([]);
          if (rolesChanged) {
            setStationIds([]);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setDynamicStations(null);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
          isInitialMount.current = false;
        }
      });
    return () => {
      cancelled = true;
    };
  }, [roleIds, locationId, setStationIds]);

  const availableStations = useMemo<Station[]>(() => {
    if (roleIds.length === 0) return [];

    const baseList: Station[] =
      dynamicStations !== null
        ? dynamicStations
        : stations.filter((s) => stationsCoveredByRoles.has(s.id));

    // Also include any catalog stations matching the roles or existing selections
    // to ensure no station is missing from options or chip labels
    const seen = new Set(baseList.map((s) => s.id));
    const merged = [...baseList];

    for (const initStation of initialStations) {
      if (initStation.id && !seen.has(initStation.id)) {
        seen.add(initStation.id);
        merged.push({
          id: initStation.id,
          name: initStation.name,
          locationId,
          sortOrder: merged.length + 1,
          isArchived: false,
        });
      }
    }

    for (const s of stations) {
      if (!seen.has(s.id) && stationsCoveredByRoles.has(s.id)) {
        seen.add(s.id);
        merged.push(s);
      }
    }

    return merged;
  }, [
    roleIds.length,
    dynamicStations,
    stations,
    stationsCoveredByRoles,
    initialStations,
    locationId,
  ]);

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
    isLoading,
    stationsBlockedReason,
  };
}
