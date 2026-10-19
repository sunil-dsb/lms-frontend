import type {
  ActiveSeason,
  AdminEmployee,
  ApiError,
  Category,
  ClearanceLevel,
  CreateEmployeeInput,
  CreateLocationInput,
  CreateProcedureInput,
  CreateRoleInput,
  CreateStationInput,
  Employee,
  EmployeeRole,
  EmployeeStatus,
  InviteResult,
  Location,
  Procedure,
  ProcedureQuizMode,
  Role,
  Station,
  Subcategory,
  UpdateLocationInput,
  UpdateRoleInput,
  UpdateStationInput,
} from "../types";
import { http } from "../http";
import { ApiException } from "../errors";
import { AUTH_ENDPOINTS } from "@/services/auth/endpoints";
import { lookupInvite as authLookupInvite } from "@/services/auth/api";
import { setStored } from "../api-storage";

export interface LoginInput {
  email?: string;
  name?: string;
  password?: string;
  locationId?: string;
  deviceMode?: "personal" | "shared";
}

export async function login(
  input: LoginInput,
): Promise<{ employee: Employee }> {
  const { data } = await http.post<{
    success: boolean;
    data: {
      token: string;
      user: { id: string; name: string; email: string };
      employee?: Employee;
      role?: string;
    };
  }>(AUTH_ENDPOINTS.LOGIN, {
    email: input.email,
    password: input.password,
  });

  const token = data.data?.token;

  if (typeof window !== "undefined" && token) {
    localStorage.setItem("token", token);
    document.cookie = `lms_token=${token}; path=/; max-age=864000; SameSite=Lax`;
  }

  let emp: Employee;
  if (data.data?.employee) {
    emp = data.data.employee;
  } else if (data.data?.role) {
    emp = {
      id: data.data.user.id,
      name: data.data.user.name,
      email: data.data.user.email,
      role: data.data.role as EmployeeRole,
      locationId: "",
      roleIds: [],
      stationIds: [],
      languagePref: "en",
    };
  } else {
    const meRes = await fetchMe();
    emp = meRes.employee;
  }

  if (typeof window !== "undefined") {
    setStored("current_user", emp);
    document.cookie = `lms_role=${emp.role}; path=/; max-age=864000; SameSite=Lax`;
    document.cookie = `lms_emp_id=${emp.id}; path=/; max-age=864000; SameSite=Lax`;
  }

  return { employee: emp };
}

export async function logout(): Promise<{ ok: true }> {
  try {
    await http.post(AUTH_ENDPOINTS.SIGN_OUT);
  } catch {
    // Continue cleanup even if server sign-out fails
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("lms_demo_current_user");
      localStorage.removeItem("current_user");
      document.cookie =
        "lms_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie =
        "lms_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie =
        "lms_emp_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie =
        "better-auth.session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    } catch {
      // Ignore
    }
  }
  clearMeCache();
  return { ok: true };
}

export async function requestPasswordReset(input: {
  email: string;
}): Promise<{ ok: true; message: string }> {
  await http.post(AUTH_ENDPOINTS.FORGOT_PASSWORD, { email: input.email });
  return { ok: true, message: "Password reset link sent." };
}

export async function resetPassword(input: {
  token?: string;
  code?: string;
  password: string;
  email?: string;
}): Promise<{ ok: true; message: string }> {
  await http.post(AUTH_ENDPOINTS.RESET_PASSWORD, {
    email: input.email || "",
    otp: input.code || input.token || "",
    password: input.password,
  });
  return { ok: true, message: "Password updated successfully." };
}

export async function activate(input: {
  token?: string;
  password: string;
  email?: string;
}): Promise<{ employee: Employee; redirectTo?: string }> {
  const { activate: authActivate } = await import("@/services/auth/api");
  return authActivate(input);
}

export async function verifyResetToken(token: string): Promise<{
  valid: boolean;
  email?: string;
  employeeName?: string;
}> {
  if (!token || token === "invalid" || token === "expired") {
    return { valid: false };
  }
  return {
    valid: true,
    email: "",
    employeeName: "",
  };
}

const inFlightMe = new Map<string, Promise<{ employee: Employee }>>();
const cachedMe = new Map<
  string,
  { data: { employee: Employee }; expiresAt: number }
>();
const ME_CACHE_TTL_MS = 15 * 60_000; // 15 minutes sliding TTL

export function clearMeCache(): void {
  cachedMe.clear();
  inFlightMe.clear();
}

export async function fetchMe(
  cookieHeader?: string,
  _signal?: AbortSignal,
): Promise<{ employee: Employee }> {
  const cacheKey =
    cookieHeader ||
    (typeof window !== "undefined" ? "client" : "server_default");
  const now = Date.now();

  const cached = cachedMe.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const existing = inFlightMe.get(cacheKey);
  if (existing) {
    return existing;
  }

  const mePromise = (async () => {
    try {
      const headers: Record<string, string> = {};

      if (cookieHeader) {
        headers["Cookie"] = cookieHeader;
        const tokenMatch = cookieHeader.match(/(?:^|;\s*)lms_token=([^;]+)/);
        if (tokenMatch) {
          headers["Authorization"] =
            `Bearer ${decodeURIComponent(tokenMatch[1])}`;
        }
      }

      const { data } = await http.get<{
        success: boolean;
        data: {
          employee?: Employee;
          user?: { id: string; name: string; email: string };
          role?: string;
        };
      }>(AUTH_ENDPOINTS.ME, {
        headers: Object.keys(headers).length ? headers : undefined,
        signal: _signal,
      });

      if (data.data?.employee) {
        const res = { employee: data.data.employee };
        cachedMe.set(cacheKey, {
          data: res,
          expiresAt: Date.now() + ME_CACHE_TTL_MS,
        });
        return res;
      }

      if (data.data?.user) {
        const userRole = (data.data.role as EmployeeRole) || "super_admin";
        const res = {
          employee: {
            id: data.data.user.id,
            name: data.data.user.name,
            email: data.data.user.email,
            role: userRole,
            locationId: "",
            roleIds: [],
            stationIds: [],
            languagePref: "en" as const,
          },
        };
        cachedMe.set(cacheKey, {
          data: res,
          expiresAt: Date.now() + ME_CACHE_TTL_MS,
        });
        return res;
      }
    } catch (err) {
      // If we have a previously cached session and this is a non-401 transient error,
      // preserve the session rather than kicking the user to the login screen.
      if (
        cached &&
        err instanceof ApiException &&
        err.status !== 401 &&
        err.status !== 403
      ) {
        cached.expiresAt = Date.now() + 60_000;
        return cached.data;
      }
      if (err instanceof ApiException) {
        throw err;
      }
    } finally {
      inFlightMe.delete(cacheKey);
    }

    throw new ApiException(
      401,
      "SESSION_INVALID",
      "Session expired or invalid",
    );
  })();

  inFlightMe.set(cacheKey, mePromise);
  return mePromise;
}

// ----------------------------------------------------------------------------
// Admin lookups
// ----------------------------------------------------------------------------

export async function listRoles(
  cookieHeader?: string,
): Promise<{ roles: Role[] }> {
  // Always live data — no mock fallback. Failures propagate so the UI can
  // surface the backend error instead of rendering stale seed rows.
  const { fetchRoles } = await import("@/services/jobs/api");
  return fetchRoles(cookieHeader);
}

export async function listStations(
  locationId?: string,
  cookieHeader?: string,
  _opts: { includeArchived?: boolean } = {},
): Promise<{ stations: Station[] }> {
  // `locationId` / `includeArchived` are legacy parameters kept for
  // backward compatibility — backend stations are global `{ id, name }`
  // rows with no location scoping or archive flag, so they are ignored.
  // Always live data — no mock fallback.
  void locationId;
  const { fetchStations } = await import("@/services/stations/api");
  return fetchStations({}, cookieHeader);
}

export async function listLocations(
  cookieHeader?: string,
): Promise<{ locations: Location[] }> {
  // Always live data — no mock fallback.
  const { fetchLocations } = await import("@/services/locations/api");
  return fetchLocations(cookieHeader);
}

// ----------------------------------------------------------------------------
// Admin employees
// ----------------------------------------------------------------------------

export async function listEmployees(
  opts: { status?: EmployeeStatus | "all" } = {},
  cookieHeader?: string,
): Promise<{ employees: AdminEmployee[] }> {
  // Always live data — no mock fallback. Failures propagate so screens
  // render the backend error instead of stale seed rows.
  const status = opts.status ?? "all";
  const { fetchEmployees } = await import("@/services/employees/api");
  return fetchEmployees({ status }, cookieHeader);
}

export async function createEmployee(
  input: CreateEmployeeInput,
): Promise<{ employee: Employee; invite: InviteResult }> {
  const { createEmployee: apiCreate } =
    await import("@/services/employees/api");
  return apiCreate(input);
}

export async function resendInvite(
  employeeId: string,
): Promise<{ invite: InviteResult }> {
  const { resendInvite: apiResend } = await import("@/services/employees/api");
  return apiResend(employeeId);
}

export async function deactivateEmployee(
  employeeId: string,
): Promise<{ employee: AdminEmployee }> {
  const { deactivateEmployee: apiDeactivate } =
    await import("@/services/employees/api");
  return apiDeactivate(employeeId);
}

export async function reactivateEmployee(
  employeeId: string,
): Promise<{ employee: AdminEmployee }> {
  const { reactivateEmployee: apiReactivate } =
    await import("@/services/employees/api");
  return apiReactivate(employeeId);
}

// ----------------------------------------------------------------------------
// Admin settings — stations, roles, locations
// ----------------------------------------------------------------------------

export async function createStation(
  input: CreateStationInput,
): Promise<{ station: Station }> {
  // Backend `POST /api/v1/stations` takes `{ name }` only. Errors propagate
  // to the caller — no mock fallback, so a failed write can never render
  // as a saved chip.
  const { createStation: apiCreate } = await import("@/services/stations/api");
  return apiCreate({ name: input.name.trim() });
}

export async function updateStation(
  stationId: string,
  patch: UpdateStationInput,
): Promise<{ station: Station }> {
  // Backend `PATCH /api/v1/stations/:id` takes `{ name }` only. Removal
  // goes through `deleteStation` (DELETE), not an archive flag.
  if (patch.name === undefined) {
    throw new ApiException(400, "INVALID_INPUT", "Nothing to update");
  }
  const { updateStation: apiUpdate } = await import("@/services/stations/api");
  return apiUpdate(stationId, { name: patch.name.trim() });
}

export async function deleteStation(stationId: string): Promise<{ ok: true }> {
  const { deleteStation: apiDelete } = await import("@/services/stations/api");
  return apiDelete(stationId);
}

export async function createRole(
  input: CreateRoleInput,
): Promise<{ role: Role }> {
  // Backend `POST /api/v1/jobs` takes `{ name, stationIds? }` — there is no
  // clearance tier. Errors propagate (no mock fallback).
  const { createJob } = await import("@/services/jobs/api");
  const { job } = await createJob({
    name: input.name.trim(),
    stationIds: input.stationIds ?? [],
  });
  const role: Role = {
    id: job.id,
    name: job.name,
    clearanceLevel: input.clearanceLevel ?? "general",
    stationIds: job.stationIds ?? input.stationIds ?? [],
    createdAt: job.createdAt || new Date().toISOString(),
  };
  return { role };
}

export async function updateRole(
  roleId: string,
  patch: UpdateRoleInput,
): Promise<{ role: Role }> {
  // Backend `PATCH /api/v1/jobs/:id` takes `{ name?, stationIds? }` —
  // `clearanceLevel` is UI legacy and is never sent.
  const payload: { name?: string; stationIds?: string[] } = {};
  if (patch.name !== undefined) payload.name = patch.name.trim();
  if (patch.stationIds !== undefined) payload.stationIds = patch.stationIds;
  if (Object.keys(payload).length === 0) {
    throw new ApiException(400, "INVALID_INPUT", "Nothing to update");
  }
  const { updateJob } = await import("@/services/jobs/api");
  const { job } = await updateJob(roleId, payload);
  const role: Role = {
    id: job.id,
    name: job.name,
    clearanceLevel: patch.clearanceLevel ?? "general",
    stationIds: job.stationIds ?? payload.stationIds ?? [],
    createdAt: job.createdAt || new Date().toISOString(),
  };
  return { role };
}

export async function deleteRole(roleId: string): Promise<{ ok: true }> {
  const { deleteJob } = await import("@/services/jobs/api");
  await deleteJob(roleId);
  return { ok: true };
}

export async function createLocation(
  input: CreateLocationInput,
): Promise<{ location: Location }> {
  // Backend `POST /api/v1/locations` takes `{ name }`. Errors propagate.
  const { createLocation: apiCreate } =
    await import("@/services/locations/api");
  return apiCreate({ name: input.name.trim() });
}

export async function updateLocation(
  locationId: string,
  patch: UpdateLocationInput,
): Promise<{ location: Location }> {
  const { updateLocation: apiUpdate } =
    await import("@/services/locations/api");
  return apiUpdate(locationId, { name: patch.name.trim() });
}

export async function deleteLocation(
  locationId: string,
): Promise<{ ok: true }> {
  const { deleteLocation: apiDelete } =
    await import("@/services/locations/api");
  await apiDelete(locationId);
  return { ok: true };
}

// ----------------------------------------------------------------------------
// Activate
// ----------------------------------------------------------------------------

export async function lookupInvite(token: string): Promise<{
  employeeName: string;
  expiresAt: string;
  employeeStatus: "pending" | "active" | "deactivated";
}> {
  return authLookupInvite(token);
}

// ----------------------------------------------------------------------------
// Library — procedures
// ----------------------------------------------------------------------------

/** A URL name from a title: lower case, digits kept, and a number on the end
 *  when another procedure already has it. */
