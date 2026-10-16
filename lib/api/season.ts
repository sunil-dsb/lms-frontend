import type { ActiveSeason } from "../types";
import { setStored } from "../api-storage";

export function getActiveSeason(): ActiveSeason {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      localStorage.getItem("lms_active_season") ||
      localStorage.getItem("lms_demo_active_season");
    if (!raw) return null;
    const parsed = raw.startsWith('"') ? JSON.parse(raw) : raw;
    return parsed === "summer" || parsed === "winter" ? parsed : null;
  } catch {
    return null;
  }
}

export function setActiveSeason(season: ActiveSeason): void {
  if (typeof window === "undefined") return;
  try {
    if (season) {
      localStorage.setItem("lms_active_season", season);
      setStored("active_season", season);
    } else {
      localStorage.removeItem("lms_active_season");
      localStorage.removeItem("lms_demo_active_season");
    }
    window.dispatchEvent(new Event("lms_active_season_updated"));
  } catch {
    // Ignore storage errors
  }
}
