import type {
  AdminEmployee,
  Employee,
  EmployeeStatus,
  EmployeeRole,
  AccessLevel,
  CreateEmployeeInput,
  InviteResult,
} from "@/lib/types";

export type {
  AdminEmployee,
  Employee,
  EmployeeStatus,
  EmployeeRole,
  AccessLevel,
  CreateEmployeeInput,
  InviteResult,
};

export interface EmployeeFilterOptions {
  status?: EmployeeStatus | "all";
  q?: string;
}

export const EMPLOYEES_UPDATED_EVENT = "lms_employees_updated";

export interface UpdateEmployeeInput {
  name: string;
  email: string | null;
  locationId: string;
  accessLevel: AccessLevel;
  role: EmployeeRole;
  roleIds: string[];
  stationIds: string[];
}
