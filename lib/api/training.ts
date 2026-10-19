import type { Procedure, TrainingAssignment } from "../types";
import {
  listTrainingAssignmentsForCourse,
  assignCourseToEmployees,
  mockTrainingEmployees,
  type MockEmployee,
} from "../mock-training";

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
    assignments: TrainingAssignment[];
  };
}

export interface TrainingEmployeesResponse {
  success: boolean;
  data: MockEmployee[];
}

export interface CourseAssignmentsResponse {
  success: boolean;
  data: TrainingAssignment[];
}

/**
 * Fetch assignments for a specific training course.
 * Prepares the frontend for seamless backend integration.
 */
export async function fetchCourseAssignments(
  courseId: string,
): Promise<CourseAssignmentsResponse> {
  // When backend endpoint is active:
  // const { data } = await http.get<CourseAssignmentsResponse>(TRAINING_ENDPOINTS.COURSE_ASSIGNMENTS(courseId));
  // return data;

  const assignments = listTrainingAssignmentsForCourse(courseId);
  return {
    success: true,
    data: assignments,
  };
}

/**
 * Fetch assignable employees for training.
 */
export async function fetchAssignableEmployees(): Promise<TrainingEmployeesResponse> {
  // When backend endpoint is active:
  // const { data } = await http.get<TrainingEmployeesResponse>(TRAINING_ENDPOINTS.EMPLOYEES);
  // return data;

  // Filter out any legacy or invalid stations like "Saucier"
  const cleanEmployees = mockTrainingEmployees.map((emp) => ({
    ...emp,
    station: emp.station === "Saucier" ? "Prep" : emp.station,
  }));

  return {
    success: true,
    data: cleanEmployees,
  };
}

/**
 * Assign a course to employees with due date.
 */
export async function assignCourse(
  payload: AssignCoursePayload,
): Promise<AssignCourseResponse> {
  // When backend endpoint is active:
  // const { data } = await http.post<AssignCourseResponse>(TRAINING_ENDPOINTS.ASSIGN, payload);
  // return data;

  // Simulated latency for realistic async interaction
  await new Promise((resolve) => setTimeout(resolve, 300));

  const created = assignCourseToEmployees(
    payload.courseId,
    payload.employeeIds,
    payload.dueAt,
  );

  return {
    success: true,
    message: `Successfully assigned course to ${created.length} employees`,
    data: {
      courseId: payload.courseId,
      assignedCount: created.length,
      assignments: created,
    },
  };
}
