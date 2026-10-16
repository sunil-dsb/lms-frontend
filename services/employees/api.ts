import http from "@/lib/http";
import { EMPLOYEES_ENDPOINTS } from "./endpoints";
import type {
  AdminEmployee,
  Employee,
  CreateEmployeeInput,
  InviteResult,
  EmployeeFilterOptions,
} from "./types";

function frontendInviteUrl(inviteUrl: string): string {
  if (!inviteUrl) return "";
  try {
    const parsed = new URL(
      inviteUrl,
      typeof window === "undefined"
        ? "http://localhost"
        : window.location.origin,
    );
    const inviteMatch = parsed.pathname.match(
      /\/auth\/invites\/([^/]+)\/([^/]+)\/?$/,
    );
    if (inviteMatch) {
      const [, locale, token] = inviteMatch;
      const origin =
        typeof window === "undefined" ? "" : window.location.origin;
      return `${origin}/${locale}/invite/${encodeURIComponent(token)}`;
    }
    // Already a frontend invite URL (e.g. `/en/invite/token?token=…`) on
    // another host (production, tunnel): keep path + query, but point it
    // at the app the admin is actually using so copy → open → activate
    // works in this environment. Server-side has no origin — keep as-is.
    if (
      typeof window !== "undefined" &&
      /^\/[a-z]{2}\/invite(\/|$)/i.test(parsed.pathname)
    ) {
      return `${window.location.origin}${parsed.pathname}${parsed.search}`;
    }
  } catch {
    // Keep an unrecognized invite URL as returned by the API.
  }
  return inviteUrl;
}

function normalizeEmployee<T extends Employee>(raw: any): T {
  const stationIds = Array.isArray(raw?.stationIds)
    ? raw.stationIds
    : Array.isArray(raw?.stations)
      ? raw.stations.map((station: { id: string }) => station.id)
      : [];
  const normalizedRoleIds = Array.isArray(raw?.roleIds)
    ? raw.roleIds
    : Array.isArray(raw?.jobIds)
      ? raw.jobIds
      : Array.isArray(raw?.jobs)
        ? raw.jobs.map((job: { id: string }) => job.id)
        : [];
  const accessLevel =
    raw?.accessLevel ??
    (raw?.role === "manager"
      ? "manager"
      : raw?.role === "super_admin" || raw?.role === "admin"
        ? "manager"
        : "employee");

  return {
    ...raw,
    accessLevel,
    roleIds: normalizedRoleIds,
    jobIds: normalizedRoleIds,
    stationIds,
  } as T;
}

export async function fetchEmployeeById(
  id: string,
  cookieHeader?: string,
): Promise<{ employee: AdminEmployee; inviteUrl?: string }> {
  const headers: Record<string, string> = {};

  if (cookieHeader) {
    headers["Cookie"] = cookieHeader;
    const tokenMatch = cookieHeader.match(/(?:^|;\s*)lms_token=([^;]+)/);
    if (tokenMatch) {
      headers["Authorization"] = `Bearer ${decodeURIComponent(tokenMatch[1])}`;
    }
  }

  const { data } = await http.get<{
    success: boolean;
    data: { employee: any; inviteUrl?: string };
  }>(EMPLOYEES_ENDPOINTS.GET(id), {
    headers: Object.keys(headers).length ? headers : undefined,
  });

  const raw = data.data?.employee;
  // The backend returns `inviteUrl` for pending employees both top-level
  // and nested on the employee — surface it explicitly (normalizeEmployee
  // spreads unknown fields, but the UI should not rely on that).
  const rawInvite: string | undefined =
    data.data?.inviteUrl ||
    (typeof raw?.inviteUrl === "string" ? raw.inviteUrl : undefined);
  const inviteUrl = rawInvite ? frontendInviteUrl(rawInvite) : undefined;
  return { employee: normalizeEmployee<AdminEmployee>(raw), inviteUrl };
}

export async function fetchEmployees(
  opts: EmployeeFilterOptions = {},
  cookieHeader?: string,
): Promise<{ employees: AdminEmployee[] }> {
  const status = opts.status ?? "all";
  const headers: Record<string, string> = {};

  if (cookieHeader) {
    headers["Cookie"] = cookieHeader;
    const tokenMatch = cookieHeader.match(/(?:^|;\s*)lms_token=([^;]+)/);
    if (tokenMatch) {
      headers["Authorization"] = `Bearer ${decodeURIComponent(tokenMatch[1])}`;
    }
  }

  const { data } = await http.get<{
    success: boolean;
    data: { employees: AdminEmployee[] };
  }>(EMPLOYEES_ENDPOINTS.LIST, {
    headers: Object.keys(headers).length ? headers : undefined,
    params: {
      status: status !== "all" ? status : undefined,
      // Backend paginates (default 10) — ask for the whole roster: the
      // dashboard counts and People filters need every row to be correct.
      limit: 200,
    },
  });

  const rawList = data.data?.employees ?? [];
  return { employees: rawList.map((e) => normalizeEmployee<AdminEmployee>(e)) };
}

export async function createEmployee(
  input: CreateEmployeeInput,
): Promise<{ employee: Employee; invite: InviteResult }> {
  const { data } = await http.post<{
    success: boolean;
    data: {
      employee: Employee;
      inviteUrl?: string;
    };
  }>(EMPLOYEES_ENDPOINTS.CREATE, {
    name: input.name,
    email: input.email,
    locationId: input.locationId,
    role: input.accessLevel === "manager" ? "manager" : "employee",
    jobIds: input.roleIds,
    stationIds: input.stationIds ?? [],
    employeeCode: input.employeeCode || undefined,
    languagePref: input.languagePref ?? "en",
  });

  const invite: InviteResult = {
    url: frontendInviteUrl(data.data?.inviteUrl || ""),
    code: "",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  return { employee: normalizeEmployee<Employee>(data.data.employee), invite };
}

export async function resendInvite(
  employeeId: string,
): Promise<{ invite: InviteResult }> {
  const { data } = await http.post<{
    success: boolean;
    data: {
      inviteUrl: string;
    };
  }>(EMPLOYEES_ENDPOINTS.RESEND_INVITE(employeeId));

  return {
    invite: {
      url: frontendInviteUrl(data.data?.inviteUrl || ""),
      code: "",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  };
}

export async function deactivateEmployee(
  employeeId: string,
): Promise<{ employee: AdminEmployee }> {
  const { data } = await http.post<{
    success: boolean;
    data: {
      employee: AdminEmployee;
    };
  }>(EMPLOYEES_ENDPOINTS.DEACTIVATE(employeeId));

  return { employee: normalizeEmployee<AdminEmployee>(data.data.employee) };
}

export async function reactivateEmployee(
  employeeId: string,
): Promise<{ employee: AdminEmployee }> {
  const { data } = await http.post<{
    success: boolean;
    data: {
      employee: AdminEmployee;
    };
  }>(EMPLOYEES_ENDPOINTS.REACTIVATE(employeeId));

  return { employee: normalizeEmployee<AdminEmployee>(data.data.employee) };
}

/** Full-body update (backend validates against the create schema minus
 *  employeeCode — every field required). The caller must send the current
 *  `status`/`languagePref` explicitly: the backend defaults an omitted
 *  status to `pending`, which would silently deactivate people. */
export interface UpdateEmployeeRequest {
  name: string;
  email: string;
  locationId: string;
  role: "super_admin" | "manager" | "employee";
  jobIds: string[];
  stationIds: string[];
  languagePref: "en" | "es";
  status: "pending" | "active" | "deactivated";
}

export async function updateEmployee(
  employeeId: string,
  input: UpdateEmployeeRequest,
): Promise<{ employee: AdminEmployee; inviteUrl?: string }> {
  const { data } = await http.put<{
    success: boolean;
    data: {
      employee: AdminEmployee;
      inviteUrl?: string;
    };
  }>(EMPLOYEES_ENDPOINTS.UPDATE(employeeId), input);

  // When a pending employee's email changes, the backend mails a fresh
  // magic link and returns its `inviteUrl` — the caller surfaces it so
  // the admin can copy it when email delivery is unreliable.
  const rawInvite: string | undefined = data.data?.inviteUrl || undefined;
  return {
    employee: normalizeEmployee<AdminEmployee>(data.data.employee),
    inviteUrl: rawInvite ? frontendInviteUrl(rawInvite) : undefined,
  };
}
