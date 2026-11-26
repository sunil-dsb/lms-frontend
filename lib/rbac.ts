import type { AccessLevel, EmployeeRole, SystemRole } from "./types";

/**
 * Standardizes role normalization: treats "admin" as "super_admin".
 */
export function normalizeRole(role?: string | null): SystemRole {
  if (role === "admin" || role === "super_admin") return "super_admin";
  if (role === "manager") return "manager";
  if (role === "supervisor") return "supervisor";
  return "employee";
}

export function isSuperAdmin(role?: string | null): boolean {
  return normalizeRole(role) === "super_admin";
}

export function isManager(role?: string | null): boolean {
  return normalizeRole(role) === "manager";
}

export function isSupervisor(role?: string | null): boolean {
  return normalizeRole(role) === "supervisor";
}

export function isEmployee(role?: string | null): boolean {
  return normalizeRole(role) === "employee";
}

/**
 * Formats a system role into a clean display label (e.g. "Admin", "Manager", "Supervisor", "Employee").
 * Replaces any display of "super_admin" / "Super Admin" with "Admin".
 */
export function formatSystemRole(role?: string | null, isEs = false): string {
  const r = role?.toLowerCase()?.trim();
  if (r === "super_admin" || r === "admin")
    return isEs ? "Administrador" : "Admin";
  if (r === "manager") return isEs ? "Gerente" : "Manager";
  if (r === "supervisor") return isEs ? "Supervisor" : "Supervisor";
  return isEs ? "Empleado" : "Employee";
}

/**
 * Checks if a user has access to the management/admin portal (/admin).
 * Super Admin, Location Manager, and Shift Supervisor can access /admin.
 * Regular Employees are restricted to the kitchen floor (/employee/home).
 */
export function canAccessAdminPortal(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === "super_admin" || r === "manager" || r === "supervisor";
}

/**
 * Can invite, create, and configure employees: Super Admin & Manager only.
 * Supervisors and Employees do NOT have user creation privileges.
 */
export function canInviteEmployees(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === "super_admin" || r === "manager";
}

/**
 * Can edit employee profiles. Admins may also change system roles; managers
 * may edit other employee fields but the API keeps their system role fixed.
 * Supervisors have view-only access.
 */
export function canEditEmployees(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === "super_admin" || r === "manager";
}

/**
 * Can deactivate or resend invites to employees.
 */
export function canDeactivateEmployees(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === "super_admin" || r === "manager";
}

/**
 * Can author, edit, publish, or delete kitchen procedures and recipe SOPs.
 * Supervisors have read access only on the floor.
 */
export function canManageProcedures(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === "super_admin" || r === "manager";
}

/**
 * Can author, edit, or delete training courses and chapters.
 */
export function canManageCourses(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === "super_admin" || r === "manager";
}

/**
 * Can assign published training courses to staff.
 * Super Admin, Manager, and Supervisor (to direct subordinates).
 */
export function canAssignCourses(role?: string | null): boolean {
  const r = normalizeRole(role);
  return r === "super_admin" || r === "manager" || r === "supervisor";
}

/**
 * Can configure kitchen stations, job roles, and store settings.
 */
export function canManageSettings(role?: string | null): boolean {
  return isSuperAdmin(role);
}

/**
 * Can view the organization-wide system audit log.
 * Super Admin only.
 */
export function canViewAuditLog(role?: string | null): boolean {
  return isSuperAdmin(role);
}

/**
 * Returns the list of assignable roles when creating/inviting a user.
 * - Super Admin can invite Managers, Supervisors, and Employees.
 * - Manager can ONLY invite Supervisors and Employees (cannot create Managers).
 * - Supervisor/Employee cannot invite anyone.
 */
export function getAllowedInviteRoles(
  currentUserRole?: string | null,
): AccessLevel[] {
  if (isSuperAdmin(currentUserRole)) {
    return ["manager", "supervisor", "employee"];
  }
  if (isManager(currentUserRole)) {
    return ["supervisor", "employee"];
  }
  return [];
}
