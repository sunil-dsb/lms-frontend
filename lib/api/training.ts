import type { AdminEmployee } from "../types";
import type { CourseAssignmentRow } from "@/services/courses/types";
import type { MockEmployee } from "../mock-training";
import {
  assignCourseApi,
  fetchCourseAssignmentsApi,
} from "@/services/courses/api";
import { fetchEmployees } from "@/services/employees/api";

export const TRAINING_ENDPOINTS = {
  COURSES: "/training/courses",
  COURSE_ASSIGNMENTS: (courseId: string) =>
    `/training/courses/${courseId}/assignments`,
  ASSIGN: "/training/assignments",
  EMPLOYEES: "/training/employees",
} as const;

export interface AssignCoursePayload {
  courseId: string;
  employeeIds: string[];
  dueAt?: string;
  scope?: "everyone" | "station" | "people";
}

export interface AssignCourseResponse {
  success: boolean;
  message?: string;
  data: {
    courseId: string;
    assignedCount: number;
    assignments: CourseAssignmentRow[];
  };
}

export interface TrainingEmployeesResponse {
  success: boolean;
  data: MockEmployee[];
}

export interface CourseAssignmentsResponse {
  success: boolean;
  data: CourseAssignmentRow[];
}

/**
 * Fetch assignments for a specific training course from live database.
 */
export async function fetchCourseAssignments(
  courseId: string,
): Promise<CourseAssignmentsResponse> {
  try {
    const data = await fetchCourseAssignmentsApi(courseId);
    return {
      success: true,
      data: Array.isArray(data) ? data : [],
    };
  } catch (err) {
    console.error("Backend course assignments error:", err);
    return {
      success: false,
      data: [],
    };
  }
}

interface AssignableEmployeeItem extends AdminEmployee {
  stations?: Array<{ id: string; name: string }>;
  resolvedStations?: Array<{ id: string; name: string }>;
  avatar?: string;
}

/**
 * Fetch assignable employees for training from live database.
 */
export async function fetchAssignableEmployees(): Promise<TrainingEmployeesResponse> {
  try {
    const res = await fetchEmployees();
    // The backend accepts both `active` and `pending` employees in one
    // assign batch (only `deactivated` is rejected), so new hires who have
    // not activated their account yet get pre-assigned training and see it
    // the moment they log in.
    const assignable = (res?.employees || []).filter(
      (emp) => emp.status !== "deactivated",
    );

    const liveEmployees: MockEmployee[] = assignable.map((emp) => {
      const stationList: Array<{ id: string; name: string }> =
        (emp as AssignableEmployeeItem).stations ||
        (emp as AssignableEmployeeItem).resolvedStations ||
        [];
      const stationNames = stationList
        .map((s) => s.name.trim())
        .filter(Boolean);
      const displayStation =
        stationNames.length > 0 ? stationNames.join(", ") : "Unassigned";

      return {
        id: emp.id,
        name: emp.name,
        role: emp.role === "manager" ? "manager" : "employee",
        status: (emp.status === "pending" ? "pending" : "active") as
          "active" | "pending",
        station: displayStation,
        stations: stationNames,
        locationId: emp.locationId || "loc-roma",
        avatar: (emp as AssignableEmployeeItem).avatar,
      };
    });

    return {
      success: true,
      data: liveEmployees,
    };
  } catch (err) {
    console.error("Failed to fetch assignable employees:", err);
    return {
      success: false,
      data: [],
    };
  }
}

/**
 * Assign a course to employees with due date.
 */
export async function assignCourse(
  payload: AssignCoursePayload,
): Promise<AssignCourseResponse> {
  const result = await assignCourseApi(
    payload.courseId,
    payload.employeeIds,
    payload.dueAt,
    "add",
  );

  return {
    success: true,
    message: `Successfully assigned course to ${result.assignedCount} employees`,
    data: {
      courseId: payload.courseId,
      assignedCount: result.assignedCount,
      assignments: [],
    },
  };
}
