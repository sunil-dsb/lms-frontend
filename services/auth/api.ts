import http, { backendApiUrl } from "@/lib/http";
import { AUTH_ENDPOINTS } from "./endpoints";
import type {
  LoginCredentials,
  LoginResponse,
  AuthMeResponse,
  SetPasswordInput,
} from "./types";
import type { Employee, EmployeeRole } from "@/lib/types";
import { ApiException } from "@/lib/api";

/** Login with one automatic retry on transient failures. The database
 *  sleeps when idle (Neon scale-to-zero) — the first attempt can fail while
 *  it wakes, and the immediate retry then succeeds. 4xx (wrong password,
 *  locked) never retries. */
const TRANSIENT_RETRY_DELAY_MS = 3000;

function isTransientLoginError(err: unknown): boolean {
  if (!(err instanceof ApiException)) return true; // network-level failure
  if (err.status === 0) return true;
  if (err.status >= 500) return true;
  return err.code === "DATABASE_ERROR" || err.code === "INTERNAL_ERROR";
}

export async function login(
  input: LoginCredentials,
): Promise<{ employee: Employee; token: string }> {
  let attempt = 0;
  for (;;) {
    try {
      return await loginAttempt(input);
    } catch (err) {
      attempt += 1;
      if (attempt > 1 || !isTransientLoginError(err)) throw err;
      await new Promise((resolve) =>
        setTimeout(resolve, TRANSIENT_RETRY_DELAY_MS),
      );
    }
  }
}

async function loginAttempt(
  input: LoginCredentials,
): Promise<{ employee: Employee; token: string }> {
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
    const raw = data.data.employee as any;
    emp = {
      ...raw,
      roleIds: Array.isArray(raw.roleIds)
        ? raw.roleIds
        : Array.isArray(raw.jobIds)
          ? raw.jobIds
          : [],
      jobIds: Array.isArray(raw.jobIds)
        ? raw.jobIds
        : Array.isArray(raw.roleIds)
          ? raw.roleIds
          : [],
      stationIds: Array.isArray(raw.stationIds) ? raw.stationIds : [],
    };
  } else if (data.data?.role) {
    emp = {
      id: data.data.user.id,
      name: data.data.user.name,
      email: data.data.user.email,
      role: data.data.role as EmployeeRole,
      locationId: "",
      roleIds: [],
      jobIds: [],
      stationIds: [],
      languagePref: "en",
    };
  } else {
    const meRes = await fetchMe();
    emp = meRes.employee;
  }

  if (typeof window !== "undefined") {
    document.cookie = `lms_role=${emp.role}; path=/; max-age=864000; SameSite=Lax`;
    document.cookie = `lms_emp_id=${emp.id}; path=/; max-age=864000; SameSite=Lax`;
  }

  return { employee: emp, token };
}

const inFlightAuthMe = new Map<string, Promise<{ employee: Employee }>>();
const cachedAuthMe = new Map<
  string,
  { data: { employee: Employee }; expiresAt: number }
>();
const AUTH_ME_CACHE_TTL_MS = 60_000;

export function clearAuthMeCache(): void {
  cachedAuthMe.clear();
  inFlightAuthMe.clear();
}

export async function fetchMe(
  cookieHeader?: string,
  _signal?: AbortSignal,
): Promise<{ employee: Employee }> {
  const cacheKey =
    cookieHeader ||
    (typeof window !== "undefined" ? "client" : "server_default");
  const now = Date.now();

  const cached = cachedAuthMe.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const existing = inFlightAuthMe.get(cacheKey);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    try {
      // Freshness is owned by the 10s TTL + dedup above — no no-cache
      // headers or `_t` buster, which would force a backend round-trip
      // on every session check.
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
        const raw = data.data.employee as any;
        const res = {
          employee: {
            ...raw,
            roleIds: Array.isArray(raw.roleIds)
              ? raw.roleIds
              : Array.isArray(raw.jobIds)
                ? raw.jobIds
                : [],
            jobIds: Array.isArray(raw.jobIds)
              ? raw.jobIds
              : Array.isArray(raw.roleIds)
                ? raw.roleIds
                : [],
            stationIds: Array.isArray(raw.stationIds) ? raw.stationIds : [],
            stations: Array.isArray(raw.stations) ? raw.stations : [],
            jobs: Array.isArray(raw.jobs) ? raw.jobs : [],
          },
        };
        cachedAuthMe.set(cacheKey, {
          data: res,
          expiresAt: Date.now() + AUTH_ME_CACHE_TTL_MS,
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
        cachedAuthMe.set(cacheKey, {
          data: res,
          expiresAt: Date.now() + AUTH_ME_CACHE_TTL_MS,
        });
        return res;
      }

      throw new ApiException(
        401,
        "SESSION_INVALID",
        "Session expired or invalid",
      );
    } finally {
      inFlightAuthMe.delete(cacheKey);
    }
  })();

  inFlightAuthMe.set(cacheKey, promise);
  return promise;
}

export async function lookupInvite(token: string): Promise<{
  employeeName: string;
  expiresAt: string;
  employeeStatus: "pending" | "active" | "deactivated";
  email?: string;
}> {
  try {
    const { data } = await http.get<{
      success: boolean;
      data: {
        employeeName: string;
        expiresAt: string;
        employeeStatus: "pending" | "active" | "deactivated";
        email?: string;
      };
    }>(AUTH_ENDPOINTS.INVITE_LOOKUP(token));
    return data.data;
  } catch (err) {
    if (err instanceof ApiException) throw err;
    return {
      employeeName: "New Team Member",
      expiresAt: new Date(Date.now() + 86400 * 1000).toISOString(),
      employeeStatus: "pending",
    };
  }
}

export async function activate(input: {
  token?: string;
  password: string;
  email?: string;
}): Promise<{ employee: Employee; redirectTo?: string }> {
  const { data } = await http.post<{
    success: boolean;
    data: {
      employee: Employee;
      token?: string;
      redirectTo?: string;
    };
  }>(backendApiUrl(AUTH_ENDPOINTS.SET_PASSWORD), {
    password: input.password,
  });

  const rawEmp = data.data?.employee as any;
  const normalizedEmp: Employee = rawEmp
    ? {
        ...rawEmp,
        roleIds: Array.isArray(rawEmp.roleIds)
          ? rawEmp.roleIds
          : Array.isArray(rawEmp.jobIds)
            ? rawEmp.jobIds
            : [],
        jobIds: Array.isArray(rawEmp.jobIds)
          ? rawEmp.jobIds
          : Array.isArray(rawEmp.roleIds)
            ? rawEmp.roleIds
            : [],
        stationIds: Array.isArray(rawEmp.stationIds) ? rawEmp.stationIds : [],
        stations: Array.isArray(rawEmp.stations) ? rawEmp.stations : [],
        jobs: Array.isArray(rawEmp.jobs) ? rawEmp.jobs : [],
      }
    : rawEmp;

  if (typeof window !== "undefined") {
    if (data.data?.token) {
      localStorage.setItem("token", data.data.token);
      document.cookie = `lms_token=${data.data.token}; path=/; max-age=864000; SameSite=Lax`;
    }
    if (normalizedEmp) {
      document.cookie = `lms_role=${normalizedEmp.role}; path=/; max-age=864000; SameSite=Lax`;
      document.cookie = `lms_emp_id=${normalizedEmp.id}; path=/; max-age=864000; SameSite=Lax`;
    }
  }

  return {
    ...data.data,
    employee: normalizedEmp,
  };
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

  return { ok: true };
}
